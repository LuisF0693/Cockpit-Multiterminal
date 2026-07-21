'use strict';

/**
 * Dial Reverse-Inference for /design-md
 *
 * Authority: .claude/rules/design-absolute-bans.md + tasteskill.dev v2 Sections 1+6
 * Source bench: docs/bench/2026-05-18-impeccable-vs-sinkra-design-stack/
 *
 * Reverse-engineers tasteskill dials (DESIGN_VARIANCE / MOTION_INTENSITY /
 * VISUAL_DENSITY) from extracted sidecars. Result is emitted as
 * dial-inference.yaml downstream of /design-md.
 *
 * Each dial returns an integer 1-10 + a confidence 0-1.
 * Follows .claude/rules/extraction-no-fallbacks.md — returns
 * { score: null, confidence: 0, status: 'no_input' } when input missing.
 */

// ── DESIGN_VARIANCE inference ─────────────────────────────────────────
/**
 * Reads layout/grid signals to infer composition variance.
 *
 * Signals (each adds 0-3 points to a raw 0-15 scale):
 *   - Asymmetric grid columns (e.g. 2fr 1fr 1fr): +3
 *   - Massive empty zones (>20vw padding): +2
 *   - Masonry layouts detected: +3
 *   - Overlapping margins (margin-top negative): +2
 *   - Varied aspect ratios in adjacent media: +2
 *   - Left/right-aligned headers over centered data: +1
 *   - Strict 12-column symmetric grid only: -3
 *   - Flexbox justify-center as dominant: -2
 */
function inferDesignVariance(atomicClassification, componentProps, tokens) {
  if (!atomicClassification && !componentProps) {
    return { dial: 'DESIGN_VARIANCE', score: null, confidence: 0, status: 'no_input', signals: [] };
  }

  const signals = [];
  let rawScore = 5; // midpoint default if input present but mixed signals

  const props = Array.isArray(componentProps) ? componentProps : [];

  // Asymmetric grid detection
  const asymmetricGridRe = /grid-template-columns:\s*[^;]*(\d+fr\s+\d+fr\s+\d+fr|\d+fr\s+\d+fr)[^;]*/i;
  const symmetricGridRe = /grid-template-columns:\s*repeat\(\d+,\s*1fr\)/i;
  let asymmetricHits = 0;
  let symmetricHits = 0;
  for (const node of props) {
    const s = (node.styles || '').toString().toLowerCase();
    if (asymmetricGridRe.test(s)) {
      const m = s.match(asymmetricGridRe);
      if (m && /\b(2fr|3fr|4fr|5fr)\b/.test(m[0])) {
        asymmetricHits += 1;
      }
    }
    if (symmetricGridRe.test(s)) symmetricHits += 1;
  }
  if (asymmetricHits > 0) {
    rawScore += 3;
    signals.push({ type: 'asymmetric_grid', count: asymmetricHits, delta: 3 });
  }
  if (symmetricHits > 2 && asymmetricHits === 0) {
    rawScore -= 3;
    signals.push({ type: 'strict_symmetric_grid_dominant', count: symmetricHits, delta: -3 });
  }

  // Negative-margin overlapping
  const negativeMarginRe = /margin(-top|-bottom|-left|-right)?:\s*-\d+/i;
  const negativeMarginHits = props.filter((n) => negativeMarginRe.test((n.styles || '').toString())).length;
  if (negativeMarginHits >= 2) {
    rawScore += 2;
    signals.push({ type: 'overlapping_margins', count: negativeMarginHits, delta: 2 });
  }

  // Massive empty zones (padding > 20vw or paddingLeft > 320px or so)
  const massiveEmptyRe = /padding[^;]*:\s*[^;]*(2[0-9]vw|3\dvw|4\dvw|5\dvw|6\dvw|7\dvw|8\dvw|9\dvw)/i;
  const massiveEmptyHits = props.filter((n) => massiveEmptyRe.test((n.styles || '').toString())).length;
  if (massiveEmptyHits > 0) {
    rawScore += 2;
    signals.push({ type: 'massive_empty_zones', count: massiveEmptyHits, delta: 2 });
  }

  // Masonry / non-uniform row heights
  const masonryRe = /(grid-template-rows:\s*masonry|column-count:\s*\d|columns:\s*\d)/i;
  const masonryHits = props.filter((n) => masonryRe.test((n.styles || '').toString())).length;
  if (masonryHits > 0) {
    rawScore += 3;
    signals.push({ type: 'masonry_or_column_layout', count: masonryHits, delta: 3 });
  }

  // Centered hero dominant
  let centeredHeroHits = 0;
  for (const node of props) {
    const s = (node.styles || '').toString();
    if (/text-align:\s*center/.test(s) && /(hero|h1|display)/i.test(node.selector || '')) {
      centeredHeroHits += 1;
    }
  }
  if (centeredHeroHits > 0 && asymmetricHits === 0) {
    rawScore -= 2;
    signals.push({ type: 'centered_hero_dominant', count: centeredHeroHits, delta: -2 });
  }

  // Atomic-classification signal: if extractor found many "templates" / "pages" with similar structure → low variance
  if (atomicClassification && typeof atomicClassification === 'object') {
    const templateCount = (atomicClassification.templates || []).length;
    const pageCount = (atomicClassification.pages || []).length;
    if (templateCount > 0 && pageCount > 0 && templateCount === pageCount) {
      rawScore -= 1;
      signals.push({ type: 'every_page_uses_same_template', count: templateCount, delta: -1 });
    }
  }

  // Clamp to 1-10
  const score = Math.max(1, Math.min(10, rawScore));
  // Confidence proportional to number of signals consulted
  const confidence = Math.min(1, signals.length / 5);

  return { dial: 'DESIGN_VARIANCE', score, confidence, status: 'evaluated', signals };
}

