#!/usr/bin/env node
"use strict";

/**
 * wire-baseline-schema — STORY-146.0 follow-up QG-146-01 + QG-146-02
 *
 * Wires the orphan libs (classify-divergence.cjs, baseline-schema.cjs) into the
 * audit pipeline by transforming the audit-gallery-drift.cjs output
 * (`gallery-drift-baseline.json` / `design-gallery-drift-audit/v1`) into the
 * spec-compliant baseline (`curation-baseline.json` / `design-gallery-baseline/v1`)
 * that the story's Quality Gate bash expects (AC3 + AC5).
 *
 * Input:  .tmp/audit/gallery-drift-baseline.json (audit-gallery-drift.cjs output)
 * Output: .tmp/audit/curation-baseline.json     (baseline-schema.cjs validates)
 *
 * Resolves:
 *  - QG-146-01: classify-divergence.cjs + baseline-schema.cjs become consumed (no longer orphans)
 *  - QG-146-02: AC3 (extractHash, baselineRef, currentSrcHash, publicCacheHash via lineage{})
 *               AC5 (schemaVersion: design-gallery-baseline/v1, lineage fields populated)
 */

const fs = require("fs");
const path = require("path");
const { classifyAll } = require("./lib/classify-divergence.cjs");
const baselineSchema = require("./lib/baseline-schema.cjs");

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DEFAULT_INPUT = path.join(REPO_ROOT, ".tmp/audit/gallery-drift-baseline.json");
const DEFAULT_OUTPUT = path.join(REPO_ROOT, ".tmp/audit/curation-baseline.json");

// Per Epic section "Baseline audit obrigatório" (lines 257-261)
const CATEGORY_MAP = {
  aiox: "protected",
  anthropic: "protected",
  "mistral.ai": "protected",
  lovable: "protected",
  netflix: "protected",
  itau: "protected",
  amazon: "protected",
  mercadolivre: "protected",
  nubank: "watchlist-visual",
  n8n: "watchlist-visual",
  notion: "watchlist-visual",
  playstation: "watchlist-handoff",
  wise: "watchlist-handoff",
  starbucks: "watchlist-handoff",
};

// Map audit-gallery-drift.cjs finding codes → divergence classification.
// Aligns with classify-divergence.cjs valid classes.
// NOTE: audit-gallery-drift.cjs emits findings with the code in `field` (not `code`).
// All patterns below check `finding.field` first, then legacy `finding.code` fallback.
function classifyFinding(finding) {
  // field carries the finding code in audit-gallery-drift.cjs output; code is legacy fallback
  const code = finding.field || finding.code || finding.type || finding.id || "";
  const upper = code.toUpperCase();

  // extract-gap: extractor failed to produce canonical data (missing dir, missing file,
  // bad format, generic fallback used instead of real brand value)
  if (
    upper.includes("FAVICON_AS_LOGO") ||
    upper.includes("LOCAL_FONT_FILE_MISSING") ||
    upper.includes("MISSING_EXTRACT") ||
    upper.includes("EXTRACT_GAP") ||
    upper.includes("GENERIC_NAV") ||
    upper.includes("GENERIC_CTA") ||
    upper.includes("SVG_IMG_COMPATIBILITY") ||
    upper.includes("SOURCE_PROFILE_COLORS_MISSING") ||
    upper.includes("NO_FONTS") ||
    upper.includes("SECONDARY_SHADCN_DEFAULT") ||
    upper.includes("GENERATED_WORDMARK") ||
    upper.includes("THEME_DETECTOR_MISMATCH") ||
    upper.includes("KNOWN_RED_PRESENT")
  ) {
    return { classification: "extract-gap", rationale: finding.rationale || finding.message || code };
  }
  if (
    upper.includes("RUNTIME_STALE") ||
    upper.includes("CACHE_DRIFT") ||
    upper.includes("STALE_") ||
    upper.includes("CACHE_")
  ) {
    return { classification: "runtime-stale", rationale: finding.rationale || finding.message || code };
  }
  if (upper.includes("MANUAL_FIX") || upper.includes("HOTFIX")) {
    return { classification: "manual-fix", rationale: finding.rationale || finding.message || code };
  }
  if (upper.includes("REGRESSION") || upper.includes("HISTORICAL")) {
    return { classification: "historical-regression", rationale: finding.rationale || finding.message || code };
  }
  return { classification: "unknown", rationale: finding.rationale || finding.message || `Unmapped finding code: ${code}` };
}

