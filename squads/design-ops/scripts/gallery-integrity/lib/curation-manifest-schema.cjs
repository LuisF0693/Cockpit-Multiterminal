"use strict";

const SCHEMA_VERSION = "design-gallery-curation-manifest/v1";

const VALID_MODES = new Set(["curated", "extract", "materializer", "n/a"]);
const VALID_LAYERS = new Set(["tokens", "showcase", "sourceProfile", "fonts", "logo", "diagnostics"]);

function validateFieldEntry(fieldKey, fieldEntry, path) {
  const errors = [];
  if (!fieldEntry || typeof fieldEntry !== "object") {
    errors.push(`${path}: must be an object`);
    return errors;
  }
  if (!fieldEntry.source || typeof fieldEntry.source !== "string" || !fieldEntry.source.trim()) {
    errors.push(`${path}.source: required non-empty string`);
  }
  if (fieldEntry.value === undefined) {
    errors.push(`${path}.value: required`);
  }
  if (!fieldEntry.reason || typeof fieldEntry.reason !== "string" || fieldEntry.reason.trim().length < 10) {
    errors.push(`${path}.reason: required string, min 10 chars`);
  }
  if (!fieldEntry.evidenceHash || typeof fieldEntry.evidenceHash !== "string" || !fieldEntry.evidenceHash.trim()) {
    errors.push(`${path}.evidenceHash: required non-empty string`);
  }
  return errors;
}

function validateLayerEntry(layer, entry, brandSlug) {
  const errors = [];
  const path = `brands.${brandSlug}.${layer}`;

  if (!entry || typeof entry !== "object") {
    errors.push(`${path}: must be an object`);
    return errors;
  }

  if (!entry.mode) {
    errors.push(`${path}.mode: required`);
  } else if (!VALID_MODES.has(entry.mode)) {
    errors.push(`${path}.mode: must be one of ${[...VALID_MODES].join("|")}`);
  }

  if (entry.mode === "curated") {
    if (!entry.reason || typeof entry.reason !== "string" || entry.reason.trim().length < 10) {
      errors.push(`${path}.reason: required string min 10 chars when mode=curated`);
    }
    if (!entry.fields || typeof entry.fields !== "object" || Array.isArray(entry.fields)) {
      errors.push(`${path}.fields: required object when mode=curated`);
    } else {
      for (const [fieldKey, fieldEntry] of Object.entries(entry.fields)) {
        errors.push(...validateFieldEntry(fieldKey, fieldEntry, `${path}.fields.${fieldKey}`));
      }
    }
  }

  return errors;
}

function validateBrandEntry(brandSlug, brandEntry) {
  const errors = [];

  if (!brandEntry || typeof brandEntry !== "object") {
    errors.push(`brands.${brandSlug}: must be an object`);
    return errors;
  }

  for (const layer of VALID_LAYERS) {
    if (!brandEntry[layer]) {
      errors.push(`brands.${brandSlug}.${layer}: required layer`);
    } else {
      errors.push(...validateLayerEntry(layer, brandEntry[layer], brandSlug));
    }
  }

  return errors;
}

function validate(manifest) {
  const errors = [];

  if (!manifest || typeof manifest !== "object") {
    errors.push("manifest: must be an object");
    throw new Error(`Schema validation failed:\n${errors.join("\n")}`);
  }

  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion: expected "${SCHEMA_VERSION}", got "${manifest.schemaVersion}"`);
  }

  if (!manifest.brands || typeof manifest.brands !== "object" || Array.isArray(manifest.brands)) {
    errors.push("brands: required object");
  } else {
    for (const [brandSlug, brandEntry] of Object.entries(manifest.brands)) {
      errors.push(...validateBrandEntry(brandSlug, brandEntry));
    }
  }

  if (errors.length) {
    throw new Error(`Schema validation failed:\n${errors.join("\n")}`);
  }
  return true;
}

module.exports = { SCHEMA_VERSION, VALID_MODES, VALID_LAYERS, validate, validateBrandEntry, validateLayerEntry };
