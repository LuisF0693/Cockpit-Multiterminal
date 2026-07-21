"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  bestFontFaces,
  buildAssets,
  buildModes,
  buildSourceProfile,
  computeGalleryReadiness,
  extractMarkdownImage,
  hasRealLiveCoverage,
  mostCommonFontFamily,
  problemCount,
  scoreHeroImageCandidate,
} = require("./materialize-design-gallery-bundle.cjs");

test("bestFontFaces ranks exact primary family first and skips debug fonts", () => {
  const faces = bestFontFaces(
    [
      {
        family: "Netflix Sans",
        weight: "400",
        src_urls: ["https://example.com/netflix-sans.woff2"],
      },
      {
        family: "Netflix Sans Debug",
        weight: "100 900",
        src_urls: ["https://example.com/debug.woff2"],
      },
      {
        family: "Netflix Sans Variable",
        weight: "100 900",
        src_urls: ["https://example.com/netflix-sans-variable.woff2"],
      },
    ],
    "Netflix Sans Variable",
  );

  assert.equal(faces[0].family, "Netflix Sans Variable");
  assert.equal(faces.some((face) => /debug/i.test(face.family)), false);
});

test("buildModes preserves Netflix native red, dark default and component vars", () => {
  const tokens = {
    colors: {
      primary: "#e00000",
      surface: "#000000",
      text: "#ffffff",
      "text-muted": "#a9a9a9",
      border: "#461518",
      secondary: "#161d52",
      success: "#2bb871",
    },
    typography: {
      body: {
        fontFamily: "Netflix Sans Variable",
      },
    },
    preview_tokens: {
      card_bg: "#1a1a1a",
      card_radius: "8px",
    },
  };
  const renderContract = {
    theme: {
      default_mode: "dark",
      surface: "#000000",
      surface_alt: "#1a1a1a",
    },
    native_vars: {
      light: {
        "--wct--local-design--Button-Surface": "rgb(229,9,20)",
        "--wct--local-design--Button-SurfaceHovered": "rgb(193,17,25)",
        "--wct--local-design--Button-BorderRadius": "0.25rem",
        "--wct--local-design--Button-Height": "2.5rem",
      },
    },
  };
  const result = buildModes({
    tokens,
    renderContract,
    tokenExtended: { motion: {} },
    fontFamily: mostCommonFontFamily(tokens.typography),
    context: { tokens, renderContract },
  });

  assert.equal(result.defaultMode, "dark");
  assert.equal(result.modes.dark["--primary"], "#E50914");
  assert.equal(result.modes.dark["--brand-native-button-hover"], "#C11119");
  assert.equal(result.modes.dark["--radius-button"], "0.25rem");
});

test("buildModes never invents Itaú/Netflix red as a missing hover fallback", () => {
  const tokens = {
    colors: {
      primary: "#ff9900",
      accent: "#ff9900",
      surface: "#ffffff",
      text: "#111111",
      secondary: "#232f3e",
    },
    typography: {
      body: {
        fontFamily: "Amazon Ember",
      },
    },
    preview_tokens: {
      accent: "#ff9900",
    },
  };
  const renderContract = {
    theme: {
      default_mode: "light",
      surface: "#ffffff",
    },
    native_vars: {
      light: {
        "--wct--local-design--Button-Surface": "#ff9900",
      },
    },
  };

  const result = buildModes({
    tokens,
    renderContract,
    tokenExtended: { motion: {} },
    fontFamily: mostCommonFontFamily(tokens.typography),
    context: { tokens, renderContract },
  });

  assert.equal(result.modes.light["--accent"], "#FF9900");
  assert.equal(result.modes.light["--brand-native-button-hover"], "#FF9900");
  assert.notEqual(result.modes.light["--accent"], "#C11119");
  assert.notEqual(result.modes.light["--brand-native-button-hover"], "#C11119");
});

test("buildAssets promotes curated wordmark over favicon fallback", () => {
  const assets = buildAssets({
    slug: "netflix",
    metaAssets: {
      appleTouchIconUrl: "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png",
    },
    favicon: {
      sourceUrl: "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png",
    },
    logo: {
      source: "favicon (fallback)",
      sourceUrl: "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png",
    },
  });

  assert.equal(assets.logoSourceKind, "wordmark");
  assert.match(assets.logoUrl, /Netflix_2015_logo\.svg$/);
  assert.match(assets.faviconPngUrl, /nficon2016\.png$/);
});