function mapFindingToDivergence(finding) {
  const layer = finding.layer || finding.area || "diagnostics";
  const field = finding.field || finding.code || finding.id || "unknown";
  const { classification, rationale } = classifyFinding(finding);
  return {
    layer,
    field,
    extractValue: finding.extractValue ?? null,
    baselineValue: finding.baselineValue ?? null,
    currentSrcValue: finding.currentSrcValue ?? null,
    publicCacheValue: finding.publicCacheValue ?? null,
    classification,
    rationale,
  };
}

function combineHashes(hashesByFile) {
  if (!hashesByFile || typeof hashesByFile !== "object") return null;
  const keys = Object.keys(hashesByFile).sort();
  if (!keys.length) return null;
  const concatenated = keys.map((k) => `${k}:${hashesByFile[k]}`).join("|");
  return require("crypto").createHash("sha256").update(concatenated).digest("hex");
}

function transformItemToBrand(item) {
  const slug = item.slug;
  const category = CATEGORY_MAP[slug] || "protected";

  const divergences = (item.findings || []).map(mapFindingToDivergence);

  // Use classifyAll for re-validation (per-brand threshold abort if >10% unknown without rationale).
  // We pass abortOnThreshold=false here because findings already have rationale; we just want the validator to run.
  const classifiedDivergences = classifyAll(divergences, slug, false);

  const lineage = {
    schemaVersion: baselineSchema.SCHEMA_VERSION,
    extractHash: combineHashes(item.hashes?.extract),
    baselineRef: item.paths?.preTierB || null,
    baselineHash: combineHashes(item.hashes?.preTierB),
    currentSrcHash: combineHashes(item.hashes?.src),
    publicCacheHash: combineHashes(item.hashes?.public),
    extractPath: item.paths?.extract || null,
  };

  return {
    slug,
    category,
    lineage,
    divergences: classifiedDivergences,
  };
}

function transform(driftBaseline) {
  const items = driftBaseline.items || [];
  const brands = items.map(transformItemToBrand);

  return {
    schemaVersion: baselineSchema.SCHEMA_VERSION,
    sourceSchema: driftBaseline.schemaVersion,
    sourceCommand: driftBaseline.command,
    transformedBy: "wire-baseline-schema.cjs",
    transformedAt: new Date().toISOString(),
    brands,
  };
}

function main() {
  const inputArg = process.argv[2];
  const outputArg = process.argv[3];
  const inputPath = inputArg ? path.resolve(inputArg) : DEFAULT_INPUT;
  const outputPath = outputArg ? path.resolve(outputArg) : DEFAULT_OUTPUT;

  if (!fs.existsSync(inputPath)) {
    console.error(`[wire-baseline-schema] input not found: ${inputPath}`);
    console.error(`Run audit-gallery-drift.cjs first to produce gallery-drift-baseline.json.`);
    process.exit(2);
  }

  const driftBaseline = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const baseline = transform(driftBaseline);

  // Validate via baseline-schema.cjs — this is QG-146-01's "wire-up" proof.
  try {
    baselineSchema.validate(baseline);
  } catch (err) {
    console.error(`[wire-baseline-schema] schema validation failed:\n${err.message}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(baseline, null, 2)}\n`);

  console.log(`[wire-baseline-schema] OK`);
  console.log(`  input:  ${path.relative(REPO_ROOT, inputPath)}`);
  console.log(`  output: ${path.relative(REPO_ROOT, outputPath)}`);
  console.log(`  brands: ${baseline.brands.length}`);
  console.log(`  divergences: ${baseline.brands.reduce((sum, b) => sum + b.divergences.length, 0)}`);
  console.log(`  schema:    ${baseline.schemaVersion}`);
}

if (require.main === module) {
  main();
}

module.exports = { transform, transformItemToBrand, classifyFinding, CATEGORY_MAP };
