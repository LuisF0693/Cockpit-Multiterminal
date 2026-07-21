"use strict";

const UNKNOWN_THRESHOLD = 0.10;

// Per-brand hotfix whitelist: fields where current_src is known to be a deliberate manual fix.
// Key: slug, Value: Set of field keys that are whitelisted as manual-fix.
const MANUAL_FIX_WHITELIST = {
  aiox: new Set(["--primary", "--accent", "defaultMode"]),
  netflix: new Set(["--accent", "--primary"]),
  itau: new Set(["--primary", "--secondary"]),
  mercadolivre: new Set(["--primary", "--accent"]),
};

/**
 * Classify a single divergence entry.
 *
 * Rules (evaluated in order — first match wins):
 * 1. extract = null/incomplete AND current_src has a value → extract-gap
 * 2. current_src ≠ public_cache (regardless of extract) → runtime-stale
 * 3. current_src is in brand's manual-fix whitelist AND differs from extract+baseline → manual-fix
 * 4. current_src ≠ baseline AND baseline had a valid value → historical-regression
 * 5. Fallthrough → unknown (requires rationale)
 *
 * @param {object} params
 * @param {string} params.slug - brand slug
 * @param {string} params.layer - audit layer
 * @param {string} params.field - field name
 * @param {*} params.extractValue - value from url-extract (null = missing/gap)
 * @param {*} params.baselineValue - value from pre-tier-b baseline (null = not available)
 * @param {*} params.currentSrcValue - value from apps/design/src/data/designs/
 * @param {*} params.publicCacheValue - value from apps/design/public/data/companies/
 * @returns {{ classification: string, rationale: string }}
 */
function classifyDivergence({ slug, layer: _layer, field, extractValue, baselineValue, currentSrcValue, publicCacheValue }) {
  const extractMissing = extractValue == null || extractValue === "";
  const srcHasValue = currentSrcValue != null && currentSrcValue !== "";
  const srcDiffPublic = currentSrcValue !== publicCacheValue && publicCacheValue != null;
  const whitelist = MANUAL_FIX_WHITELIST[slug];
  const isWhitelisted = whitelist && whitelist.has(field);
  const extractDiffSrc = extractValue !== currentSrcValue;
  const baselineDiffSrc = baselineValue != null && baselineValue !== currentSrcValue;

  // Rule 1: extract-gap — extract has no signal, current has a value
  if (extractMissing && srcHasValue) {
    return {
      classification: "extract-gap",
      rationale: `extract yielded null/empty for ${field}; current_src has value "${currentSrcValue}"`,
    };
  }

  // Rule 2: runtime-stale — src ≠ public_cache
  if (srcDiffPublic) {
    return {
      classification: "runtime-stale",
      rationale: `current_src "${currentSrcValue}" ≠ public_cache "${publicCacheValue}" — build-public-data not run`,
    };
  }

  // Rule 3: manual-fix — whitelisted field, current differs from extract/baseline
  if (isWhitelisted && (extractDiffSrc || baselineDiffSrc)) {
    return {
      classification: "manual-fix",
      rationale: `field "${field}" is in the known hotfix whitelist for brand "${slug}"; divergence from extract/baseline is intentional`,
    };
  }

  // Rule 4: historical-regression — current differs from pre-tier-b baseline
  if (baselineDiffSrc && baselineValue != null) {
    return {
      classification: "historical-regression",
      rationale: `current_src "${currentSrcValue}" differs from baseline "${baselineValue}" — potential regression introduced by Tier B migration`,
    };
  }

  // Rule 5: unknown — triaging required
  return {
    classification: "unknown",
    rationale: null,
  };
}

/**
 * Classify an array of divergences. Aborts with exit code 1 if too many are unknown without rationale.
 *
 * @param {object[]} divergences - array of divergence params (same shape as classifyDivergence input + output merged)
 * @param {string} slug - brand slug (for threshold check)
 * @param {boolean} [abortOnThreshold=true] - whether to throw if unknown% > threshold
 * @returns {object[]} classified divergences
 */
function classifyAll(divergences, slug, abortOnThreshold = true) {
  if (!divergences || !divergences.length) return [];

  const results = divergences.map((div) => {
    const { classification, rationale } = classifyDivergence({ slug, ...div });
    return { ...div, classification, rationale: div.rationale || rationale };
  });

  if (abortOnThreshold) {
    const unknownWithoutRationale = results.filter(
      (item) => item.classification === "unknown" && !item.rationale,
    );
    const ratio = unknownWithoutRationale.length / results.length;
    if (ratio > UNKNOWN_THRESHOLD) {
      const msg = [
        `[classify-divergence] ${slug}: ${unknownWithoutRationale.length}/${results.length} divergences (${(ratio * 100).toFixed(1)}%) are "unknown" without rationale.`,
        `Threshold is ${(UNKNOWN_THRESHOLD * 100).toFixed(0)}%. AC7 requires all unknowns to have a rationale.`,
        `Fields affected: ${unknownWithoutRationale.map((d) => d.field).join(", ")}`,
      ].join("\n");
      throw Object.assign(new Error(msg), { code: "UNKNOWN_THRESHOLD_EXCEEDED" });
    }
  }

  return results;
}

module.exports = {
  classifyDivergence,
  classifyAll,
  UNKNOWN_THRESHOLD,
  MANUAL_FIX_WHITELIST,
};
