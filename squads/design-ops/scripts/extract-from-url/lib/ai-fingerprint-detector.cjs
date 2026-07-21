'use strict';

/**
 * AI Fingerprint Detector — Sidecar for /design-md extraction
 *
 * Authority: .claude/rules/design-absolute-bans.md
 * Absorbs: impeccable.style 29-rule detector + tasteskill.dev anti-Lila/anti-Inter
 *
 * Reads extraction sidecars and emits ai-fingerprint-report.json with
 * a 0-100 AI-slop probability score + detected fingerprints + recommendation.
 *
 * NEVER fabricates fallbacks per .claude/rules/extraction-no-fallbacks.md —
 * if input sidecar missing, returns "no_input" status rather than guessing.
 */

// ── Detectors (each returns { status, hits[] }) ────────────────────────

/**
 * Detect AI-monoculture fonts.
 * input fontFaces: [{ family, weight, ... }, ...] from inputs/font-faces.json
 * input register: 'brand' | 'product' | unknown
 */
function detectFontMonoculture(fontFaces, register) {
  if (!fontFaces || !Array.isArray(fontFaces)) {
    return { status: 'no_input', hits: [], detector: 'font_monoculture' };
  }

  const blocklist = {
    Inter: { severity: 'P1', context_block: ['brand', 'pitch', 'marketing', 'creative'] },
    'Inter Tight': { severity: 'P1', context_block: ['brand', 'pitch', 'marketing', 'creative'] },
    Fraunces: { severity: 'P0', context_block: ['all'], pattern: 'italic_serif_hero' },
    Recoleta: { severity: 'P0', context_block: ['all'], pattern: 'italic_serif_hero' },
    'Mona Sans': { severity: 'P1', context_block: ['all'] },
    'Plus Jakarta Sans': { severity: 'P1', context_block: ['all'] },
    'Space Grotesk': { severity: 'P1', context_block: ['all'] },
    'Instrument Sans': { severity: 'P1', context_block: ['all'] },
    'Geist Mono': { severity: 'P2', context_block: ['brand'] }, // monoculture creep outside dashboards
  };

  const hits = [];
  for (const face of fontFaces) {
    const family = face.family || face.name;
    if (!family) continue;
    const entry = blocklist[family];
    if (!entry) continue;
    const blocked = entry.context_block.includes('all') || entry.context_block.includes(register);
    if (blocked) {
      hits.push({
        ban_id: 'font_monoculture',
        family,
        severity: entry.severity,
        register,
        pattern: entry.pattern || 'monoculture_signal',
        replacement: 'Geist | Outfit | Cabinet Grotesk | Satoshi',
      });
    }
  }
  return { status: 'evaluated', hits, detector: 'font_monoculture' };
}

/**
 * Detect ban_02 gradient text.
 * input componentProps: [{ selector, styles }, ...] from inputs/component-properties.json
 */
function detectGradientText(componentProps) {
  if (!componentProps || !Array.isArray(componentProps)) {
    return { status: 'no_input', hits: [], detector: 'gradient_text' };
  }
  const hits = [];
  for (const node of componentProps) {
    const s = (node.styles || '').toString().toLowerCase();
    const hasClip = /background-clip:\s*text|-webkit-background-clip:\s*text/.test(s);
    const hasGradient = /(linear|radial|conic)-gradient\s*\(/.test(s);
    if (hasClip && hasGradient) {
      hits.push({
        ban_id: 'ban_02_gradient_text',
        selector: node.selector,
        severity: 'P0',
        replacement: 'Single solid color. Emphasis via weight or size.',
      });
    }
  }
  return { status: 'evaluated', hits, detector: 'gradient_text' };
}

/**
 * Detect ban_01 side-stripe borders (>1px colored accent on left/right).
 */
function detectSideStripeBorders(componentProps) {
  if (!componentProps || !Array.isArray(componentProps)) {
    return { status: 'no_input', hits: [], detector: 'side_stripe_borders' };
  }
  const hits = [];
  const re = /border-(left|right):\s*(\d+)px\s+(solid|dashed|dotted)\s+(#[0-9a-fA-F]{3,8}|rgb|hsl|oklch|oklab|lch|lab)/;
  for (const node of componentProps) {
    const s = (node.styles || '').toString();
    const m = s.match(re);
    if (m && parseInt(m[2], 10) > 1) {
      hits.push({
        ban_id: 'ban_01_side_stripe_borders',
        selector: node.selector,
        evidence: m[0],
        severity: 'P1',
        replacement: 'Full borders, background tints, leading numbers/icons, or nothing.',
      });
    }
  }
  return { status: 'evaluated', hits, detector: 'side_stripe_borders' };
}

/**
 * Detect ban_08 pure #000 / #fff (no brand tint).
 */
function detectPureBlackWhite(tokens) {
  if (!tokens || typeof tokens !== 'object') {
    return { status: 'no_input', hits: [], detector: 'pure_black_white' };
  }
  let count = 0;
  const where = [];
  const walk = (obj, path = []) => {
    if (!obj) return;
    if (typeof obj === 'string') {
      const v = obj.replace(/\s/g, '').toLowerCase();
      if (v === '#000' || v === '#000000' || v === '#fff' || v === '#ffffff') {
        count += 1;
        where.push(path.join('.'));
      }
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => walk(item, [...path, i]));
      return;
    }
    if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        walk(obj[k], [...path, k]);
      }
    }
  };
  walk(tokens);
  const hits = count > 0
    ? [{
        ban_id: 'ban_08_pure_black_or_white',
        count,
        locations: where.slice(0, 10),
        severity: 'P1',
        replacement: 'Tint neutrals to brand hue (Off-Black, Zinc-950, brand-tinted). min_chroma 0.005.',
      }]
    : [];
  return { status: 'evaluated', hits, detector: 'pure_black_white' };
}

