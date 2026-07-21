#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { hashObj, hashText, sha256, canonicalize } = require("./lib/canonicalize.cjs");

const SCRIPT_PATH = path.relative(process.cwd(), __filename);
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DESIGNS_SRC_ROOT = path.join(REPO_ROOT, "apps/design/src/data/designs");
const PUBLIC_COMPANIES_ROOT = path.join(REPO_ROOT, "apps/design/public/data/companies");
const EXTRACTS_ROOT = path.join(REPO_ROOT, "outputs/design-ops/url-extracts");
const PRE_TIER_B_ROOT = path.join(REPO_ROOT, "apps/design-pre-tier-b/src/data/designs");
const DESIGNS_INDEX = path.join(REPO_ROOT, "apps/design/src/data/designs-index.generated.json");

const ARTIFACT_FILES = ["meta.json", "assets.json", "fonts.json", "preview.json", "audit.json", "diagnostics.json", "DESIGN.md"];
const EXTRACT_FILES = [
  "tokens.json",
  "tokens-extended.json",
  "render-contract.json",
  "inputs/font-faces.json",
  "inputs/theme-default.json",
  "inputs/logo.json",
  "inputs/favicon.json",
  "inputs/hero-block.json",
  "inputs/meta-assets.json",
  "DESIGN.md",
];

const DEFAULT_BRANDS = [
  "aiox", "anthropic", "mistral.ai", "lovable", "netflix",
  "itau", "amazon", "mercadolivre", "nubank", "n8n",
  "notion", "playstation", "wise", "starbucks",
];

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function readText(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return null; }
}

