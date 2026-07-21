#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SCRIPT_PATH = path.relative(process.cwd(), __filename);
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DESIGN_APP_ROOT = path.join(REPO_ROOT, "apps/design");
const DESIGNS_SRC_ROOT = path.join(DESIGN_APP_ROOT, "src/data/designs");
const DESIGNS_INDEX = path.join(DESIGN_APP_ROOT, "src/data/designs-index.generated.json");
const PUBLIC_COMPANIES_ROOT = path.join(DESIGN_APP_ROOT, "public/data/companies");
const EXTRACTS_ROOT = path.join(REPO_ROOT, "outputs/design-ops/url-extracts");
const PRE_TIER_B_ROOT = path.join(REPO_ROOT, "apps/design-pre-tier-b/src/data/designs");
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, ".tmp/audit");
const DEFAULT_BRANDS = [
  "aiox",
  "anthropic",
  "mistral.ai",
  "lovable",
  "netflix",
  "itau",
  "amazon",
  "mercadolivre",
  "nubank",
  "n8n",
  "notion",
  "playstation",
  "wise",
  "starbucks",
];

const JSON_FILES = ["meta.json", "assets.json", "fonts.json", "preview.json", "audit.json", "diagnostics.json"];
const CONTAMINATION = ["#C11119", "#99161D"];
const SHADCN_SECONDARY_DEFAULTS = new Set(["#F4F4F5", "#F3F3F3", "#E4E4E7", "#18181B", "#0A0A0A", "#FAFAFA"]);
const GENERIC_NAVS = [
  ["Product", "Resources", "Docs"],
  ["Overview", "Products", "Resources", "Pricing"],
];
const GENERIC_COPY_RE = /\b(?:source-derived tokens|responsive composition|active design skin|welcome to .*awesome platform|get started|learn more)\b/i;

