#!/usr/bin/env node
"use strict";

/**
 * validate-curation-manifest — STORY-146.1 Subtask 4
 *
 * Validates apps/design/src/data/designs/_curation-manifest.json against
 * the design-gallery-curation-manifest/v1 schema.
 *
 * Also verifies EAC13: _curation-manifest.json is NOT present in any
 * designs-index*.json files (both src and public).
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — schema violation or EAC13 leak detected
 *   3 — manifest file not found
 */

const fs = require("fs");
const path = require("path");
const { validate } = require("./lib/curation-manifest-schema.cjs");

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  "apps/design/src/data/designs/_curation-manifest.json"
);
const INDEX_PATHS = [
  "apps/design/src/data/designs-index.generated.json",
  "apps/design/public/data/designs-index.json",
];

function checkManifestExists() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`[validate-curation-manifest] FAIL: manifest not found at ${MANIFEST_PATH}`);
    process.exit(3);
  }
}

function validateSchema() {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch (err) {
    console.error(`[validate-curation-manifest] FAIL: cannot parse manifest JSON: ${err.message}`);
    process.exit(1);
  }

  try {
    validate(manifest);
  } catch (err) {
    console.error(`[validate-curation-manifest] FAIL: schema validation error:\n${err.message}`);
    process.exit(1);
  }

  return manifest;
}

function checkEac13Exclusion() {
  let leaked = false;
  for (const relPath of INDEX_PATHS) {
    const absPath = path.join(REPO_ROOT, relPath);
    if (!fs.existsSync(absPath)) continue;
    const content = fs.readFileSync(absPath, "utf8");
    if (content.includes("_curation-manifest")) {
      console.error(
        `[validate-curation-manifest] FAIL EAC13: "_curation-manifest" found in ${relPath}`
      );
      leaked = true;
    }
  }
  if (leaked) process.exit(1);
}

function printSummary(manifest) {
  const brands = Object.keys(manifest.brands);
  let curatedCount = 0;
  brands.forEach((slug) => {
    const b = manifest.brands[slug];
    Object.values(b).forEach((layer) => {
      if (layer.mode === "curated" && layer.fields) {
        curatedCount += Object.keys(layer.fields).length;
      }
    });
  });

  console.log(`[validate-curation-manifest] OK`);
  console.log(`  schema:        ${manifest.schemaVersion}`);
  console.log(`  brands:        ${brands.length} (${brands.join(", ")})`);
  console.log(`  curated fields:${curatedCount}`);
  console.log(`  EAC13:         _curation-manifest not in designs-index files`);
}

function main() {
  checkManifestExists();
  const manifest = validateSchema();
  checkEac13Exclusion();
  printSummary(manifest);
}

main();
