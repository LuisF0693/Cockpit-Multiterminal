#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const REPO_ROOT = path.resolve(__dirname, "../../..");
const DEFAULT_EXTRACTS_ROOT = path.join(REPO_ROOT, "outputs/design-ops/url-extracts");
const DEFAULT_GALLERY_ROOT = path.join(REPO_ROOT, "apps/design/src/data/designs");
const BRAND_ASSET_OVERRIDES_PATH = path.join(REPO_ROOT, "squads/design-ops/data/brand-asset-overrides.json");

const ARCHETYPE_META = {
  "cinematic-streaming": {
    label: "Cinematic Streaming · Red-on-Black Conversion",
    category: "Streaming & Entertainment",
    heroVariant: "cinematic-streaming",
    tags: ["cinematic", "streaming", "dark", "conversion", "red-on-black"],
    components: [
      "Conversion hero",
      "Email capture field",
      "Red primary CTA",
      "Language selector",
      "Plan comparison cards",
      "FAQ accordion",
      "Billboard carousel",
      "Dark gradient hero",
    ],
    foundations: [
      "Black is the native canvas, not a dark-mode variant.",
      "Red owns conversion, focus and brand emphasis.",
      "White typography carries the hierarchy; muted gray is only secondary.",
      "Controls are compact rectangles with small radius, not rounded SaaS pills.",
      "Hero composition uses cinematic gradient depth and centered conversion copy.",
    ],
  },
  "polaris-friendly": {
    label: "Commerce Application · Friendly Operational",
    category: "Commerce & Retail",
    heroVariant: "application-ui",
    tags: ["commerce", "application", "friendly"],
  },
  "carbon-enterprise": {
    label: "Enterprise Application · Rational Grid",
    category: "Enterprise Software",
    heroVariant: "application-ui",
    tags: ["enterprise", "application", "grid"],
  },
  "material-elevation": {
    label: "Material Application · Elevation System",
    category: "Productivity & Tools",
    heroVariant: "application-ui",
    tags: ["material", "application", "elevation"],
  },
  "apple-glass": {
    label: "Consumer Product · Glass Surface",
    category: "Consumer Product",
    heroVariant: "consumer-product",
    tags: ["consumer", "glass", "premium"],
  },
  "marketing-gradient": {
    label: "Marketing Site · Gradient Campaign",
    category: "Marketing & Growth",
    heroVariant: "marketing-gradient",
    tags: ["marketing", "gradient", "campaign"],
  },
  "brutalist-mono": {
    label: "Technical System · Monospace Brutalist",
    category: "Developer Tools",
    heroVariant: "technical",
    tags: ["technical", "mono", "brutalist"],
  },
};

const FALLBACK_COMPONENTS = [
  "Primary CTA",
  "Secondary CTA",
  "Navigation header",
  "Content card",
  "Form field",
  "Badge",
  "State matrix",
  "Responsive showcase",
];

function usage() {
  console.log(`Usage:
  node squads/design-ops/scripts/materialize-design-gallery-bundle.cjs --slug <slug> [--from <extract-dir>] [--out <design-dir>] [--force] [--dry-run]
  node squads/design-ops/scripts/materialize-design-gallery-bundle.cjs --all [--force] [--dry-run]

Modes:
  --slug <name>   Materialize one bundle from outputs/design-ops/url-extracts/<slug>/
  --all           Iterate every promoted extract (every <slug>/ that has a top-level DESIGN.md)
                  and materialize each bundle. Skips slugs without DESIGN.md.

Examples:
  node squads/design-ops/scripts/materialize-design-gallery-bundle.cjs --slug netflix
  node squads/design-ops/scripts/materialize-design-gallery-bundle.cjs --slug cloudflare --force
  node squads/design-ops/scripts/materialize-design-gallery-bundle.cjs --all --force        # backfill everything
  node squads/design-ops/scripts/materialize-design-gallery-bundle.cjs --all --dry-run      # preview only`);
}

function parseArgs(argv) {
  const args = {
    force: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--slug") {
      args.slug = argv[++index];
    } else if (arg.startsWith("--slug=")) {
      args.slug = arg.slice("--slug=".length);
    } else if (arg === "--from") {
      args.from = argv[++index];
    } else if (arg.startsWith("--from=")) {
      args.from = arg.slice("--from=".length);
    } else if (arg === "--out") {
      args.out = argv[++index];
    } else if (arg.startsWith("--out=")) {
      args.out = arg.slice("--out=".length);
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--all") {
      args.all = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.slug) {
    args.slug = slugify(args.slug);
  }

  return args;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.[a-z]{2,}(\/.*)?$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readFileSafe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function readJsonSafe(file, fallback = null) {
  const raw = readFileSafe(file);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readYamlSafe(file, fallback = null) {
  const raw = readFileSafe(file);
  if (!raw) return fallback;
  try {
    return yaml.load(raw);
  } catch {
    return fallback;
  }
}

function writeJson(file, data, dryRun) {
  if (dryRun) return;
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function copyFile(from, to, dryRun) {
  if (dryRun) return;
  fs.copyFileSync(from, to);
}

function titleCaseFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanName(value, slug) {
  const raw = String(value || "").trim();
  if (!raw) return titleCaseFromSlug(slug);
  const separators = [" - ", " | ", " — ", " – ", ":", "·"];
  let result = raw;
  for (const separator of separators) {
    if (result.includes(separator)) {
      result = result.split(separator)[0].trim();
    }
  }
  if (result.length > 28 && raw.toLowerCase().includes(slug)) {
    return titleCaseFromSlug(slug);
  }
  return result || titleCaseFromSlug(slug);
}

function domainFromUrl(url, slug) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return slug ? `${slug}.com` : null;
  }
}

function normalizeSourceUrl(value, sourceUrl) {
  if (!value || typeof value !== "string") return null;
  try {
    return new URL(value.trim(), sourceUrl || "https://example.com/").toString();
  } catch {
    return null;
  }
}

function cleanSourceText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&atilde;/gi, "ã")
    .replace(/&aacute;/gi, "á")
    .replace(/&eacute;/gi, "é")
    .replace(/&iacute;/gi, "í")
    .replace(/&oacute;/gi, "ó")
    .replace(/&uacute;/gi, "ú")
    .replace(/&ecirc;/gi, "ê")
    .replace(/&ocirc;/gi, "ô")
    .replace(/&agrave;/gi, "à")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMarkdownHeading(pageMd, { level = 2, preferred = [] } = {}) {
  const lines = String(pageMd || "").split(/\r?\n/);
  const prefix = `${"#".repeat(level)} `;
  const candidates = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].startsWith(prefix)) continue;
    const parts = [lines[index].slice(prefix.length)];
    for (let next = index + 1; next < lines.length; next += 1) {
      const line = lines[next];
      if (!line.trim()) break;
      if (/^#{1,6}\s/.test(line) || /^\s*[[*!-]/.test(line)) break;
      parts.push(line);
    }
    const text = cleanSourceText(parts.join(" "));
    if (text) candidates.push(text);
  }

  const matched = candidates.find((candidate) => preferred.some((pattern) => pattern.test(candidate)));
  return matched || candidates[0] || null;
}