/**
 * Detect "Lila" purple/blue AI aesthetic.
 * Looks for tokens whose OKLCH hue is in [260, 280] with chroma > 0.1.
 */
function detectLilaPalette(tokens) {
  if (!tokens || typeof tokens !== 'object') {
    return { status: 'no_input', hits: [], detector: 'lila_palette' };
  }
  const hits = [];
  // OKLCH pattern: oklch(L% C H) or oklch(L C H)
  const oklchRe = /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\s*\)/i;
  const walk = (obj, path = []) => {
    if (!obj) return;
    if (typeof obj === 'string') {
      const m = obj.match(oklchRe);
      if (m) {
        const chroma = parseFloat(m[2]);
        const hue = parseFloat(m[3]);
        if (chroma > 0.1 && hue >= 260 && hue <= 285) {
          hits.push({
            ban_id: 'lila_purple_blue',
            location: path.join('.'),
            value: obj,
            severity: 'P1',
            replacement: 'Zinc/Slate neutral + Emerald | Electric Blue | Deep Rose accent',
          });
        }
      }
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => walk(item, [...path, i]));
      return;
    }
    if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) walk(obj[k], [...path, k]);
    }
  };
  walk(tokens);
  return { status: 'evaluated', hits, detector: 'lila_palette' };
}

/**
 * Detect bouncy/elastic easing in motion specs.
 */
function detectBouncyEasing(motion) {
  if (!motion || typeof motion !== 'object') {
    return { status: 'no_input', hits: [], detector: 'bouncy_easing' };
  }
  const hits = [];
  // cubic-bezier with negative y values OR > 1 (overshoot)
  const overshootRe = /cubic-bezier\(\s*[\d.-]+\s*,\s*(-[\d.]+|[\d.]+)\s*,\s*[\d.-]+\s*,\s*(-[\d.]+|[\d.]*[2-9][\d.]*)\s*\)/i;
  const namedBounceRe = /\b(bounce|elastic|back-?in|back-?out|back-?in-?out)\b/i;
  const walk = (obj, path = []) => {
    if (!obj) return;
    if (typeof obj === 'string') {
      if (overshootRe.test(obj) || namedBounceRe.test(obj)) {
        hits.push({
          ban_id: 'animation_easing_bouncy',
          location: path.join('.'),
          evidence: obj,
          severity: 'P1',
          replacement: 'ease-out-quart | ease-out-quint | ease-out-expo. No overshoot.',
        });
      }
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => walk(item, [...path, i]));
      return;
    }
    if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) walk(obj[k], [...path, k]);
    }
  };
  walk(motion);
  return { status: 'evaluated', hits, detector: 'bouncy_easing' };
}

/**
 * Detect animation of layout properties (width/height/top/left/margin/padding).
 */