// ── MOTION_INTENSITY inference ────────────────────────────────────────
/**
 * Reads motion sidecar to infer motion budget.
 *
 * Signals:
 *   - Spring transitions detected (Framer Motion): +2
 *   - Scroll-driven motion (parallax, scroll-snap, scroll-timeline): +3
 *   - Multiple keyframe animations: +2
 *   - View transitions API: +2
 *   - Continuous/infinite animations: +1
 *   - Only :hover transitions: -2
 *   - No motion sidecar entries: -3 (static)
 */
function inferMotionIntensity(motion) {
  if (!motion || typeof motion !== 'object') {
    return { dial: 'MOTION_INTENSITY', score: null, confidence: 0, status: 'no_input', signals: [] };
  }

  const signals = [];
  let rawScore = 4; // default midpoint

  const motionStr = JSON.stringify(motion);

  // Spring physics signals
  if (/\bspring\b|stiffness|damping|useMotionValue|useTransform/i.test(motionStr)) {
    rawScore += 2;
    signals.push({ type: 'spring_physics_detected', delta: 2 });
  }

  // Scroll-driven motion
  if (/scroll-timeline|scroll-snap|useScroll|parallax|scroll-driven/i.test(motionStr)) {
    rawScore += 3;
    signals.push({ type: 'scroll_driven_motion', delta: 3 });
  }

  // Keyframes count
  const keyframeMatches = motionStr.match(/@keyframes\b/g) || [];
  if (keyframeMatches.length >= 3) {
    rawScore += 2;
    signals.push({ type: 'multiple_keyframe_animations', count: keyframeMatches.length, delta: 2 });
  }

  // View transitions
  if (/view-transition|view-transition-name|::view-transition/i.test(motionStr)) {
    rawScore += 2;
    signals.push({ type: 'view_transitions_api', delta: 2 });
  }

  // Continuous/infinite
  const infiniteRe = /(animation-iteration-count:\s*infinite|repeat:\s*Infinity|repeat:\s*-1)/i;
  if (infiniteRe.test(motionStr)) {
    rawScore += 1;
    signals.push({ type: 'continuous_animations', delta: 1 });
  }

  // Transitions structure check
  const transitions = Array.isArray(motion.transitions) ? motion.transitions : [];
  const hoverOnlyTransitions = transitions.filter((t) => /\bhover\b/i.test(JSON.stringify(t)) && !/(scroll|spring|infinite|keyframe)/i.test(JSON.stringify(t)));
  if (transitions.length > 0 && hoverOnlyTransitions.length === transitions.length) {
    rawScore -= 2;
    signals.push({ type: 'only_hover_transitions', count: transitions.length, delta: -2 });
  }

  // Empty motion sidecar — only flag if no positive signals were added
  const hasPositiveSignal = signals.some((s) => s.delta > 0);
  if (!hasPositiveSignal && transitions.length === 0 && keyframeMatches.length === 0 && Object.keys(motion).length < 3) {
    rawScore -= 3;
    signals.push({ type: 'no_motion_detected', delta: -3 });
  }

  const score = Math.max(1, Math.min(10, rawScore));
  const confidence = Math.min(1, signals.length / 4);

  return { dial: 'MOTION_INTENSITY', score, confidence, status: 'evaluated', signals };
}

// ── VISUAL_DENSITY inference ──────────────────────────────────────────
/**
 * Reads spacing tokens + layout signals to infer visual density.
 *
 * Signals (each contributes to raw 1-15 scale):
 *   - Default paddings < 8px observed: +3 (cockpit)
 *   - Default paddings < 16px observed: +1
 *   - Default paddings > 48px observed: -3 (gallery)
 *   - Default paddings > 32px observed: -1
 *   - font-mono used for numeric data: +2
 *   - Many cards on one page (>10): +1
 *   - Single hero with massive whitespace: -2
 *   - Section gaps > 96px: -1
 */