test("buildSourceProfile classifies Magalu as ecommerce marketplace", () => {
  const profile = buildSourceProfile({
    slug: "magazineluiza",
    name: "Magazine Luiza",
    domain: "magazineluiza.com.br",
    sourceUrl: "https://www.magazineluiza.com.br/",
    pageMd: "# Magazine Luiza\n\nOfertas em móveis, eletrônicos e marketplace.",
    pageHtml: "",
    heroBlock: {},
    metaAssets: {
      ogTitle: "Magazine Luiza | Pra você é Magalu!",
      ogDescription: "As melhores ofertas em móveis, eletrônicos, eletrodomésticos e muito mais.",
    },
  });

  assert.equal(profile.type, "ecommerce-marketplace");
  assert.equal(profile.variant, "magalu");
  assert.equal(profile.searchPlaceholder, "O que você procura?");
});

test("buildSourceProfile classifies Americanas as ecommerce marketplace", () => {
  const profile = buildSourceProfile({
    slug: "americanas",
    name: "Americanas",
    domain: "americanas.com.br",
    sourceUrl: "https://www.americanas.com.br/",
    pageMd: "# Americanas\n\nOfertas, produtos, frete e cestinha.",
    pageHtml: "",
    heroBlock: {},
    metaAssets: {
      ogTitle: "Americanas - Tudo que você ama",
      ogDescription: "Precisando de iPhone, creatina ou daquela barra de chocolate? Americanas tem.",
    },
  });

  assert.equal(profile.type, "ecommerce-marketplace");
  assert.equal(profile.variant, "americanas");
  assert.equal(profile.searchPlaceholder, "busque aqui seu produto");
});

test("extractMarkdownImage prefers campaign banners over logo/avatar assets", () => {
  const pageMd = [
    "![Logo do site escrito Magalu](https://wx.mlcdn.com.br/site/desk/header/lu-logo-avatar.png)",
    "![Campanha de ofertas](https://wx.mlcdn.com.br/site/banner/superbanner-ofertas-desktop.webp)",
  ].join("\n");

  const image = extractMarkdownImage(pageMd, "https://www.magazineluiza.com.br/", [/oferta|banner|superbanner|desktop/]);

  assert.match(image.url, /superbanner-ofertas-desktop\.webp$/);
  assert.ok(scoreHeroImageCandidate({ alt: "Logo", url: "https://example.com/logo-avatar.png" }) < 0);
});

test("problemCount handles lint arrays, numbers and objects", () => {
  assert.equal(problemCount([{ message: "a" }, { message: "b" }]), 2);
  assert.equal(problemCount(3), 3);
  assert.equal(problemCount({ a: true, b: true }), 2);
  assert.equal(problemCount(null), 0);
});

test("computeGalleryReadiness penalizes low-confidence generated output", () => {
  const readiness = computeGalleryReadiness({
    preview: { showcase: { sourceProfile: { hero: { imageUrl: "https://example.com/banner.webp" } } } },
    qualityScore: {
      overall: 90,
      categories: {
        accessibility: { score: 33 },
      },
    },
    lintReport: { errors: [], warnings: Array.from({ length: 57 }, () => ({})) },
    extractLog: { confidence_summary: { high: 29, medium: 0, low: 156 } },
  });

  assert.equal(readiness.grade === "A", false);
  assert.ok(readiness.blockers.includes("source-confidence-low"));
  assert.ok(readiness.blockers.includes("accessibility-low"));
  assert.ok(readiness.blockers.includes("lint-warning-heavy"));
});

test("computeGalleryReadiness suppresses quality when extraction coverage is not live real", () => {
  const readiness = computeGalleryReadiness({
    preview: { showcase: { sourceProfile: { hero: { imageUrl: "https://example.com/banner.webp" } } } },
    qualityScore: { overall: 96, grade: "A", categories: { accessibility: { score: 96 } } },
    lintReport: { errors: [], warnings: [] },
    extractLog: { confidence_summary: { high: 10, medium: 0, low: 0 } },
    extractionClass: {
      operational_mode: "imported_curated_md",
      coverage_real: false,
    },
  });

  assert.equal(readiness.components.qualityTrusted, false);
  assert.equal(readiness.components.quality, 0);
  assert.ok(readiness.blockers.includes("coverage-not-real"));
});

test("hasRealLiveCoverage requires live_extraction and coverage_real true", () => {
  assert.equal(hasRealLiveCoverage({ operational_mode: "live_extraction", coverage_real: true }), true);
  assert.equal(hasRealLiveCoverage({ operational_mode: "manual_recovery", coverage_real: true }), false);
  assert.equal(hasRealLiveCoverage({ operational_mode: "live_extraction", coverage_real: false }), false);
});