function detectLayoutPropertyAnimation(motion) {
  if (!motion || typeof motion !== 'object') {
    return { status: 'no_input', hits: [], detector: 'layout_property_animation' };
  }
  const hits = [];
  const layoutPropRe = /transition[^;]*:\s*[^;]*\b(width|height|top|left|right|bottom|margin|padding|inset)\b/i;
  const walk = (obj, path = []) => {
    if (!obj) return;
    if (typeof obj === 'string') {
      if (layoutPropRe.test(obj)) {
        hits.push({
          ban_id: 'animation_layout_properties',
          location: path.join('.'),
          evidence: obj.slice(0, 120),
          severity: 'P2',
          replacement: 'Animate via transform (translate/scale/rotate) and opacity only.',
        });
      }
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => walk(item, [...path, i]));
      return;
    }
    if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) walk(obj[k], [...path, k]);
    }
  };
  walk(motion);
  return { status: 'evaluated', hits, detector: 'layout_property_animation' };
}

/**
 * Detect ban_03 glassmorphism as default (decorative blurred glass).
 * RT-FIX-3 (@design-chief 2026-05-19): missing detector identified.
 * Looks for: backdrop-filter: blur(N) + background: rgba(...) with low alpha.
 */
function detectGlassmorphism(componentProps) {
  if (!componentProps || !Array.isArray(componentProps)) {
    return { status: 'no_input', hits: [], detector: 'glassmorphism' };
  }
  const hits = [];
  const blurRe = /(?:-webkit-)?backdrop-filter:\s*[^;]*blur\(\s*\d+(?:\.\d+)?(?:px|rem|em)?\s*\)/i;
  const rgbaLowAlphaRe = /background(?:-color)?:\s*rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0?\.\d+\s*\)/i;
  for (const node of componentProps) {
    const s = (node.styles || '').toString().toLowerCase();
    const hasBlur = blurRe.test(s);
    const hasGlassBg = rgbaLowAlphaRe.test(s);
    if (hasBlur && hasGlassBg) {
      hits.push({
        ban_id: 'ban_03_glassmorphism_default',
        selector: node.selector,
        severity: 'P1',
        evidence: 'backdrop-filter blur + rgba low-alpha background',
        replacement: 'Use rarely and purposefully. Default to solid surface or background tint.',
      });
    }
  }
  return { status: 'evaluated', hits, detector: 'glassmorphism' };
}

/**
 * Detect ban_05 identical card grids (3+ children with same class/structure).
 * RT-FIX-3 (@design-chief 2026-05-19): missing detector identified.
 * Heuristic: count occurrences of `.card`-pattern selectors AND look for
 * grid-template-columns repeat(3..N, 1fr) — both signals together = identical grid.
 */
function detectIdenticalCardGrids(componentProps) {
  if (!componentProps || !Array.isArray(componentProps)) {
    return { status: 'no_input', hits: [], detector: 'identical_card_grids' };
  }
  const hits = [];

  // Count selectors that look like card variants (.card, .card-item, .feature-card, etc)
  const cardSelectorRe = /\.(card|feature-card|card-item|tile|grid-item|product-card|service-card)\b/i;
  const cardCount = componentProps.filter((n) => cardSelectorRe.test(n.selector || '')).length;

  // Find symmetric grid templates with 3+ columns
  const symmetricGridRe = /grid-template-columns:\s*repeat\(\s*([3-9]|1[0-2])\s*,\s*(?:1fr|minmax\([^)]*\)\s*)\)/i;
  const hasSymGrid = componentProps.some((n) => symmetricGridRe.test((n.styles || '').toString()));

  // Heuristic: 3+ card selectors AND symmetric 3+ col grid AND no variation in card height/padding
  // Variation absence proxy: count distinct `height:` and `padding:` declarations across card selectors
  const cardNodes = componentProps.filter((n) => cardSelectorRe.test(n.selector || ''));
  const distinctHeights = new Set(
    cardNodes.map((n) => {
      const m = (n.styles || '').match(/height:\s*([^;]+)/);
      return m ? m[1].trim() : null;
    }).filter(Boolean)
  );
  const distinctPaddings = new Set(
    cardNodes.map((n) => {
      const m = (n.styles || '').match(/padding:\s*([^;]+)/);
      return m ? m[1].trim() : null;
    }).filter(Boolean)
  );
  const uniformCards = cardNodes.length >= 3 && distinctHeights.size <= 1 && distinctPaddings.size <= 1;

  if (cardCount >= 3 && hasSymGrid && uniformCards) {
    hits.push({
      ban_id: 'ban_05_identical_card_grids',
      severity: 'P1',
      evidence: `${cardCount} card selectors in symmetric grid with uniform height/padding (distinct h=${distinctHeights.size}, distinct p=${distinctPaddings.size})`,
      replacement: 'Use 2-col zig-zag, asymmetric grid (2fr 1fr 1fr), horizontal scroll, or single varied row.',
    });
  }
  return { status: 'evaluated', hits, detector: 'identical_card_grids' };
}