function inferVisualDensity(tokens, componentProps) {
  if (!tokens && !componentProps) {
    return { dial: 'VISUAL_DENSITY', score: null, confidence: 0, status: 'no_input', signals: [] };
  }

  const signals = [];
  let rawScore = 5;

  // Token-based spacing scale analysis
  if (tokens && typeof tokens === 'object') {
    const spacings = collectNumericValues(tokens, /spacing|padding|gap|margin/i, /\d+(\.\d+)?(px|rem|em)?/);
    if (spacings.length > 0) {
      const avgPx = avgInPx(spacings);
      if (avgPx !== null) {
        if (avgPx < 8) { rawScore += 3; signals.push({ type: 'spacing_scale_tight_lt_8px', avgPx, delta: 3 }); }
        else if (avgPx < 16) { rawScore += 1; signals.push({ type: 'spacing_scale_compact_8_16px', avgPx, delta: 1 }); }
        else if (avgPx > 48) { rawScore -= 3; signals.push({ type: 'spacing_scale_airy_gt_48px', avgPx, delta: -3 }); }
        else if (avgPx > 32) { rawScore -= 1; signals.push({ type: 'spacing_scale_generous_32_48px', avgPx, delta: -1 }); }
      }
    }
  }

  // font-mono for data (signal for cockpit mode)
  const props = Array.isArray(componentProps) ? componentProps : [];
  let monoForDataHits = 0;
  for (const node of props) {
    const s = (node.styles || '').toString();
    if (/font-family:\s*[^;]*mono/i.test(s) && /(td|tr|table|\.metric|\.stat|\.data)/i.test(node.selector || '')) {
      monoForDataHits += 1;
    }
  }
  if (monoForDataHits >= 2) {
    rawScore += 2;
    signals.push({ type: 'mono_for_numeric_data', count: monoForDataHits, delta: 2 });
  }

  // Many cards
  const cardHits = props.filter((n) => /\bcard\b/i.test(n.selector || '')).length;
  if (cardHits > 10) {
    rawScore += 1;
    signals.push({ type: 'high_card_count', count: cardHits, delta: 1 });
  }

  // Big section gaps (low density signal)
  const bigGapRe = /(gap|row-gap|column-gap):\s*(9[6-9]|1[0-9]{2,}|2[0-9]{2})px/i;
  const bigGapHits = props.filter((n) => bigGapRe.test((n.styles || '').toString())).length;
  if (bigGapHits > 0) {
    rawScore -= 1;
    signals.push({ type: 'big_section_gaps', count: bigGapHits, delta: -1 });
  }

  const score = Math.max(1, Math.min(10, rawScore));
  const confidence = Math.min(1, signals.length / 4);

  return { dial: 'VISUAL_DENSITY', score, confidence, status: 'evaluated', signals };
}

// ── helpers ───────────────────────────────────────────────────────────

function collectNumericValues(obj, keyPattern, valuePattern) {
  const out = [];
  const walk = (node, inMatchedSubtree = false) => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach((n) => walk(n, inMatchedSubtree));
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        const keyMatches = keyPattern.test(k);
        // If this key matches the pattern, all string descendants are candidates
        if (keyMatches && typeof v === 'string' && valuePattern.test(v)) {
          out.push(v);
        } else if (keyMatches && typeof v === 'object') {
          // Descend into matched subtree (e.g. spacing: { xs: '2px', sm: '4px' })
          walk(v, true);
        } else if (inMatchedSubtree && typeof v === 'string' && valuePattern.test(v)) {
          out.push(v);
        } else {
          walk(v, inMatchedSubtree);
        }
      }
    }
  };
  walk(obj, false);
  return out;
}

function avgInPx(values) {
  const px = [];
  for (const v of values) {
    const m = v.match(/(\d+(\.\d+)?)(px|rem|em)?/);
    if (!m) continue;
    const n = parseFloat(m[1]);
    const unit = m[3] || 'px';
    if (unit === 'rem' || unit === 'em') px.push(n * 16);
    else px.push(n);
  }
  if (px.length === 0) return null;
  return px.reduce((a, b) => a + b, 0) / px.length;
}

// ── Public report builder ─────────────────────────────────────────────

/**
 * Build dial-inference report.
 *
 * @param {Object} inputs
 * @param {Object} inputs.tokens
 * @param {Object} inputs.atomicClassification
 * @param {Array}  inputs.componentProps
 * @param {Object} inputs.motion
 * @param {string} inputs.sourceUrl
 *
 * @returns {Object} dial-inference.yaml content
 */
function buildReport(inputs) {
  const variance = inferDesignVariance(inputs.atomicClassification, inputs.componentProps, inputs.tokens);
  const motion = inferMotionIntensity(inputs.motion);
  const density = inferVisualDensity(inputs.tokens, inputs.componentProps);

  return {
    schema_version: '1.0',
    authority: '.claude/rules/design-absolute-bans.md + tasteskill.dev v2 Sections 1+6',
    generated_at: new Date().toISOString(),
    source_url: inputs.sourceUrl || null,
    dials: {
      DESIGN_VARIANCE: variance,
      MOTION_INTENSITY: motion,
      VISUAL_DENSITY: density,
    },
    overall_confidence: avg([variance.confidence, motion.confidence, density.confidence]),
    consumption_hint: {
      slide_creator: 'Use these dials as preflight signal when generating a deck inspired by source_url',
      design_md: 'Embed in DESIGN.md frontmatter as tasteskill_dials: { DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY }',
    },
  };
}

function avg(arr) {
  const valid = arr.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

module.exports = {
  inferDesignVariance,
  inferMotionIntensity,
  inferVisualDensity,
  buildReport,
};