function extractMarkdownImage(pageMd, sourceUrl, preferred = []) {
  const matches = [...String(pageMd || "").matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  const candidates = [];
  for (const match of matches) {
    const alt = cleanSourceText(match[1]);
    const url = normalizeSourceUrl(match[2], sourceUrl);
    if (!url) continue;
    const score = scoreHeroImageCandidate({ alt, url }, preferred);
    candidates.push({ alt, url, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return best && best.score > 0 ? { alt: best.alt, url: best.url, score: best.score } : null;
}

function extractHeroImageFromHtml(pageHtml, sourceUrl) {
  const matches = [...String(pageHtml || "").matchAll(/<input[^>]+id=["']desktop["'][^>]+value=["']([^"']+)["'][^>]*>/gi)];
  const candidates = matches
    .map((match) => {
      const url = normalizeSourceUrl(match[1], sourceUrl);
      return url ? { alt: "", url, score: scoreHeroImageCandidate({ alt: "", url }, [/hero|banner|superbanner|campaign|desktop/i]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.score > 0 ? candidates[0].url : null;
}

function scoreHeroImageCandidate(candidate, preferred = []) {
  const value = `${candidate.alt || ""} ${candidate.url || ""}`.toLowerCase();
  let score = 0;
  if (preferred.some((pattern) => pattern.test(value))) score += 35;
  if (/hero|banner|superbanner|campaign|campanha|carousel|desktop|desk|home/i.test(value)) score += 35;
  if (/deal|sale|promo|oferta|cupom|frete|cashback|produto|product|category|categoria/i.test(value)) score += 18;
  if (/\.(webp|jpe?g|png)(?:[?#]|$)/i.test(value)) score += 8;
  if (/(^|[^a-z])(logo|favicon|avatar|icon|sprite|brandmark|wordmark|apple-touch|lu-logo|nficon)([^a-z]|$)/i.test(value)) score -= 80;
  if (/1x1|pixel|placeholder|transparent|loader|spinner/i.test(value)) score -= 60;
  if (/base64|data:image/i.test(value)) score -= 20;
  return score;
}

function extractProductCards(pageMd, max = 6) {
  const cards = [...String(pageMd || "").matchAll(/\[###\s*([^\]]+)\]\([^)]+\)/g)]
    .map((match) => cleanSourceText(match[1]))
    .filter((title) => title && !/^teste$/i.test(title));
  return compactArray(cards).slice(0, max).map((title) => ({
    title,
    badge: /empr[eé]stimo|cr[eé]dito/i.test(title) ? "Crédito ideal" : null,
  }));
}

function buildSourceProfile({ slug, name, domain, sourceUrl, pageMd, pageHtml, heroBlock, metaAssets }) {
  // Identity blob: slug + domain + brand name + ogTitle. NEVER includes pageMd —
  // pageMd often mentions partners/competitors (e.g. Anthropic page mentions
  // "Amazon Bedrock") which would false-match brand classifiers.
  const identityBlob = `${slug} ${domain} ${name} ${metaAssets.ogTitle || ""}`.toLowerCase();
  const sourceBlob = `${slug} ${domain} ${name} ${metaAssets.ogTitle || ""} ${metaAssets.ogDescription || ""} ${pageMd || ""}`.toLowerCase();
  // Identity-only matchers — strong signal. Tighter regex prevents partial matches
  // (e.g. "amazon" must be ^amazon$ or amazon.com, not "amazon bedrock").
  const isKnownEcommerce = /(\bmercado\s*livre\b|\bmercadolivre\b|^amazon$|\bamazon\.com\b|\bmagalu\b|\bmagazine\s*luiza\b|\bmagazineluiza\b|\bamericanas\b|\bamericanas\.com\b)/i.test(identityBlob);
  const isKnownBanking = /(\bsantander\b|\bbanco\b|\bbank\b)/i.test(identityBlob);

  if (isKnownEcommerce) {
    const isAmazon = /amazon/i.test(sourceBlob);
    const isMercadoLivre = /mercado\s*livre|mercadolivre/i.test(sourceBlob);
    const isMagalu = /magalu|magazine\s*luiza|magazineluiza/i.test(sourceBlob);
    const isAmericanas = /americanas|americanas\.com/i.test(sourceBlob);
    const image = extractMarkdownImage(
      pageMd,
      sourceUrl,
      isMercadoLivre
        ? [/meli|frete|cashback|mercado/]
        : isMagalu
          ? [/oferta|banner|produto|superbanner|campanha|desktop/]
          : isAmericanas
            ? [/americanas|oferta|produto|frete|cestinha/]
          : [/hero|deal|sale|amazon/],
    );
    return {
      type: "ecommerce-marketplace",
      confidence: isAmazon || isMercadoLivre || isMagalu || isAmericanas ? "high" : "medium",
      variant: isAmazon ? "amazon" : isMercadoLivre ? "mercadolivre" : isMagalu ? "magalu" : isAmericanas ? "americanas" : "generic",
      searchPlaceholder: isAmazon ? "Search Amazon" : isMagalu ? "O que você procura?" : isAmericanas ? "busque aqui seu produto" : "Digite o que você quer encontrar",
      deliveryLabel: isAmazon ? "Delivering to Nashville 37217" : isMagalu || isAmericanas ? "Ofertas para sua região" : "Enviar para São Paulo 01011000",
      navMain: isAmazon
        ? ["All", "Today's Deals", "Customer Service", "Registry", "Gift Cards", "Sell"]
        : isMagalu
          ? ["Todos os departamentos", "Ofertas", "Cupons", "Serviços", "Marketplace", "Cartão Magalu"]
          : isAmericanas
            ? ["departamentos", "mercado", "cupons", "ofertas", "cashback", "serviços"]
          : ["Categorias", "Ofertas", "Histórico", "Supermercado", "Moda", "Vender", "Ajuda"],
      hero: {
        headline: isAmazon ? "Spend less. Smile more." : isMagalu ? "Pra você é Magalu!" : isAmericanas ? "Tudo que você ama" : extractMarkdownHeading(pageMd, { level: 1 }) || name,
        lead: isAmazon ? "Deals, delivery, cart and account flows in one dense marketplace shell." : metaAssets.ogDescription || "Frete grátis rápido em produtos selecionados.",
        cta: isAmazon ? "Shop deals" : isMagalu ? "Ver ofertas" : "Ver ofertas",
        imageUrl: image?.url || null,
        imageAlt: image?.alt || "Marketplace campaign",
      },
      productSection: {
        title: isAmazon ? "Shop by department" : "Categorias em destaque",
        cards: (isAmazon
          ? ["Electronics", "Home & Kitchen", "Books", "Fashion", "Toys", "Grocery"]
          : isMagalu
            ? ["Celulares", "Eletrodomésticos", "Móveis", "TV e Vídeo", "Informática", "Mercado"]
            : isAmericanas
              ? ["Smartphones", "Mercado", "Eletrodomésticos", "Casa", "Games", "Beleza"]
            : ["Veículos", "Supermercado", "Tecnologia", "Casa e Móveis", "Eletrodomésticos", "Esportes"]).map((title) => ({ title })),
      },
    };
  }

  if (isKnownBanking) {
    const heroImageUrl = extractHeroImageFromHtml(pageHtml, sourceUrl);
    return {
      type: "banking-home",
      confidence: "high",
      navTop: ["Para você", "Para sua empresa"],
      searchPlaceholder: "O que você procura?",
      loginSelect: "Pessoa Física",
      loginPlaceholder: "Insira seu CPF",
      navMain: ["Meu dia a dia", "Produtos e Serviços", "Open Finance", "Atendimento", "Segurança", "Agências", "Blog"],
      hero: {
        headline:
          extractMarkdownHeading(pageMd, { level: 2, preferred: [/imposto|prazo|declara/i] }) ||
          heroBlock.headline ||
          metaAssets.ogTitle ||
          name,
        lead: heroBlock.lead || metaAssets.ogDescription || null,
        cta: heroBlock.ctas?.[0]?.label || "ACESSE",
        imageUrl: heroImageUrl,
        imageAlt: "Campanha principal",
      },
      productSection: {
        title: extractMarkdownHeading(pageMd, { level: 2, preferred: [/olhadinha|temos|produtos|servi/i] }) || "Dá uma olhadinha em tudo que temos",
        cards: extractProductCards(pageMd, 6),
      },
    };
  }

  return null;
}

function compactArray(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function countObjectKeys(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).length : 0;
}

function maybeHex(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) return normalizeHex(raw);
  const rgb = raw.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (!rgb) return null;
  return `#${[rgb[1], rgb[2], rgb[3]]
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function normalizeHex(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("#")) return raw;
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase();
  }
  return raw.slice(0, 7).toUpperCase();
}

function isDarkColor(hex) {
  const normalized = maybeHex(hex);
  if (!normalized) return false;
  const number = Number.parseInt(normalized.slice(1), 16);
  const r = (number >> 16) & 255;
  const g = (number >> 8) & 255;
  const b = number & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

function collectStrings(value, out = []) {
  if (!value) return out;
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

function findNetflixRed(context, colors) {
  const text = collectStrings(context).join("\n");
  if (/rgb\(\s*229\s*,\s*9\s*,\s*20\s*\)/i.test(text) || /#e50914/i.test(text)) {
    return "#E50914";
  }
  return normalizeHex(colors.primary || colors.accent || colors.tertiary || colors.secondary || "#000000");
}

function mostCommonFontFamily(typography) {
  const counts = new Map();
  for (const token of Object.values(typography || {})) {
    const family = token && token.fontFamily;
    if (!family) continue;
    counts.set(family, (counts.get(family) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || "Inter";
}

function cssFontStack(family) {
  if (!family) return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  return `'${family}', Arial, system-ui, sans-serif`;
}

function bestFontFaces(fontFaces, primaryFamily) {
  const ranked = [...(fontFaces || [])]
    .map((entry) => {
      const url = (entry.src_urls || []).find((src) => /\.woff2($|\?)/i.test(src)) || (entry.src_urls || [])[0] || entry.url;
      const family = entry.family;
      const normalizedFamily = String(family || "").toLowerCase();
      const normalizedPrimary = String(primaryFamily || "").toLowerCase();
      const primaryBase = normalizedPrimary.replace(/\s+variable$/i, "");
      const exactPrimary = normalizedFamily === normalizedPrimary;
      const primaryHit = normalizedFamily && primaryBase && normalizedFamily.includes(primaryBase);
      return {
        family,
        weight: String(entry.weight || "400"),
        style: entry.style || "normal",
        display: entry.display || "swap",
        format: /\.woff2($|\?)/i.test(url || "") ? "woff2" : "woff",
        url,
        sourceCssUrl: entry.source_css_url,
        raw: entry.raw,
        rank: exactPrimary ? 0 : primaryHit ? 1 : family && /sans/i.test(family) ? 2 : 3,
      };
    })
    .filter((entry) => entry.family && entry.url && !/debug/i.test(entry.family))
    .sort((a, b) => a.rank - b.rank || a.family.localeCompare(b.family) || String(a.weight).localeCompare(String(b.weight)));

  const seen = new Set();
  const result = [];
  for (const entry of ranked) {
    const key = `${entry.family}|${entry.weight}|${entry.style}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      family: entry.family,
      weight: entry.weight,
      style: entry.style,
      display: entry.display,
      format: entry.format,
      url: entry.url,
      sourceCssUrl: entry.sourceCssUrl,
    });
    if (result.length >= 10) break;
  }
  return result;
}

function componentNames(tokens, tokenExtended, componentProperties, archetype) {
  const fromTokens = Object.keys(tokens.components || {});
  const fromExtended = Object.keys(tokenExtended.components || {});
  const fromProperties = Object.keys(componentProperties.summary || {});
  const archetypeComponents = ARCHETYPE_META[archetype]?.components || [];
  return compactArray([...archetypeComponents, ...fromTokens, ...fromExtended, ...fromProperties, ...FALLBACK_COMPONENTS]).slice(0, 18);
}

function buildComponentsInventory(components, archetype) {
  const actionItems = components.filter((item) => /button|cta|action|link|capture/i.test(item));
  const formItems = components.filter((item) => /input|field|form|select|language|email/i.test(item));
  const surfaceItems = components.filter((item) => /card|hero|surface|gradient|modal|billboard|carousel|accordion/i.test(item));
  const navItems = components.filter((item) => /nav|header|menu|footer/i.test(item));
  const proofItems = components.filter((item) => /plan|faq|badge|state|matrix|responsive/i.test(item));

  return [
    { id: "actions", label: "Actions", items: actionItems },
    { id: "forms", label: "Forms", items: formItems },
    { id: "surfaces", label: "Surfaces", items: surfaceItems },
    { id: "navigation", label: "Navigation", items: navItems },
    { id: "systems", label: "Systems", items: proofItems },
  ]
    .map((group) => ({
      ...group,
      items: compactArray(group.items).slice(0, 6),
    }))
    .filter((group) => group.items.length > 0 || archetype === "cinematic-streaming");
}

function paletteFromModes(modes, nativeVars, brandRed) {
  const base = modes.dark || modes.light || {};
  const values = [
    ["primary", "--primary", "primary action, links and selected emphasis"],
    ["accent", "--accent", "accent surface and hover emphasis"],
    ["canvas", "--background", "root page canvas"],
    ["card", "--card", "card, modal and preview surface"],
    ["fg", "--foreground", "primary text"],
    ["fg-muted", "--muted-foreground", "secondary text"],
    ["border", "--border", "control outlines and dividers"],
    ["ring", "--ring", "keyboard focus ring"],
  ];

  const nativeButton = nativeVars["--wct--local-design--Button-Surface"];
  if (brandRed && nativeButton) {
    values.push(["native-cta", "--brand-native-button-surface", "upstream button surface extracted from native CSS vars"]);
  }

  return values
    .filter(([, cssVar]) => base[cssVar] || cssVar === "--brand-native-button-surface")
    .map(([name, cssVar, role]) => ({ name, cssVar, role }));
}

function nativeValue(nativeVars, key, fallback) {
  return firstValue(nativeVars?.[key], fallback);
}

function buildModes({ tokens, renderContract, tokenExtended, fontFamily, context }) {
  const colors = tokens.colors || {};
  const nativeVars = renderContract.native_vars?.light || tokenExtended.themed?.light || {};
  const brandRed = findNetflixRed(context, colors);
  const nativeButton = maybeHex(nativeValue(nativeVars, "--wct--local-design--Button-Surface", null)) || brandRed;
  const nativeButtonHover = maybeHex(nativeValue(nativeVars, "--wct--local-design--Button-SurfaceHovered", null)) || nativeButton;
  const nativeButtonPressed = maybeHex(nativeValue(nativeVars, "--wct--local-design--Button-SurfacePressed", null)) || nativeButtonHover;
  const brandAccent = normalizeHex(
    maybeHex(tokens.preview_tokens?.accent) ||
    maybeHex(colors.accent) ||
    maybeHex(colors.tertiary) ||
    nativeButton ||
    brandRed,
  );
  const nativeButtonRadius = nativeValue(nativeVars, "--wct--local-design--Button-BorderRadius", tokens.preview_tokens?.button_radius || "4px");
  const nativeButtonHeight = nativeValue(nativeVars, "--wct--local-design--Button-Height", "2.5rem");
  const nativeButtonFontSize = nativeValue(nativeVars, "--wct--local-design--Button-TextFontSize", tokens.typography?.button?.fontSize || "1rem");
  const nativeButtonFontWeight = nativeValue(nativeVars, "--wct--local-design--Button-TextFontWeight", tokens.typography?.button?.fontWeight || "600");
  const nativeInputSurface = nativeValue(nativeVars, "--wct--local-design--Input-Surface", tokens.components?.["input-text"]?.bg || "rgba(22,22,22,0.7)");
  const nativeInputBorder = nativeValue(nativeVars, "--wct--local-design--Input-Border", colors.border || "rgba(128,128,128,0.7)");
  const nativeInputRadius = nativeValue(nativeVars, "--wct--local-design--Input-BorderRadius", tokens.preview_tokens?.input_radius || "4px");
  const focusRing = nativeValue(nativeVars, "--wct--focus-ring--color", "#FFFFFF");
  const easing = tokenExtended.motion?.easing || tokens.motion?.easing || "cubic-bezier(0.32,0.94,0.6,1)";
  const duration = tokenExtended.motion?.duration_base || "250ms";
  const shadow = tokens.components?.card?.shadow || "0 0.25rem 0.5rem 0 rgba(0,0,0,0.8)";
  const stack = cssFontStack(fontFamily);
  const surface = normalizeHex(colors.surface || renderContract.theme?.surface || "#000000");
  const darkNative = isDarkColor(surface);

  const dark = {
    "--background": surface,
    "--foreground": normalizeHex(colors.text || "#FFFFFF"),
    "--card": normalizeHex(tokens.preview_tokens?.card_bg || renderContract.theme?.surface_alt || "#1A1A1A"),
    "--card-foreground": normalizeHex(colors.text || "#FFFFFF"),
    "--primary": brandRed,
    "--primary-foreground": "#FFFFFF",
    "--secondary": normalizeHex(colors.secondary || "#161D52"),
    "--secondary-foreground": "#FFFFFF",
    "--muted": "#161616",
    "--muted-foreground": normalizeHex(colors["text-muted"] || colors.neutral || "#A9A9A9"),
    "--accent": brandAccent,
    "--accent-foreground": "#FFFFFF",
    "--destructive": normalizeHex(colors.error || brandRed),
    "--destructive-foreground": "#FFFFFF",
    "--border": maybeHex(colors.border) || "rgba(128,128,128,0.7)",
    "--input": nativeInputBorder,
    "--ring": maybeHex(focusRing) || "#FFFFFF",
    "--surface": surface,
    "--surface-foreground": normalizeHex(colors.text || "#FFFFFF"),
    "--surface-container": "#161616",
    "--surface-container-low": "#0A0A0A",
    "--surface-container-high": "#1A1A1A",
    "--surface-container-highest": "#2A2A2A",
    "--surface-bright": "#2A2A2A",
    "--surface-dim": "#000000",
    "--font-display": stack,
    "--font-body": stack,
    "--font-ui": stack,
    "--font-sans": stack,
    "--font-mono": "'Roboto Mono', 'SFMono-Regular', ui-monospace, monospace",
    "--radius-card": tokens.preview_tokens?.card_radius || tokens.rounded?.md || "8px",
    "--radius-input": nativeInputRadius,
    "--radius-button": nativeButtonRadius,
    "--radius-full": tokens.rounded?.full || "9999px",
    "--btn-height": nativeButtonHeight,
    "--btn-padx": nativeValue(nativeVars, "--wct--local-design--Button-SpaceHorizontal", "1rem"),
    "--btn-pady": nativeValue(nativeVars, "--wct--local-design--Button-SpaceVertical", "0.25rem"),
    "--btn-shadow": "none",
    "--btn-shadow-hover": "none",
    "--card-shadow": shadow,
    "--input-height": "3.5rem",
    "--motion-standard": `${duration} ${easing}`,
    "--motion-fast": `${tokenExtended.motion?.duration_fast || "100ms"} ${easing}`,
    "--motion-slow": `${tokenExtended.motion?.duration_slow || "533ms"} ${easing}`,
    "--state-hover": "rgba(255,255,255,0.10)",
    "--state-focus": "rgba(255,255,255,0.16)",
    "--state-pressed": "rgba(255,255,255,0.22)",
    "--brand-native-button-surface": nativeButton,
    "--brand-native-button-hover": nativeButtonHover,
    "--brand-native-button-pressed": nativeButtonPressed,
    "--brand-native-input-surface": nativeInputSurface,
    "--brand-native-input-border": nativeInputBorder,
  };

  const light = {
    "--background": "#FFFFFF",
    "--foreground": "#141414",
    "--card": "#F5F5F5",
    "--card-foreground": "#141414",
    "--primary": brandRed,
    "--primary-foreground": "#FFFFFF",
    "--secondary": "#F3F3F3",
    "--secondary-foreground": "#141414",
    "--muted": "#F5F5F5",
    "--muted-foreground": "#5F5F5F",
    "--accent": brandAccent,
    "--accent-foreground": "#FFFFFF",
    "--destructive": normalizeHex(colors.error || brandRed),
    "--destructive-foreground": "#FFFFFF",
    "--border": "#B3B3B3",
    "--input": "#8C8C8C",
    "--ring": brandRed,
    "--surface": "#FFFFFF",
    "--surface-foreground": "#141414",
    "--surface-container": "#F3F3F3",
    "--surface-container-low": "#FFFFFF",
    "--surface-container-high": "#E6E6E6",
    "--surface-container-highest": "#DADADA",
    "--surface-bright": "#FFFFFF",
    "--surface-dim": "#F3F3F3",
    "--font-display": stack,
    "--font-body": stack,
    "--font-ui": stack,
    "--font-sans": stack,
    "--font-mono": "'Roboto Mono', 'SFMono-Regular', ui-monospace, monospace",
    "--radius-card": tokens.preview_tokens?.card_radius || tokens.rounded?.md || "8px",
    "--radius-input": nativeInputRadius,
    "--radius-button": nativeButtonRadius,
    "--radius-full": tokens.rounded?.full || "9999px",
    "--btn-height": nativeButtonHeight,
    "--btn-padx": nativeValue(nativeVars, "--wct--local-design--Button-SpaceHorizontal", "1rem"),
    "--btn-pady": nativeValue(nativeVars, "--wct--local-design--Button-SpaceVertical", "0.25rem"),
    "--btn-shadow": "none",
    "--btn-shadow-hover": "none",
    "--card-shadow": "0 0.25rem 0.75rem rgba(0,0,0,0.12)",
    "--input-height": "3.5rem",
    "--motion-standard": `${duration} ${easing}`,
    "--motion-fast": `${tokenExtended.motion?.duration_fast || "100ms"} ${easing}`,
    "--motion-slow": `${tokenExtended.motion?.duration_slow || "533ms"} ${easing}`,
    "--state-hover": "rgba(0,0,0,0.08)",
    "--state-focus": "rgba(0,0,0,0.12)",
    "--state-pressed": "rgba(0,0,0,0.16)",
    "--brand-native-button-surface": nativeButton,
    "--brand-native-button-hover": nativeButtonHover,
    "--brand-native-button-pressed": nativeButtonPressed,
    "--brand-native-input-surface": nativeInputSurface,
    "--brand-native-input-border": nativeInputBorder,
  };

  return {
    defaultMode: darkNative ? "dark" : renderContract.theme?.default_mode || "light",
    brandRed,
    nativeVars,
    modes: { light, dark },
    nativeButtonFontSize,
    nativeButtonFontWeight,
  };
}

function buildTokenExtensions({ tokens, tokenExtended, renderContract, modes, nativeVars, fontFamily, nativeButtonFontSize, nativeButtonFontWeight }) {
  const typography = tokens.typography || {};
  const nativeLight = renderContract.native_vars?.light || {};
  const componentVars = {
    "--button-bg": "var(--primary)",
    "--button-fg": "var(--primary-foreground)",
    "--button-hover-bg": "var(--brand-native-button-hover)",
    "--button-active-bg": "var(--brand-native-button-pressed)",
    "--button-border": "var(--brand-native-button-surface)",
    "--button-border-radius": "var(--radius-button)",
    "--button-min-height": "var(--btn-height)",
    "--button-padding-x": "var(--btn-padx)",
    "--button-padding-y": "var(--btn-pady)",
    "--button-font-size": nativeButtonFontSize,
    "--button-font-weight": String(nativeButtonFontWeight),
    "--input-bg": "var(--brand-native-input-surface)",
    "--input-border": "var(--brand-native-input-border)",
    "--input-radius": "var(--radius-input)",
    "--input-height": "var(--input-height)",
    "--card-bg": "var(--card)",
    "--card-fg": "var(--card-foreground)",
    "--card-radius": "var(--radius-card)",
    "--card-shadow": "var(--card-shadow)",
    "--badge-radius": tokens.components?.["badge-default"]?.radius || "4px",
    "--hero-gradient": tokenExtended.gradient?.secondary || "radial-gradient(70% 45% at 50% 0%, color-mix(in srgb, var(--primary) 32%, transparent), transparent 68%)",
  };

  return {
    semantic: {
      "--success": normalizeHex(tokens.colors?.success || "#2BB871"),
      "--warning": "#D89D31",
      "--info": normalizeHex(tokens.colors?.secondary || "#161D52"),
      "--chart-1": "var(--primary)",
      "--chart-2": "var(--secondary)",
      "--chart-3": "var(--tertiary, #482566)",
      "--chart-4": "var(--success)",
      "--chart-5": "var(--muted-foreground)",
    },
    darkSemantic: {
      "--success": normalizeHex(tokens.colors?.success || "#2BB871"),
      "--warning": "#D89D31",
      "--info": "#8EA8FF",
    },
    typeScale: {
      "--type-display": `${typography["display-hero"]?.fontWeight || 700} ${typography["display-hero"]?.fontSize || "2.5rem"}/${typography["display-hero"]?.lineHeight || 1.15} ${cssFontStack(fontFamily)}`,
      "--type-heading": `${typography["section-heading"]?.fontWeight || 600} ${typography["section-heading"]?.fontSize || "1.75rem"}/${typography["section-heading"]?.lineHeight || 1.25} ${cssFontStack(fontFamily)}`,
      "--type-body": `${typography.body?.fontWeight || 400} ${typography.body?.fontSize || "1rem"}/${typography.body?.lineHeight || 1.5} ${cssFontStack(fontFamily)}`,
      "--type-caption": `${typography.caption?.fontWeight || 400} ${typography.caption?.fontSize || "0.8125rem"}/${typography.caption?.lineHeight || 1.35} ${cssFontStack(fontFamily)}`,
      "--font-lead": cssFontStack(fontFamily),
      "--font-heading": cssFontStack(fontFamily),
      "--font-btn": cssFontStack(fontFamily),
      "--font-nav": cssFontStack(fontFamily),
    },
    geometry: {
      "--container-max": tokenExtended.container?.max_width || "120rem",
      "--section-padx": tokens.spacing?.lg || "24px",
      "--section-gap": tokens.spacing?.xl || "32px",
      "--grid-gap": tokens.spacing?.lg || "24px",
      "--hero-min-height": "min(760px, 92vh)",
      "--preview-mobile-width": "375px",
      "--preview-tablet-width": "768px",
      "--preview-desktop-width": "1280px",
    },
    componentVars,
    nativeVars: nativeLight,
    nativeDarkVars: renderContract.native_vars?.dark || {},
    extractedComponentVars: nativeVars,
    previewCssVars: {
      "--preview-button-primary-bg": modes.dark["--primary"],
      "--preview-button-primary-fg": modes.dark["--primary-foreground"],
      "--preview-button-secondary-bg": "transparent",
      "--preview-button-secondary-fg": modes.dark["--foreground"],
      "--preview-button-secondary-border": modes.dark["--foreground"],
      "--preview-button-radius": modes.dark["--radius-button"],
      "--preview-button-height": modes.dark["--btn-height"],
      "--preview-card-bg": modes.dark["--card"],
      "--preview-card-fg": modes.dark["--card-foreground"],
      "--preview-card-radius": modes.dark["--radius-card"],
      "--preview-input-bg": modes.dark["--brand-native-input-surface"],
      "--preview-input-border": modes.dark["--brand-native-input-border"],
    },
  };
}

function buildPreview({ slug, sourceDir, tokens, tokenExtended, renderContract, styleFingerprint, qualityScore, metaAssets, heroBlock, pageMd, pageHtml, fontFamily, fontFaces, modesResult, componentProperties }) {
  const archetype = styleFingerprint.classification?.primary_archetype || tokenExtended.meta?.style_archetype || "marketing-gradient";
  const archetypeMeta = ARCHETYPE_META[archetype] || {
    label: `${titleCaseFromSlug(archetype)} · Extracted Design System`,
    category: "Digital Product",
    heroVariant: "application-ui",
    tags: [archetype],
  };
  const sourceUrl = renderContract.source?.url || `https://${slug}.com/`;
  const name = cleanName(tokens.name || metaAssets.ogSiteName || metaAssets.ogTitle, slug);
  const domain = domainFromUrl(sourceUrl, slug);
  const sourceProfile = buildSourceProfile({ slug, name, domain, sourceUrl, pageMd, pageHtml, heroBlock, metaAssets });
  const sourceProfileLabel = sourceProfile?.type === "banking-home"
    ? "Retail Banking · Source Homepage"
    : sourceProfile?.type === "ecommerce-marketplace"
      ? "Ecommerce Marketplace · Source Homepage"
      : null;
  const sourceCategory = sourceProfile?.type === "banking-home"
    ? "Banking & Financial Services"
    : sourceProfile?.type === "ecommerce-marketplace"
      ? "E-commerce & Marketplace"
      : null;
  const components = componentNames(tokens, tokenExtended, componentProperties, archetype);
  const modes = modesResult.modes;
  const tokenExtensions = buildTokenExtensions({
    tokens,
    tokenExtended,
    renderContract,
    modes,
    nativeVars: modesResult.nativeVars,
    fontFamily,
    nativeButtonFontSize: modesResult.nativeButtonFontSize,
    nativeButtonFontWeight: modesResult.nativeButtonFontWeight,
  });
  const colorCount = countObjectKeys(tokens.colors);
  const typographyCount = countObjectKeys(tokens.typography);
  const nativeVarsCount = countObjectKeys(renderContract.native_vars?.light);
  const fontFaceCount = fontFaces.length;

  return {
    slug,
    name,
    domain,
    markdownSource: slug,
    archetype: sourceProfileLabel || archetypeMeta.label,
    defaultMode: modesResult.defaultMode,
    heroVariant: archetypeMeta.heroVariant,
    chips: compactArray([
      fontFamily,
      `${modes.dark["--primary"]} primary`,
      `${modes.dark["--background"]} canvas`,
      `${modes.dark["--radius-button"]} button radius`,
      `${styleFingerprint.classification?.confidence_score || 0}% archetype`,
    ]).slice(0, 6),
    details: {
      palette: paletteFromModes(modes, modesResult.nativeVars, modesResult.brandRed),
      type: {
        display: fontFamily,
        body: fontFamily,
        mono: "ui-monospace",
        weights: compactArray(Object.values(tokens.typography || {}).map((item) => item?.fontWeight)).join(" / ") || "400 / 600 / 700",
        featuretag: "Extracted @font-face + native component font vars",
      },
      radius: {
        card: "--radius-card",
        input: "--radius-input",
        button: "--radius-button",
        pill: "--radius-full",
      },
      voice: {
        tone: archetype === "cinematic-streaming" ? "direct conversion · cinematic promise · high-contrast entertainment" : "source-derived, product-specific and concise",
        casing: "Match source copy casing; avoid generic SaaS title casing.",
        emoji: "Never",
      },
      components,
      componentsInventory: buildComponentsInventory(components, archetype),
      componentStats: [
        { id: "css-vars", label: "native vars", count: nativeVarsCount },
        { id: "font-face", label: "@font-face", count: fontFaceCount },
        { id: "colors", label: "colors", count: colorCount },
        { id: "type", label: "type scales", count: typographyCount },
      ],
      foundations: archetypeMeta.foundations || [
        "Use extracted colors through semantic aliases before drawing any preview surface.",
        "Use upstream font faces whenever concrete URLs are available.",
        "Preserve native component radius, height, border and focus variables.",
        "Keep native variables available under tokenExtensions.nativeVars for high-fidelity renderers.",
      ],
      voiceSamples: [
        {
          do: heroBlock.headline || name,
          dont: `Welcome to ${name}'s awesome platform.`,
        },
        {
          do: metaAssets.ogDescription || "Use the source page language and extracted component rhythm.",
          dont: "Replace the brand with a generic dashboard narrative.",
        },
      ],
      dosAndDonts: {
        dos: [
          "Render logo/favicon assets when available; never fall back to initials for brand identity surfaces.",
          "Resolve through design-skin canonical aliases and preview variables before rendering components.",
          "Preserve native component variables in tokenExtensions.nativeVars for stack-specific fidelity.",
          "Keep extracted font-family and font-weight values on form, button and nav specimens.",
          "Use the extracted default mode as the first visual impression.",
        ],
        donts: [
          "Leak AIOX or gallery chrome accent tokens into brand specimens.",
          "Use generic rounded-pill buttons unless the source tokens specify them.",
          "Replace site-specific patterns with a universal SaaS dashboard.",
          "Ignore native component variables such as --wct--local-design--Button-* or Select/Input vars.",
          "Treat derived light mode as source truth when the source is dark-default.",
        ],
      },
      install: `node squads/design-ops/scripts/materialize-design-gallery-bundle.cjs --slug ${slug}`,
      license: "Source-derived preview bundle; brand assets remain property of their owners.",
      extractionEvidence: {
        sourceUrl,
        extractDir: path.relative(REPO_ROOT, sourceDir),
        archetype,
        confidence: styleFingerprint.classification?.confidence_score || 0,
        qualityGrade: qualityScore.grade || null,
      },
    },
    showcase: {
      kicker: `${name} · ${sourceCategory || archetypeMeta.category}`,
      // Gap 5: prefer headlineHtml (preserves <u>, <em>, <br>, <strong> from real source) over plain headline.
      // Consumers responsible for sanitizing or rendering via dangerouslySetInnerHTML.
      headline: sourceProfile?.hero?.headline || heroBlock.headlineHtml || heroBlock.headline || metaAssets.ogTitle || name,
      lead: sourceProfile?.hero?.lead || heroBlock.lead || metaAssets.ogDescription || "Source-derived tokens, components and responsive composition rendered through the active design skin.",
      leadPlacement: "center",
      ctaPrimary: sourceProfile?.hero?.cta || heroBlock.ctas?.[0]?.label || "Get Started",
      // Gap 5: dropdown chevron on primary CTA (e.g. "Try Claude ▾"). Default false; override in meta.json or extracted via cta-variants signal.
      ctaPrimaryDropdown: Boolean(heroBlock.ctas?.[0]?.hasDropdown) || false,
      ctaSecondary: sourceProfile ? null : archetype === "cinematic-streaming" ? "Sign In" : "Learn more",
      nav: sourceProfile?.navMain || ["Overview", "Products", "Resources", "Pricing"],
      sourceProfile,
      badges: compactArray([archetype, `${qualityScore.grade || "?"} quality`, `${nativeVarsCount} native vars`]),
    },
    modes,
    tokenExtensions,
    markdownVariants: [
      {
        id: "full",
        label: "Full DESIGN.MD",
        agent: "Universal",
        limit: null,
        renderer: "source",
        note: "Complete source generated by design-md extraction.",
      },
      {
        id: "skin-contract",
        label: "Skin contract",
        agent: "Renderer",
        include: ["modes", "tokenExtensions", "details.components", "details.palette"],
        note: "Canonical tokens plus native vars for high-fidelity agnostic rendering.",
      },
      {
        id: "audit",
        label: "Audit",
        agent: "QA",
        include: ["details.extractionEvidence", "details.componentStats"],
        note: "Extraction provenance, confidence and known gaps.",
      },
    ],
    preview: {
      palette: compactArray([
        modes.dark["--primary"],
        modes.dark["--background"],
        modes.dark["--card"],
        modes.dark["--foreground"],
        modes.dark["--muted-foreground"],
        modes.dark["--border"],
        modes.dark["--secondary"],
      ]),
      canvas: modes.dark["--background"],
      foreground: modes.dark["--foreground"],
      muted: modes.dark["--muted-foreground"],
      card: modes.dark["--card"],
      surface: modes.dark["--surface-container"],
      border: modes.dark["--border"],
      accent: modes.dark["--accent"],
      primaryButtonBg: modes.dark["--primary"],
      primaryButtonFg: modes.dark["--primary-foreground"],
      secondaryButtonBg: "transparent",
      secondaryButtonFg: modes.dark["--foreground"],
      secondaryButtonBorder: modes.dark["--foreground"],
      cardRadius: modes.dark["--radius-card"],
      buttonRadius: modes.dark["--radius-button"],
      fontDisplay: modes.dark["--font-display"],
      fontUi: modes.dark["--font-ui"],
      fontMono: modes.dark["--font-mono"],
    },
  };
}

function buildMeta({ slug, preview, assets, metaAssets }) {
  const addedAt = new Date().toISOString();
  const profileType = preview.showcase?.sourceProfile?.type || null;
  const category = profileType === "banking-home"
    ? "Fintech"
    : profileType === "ecommerce-marketplace"
      ? "E-commerce"
      : ARCHETYPE_META[preview.details.extractionEvidence.archetype]?.category || "Digital Product";
  const profileTags = profileType === "banking-home"
    ? ["banking", "financial-services", "source-homepage"]
    : profileType === "ecommerce-marketplace"
      ? ["ecommerce", "marketplace", "source-homepage"]
      : [];
  return {
    id: slug,
    companySlug: slug,
    name: preview.name,
    author: slug,
    cat: category,
    blurb: `${preview.archetype}. ${preview.showcase.lead}`.slice(0, 260),
    tags: compactArray([
      ...profileTags,
      ...(ARCHETYPE_META[preview.details.extractionEvidence.archetype]?.tags || []),
      preview.defaultMode,
      preview.details.type.body.toLowerCase(),
      "url-extract",
      "materialized",
    ]).slice(0, 12),
    hero: preview.modes.dark["--primary"],
    canvas: preview.modes.dark["--background"],
    glyph: preview.name.charAt(0).toUpperCase(),
    stats: {
      stars: 0,
      installs: 0,
      forks: 0,
    },
    featured: false,
    trending: 0,
    added: addedAt.slice(0, 10),
    addedAt,
    logoIsWordmark: assets.logoSourceKind === "wordmark",
    sourceUrl: metaAssets.canonicalUrl || `https://${preview.domain}/`,
  };
}

function buildAssets({ slug, metaAssets, favicon, logo }) {
  const assetOverrides = readJsonSafe(BRAND_ASSET_OVERRIDES_PATH, {})[slug] || {};
  const faviconUrl = favicon?.svg || favicon?.href || favicon?.url || null;
  const faviconPngUrl = favicon?.png || metaAssets.appleTouchIconUrl || faviconUrl || null;
  const logoCandidate = logo?.url || logo?.src || logo?.href || logo?.sourceUrl || null;
  const logoUrl = assetOverrides.logoUrl || logoCandidate || metaAssets.ogImageUrl || faviconPngUrl || faviconUrl || null;
  const logoFromFavicon =
    /favicon/i.test(String(logo?.source || "")) ||
    (logoUrl && !assetOverrides.logoUrl && (logoUrl === faviconUrl || logoUrl === faviconPngUrl || logoUrl === metaAssets.appleTouchIconUrl));
  const logoSourceKind = logoUrl ? assetOverrides.logoSourceKind || (logoFromFavicon ? "favicon" : logo?.kind === "wordmark" ? "wordmark" : "logo") : "missing";
  return {
    logoUrl,
    logoColorUrl: assetOverrides.logoColorUrl || logoUrl,
    logoDarkUrl: assetOverrides.logoDarkUrl,
    logoLightUrl: assetOverrides.logoLightUrl,
    logoWhiteUrl: assetOverrides.logoWhiteUrl,
    logoBlackUrl: assetOverrides.logoBlackUrl,
    logoSourceUrl: assetOverrides.logoSourceUrl || logo?.sourceUrl || metaAssets.canonicalUrl || `https://${slug}.com/`,
    faviconUrl,
    faviconPngUrl,
    appleTouchIconUrl: metaAssets.appleTouchIconUrl || faviconPngUrl,
    ogImageUrl: metaAssets.ogImageUrl,
    logoGenerated: !logoUrl,
    logoSourceKind,
    faviconSource: faviconUrl || faviconPngUrl ? "extracted" : "missing",
  };
}

function buildAudit({ slug, preview, qualityScore, lintReport, telemetry, styleFingerprint, renderContract, extractLog, extractionClass }) {
  const normalizedExtractionClass = normalizeExtractionClass(extractionClass);
  const qualityTrusted = hasRealLiveCoverage(normalizedExtractionClass);
  const categories = Object.entries(qualityScore.categories || {}).map(([id, value]) => ({
    id,
    label: id.replace(/_/g, " "),
    score: value.score,
    grade: value.grade,
    value: value.value,
    ideal: value.ideal,
  }));
  const nativeCount = countObjectKeys(renderContract.native_vars?.light);
  const lintErrors = problemCount(lintReport.errors ?? lintReport.errors_count);
  const lintWarnings = problemCount(lintReport.warnings ?? lintReport.warnings_count);
  const readiness = computeGalleryReadiness({ preview, qualityScore, lintReport, extractLog, extractionClass: normalizedExtractionClass });
  return {
    source: {
      brand: preview.name,
      sourceUrl: renderContract.source?.url || `https://${slug}.com/`,
      localFullDiagnostics: `apps/design/src/data/designs/${slug}/diagnostics.json`,
      extractDir: `outputs/design-ops/url-extracts/${slug}`,
    },
    headerBadges: [
      {
        label: qualityTrusted
          ? `quality: ${qualityScore.grade || "?"}/${qualityScore.overall || "?"}`
          : "quality: untrusted",
        className: qualityTrusted && qualityScore.overall >= 85 ? "badge badge-ok" : "badge badge-warn",
        title: qualityTrusted
          ? "Extractor quality score for live extraction with real coverage."
          : "Quality score suppressed because extraction-class coverage_real is not true.",
      },
      {
        label: `lint: ${lintErrors}E/${lintWarnings}W`,
        className: lintErrors === 0 ? "badge badge-ok" : "badge badge-danger",
        title: "DESIGN.md lint result.",
      },
      {
        label: `readiness: ${readiness.grade}/${readiness.score}`,
        className: readiness.score >= 85 ? "badge badge-ok" : readiness.score >= 70 ? "badge badge-warn" : "badge badge-danger",
        title: "Gallery readiness score: quality, source confidence, lint, accessibility and preview fidelity.",
      },
      {
        label: `native vars: ${nativeCount}`,
        className: nativeCount > 0 ? "badge badge-ok" : "badge badge-warn",
        title: "Native CSS variables preserved for design-skin renderers.",
      },
      {
        label: "materialized",
        className: "badge badge-ok",
        title: "Generated by materialize-design-gallery-bundle.cjs.",
      },
    ],
    quality: {
      overall: qualityScore.overall || null,
      grade: qualityScore.grade || null,
      trusted: qualityTrusted,
      categories,
    },
    extractionClass: normalizedExtractionClass,
    galleryReadiness: readiness,
    coverage: {
      cssVars: nativeCount,
      fontFaces: preview.details.componentStats.find((item) => item.id === "font-face")?.count || 0,
      colors: preview.details.componentStats.find((item) => item.id === "colors")?.count || 0,
      typeScales: preview.details.componentStats.find((item) => item.id === "type")?.count || 0,
      sourceGapMarkers: extractLog?.quality?.source_gap_markers || null,
    },
    technicalSource: {
      provider: telemetry.provider,
      model: telemetry.llm?.model,
      costUsd: telemetry.llm?.cost_estimate?.usd,
      costSource: telemetry.llm?.cost_estimate?.source,
      turns: telemetry.llm?.turns_used,
      wallClockMs: telemetry.wall_clock_ms,
      reused: telemetry.reuse?.enabled && telemetry.reuse?.hits > 0,
    },
    visualArchetype: {
      primary: styleFingerprint.classification?.primary_archetype,
      confidence: styleFingerprint.classification?.confidence_score,
      explanation: styleFingerprint.classification?.explanation,
      extractedSignals: styleFingerprint.extracted_signals,
    },
    confidenceSummary: extractLog?.confidence_summary || {},
    accessibilityPairs: qualityScore.categories?.accessibility || {},
  };
}

function problemCount(value) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (value && typeof value === "object") return Object.keys(value).length;
  return 0;
}

function normalizeExtractionClass(value) {
  if (value && typeof value === "object") return value;
  return {
    operational_mode: "unknown",
    status: "unknown",
    coverage_real: false,
    missing: true,
  };
}

function hasRealLiveCoverage(extractionClass) {
  const item = normalizeExtractionClass(extractionClass);
  return item.operational_mode === "live_extraction" && item.coverage_real === true;
}

function scoreGrade(value) {
  if (value >= 90) return "A";
  if (value >= 80) return "B";
  if (value >= 70) return "C";
  if (value >= 60) return "D";
  return "F";
}

function computeGalleryReadiness({ preview, qualityScore, lintReport, extractLog, extractionClass = null }) {
  const coverageKnown = extractionClass !== null && extractionClass !== undefined;
  const qualityTrusted = !coverageKnown || hasRealLiveCoverage(extractionClass);
  const quality = qualityTrusted ? Number(qualityScore.overall || 0) : 0;
  const confidence = extractLog?.confidence_summary || {};
  const high = Number(confidence.high || 0);
  const medium = Number(confidence.medium || 0);
  const low = Number(confidence.low || 0);
  const total = high + medium + low;
  const confidenceScore = total > 0 ? Math.round(((high + medium * 0.5) / total) * 100) : 50;
  const accessibilityScore = Number(qualityScore.categories?.accessibility?.score ?? 50);
  const lintErrors = problemCount(lintReport.errors ?? lintReport.errors_count);
  const lintWarnings = problemCount(lintReport.warnings ?? lintReport.warnings_count);
  const lintScore = Math.max(0, 100 - lintErrors * 25 - lintWarnings * 0.75);
  const profileScore = preview.showcase?.sourceProfile ? 100 : 70;
  const heroScore = preview.showcase?.sourceProfile?.hero?.imageUrl ? 100 : 70;
  const score = Math.round(
    quality * 0.35 +
    confidenceScore * 0.25 +
    accessibilityScore * 0.15 +
    lintScore * 0.15 +
    profileScore * 0.05 +
    heroScore * 0.05,
  );
  const blockers = compactArray([
    !qualityTrusted ? "coverage-not-real" : null,
    confidenceScore < 50 ? "source-confidence-low" : null,
    accessibilityScore < 60 ? "accessibility-low" : null,
    lintErrors > 0 ? "lint-errors" : null,
    lintWarnings > 25 ? "lint-warning-heavy" : null,
    !preview.showcase?.sourceProfile ? "no-source-profile" : null,
    !preview.showcase?.sourceProfile?.hero?.imageUrl ? "no-source-hero-image" : null,
  ]);
  return {
    score,
    grade: scoreGrade(score),
    components: {
      quality,
      qualityTrusted,
      coverageReal: coverageKnown ? normalizeExtractionClass(extractionClass).coverage_real === true : null,
      confidence: confidenceScore,
      accessibility: accessibilityScore,
      lint: Math.round(lintScore),
      sourceProfile: profileScore,
      sourceHeroImage: heroScore,
    },
    confidenceSummary: confidence,
    blockers,
  };
}

function buildDiagnostics({ slug, preview, tokens, tokenExtended, renderContract, styleFingerprint, telemetry, fontFaces, metaAssets, qualityScore, extractionClass }) {
  const nativeVars = renderContract.native_vars?.light || {};
  const normalizedExtractionClass = normalizeExtractionClass(extractionClass);
  const qualityTrusted = hasRealLiveCoverage(normalizedExtractionClass);
  return {
    source: {
      brand: preview.name,
      sourceFile: `apps/design/src/data/designs/${slug}/diagnostics.json`,
      generatedFrom: `outputs/design-ops/url-extracts/${slug}`,
      sourceUrl: renderContract.source?.url || `https://${slug}.com/`,
    },
    technicalSource: {
      provider: telemetry.provider,
      model: telemetry.llm?.model,
      costEstimate: telemetry.llm?.cost_estimate || null,
      phases: telemetry.phases || {},
    },
    technicalExtractionCoverage: {
      nativeVars: countObjectKeys(nativeVars),
      colors: countObjectKeys(tokens.colors),
      typeScales: countObjectKeys(tokens.typography),
      components: countObjectKeys(tokens.components),
      fontFaces: fontFaces.length,
      motionTokens: countObjectKeys(tokenExtended.motion),
    },
    headerBadges: [
      `archetype: ${styleFingerprint.classification?.primary_archetype || "unknown"}`,
      `confidence: ${styleFingerprint.classification?.confidence_score || 0}`,
      qualityTrusted ? `quality: ${qualityScore.grade || "?"}` : "quality: untrusted",
    ],
    qualityScore,
    qualityScoreTrusted: qualityTrusted,
    extractionClass: normalizedExtractionClass,
    visualArchetype: styleFingerprint,
    tokenSource: {
      defaultMode: preview.defaultMode,
      supportsDark: renderContract.theme?.supports_dark,
      supportsDarkReason: renderContract.theme?.supports_dark_reason,
      lightModeNote: preview.defaultMode === "dark" ? "Light mode is a derived gallery inspection mode; dark is source truth." : "Light mode follows source default.",
    },
    previewColors: preview.preview,
    previewRuntimeTokens: {
      modes: preview.modes,
      tokenExtensions: preview.tokenExtensions,
    },
    fontFaces: fontFaces.slice(0, 20),
    motionTokens: tokenExtended.motion || {},
    spacingScale: tokens.spacing || {},
    radiiScale: tokens.rounded || {},
    shadows: {
      card: preview.modes.dark["--card-shadow"],
      extracted: tokenExtended.components?.card?.shadow || null,
    },
    swatches: preview.preview.palette,
    cssVariablesText: Object.entries(nativeVars)
      .slice(0, 120)
      .map(([key, value]) => `${key}: ${value};`)
      .join("\n"),
    typographySamples: tokens.typography || {},
    metaAssets,
    exportActions: [
      `node squads/design-ops/scripts/materialize-design-gallery-bundle.cjs --slug ${slug} --force`,
      "npm --prefix apps/design run build",
    ],
  };
}

function materialize(args) {
  if (!args.slug) {
    usage();
    throw new Error("--slug is required");
  }

  const sourceDir = path.resolve(args.from || path.join(DEFAULT_EXTRACTS_ROOT, args.slug));
  const outDir = path.resolve(args.out || path.join(DEFAULT_GALLERY_ROOT, args.slug));
  const designMdSource = path.join(sourceDir, "DESIGN.md");

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Extract dir not found: ${sourceDir}`);
  }
  if (!fs.existsSync(designMdSource)) {
    throw new Error(`Missing source DESIGN.md: ${designMdSource}`);
  }
  if (fs.existsSync(outDir) && !args.force && !args.dryRun) {
    throw new Error(`Output dir already exists: ${outDir}. Re-run with --force to overwrite generated files.`);
  }

  const tokens = readJsonSafe(path.join(sourceDir, "tokens.json"), {});
  const tokenExtended = readJsonSafe(path.join(sourceDir, "tokens-extended.json"), {});
  const renderContract = readJsonSafe(path.join(sourceDir, "render-contract.json"), {});
  const styleFingerprint = readJsonSafe(path.join(sourceDir, "style-fingerprint.json"), {});
  const qualityScore = readJsonSafe(path.join(sourceDir, "quality-score.json"), {});
  const extractionClass = normalizeExtractionClass(readJsonSafe(path.join(sourceDir, "extraction-class.json"), null));
  const lintReport = readJsonSafe(path.join(sourceDir, "lint-report.json"), {});
  const telemetry = readJsonSafe(path.join(sourceDir, "telemetry.json"), {});
  const extractLog = readYamlSafe(path.join(sourceDir, "extraction-log.yaml"), {});
  const metaAssets = readJsonSafe(path.join(sourceDir, "inputs/meta-assets.json"), {});
  const heroBlock = readJsonSafe(path.join(sourceDir, "inputs/hero-block.json"), {});
  const pageMd = readFileSafe(path.join(sourceDir, "inputs/page.md")) || "";
  const pageHtml = readFileSafe(path.join(sourceDir, "inputs/page.html")) || "";
  const favicon = readJsonSafe(path.join(sourceDir, "inputs/favicon.json"), {});
  const logo = readJsonSafe(path.join(sourceDir, "inputs/logo.json"), {});
  const rawFontFaces = readJsonSafe(path.join(sourceDir, "inputs/font-faces.json"), []);
  const componentProperties = readJsonSafe(path.join(sourceDir, "inputs/component-properties.json"), {});
  const fontFamily = mostCommonFontFamily(tokens.typography);
  const fontFaces = bestFontFaces(rawFontFaces, fontFamily);
  const modesResult = buildModes({
    tokens,
    renderContract,
    tokenExtended,
    fontFamily,
    context: { tokens, tokenExtended, renderContract, rawFontFaces },
  });
  const preview = buildPreview({
    slug: args.slug,
    sourceDir,
    tokens,
    tokenExtended,
    renderContract,
    styleFingerprint,
    qualityScore,
    metaAssets,
    heroBlock,
    pageMd,
    pageHtml,
    fontFamily,
    fontFaces,
    modesResult,
    componentProperties,
  });
  const assets = buildAssets({ slug: args.slug, metaAssets, favicon, logo });
  const meta = buildMeta({ slug: args.slug, preview, assets, metaAssets });
  const audit = buildAudit({
    slug: args.slug,
    preview,
    qualityScore,
    lintReport,
    telemetry,
    styleFingerprint,
    renderContract,
    extractLog,
    extractionClass,
  });
  const diagnostics = buildDiagnostics({
    slug: args.slug,
    preview,
    tokens,
    tokenExtended,
    renderContract,
    styleFingerprint,
    telemetry,
    fontFaces,
    metaAssets,
    qualityScore,
    extractionClass,
  });

  const files = [
    ["meta.json", meta],
    ["assets.json", assets],
    ["fonts.json", fontFaces],
    ["preview.json", preview],
    ["audit.json", audit],
    ["diagnostics.json", diagnostics],
  ];

  if (!args.dryRun) {
    ensureDir(outDir);
  }
  for (const [filename, data] of files) {
    writeJson(path.join(outDir, filename), data, args.dryRun);
  }
  // 1.2 fix: canonical filename is DESIGN.md (lowercase) — Google spec convention,
  // case-sensitive on Linux/CI, matches the source artifact and 80% of the codebase.
  // The previous attempt also tried to unlink a stale `DESIGN.MD` sibling; on
  // case-insensitive filesystems (macOS default) that resolves to the SAME inode
  // we just wrote and silently deletes the bundle. Migration of legacy uppercase
  // names is handled out-of-band by `git mv` on a case-sensitive checkout (Linux/CI)
  // or via `git mv DESIGN.MD __tmp.md && git mv __tmp.md DESIGN.md` on macOS.
  copyFile(designMdSource, path.join(outDir, "DESIGN.md"), args.dryRun);

  return {
    slug: args.slug,
    sourceDir,
    outDir,
    defaultMode: preview.defaultMode,
    archetype: preview.details.extractionEvidence.archetype,
    nativeVars: countObjectKeys(renderContract.native_vars?.light),
    files: [...files.map(([filename]) => filename), "DESIGN.md"],
    dryRun: args.dryRun,
  };
}

function discoverPromotedSlugs() {
  // A "promoted" extract is a slug directory that holds a top-level DESIGN.md
  // (i.e. won the score gate at some point). Scratch dirs (.run-*) are skipped.
  const root = DEFAULT_EXTRACTS_ROOT;
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const slugs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name.startsWith(".") || name.startsWith("_")) continue;
    const designMd = path.join(root, name, "DESIGN.md");
    if (fs.existsSync(designMd)) slugs.push(name);
  }
  return slugs.sort();
}

function materializeAll(args) {
  const slugs = discoverPromotedSlugs();
  const results = { ok: 0, skipped: 0, failed: 0, items: [] };
  console.log(`[materialize] discovered ${slugs.length} promoted extract(s)`);
  for (const slug of slugs) {
    const itemArgs = {
      slug,
      force: args.force,
      dryRun: args.dryRun,
    };
    try {
      const result = materialize(itemArgs);
      results.ok += 1;
      results.items.push({ slug, status: "ok", outDir: path.relative(REPO_ROOT, result.outDir) });
      console.log(`  ✓ ${slug}`);
    } catch (error) {
      // Bundle already exists without --force is a "skip", everything else is "failed".
      const isSkip = /already exists/i.test(error.message);
      if (isSkip) {
        results.skipped += 1;
        results.items.push({ slug, status: "skipped", reason: "exists" });
        console.log(`  ⏭ ${slug} (exists; pass --force to overwrite)`);
      } else {
        results.failed += 1;
        results.items.push({ slug, status: "failed", error: error.message });
        console.error(`  ✗ ${slug}: ${error.message}`);
      }
    }
  }
  console.log(`[materialize] done. ok=${results.ok} skipped=${results.skipped} failed=${results.failed}`);
  return results;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (args.all) {
    const summary = materializeAll(args);
    console.log(JSON.stringify({ ok: true, mode: "all", ...summary }, null, 2));
    if (summary.failed > 0) process.exit(1);
    return;
  }
  const result = materialize(args);
  console.log(
    JSON.stringify(
      {
        ok: true,
        ...result,
        sourceDir: path.relative(REPO_ROOT, result.sourceDir),
        outDir: path.relative(REPO_ROOT, result.outDir),
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[materialize-design-gallery-bundle] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  materialize,
  buildAssets,
  buildModes,
  buildSourceProfile,
  computeGalleryReadiness,
  extractMarkdownImage,
  hasRealLiveCoverage,
  bestFontFaces,
  mostCommonFontFamily,
  normalizeExtractionClass,
  problemCount,
  scoreHeroImageCandidate,
};