function parseArgs(argv) {
  const args = {
    brands: null,
    all: false,
    outDir: DEFAULT_OUT_DIR,
    json: null,
    md: null,
    preTierBRoot: PRE_TIER_B_ROOT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--all") {
      args.all = true;
    } else if (arg === "--brands") {
      args.brands = splitCsv(argv[++index]);
    } else if (arg.startsWith("--brands=")) {
      args.brands = splitCsv(arg.slice("--brands=".length));
    } else if (arg === "--out-dir") {
      args.outDir = path.resolve(argv[++index]);
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice("--out-dir=".length));
    } else if (arg === "--json") {
      args.json = path.resolve(argv[++index]);
    } else if (arg.startsWith("--json=")) {
      args.json = path.resolve(arg.slice("--json=".length));
    } else if (arg === "--md") {
      args.md = path.resolve(argv[++index]);
    } else if (arg.startsWith("--md=")) {
      args.md = path.resolve(arg.slice("--md=".length));
    } else if (arg === "--out") {
      args.json = path.resolve(argv[++index]);
    } else if (arg.startsWith("--out=")) {
      args.json = path.resolve(arg.slice("--out=".length));
    } else if (arg === "--pre-tier-b-root") {
      args.preTierBRoot = path.resolve(argv[++index]);
    } else if (arg.startsWith("--pre-tier-b-root=")) {
      args.preTierBRoot = path.resolve(arg.slice("--pre-tier-b-root=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function usage() {
  console.log(`Usage:
  node ${SCRIPT_PATH} [--brands=aiox,anthropic] [--all] [--out-dir .tmp/audit]

Outputs:
  .tmp/audit/gallery-drift-baseline.json
  .tmp/audit/gallery-drift-baseline.md

Notes:
  Read-only against extract/src/public data. Writes audit reports only.`);
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readText(file, fallback = "") {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return fallback;
  }
}

function pathExists(file) {
  try {
    fs.accessSync(file, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stableStringify(value) {
  return JSON.stringify(sortJson(value));
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = sortJson(value[key]);
  }
  return out;
}

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function hashJson(value) {
  if (value == null) return null;
  return sha256(`${stableStringify(value)}\n`);
}

function hashText(value) {
  if (value == null) return null;
  return sha256(String(value));
}

function normalizeHex(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex.split("").map((char) => char + char).join("");
  }
  if (hex.length === 8) {
    hex = hex.slice(0, 6);
  }
  return `#${hex.toUpperCase()}`;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function isRootRelative(value) {
  return /^\//.test(String(value || ""));
}

function isDataUrl(value) {
  return /^data:/i.test(String(value || ""));
}

function decodeSvgDataUrl(value) {
  const url = String(value || "");
  if (!/^data:image\/svg\+xml/i.test(url)) return null;
  const comma = url.indexOf(",");
  if (comma === -1) return "";
  const header = url.slice(0, comma);
  const body = url.slice(comma + 1);
  if (/;base64/i.test(header)) {
    try {
      return Buffer.from(body, "base64").toString("utf8");
    } catch {
      return "";
    }
  }
  try {
    return decodeURIComponent(body);
  } catch {
    return body;
  }
}

function publicPathFromUrl(url) {
  if (!isRootRelative(url)) return null;
  const clean = String(url).split(/[?#]/)[0].replace(/^\/+/, "");
  return path.join(DESIGN_APP_ROOT, "public", clean);
}

function collectStrings(value, out = []) {
  if (value == null) return out;
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
}

function textContainsColor(text, color) {
  if (!text) return false;
  const hex = color.replace("#", "");
  if (new RegExp(`#${hex}`, "i").test(text)) return true;
  if (color.toUpperCase() === "#C11119") {
    return /rgb\(\s*193\s*,\s*17\s*,\s*25\s*\)/i.test(text);
  }
  if (color.toUpperCase() === "#99161D") {
    return /rgb\(\s*153\s*,\s*22\s*,\s*29\s*\)/i.test(text);
  }
  return false;
}

function addFinding(findings, severity, layer, code, message, evidence = {}) {
  findings.push({
    severity,
    layer,
    code,
    message,
    evidence,
  });
}

function severityRank(severity) {
  return { high: 3, medium: 2, low: 1, info: 0 }[severity] ?? 0;
}

function worstSeverity(findings) {
  let worst = "info";
  for (const finding of findings) {
    if (severityRank(finding.severity) > severityRank(worst)) worst = finding.severity;
  }
  return worst;
}

function findingCounts(findings) {
  const counts = { high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
  }
  return counts;
}

function byCount(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function loadBrandIndex() {
  const entries = readJson(DESIGNS_INDEX, []);
  const bySlug = new Map();
  for (const entry of entries) {
    if (entry && entry.id) bySlug.set(entry.id, entry);
  }
  return { entries, bySlug };
}

function readBundleJson(root) {
  const files = {};
  const hashes = {};
  const exists = {};
  for (const filename of JSON_FILES) {
    const file = path.join(root, filename);
    exists[filename] = pathExists(file);
    files[filename] = exists[filename] ? readJson(file, null) : null;
    hashes[filename] = hashJson(files[filename]);
  }
  const designMd = path.join(root, "DESIGN.md");
  exists["DESIGN.md"] = pathExists(designMd);
  hashes["DESIGN.md"] = exists["DESIGN.md"] ? hashText(readText(designMd)) : null;
  return { files, hashes, exists };
}

function loadExtractSummary(slug) {
  const root = path.join(EXTRACTS_ROOT, slug);
  const tokens = readJson(path.join(root, "tokens.json"), {});
  const tokenExtended = readJson(path.join(root, "tokens-extended.json"), {});
  const renderContract = readJson(path.join(root, "render-contract.json"), {});
  const fontFaces = readJson(path.join(root, "inputs/font-faces.json"), []);
  const themeDefault = readJson(path.join(root, "inputs/theme-default.json"), {});
  const logo = readJson(path.join(root, "inputs/logo.json"), {});
  const favicon = readJson(path.join(root, "inputs/favicon.json"), {});
  const heroBlock = readJson(path.join(root, "inputs/hero-block.json"), {});
  const metaAssets = readJson(path.join(root, "inputs/meta-assets.json"), {});
  const corpus = [
    stableStringify(tokens),
    stableStringify(tokenExtended),
    stableStringify(renderContract),
    stableStringify(fontFaces),
    stableStringify(themeDefault),
    stableStringify(logo),
    stableStringify(favicon),
    stableStringify(heroBlock),
    stableStringify(metaAssets),
    readText(path.join(root, "DESIGN.md")),
  ].join("\n");

  return {
    root,
    exists: pathExists(root),
    hashes: {
      tokens: hashJson(tokens),
      tokenExtended: hashJson(tokenExtended),
      renderContract: hashJson(renderContract),
      fontFaces: hashJson(fontFaces),
      themeDefault: hashJson(themeDefault),
      logo: hashJson(logo),
      favicon: hashJson(favicon),
      heroBlock: hashJson(heroBlock),
      metaAssets: hashJson(metaAssets),
    },
    tokens,
    tokenExtended,
    renderContract,
    fontFaces,
    themeDefault,
    logo,
    favicon,
    heroBlock,
    metaAssets,
    corpus,
  };
}

function compareSrcPublic(srcBundle, publicBundle, findings) {
  for (const filename of JSON_FILES) {
    const srcExists = srcBundle.exists[filename];
    const publicExists = publicBundle.exists[filename];
    if (!srcExists) {
      addFinding(findings, "high", "source", "MISSING_SRC_FILE", `Missing src ${filename}`, { filename });
      continue;
    }
    if (!publicExists) {
      addFinding(findings, "high", "runtime-cache", "MISSING_PUBLIC_FILE", `Missing public ${filename}`, { filename });
      continue;
    }
    if (srcBundle.hashes[filename] !== publicBundle.hashes[filename]) {
      addFinding(findings, "high", "runtime-cache", "SRC_PUBLIC_HASH_MISMATCH", `src and public ${filename} differ by canonical hash`, {
        filename,
        srcHash: srcBundle.hashes[filename],
        publicHash: publicBundle.hashes[filename],
      });
    }
  }
}

function auditContamination(slug, srcBundle, publicBundle, extract, findings) {
  const srcText = JSON_FILES.map((filename) => stableStringify(srcBundle.files[filename])).join("\n");
  const publicText = JSON_FILES.map((filename) => stableStringify(publicBundle.files[filename])).join("\n");
  const preview = srcBundle.files["preview.json"] || {};
  const modeTokens = [];
  for (const [mode, values] of Object.entries(preview.modes || {})) {
    for (const [name, value] of Object.entries(values || {})) {
      const hex = normalizeHex(value);
      if (hex && CONTAMINATION.includes(hex)) {
        modeTokens.push({ mode, name, value: hex });
      }
    }
  }

  for (const color of CONTAMINATION) {
    const inSrc = textContainsColor(srcText, color);
    const inPublic = textContainsColor(publicText, color);
    if (!inSrc && !inPublic) continue;
    const inExtract = textContainsColor(extract.corpus, color);
    const severity = inExtract ? "medium" : "high";
    const matchingTokens = modeTokens.filter((token) => token.value === color);
    addFinding(
      findings,
      severity,
      "tokens",
      "KNOWN_RED_PRESENT",
      `${color} appears in materialized data${inExtract ? " and extract evidence" : " without extract evidence"}`,
      { color, inSrc, inPublic, inExtract, modeTokens: matchingTokens },
    );
  }

  if (slug !== "netflix" && modeTokens.some((token) => token.name === "--accent")) {
    addFinding(findings, "high", "tokens", "ACCENT_KNOWN_RED", "Runtime --accent uses a known contamination red outside Netflix", {
      tokens: modeTokens.filter((token) => token.name === "--accent"),
    });
  }
}

function auditTokenMapping(srcBundle, extract, findings) {
  const preview = srcBundle.files["preview.json"] || {};
  const extractColors = extract.tokens.colors || {};
  const extractPrimary = normalizeHex(extractColors.primary);
  const extractAccent = normalizeHex(extractColors.accent);
  const extractSecondary = normalizeHex(extractColors.secondary);

  for (const [mode, values] of Object.entries(preview.modes || {})) {
    const runtimePrimary = normalizeHex(values?.["--primary"]);
    const runtimeAccent = normalizeHex(values?.["--accent"]);
    const runtimeSecondary = normalizeHex(values?.["--secondary"]);

    if (extractPrimary && extractAccent && extractPrimary !== extractAccent) {
      if (runtimePrimary === extractAccent && runtimeAccent === extractPrimary) {
        addFinding(findings, "high", "tokens", "PRIMARY_ACCENT_SWAP", `${mode} mode appears to swap primary and accent`, {
          mode,
          extractPrimary,
          extractAccent,
          runtimePrimary,
          runtimeAccent,
        });
      }
    }

    if (extractSecondary && runtimeSecondary && runtimeSecondary !== extractSecondary && SHADCN_SECONDARY_DEFAULTS.has(runtimeSecondary)) {
      addFinding(findings, "medium", "tokens", "SECONDARY_SHADCN_DEFAULT", `${mode} --secondary is a shadcn-like default while extract has secondary`, {
        mode,
        extractSecondary,
        runtimeSecondary,
      });
    }

    if (runtimePrimary && runtimeAccent && runtimePrimary === runtimeAccent && extractAccent && extractPrimary !== extractAccent) {
      addFinding(findings, "high", "tokens", "PRIMARY_ACCENT_COLLAPSED", `${mode} --primary and --accent collapsed despite distinct extract colors`, {
        mode,
        extractPrimary,
        extractAccent,
        runtimePrimary,
        runtimeAccent,
      });
    }
  }
}

function auditThemeDefault(srcBundle, extract, findings) {
  const preview = srcBundle.files["preview.json"] || {};
  const runtimeDefault = normalizeMode(preview.defaultMode || "light");
  const renderDefault = normalizeMode(extract.renderContract?.theme?.default_mode || extract.renderContract?.theme?.default);
  const detectorDefault = normalizeMode(extract.themeDefault?.default);
  const detectorConfidence = String(extract.themeDefault?.confidence || "").toLowerCase();
  const detectorSource = extract.themeDefault?.source || null;

  if (renderDefault && runtimeDefault && renderDefault !== runtimeDefault) {
    addFinding(findings, "high", "tokens", "THEME_DEFAULT_MISMATCH", "preview.defaultMode differs from render-contract theme default", {
      runtimeDefault,
      renderDefault,
      detectorDefault,
      detectorConfidence: detectorConfidence || null,
      detectorSource,
    });
    return;
  }

  if (
    detectorDefault &&
    runtimeDefault &&
    detectorDefault !== runtimeDefault &&
    ["high", "medium"].includes(detectorConfidence)
  ) {
    addFinding(findings, "medium", "tokens", "THEME_DETECTOR_MISMATCH", "preview.defaultMode differs from theme-default detector", {
      runtimeDefault,
      renderDefault,
      detectorDefault,
      detectorConfidence,
      detectorSource,
    });
  }
}

function normalizeMode(value) {
  const mode = String(value || "").toLowerCase();
  return mode === "light" || mode === "dark" ? mode : null;
}

function auditSourceProfile(srcBundle, preTierBPreview, findings) {
  const preview = srcBundle.files["preview.json"] || {};
  const showcase = preview.showcase || {};
  const sourceProfile = showcase.sourceProfile || null;
  const preSourceProfile = preTierBPreview?.showcase?.sourceProfile || null;

  if (preSourceProfile && !sourceProfile) {
    addFinding(findings, "high", "showcase", "SOURCE_PROFILE_REMOVED", "Historical baseline had showcase.sourceProfile but current source does not", {
      historicalType: preSourceProfile.type || null,
    });
  }

  if (sourceProfile?.type && !sourceProfile.colors) {
    addFinding(findings, "high", "sourceProfile", "SOURCE_PROFILE_COLORS_MISSING", "sourceProfile.type exists without sourceProfile.colors", {
      type: sourceProfile.type,
    });
  }

  const nav = Array.isArray(showcase.nav) ? showcase.nav : [];
  if (nav.length && GENERIC_NAVS.some((generic) => arraysEqual(nav, generic))) {
    addFinding(findings, "medium", "showcase", "GENERIC_NAV", "showcase.nav is a generic fallback", { nav });
  }

  const lead = String(showcase.lead || "");
  if (!lead.trim()) {
    addFinding(findings, "medium", "showcase", "EMPTY_LEAD", "showcase.lead is empty", {});
  } else if (GENERIC_COPY_RE.test(lead)) {
    addFinding(findings, "medium", "showcase", "GENERIC_LEAD", "showcase.lead looks generic", { lead: truncate(lead, 180) });
  }

  const ctas = [showcase.ctaPrimary, showcase.ctaSecondary, showcase.ctaTertiary].filter(Boolean);
  for (const cta of ctas) {
    if (GENERIC_COPY_RE.test(String(cta))) {
      addFinding(findings, "low", "showcase", "GENERIC_CTA", "showcase CTA looks generic", { cta });
    }
  }
}

function auditFonts(srcBundle, findings) {
  const fonts = srcBundle.files["fonts.json"];
  if (!Array.isArray(fonts) || fonts.length === 0) {
    addFinding(findings, "medium", "fonts", "NO_FONTS", "fonts.json is empty or not an array", {});
    return;
  }

  for (const font of fonts) {
    const url = font?.url;
    if (!url) {
      addFinding(findings, "medium", "fonts", "FONT_URL_MISSING", "Font entry has no url", { family: font?.family || null });
      continue;
    }
    if (isHttpUrl(url)) continue;
    if (isRootRelative(url)) {
      const file = publicPathFromUrl(url);
      if (!file || !pathExists(file)) {
        addFinding(findings, "high", "fonts", "LOCAL_FONT_FILE_MISSING", "Root-relative font URL points to a missing public file", {
          family: font?.family || null,
          url,
          expectedFile: file ? path.relative(REPO_ROOT, file) : null,
        });
      }
      continue;
    }
    addFinding(findings, "high", "fonts", "FONT_URL_RELATIVE", "Font URL is relative and not resolvable from public cache", {
      family: font?.family || null,
      url,
    });
  }
}

function auditAssets(srcBundle, findings) {
  const assets = srcBundle.files["assets.json"] || {};
  const logoUrls = [
    "logoUrl",
    "logoLightUrl",
    "logoDarkUrl",
    "logoColorUrl",
    "logoBlackUrl",
    "logoWhiteUrl",
    "logoNegativeUrl",
  ]
    .map((key) => [key, assets[key]])
    .filter(([, value]) => value);

  if (!assets.logoUrl) {
    addFinding(findings, "high", "assets", "LOGO_URL_MISSING", "assets.logoUrl is missing", {});
  }

  if (assets.logoSourceKind === "favicon-as-logo") {
    addFinding(findings, "high", "assets", "FAVICON_AS_LOGO", "Logo source kind is favicon-as-logo", {
      logoUrl: assets.logoUrl || null,
      faviconUrl: assets.faviconUrl || null,
    });
  }

  if (/generated-wordmark/i.test(String(assets.logoSourceKind || "")) || /\/generated-wordmarks\//.test(String(assets.logoUrl || ""))) {
    addFinding(findings, "medium", "assets", "GENERATED_WORDMARK", "Logo is a generated wordmark rather than canonical brand asset", {
      logoSourceKind: assets.logoSourceKind || null,
      logoUrl: assets.logoUrl || null,
    });
  }

  for (const [key, url] of logoUrls) {
    if (isDataUrl(url)) {
      const svg = decodeSvgDataUrl(url);
      if (svg != null) {
        const issues = svgCompatibilityIssues(svg);
        if (issues.length) {
          addFinding(findings, "medium", "assets", "SVG_IMG_COMPATIBILITY_RISK", `${key} data SVG has <img> compatibility risk`, {
            key,
            issues,
          });
        }
      }
      continue;
    }
    if (isHttpUrl(url)) continue;
    if (!isRootRelative(url)) {
      addFinding(findings, "high", "assets", "LOGO_URL_RELATIVE", `${key} is relative and not root/public resolvable`, { key, url });
      continue;
    }

    const file = publicPathFromUrl(url);
    if (!file || !pathExists(file)) {
      addFinding(findings, "high", "assets", "LOGO_FILE_MISSING", `${key} points to a missing public file`, {
        key,
        url,
        expectedFile: file ? path.relative(REPO_ROOT, file) : null,
      });
      continue;
    }

    if (/\.svg$/i.test(file)) {
      const svg = readText(file);
      const issues = svgCompatibilityIssues(svg);
      if (issues.length) {
        addFinding(findings, "medium", "assets", "SVG_IMG_COMPATIBILITY_RISK", `${key} SVG has <img> compatibility risk`, {
          key,
          url,
          issues,
        });
      }
    }
  }
}

function svgCompatibilityIssues(svg) {
  const issues = [];
  if (/\bcurrentColor\b/i.test(svg)) issues.push("currentColor");
  if (/\b(?:width|height)=["']100%["']/i.test(svg)) issues.push("percent-dimensions");
  if (!/\bviewBox=/i.test(svg)) issues.push("missing-viewBox");
  return issues;
}

function auditRuntimeContract(srcBundle, findings) {
  const preview = srcBundle.files["preview.json"] || {};
  const modes = preview.modes || {};
  const defaultMode = preview.defaultMode || "light";
  if (!modes[defaultMode]) {
    addFinding(findings, "high", "runtime", "DEFAULT_MODE_MISSING", "preview.defaultMode has no matching modes entry", {
      defaultMode,
      availableModes: Object.keys(modes),
    });
  }

  for (const [mode, values] of Object.entries(modes)) {
    const height = values?.["--btn-height"] || values?.["--preview-button-height"];
    const parsed = parseCssLengthPx(height);
    if (parsed != null && parsed < 32) {
      addFinding(findings, "medium", "runtime", "BUTTON_HEIGHT_TOO_LOW", `${mode} button height resolves below 32px`, {
        mode,
        token: height,
        resolvedPx: parsed,
      });
    }
  }
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function parseCssLengthPx(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const px = trimmed.match(/^([0-9.]+)px$/i);
  if (px) return Number(px[1]);
  const rem = trimmed.match(/^([0-9.]+)rem$/i);
  if (rem) return Number(rem[1]) * 16;
  return null;
}

function truncate(value, max) {
  const str = String(value || "");
  return str.length > max ? `${str.slice(0, max - 1)}...` : str;
}

function summarizeSource(srcBundle, extract) {
  const preview = srcBundle.files["preview.json"] || {};
  const assets = srcBundle.files["assets.json"] || {};
  const fonts = srcBundle.files["fonts.json"] || [];
  const sourceProfile = preview.showcase?.sourceProfile || null;
  return {
    name: preview.name || null,
    defaultMode: preview.defaultMode || null,
    modes: Object.keys(preview.modes || {}),
    primary: preview.modes?.dark?.["--primary"] || preview.modes?.light?.["--primary"] || null,
    accent: preview.modes?.dark?.["--accent"] || preview.modes?.light?.["--accent"] || null,
    sourceProfileType: sourceProfile?.type || null,
    sourceProfileHasColors: Boolean(sourceProfile?.colors),
    logoSourceKind: assets.logoSourceKind || null,
    logoUrl: assets.logoUrl || null,
    fontCount: Array.isArray(fonts) ? fonts.length : 0,
    extractExists: extract.exists,
  };
}

function auditBrand(slug, indexEntry, args) {
  const companySlug = indexEntry?.companySlug || slug;
  const srcRoot = path.join(DESIGNS_SRC_ROOT, slug);
  const publicRoot = path.join(PUBLIC_COMPANIES_ROOT, companySlug, "designs", slug);
  const preTierBRoot = path.join(args.preTierBRoot, slug);
  const srcBundle = readBundleJson(srcRoot);
  const publicBundle = readBundleJson(publicRoot);
  const preTierBPreview = readJson(path.join(preTierBRoot, "preview.json"), null);
  const extract = loadExtractSummary(slug);
  const findings = [];

  if (!pathExists(srcRoot)) {
    addFinding(findings, "high", "source", "MISSING_SRC_DIR", "Materialized gallery source dir is missing", {
      srcRoot: path.relative(REPO_ROOT, srcRoot),
    });
  }
  if (!pathExists(publicRoot)) {
    addFinding(findings, "high", "runtime-cache", "MISSING_PUBLIC_DIR", "Public runtime cache dir is missing", {
      publicRoot: path.relative(REPO_ROOT, publicRoot),
    });
  }
  if (!extract.exists) {
    addFinding(findings, "medium", "extract", "MISSING_EXTRACT_DIR", "Extract canonical dir is missing", {
      extractRoot: path.relative(REPO_ROOT, extract.root),
    });
  }

  compareSrcPublic(srcBundle, publicBundle, findings);
  auditContamination(slug, srcBundle, publicBundle, extract, findings);
  auditTokenMapping(srcBundle, extract, findings);
  auditThemeDefault(srcBundle, extract, findings);
  auditSourceProfile(srcBundle, preTierBPreview, findings);
  auditFonts(srcBundle, findings);
  auditAssets(srcBundle, findings);
  auditRuntimeContract(srcBundle, findings);

  return {
    slug,
    companySlug,
    status: worstSeverity(findings),
    counts: findingCounts(findings),
    paths: {
      extract: path.relative(REPO_ROOT, extract.root),
      src: path.relative(REPO_ROOT, srcRoot),
      public: path.relative(REPO_ROOT, publicRoot),
      preTierB: path.relative(REPO_ROOT, preTierBRoot),
    },
    hashes: {
      src: srcBundle.hashes,
      public: publicBundle.hashes,
      extract: extract.hashes,
    },
    summary: summarizeSource(srcBundle, extract),
    findings: findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code)),
  };
}

function buildSummary(items) {
  const allFindings = items.flatMap((item) => item.findings.map((finding) => ({ ...finding, slug: item.slug })));
  return {
    brandCount: items.length,
    findingCount: allFindings.length,
    severityCounts: findingCounts(allFindings),
    byCode: byCount(allFindings, (finding) => finding.code),
    byLayer: byCount(allFindings, (finding) => finding.layer),
    highRiskBrands: items.filter((item) => item.counts.high > 0).map((item) => item.slug),
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Design Gallery Drift Baseline Audit");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Brands: ${report.summary.brandCount}`);
  lines.push(`Findings: ${report.summary.findingCount}`);
  lines.push("");
  lines.push("## Severity Summary");
  lines.push("");
  lines.push("| Severity | Count |");
  lines.push("|----------|-------|");
  for (const severity of ["high", "medium", "low", "info"]) {
    lines.push(`| ${severity} | ${report.summary.severityCounts[severity] || 0} |`);
  }
  lines.push("");
  lines.push("## Brands");
  lines.push("");
  lines.push("| Brand | Status | High | Medium | Low | Top findings |");
  lines.push("|-------|--------|------|--------|-----|--------------|");
  for (const item of report.items) {
    const top = item.findings.slice(0, 4).map((finding) => `${finding.code} (${finding.layer})`).join("<br>");
    lines.push(`| ${item.slug} | ${item.status} | ${item.counts.high} | ${item.counts.medium} | ${item.counts.low} | ${top || "None"} |`);
  }
  lines.push("");
  lines.push("## Finding Codes");
  lines.push("");
  lines.push("| Code | Count |");
  lines.push("|------|-------|");
  for (const [code, count] of Object.entries(report.summary.byCode)) {
    lines.push(`| ${code} | ${count} |`);
  }
  lines.push("");
  lines.push("## High Severity Details");
  lines.push("");
  for (const item of report.items) {
    const high = item.findings.filter((finding) => finding.severity === "high");
    if (!high.length) continue;
    lines.push(`### ${item.slug}`);
    lines.push("");
    for (const finding of high) {
      lines.push(`- **${finding.code}** (${finding.layer}): ${finding.message}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const { entries, bySlug } = loadBrandIndex();
  const brands = args.all ? entries.map((entry) => entry.id) : args.brands || DEFAULT_BRANDS;
  const uniqueBrands = [...new Set(brands)].filter(Boolean);
  if (!uniqueBrands.length) throw new Error("No brands selected");

  const items = uniqueBrands.map((slug) => auditBrand(slug, bySlug.get(slug), args));
  const report = {
    schemaVersion: "design-gallery-drift-audit/v1",
    generatedAt: new Date().toISOString(),
    command: `node ${SCRIPT_PATH} ${process.argv.slice(2).join(" ")}`.trim(),
    repoRoot: REPO_ROOT,
    scope: {
      extractRoot: path.relative(REPO_ROOT, EXTRACTS_ROOT),
      srcRoot: path.relative(REPO_ROOT, DESIGNS_SRC_ROOT),
      publicRoot: path.relative(REPO_ROOT, PUBLIC_COMPANIES_ROOT),
      preTierBRoot: path.relative(REPO_ROOT, args.preTierBRoot),
    },
    summary: null,
    items,
  };
  report.summary = buildSummary(items);

  const jsonPath = args.json || path.join(args.outDir, "gallery-drift-baseline.json");
  const mdPath = args.md || path.join(args.outDir, "gallery-drift-baseline.md");
  ensureDir(path.dirname(jsonPath));
  ensureDir(path.dirname(mdPath));
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));

  console.log(`[audit-gallery-drift] brands=${report.summary.brandCount} findings=${report.summary.findingCount} high=${report.summary.severityCounts.high}`);
  console.log(`[audit-gallery-drift] json=${path.relative(REPO_ROOT, jsonPath)}`);
  console.log(`[audit-gallery-drift] md=${path.relative(REPO_ROOT, mdPath)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[audit-gallery-drift] ${error.message}`);
    process.exitCode = 1;
  }
}
