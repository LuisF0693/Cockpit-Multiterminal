"use strict";

const SCHEMA_VERSION = "design-gallery-baseline/v1";

const VALID_CATEGORIES = new Set(["protected", "watchlist-visual", "watchlist-handoff"]);
const VALID_CLASSIFICATIONS = new Set([
  "manual-fix",
  "runtime-stale",
  "extract-gap",
  "historical-regression",
  "unknown",
]);

function validateDivergence(div, index) {
  const errors = [];
  if (!div || typeof div !== "object") {
    errors.push(`divergences[${index}]: must be an object`);
    return errors;
  }
  if (!div.layer) errors.push(`divergences[${index}].layer: required`);
  if (!div.field) errors.push(`divergences[${index}].field: required`);
  if (!div.classification) {
    errors.push(`divergences[${index}].classification: required`);
  } else if (!VALID_CLASSIFICATIONS.has(div.classification)) {
    errors.push(`divergences[${index}].classification: must be one of ${[...VALID_CLASSIFICATIONS].join("|")}`);
  }
  if (div.classification === "unknown" && !div.rationale) {
    errors.push(`divergences[${index}].rationale: required when classification=unknown`);
  }
  return errors;
}

function validateBrandEntry(entry) {
  const errors = [];
  if (!entry || typeof entry !== "object") {
    errors.push("brand entry: must be an object");
    return errors;
  }
  if (!entry.slug) errors.push("slug: required");
  if (!entry.category) {
    errors.push("category: required");
  } else if (!VALID_CATEGORIES.has(entry.category)) {
    errors.push(`category: must be one of ${[...VALID_CATEGORIES].join("|")}`);
  }
  if (!entry.lineage || typeof entry.lineage !== "object") {
    errors.push("lineage: required object");
  } else {
    if (!entry.lineage.extractHash && entry.lineage.extractHash !== null) {
      errors.push("lineage.extractHash: required (string or null)");
    }
    if (!entry.lineage.currentSrcHash && entry.lineage.currentSrcHash !== null) {
      errors.push("lineage.currentSrcHash: required (string or null)");
    }
    if (!entry.lineage.publicCacheHash && entry.lineage.publicCacheHash !== null) {
      errors.push("lineage.publicCacheHash: required (string or null)");
    }
    if (!entry.lineage.schemaVersion) errors.push("lineage.schemaVersion: required");
  }
  if (!Array.isArray(entry.divergences)) errors.push("divergences: required array");
  else {
    for (let index = 0; index < entry.divergences.length; index++) {
      errors.push(...validateDivergence(entry.divergences[index], index));
    }
  }
  return errors;
}

function validate(baseline) {
  const errors = [];
  if (!baseline || typeof baseline !== "object") {
    errors.push("baseline: must be an object");
    throw new Error(`Schema validation failed:\n${errors.join("\n")}`);
  }
  if (baseline.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion: expected "${SCHEMA_VERSION}", got "${baseline.schemaVersion}"`);
  }
  if (!Array.isArray(baseline.brands)) {
    errors.push("brands: required array");
  } else {
    for (const entry of baseline.brands) {
      const entryErrors = validateBrandEntry(entry);
      for (const err of entryErrors) {
        errors.push(`[${entry?.slug || "?"}] ${err}`);
      }
    }
  }
  if (errors.length) {
    throw new Error(`Schema validation failed:\n${errors.join("\n")}`);
  }
  return true;
}

module.exports = { SCHEMA_VERSION, VALID_CATEGORIES, VALID_CLASSIFICATIONS, validate, validateBrandEntry };