function pathExists(file) {
  try { fs.accessSync(file, fs.constants.F_OK); return true; } catch { return false; }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function splitCsv(val) {
  return String(val || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function parseArgs(argv) {
  const args = { brands: null, out: null, compareSrcPublic: false, baselineRef: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") { args.help = true; }
    else if (arg.startsWith("--brands=")) { args.brands = splitCsv(arg.slice(9)); }
    else if (arg === "--brands") { args.brands = splitCsv(argv[++i]); }
    else if (arg.startsWith("--out=")) { args.out = path.resolve(arg.slice(6)); }
    else if (arg === "--out") { args.out = path.resolve(argv[++i]); }
    else if (arg === "--compare-src-public") { args.compareSrcPublic = true; }
    else if (arg.startsWith("--baseline-ref=")) { args.baselineRef = arg.slice(15); }
    else if (arg === "--baseline-ref") { args.baselineRef = argv[++i]; }
    else { throw new Error(`Unknown argument: ${arg}`); }
  }
  return args;
}

function usage() {
  console.log(`Usage: node ${SCRIPT_PATH} [--brands=csv] [--out=path] [--compare-src-public] [--baseline-ref=path]

Options:
  --brands=csv           Comma-separated brand slugs (default: all 14 brands)
  --out=path             Output JSON path (default: .tmp/audit/gallery-hashes.json)
  --compare-src-public   Enable src vs public cache comparison hashes
  --baseline-ref=path    Filesystem path to pre-tier-b designs root (default: apps/design-pre-tier-b/src/data/designs)`);
}

function loadBrandIndex() {
  const entries = readJson(DESIGNS_INDEX) || [];
  const bySlug = new Map();
  for (const entry of entries) {
    if (entry?.id) bySlug.set(entry.id, entry);
  }
  return bySlug;
}

function hashBundleDir(root) {
  const result = {};
  for (const filename of ARTIFACT_FILES) {
    const file = path.join(root, filename);
    if (!pathExists(file)) {
      result[filename] = null;
      continue;
    }
    if (filename.endsWith(".json")) {
      result[filename] = hashObj(readJson(file));
    } else {
      result[filename] = hashText(readText(file));
    }
  }
  return result;
}

function hashExtractDir(root) {
  const result = {};
  for (const relFile of EXTRACT_FILES) {
    const file = path.join(root, relFile);
    if (!pathExists(file)) {
      result[relFile] = null;
      continue;
    }
    if (relFile.endsWith(".json")) {
      result[relFile] = hashObj(readJson(file));
    } else {
      result[relFile] = hashText(readText(file));
    }
  }
  return result;
}

function corpusHash(root, files) {
  const parts = [];
  for (const relFile of files) {
    const file = path.join(root, relFile);
    if (!pathExists(file)) continue;
    if (relFile.endsWith(".json")) {
      const obj = readJson(file);
      if (obj) parts.push(canonicalize(obj));
    } else {
      const text = readText(file);
      if (text) parts.push(text);
    }
  }
  if (!parts.length) return null;
  return sha256(parts.join("\n"));
}

function hashBrand(slug, bySlug, baselineRefRoot) {
  const companySlug = bySlug.get(slug)?.companySlug || slug;
  const srcRoot = path.join(DESIGNS_SRC_ROOT, slug);
  const publicRoot = path.join(PUBLIC_COMPANIES_ROOT, companySlug, "designs", slug);
  const extractRoot = path.join(EXTRACTS_ROOT, slug);
  const baselineRoot = path.join(baselineRefRoot, slug);

  const srcExists = pathExists(srcRoot);
  const publicExists = pathExists(publicRoot);
  const extractExists = pathExists(extractRoot);
  const baselineExists = pathExists(baselineRoot);

  const entry = {
    slug,
    companySlug,
    sources: {
      src: {
        path: path.relative(REPO_ROOT, srcRoot),
        exists: srcExists,
        hashes: srcExists ? hashBundleDir(srcRoot) : null,
        corpusHash: srcExists ? corpusHash(srcRoot, ARTIFACT_FILES) : null,
      },
      public: {
        path: path.relative(REPO_ROOT, publicRoot),
        exists: publicExists,
        hashes: publicExists ? hashBundleDir(publicRoot) : null,
        corpusHash: publicExists ? corpusHash(publicRoot, ARTIFACT_FILES) : null,
      },
      extract: {
        path: path.relative(REPO_ROOT, extractRoot),
        exists: extractExists,
        hashes: extractExists ? hashExtractDir(extractRoot) : null,
        corpusHash: extractExists ? corpusHash(extractRoot, EXTRACT_FILES) : null,
      },
      baseline: {
        path: path.relative(REPO_ROOT, baselineRoot),
        exists: baselineExists,
        hashes: baselineExists ? hashBundleDir(baselineRoot) : null,
        corpusHash: baselineExists ? corpusHash(baselineRoot, ARTIFACT_FILES) : null,
      },
    },
  };

  // Convenience: src == public (cache fresh check)
  if (entry.sources.src.corpusHash != null && entry.sources.public.corpusHash != null) {
    entry.srcPublicMatch = entry.sources.src.corpusHash === entry.sources.public.corpusHash;
  } else {
    entry.srcPublicMatch = null;
  }

  return entry;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); return; }

  const brands = args.brands || DEFAULT_BRANDS;
  const outPath = args.out || path.join(REPO_ROOT, ".tmp/audit/gallery-hashes.json");
  const baselineRefRoot = args.baselineRef ? path.resolve(args.baselineRef) : PRE_TIER_B_ROOT;

  ensureDir(path.dirname(outPath));

  const bySlug = loadBrandIndex();
  const start = Date.now();

  const brandHashes = brands.map((slug) => hashBrand(slug, bySlug, baselineRefRoot));

  const output = {
    schemaVersion: "gallery-hashes/v1",
    generatedAt: new Date().toISOString(),
    command: `node ${SCRIPT_PATH} ${process.argv.slice(2).join(" ")}`.trim(),
    repoRoot: REPO_ROOT,
    baselineRefRoot: path.relative(REPO_ROOT, baselineRefRoot),
    inputHashes: {
      designsIndex: hashObj(readJson(DESIGNS_INDEX)),
    },
    gitSha: (() => {
      try { return require("child_process").execSync("git rev-parse HEAD", { cwd: REPO_ROOT }).toString().trim(); } catch { return null; }
    })(),
    durationMs: null,
    brands: brandHashes,
  };

  output.durationMs = Date.now() - start;

  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);

  const present = brandHashes.filter((b) => b.sources.src.exists).length;
  const withExtract = brandHashes.filter((b) => b.sources.extract.exists).length;
  const stale = brandHashes.filter((b) => b.srcPublicMatch === false).length;

  console.log(`[hash-gallery-artifacts] brands=${brands.length} src_present=${present} extract_present=${withExtract} cache_stale=${stale} duration=${output.durationMs}ms`);
  console.log(`[hash-gallery-artifacts] out=${path.relative(REPO_ROOT, outPath)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`[hash-gallery-artifacts] ${err.message}`);
    process.exitCode = 1;
  }
}

module.exports = { hashBrand, hashBundleDir, hashExtractDir };