// ── Scoring ────────────────────────────────────────────────────────────

/**
 * Compute aggregate 0-100 score from detector results.
 * Severity weights: P0=15, P1=8, P2=3.
 * Capped at 100.
 */
function computeScore(detectors) {
  const W = { P0: 15, P1: 8, P2: 3 };
  let total = 0;
  for (const det of detectors) {
    if (det.status !== 'evaluated') continue;
    for (const hit of det.hits || []) {
      total += W[hit.severity] || 0;
    }
  }
  return Math.min(100, total);
}

/**
 * Classify 0-100 score into actionable recommendation.
 */
function classifyScore(score) {
  if (score >= 81) return 'rebrief-required';
  if (score >= 61) return 'rebrief-recommended';
  if (score >= 41) return 'review-manually';
  if (score >= 21) return 'adopt-with-warnings';
  return 'adopt-safely';
}

// ── Public report builder ──────────────────────────────────────────────

/**
 * Run all detectors and build a complete report.
 *
 * @param {Object} inputs
 * @param {Array}  inputs.fontFaces        - inputs/font-faces.json
 * @param {Array}  inputs.componentProps   - inputs/component-properties.json
 * @param {Object} inputs.tokens           - tokens-extended.json or tokens.json
 * @param {Object} inputs.motion           - inputs/motion.json
 * @param {string} inputs.register         - 'brand' | 'product' | 'unknown'
 * @param {string} inputs.sourceUrl        - URL being extracted
 *
 * @returns {Object} ai-fingerprint-report.json content
 */
function buildReport(inputs) {
  const register = inputs.register || 'unknown';

  const detectors = [
    detectFontMonoculture(inputs.fontFaces, register),
    detectGradientText(inputs.componentProps),
    detectSideStripeBorders(inputs.componentProps),
    detectPureBlackWhite(inputs.tokens),
    detectLilaPalette(inputs.tokens),
    detectBouncyEasing(inputs.motion),
    detectLayoutPropertyAnimation(inputs.motion),
    detectGlassmorphism(inputs.componentProps),      // RT-FIX-3 2026-05-19
    detectIdenticalCardGrids(inputs.componentProps), // RT-FIX-3 2026-05-19
  ];

  const score = computeScore(detectors);
  const recommendation = classifyScore(score);

  const detected_fingerprints = [];
  for (const det of detectors) {
    if (det.status !== 'evaluated') continue;
    for (const hit of det.hits || []) detected_fingerprints.push(hit);
  }

  return {
    schema_version: '1.0',
    authority: '.claude/rules/design-absolute-bans.md',
    generated_at: new Date().toISOString(),
    source_url: inputs.sourceUrl || null,
    register,
    register_was_inferred: register !== 'unknown',
    ai_slop_score: score,
    recommendation,
    threshold_actions: {
      '0-20': 'pass',
      '21-40': 'warn',
      '41-60': 'review',
      '61-80': 'block',
      '81-100': 'hard-block',
    },
    detector_status: detectors.map((d) => ({ detector: d.detector, status: d.status, hit_count: (d.hits || []).length })),
    detected_fingerprints,
    summary: {
      total_detectors: detectors.length,
      detectors_with_input: detectors.filter((d) => d.status === 'evaluated').length,
      total_hits: detected_fingerprints.length,
      hits_by_severity: {
        P0: detected_fingerprints.filter((h) => h.severity === 'P0').length,
        P1: detected_fingerprints.filter((h) => h.severity === 'P1').length,
        P2: detected_fingerprints.filter((h) => h.severity === 'P2').length,
      },
    },
  };
}

module.exports = {
  detectFontMonoculture,
  detectGradientText,
  detectSideStripeBorders,
  detectPureBlackWhite,
  detectLilaPalette,
  detectBouncyEasing,
  detectLayoutPropertyAnimation,
  detectGlassmorphism,          // RT-FIX-3 2026-05-19
  detectIdenticalCardGrids,     // RT-FIX-3 2026-05-19
  computeScore,
  classifyScore,
  buildReport,
};
