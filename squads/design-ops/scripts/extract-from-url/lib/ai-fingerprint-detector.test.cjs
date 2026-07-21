'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  detectFontMonoculture,
  detectGradientText,
  detectSideStripeBorders,
  detectPureBlackWhite,
  detectLilaPalette,
  detectBouncyEasing,
  detectLayoutPropertyAnimation,
  computeScore,
  classifyScore,
  buildReport,
} = require('./ai-fingerprint-detector.cjs');

test('detectFontMonoculture flags Inter in brand register', () => {
  const result = detectFontMonoculture(
    [{ family: 'Inter' }, { family: 'Geist' }],
    'brand'
  );
  assert.equal(result.status, 'evaluated');
  assert.equal(result.hits.length, 1);
  assert.equal(result.hits[0].family, 'Inter');
  assert.equal(result.hits[0].severity, 'P1');
});

test('detectFontMonoculture allows Inter in product register', () => {
  const result = detectFontMonoculture([{ family: 'Inter' }], 'product');
  assert.equal(result.status, 'evaluated');
  assert.equal(result.hits.length, 0);
});

test('detectFontMonoculture flags Fraunces as P0 italic-serif', () => {
  const result = detectFontMonoculture([{ family: 'Fraunces' }], 'brand');
  assert.equal(result.hits[0].severity, 'P0');
});

test('detectFontMonoculture returns no_input when input missing', () => {
  const result = detectFontMonoculture(null, 'brand');
  assert.equal(result.status, 'no_input');
  assert.deepEqual(result.hits, []);
});

test('detectGradientText flags background-clip:text + linear-gradient', () => {
  const props = [
    { selector: 'h1', styles: 'background-clip:text;background:linear-gradient(45deg,#f00,#00f);' },
  ];
  const result = detectGradientText(props);
  assert.equal(result.hits.length, 1);
  assert.equal(result.hits[0].severity, 'P0');
});

test('detectGradientText skips when no gradient + clip combo', () => {
  const props = [{ selector: 'h1', styles: 'color:#333;' }];
  const result = detectGradientText(props);
  assert.equal(result.hits.length, 0);
});

test('detectSideStripeBorders flags border-left 4px solid colored', () => {
  const props = [
    { selector: '.card', styles: 'border-left: 4px solid #f00; padding:1rem;' },
  ];
  const result = detectSideStripeBorders(props);
  assert.equal(result.hits.length, 1);
  assert.equal(result.hits[0].ban_id, 'ban_01_side_stripe_borders');
});

test('detectSideStripeBorders allows 1px border-left', () => {
  const props = [{ selector: '.card', styles: 'border-left: 1px solid #ddd;' }];
  const result = detectSideStripeBorders(props);
  assert.equal(result.hits.length, 0);
});

test('detectPureBlackWhite flags #000 and #fff in tokens', () => {
  const tokens = { color: { bg: '#000000', surface: '#FFFFFF', accent: '#aabbcc' } };
  const result = detectPureBlackWhite(tokens);
  assert.equal(result.hits.length, 1);
  assert.ok(result.hits[0].count >= 2);
});

test('detectLilaPalette flags saturated purple OKLCH', () => {
  const tokens = { primary: 'oklch(60% 0.2 280)' };
  const result = detectLilaPalette(tokens);
  assert.equal(result.hits.length, 1);
  assert.equal(result.hits[0].ban_id, 'lila_purple_blue');
});

test('detectLilaPalette ignores low-chroma purple', () => {
  const tokens = { neutral: 'oklch(50% 0.05 280)' };
  const result = detectLilaPalette(tokens);
  assert.equal(result.hits.length, 0);
});

test('detectBouncyEasing flags cubic-bezier with overshoot', () => {
  const motion = { transition: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)' };
  const result = detectBouncyEasing(motion);
  assert.equal(result.hits.length, 1);
});

test('detectBouncyEasing flags named bounce easing', () => {
  const motion = { hover: { easing: 'bounce' } };
  const result = detectBouncyEasing(motion);
  assert.equal(result.hits.length, 1);
});

test('detectLayoutPropertyAnimation flags transition: width', () => {
  const motion = { primary: 'transition: width 0.3s ease-out;' };
  const result = detectLayoutPropertyAnimation(motion);
  assert.ok(result.hits.length >= 1);
});

test('computeScore returns 0 when no hits', () => {
  const score = computeScore([
    { status: 'evaluated', hits: [] },
    { status: 'no_input', hits: [] },
  ]);
  assert.equal(score, 0);
});

test('computeScore caps at 100', () => {
  const detectors = [
    { status: 'evaluated', hits: Array(20).fill({ severity: 'P0' }) },
  ];
  assert.equal(computeScore(detectors), 100);
});

test('classifyScore maps thresholds correctly', () => {
  assert.equal(classifyScore(0), 'adopt-safely');
  assert.equal(classifyScore(20), 'adopt-safely');
  assert.equal(classifyScore(30), 'adopt-with-warnings');
  assert.equal(classifyScore(50), 'review-manually');
  assert.equal(classifyScore(70), 'rebrief-recommended');
  assert.equal(classifyScore(90), 'rebrief-required');
});

test('buildReport returns complete shape with all detectors', () => {
  const report = buildReport({
    fontFaces: [{ family: 'Inter' }],
    componentProps: [{ selector: 'h1', styles: 'background-clip:text;background:linear-gradient(0,#f00,#00f);' }],
    tokens: { color: { bg: '#000000' }, primary: 'oklch(50% 0.18 270)' },
    motion: { transition: 'cubic-bezier(0.5, -0.3, 0.5, 1.4)', layout: 'transition: width 0.3s;' },
    register: 'brand',
    sourceUrl: 'https://example.com',
  });
  assert.equal(report.schema_version, '1.0');
  assert.equal(report.register, 'brand');
  assert.equal(report.source_url, 'https://example.com');
  assert.ok(report.ai_slop_score > 0);
  assert.ok(['adopt-safely', 'adopt-with-warnings', 'review-manually', 'rebrief-recommended', 'rebrief-required'].includes(report.recommendation));
  assert.ok(Array.isArray(report.detected_fingerprints));
  assert.ok(report.detected_fingerprints.length > 0);
  assert.equal(report.summary.total_detectors, 9);   // RT-FIX-3: 7 originais + glassmorphism + identical_card_grids
});

test('buildReport handles missing inputs gracefully', () => {
  const report = buildReport({
    fontFaces: null,
    componentProps: null,
    tokens: null,
    motion: null,
    register: 'unknown',
  });
  assert.equal(report.ai_slop_score, 0);
  assert.equal(report.recommendation, 'adopt-safely');
  assert.equal(report.summary.detectors_with_input, 0);
});

// ── RT-FIX-3 (2026-05-19): glassmorphism + identical-card-grid detectors ──

test('detectGlassmorphism flags backdrop-filter blur + rgba low-alpha bg', () => {
  const { detectGlassmorphism } = require('./ai-fingerprint-detector.cjs');
  const props = [
    { selector: '.glass-card', styles: 'backdrop-filter: blur(12px); background: rgba(255,255,255,0.1);' },
  ];
  const r = detectGlassmorphism(props);
  assert.equal(r.status, 'evaluated');
  assert.equal(r.hits.length, 1);
  assert.equal(r.hits[0].ban_id, 'ban_03_glassmorphism_default');
});

test('detectGlassmorphism skips when only one signal present', () => {
  const { detectGlassmorphism } = require('./ai-fingerprint-detector.cjs');
  const r = detectGlassmorphism([
    { selector: '.tinted', styles: 'background: rgba(0,0,0,0.05);' }, // no blur
  ]);
  assert.equal(r.hits.length, 0);
});

test('detectIdenticalCardGrids flags 3+ uniform cards in symmetric grid', () => {
  const { detectIdenticalCardGrids } = require('./ai-fingerprint-detector.cjs');
  const props = [
    { selector: '.layout', styles: 'grid-template-columns: repeat(3, 1fr);' },
    { selector: '.card', styles: 'padding: 1rem; height: 200px;' },
    { selector: '.card-item', styles: 'padding: 1rem; height: 200px;' },
    { selector: '.feature-card', styles: 'padding: 1rem; height: 200px;' },
  ];
  const r = detectIdenticalCardGrids(props);
  assert.equal(r.status, 'evaluated');
  assert.equal(r.hits.length, 1);
  assert.equal(r.hits[0].ban_id, 'ban_05_identical_card_grids');
});

test('detectIdenticalCardGrids skips when cards have varied dimensions', () => {
  const { detectIdenticalCardGrids } = require('./ai-fingerprint-detector.cjs');
  const props = [
    { selector: '.layout', styles: 'grid-template-columns: repeat(3, 1fr);' },
    { selector: '.card', styles: 'padding: 1rem; height: 200px;' },
    { selector: '.card', styles: 'padding: 1.5rem; height: 280px;' }, // varied
    { selector: '.card', styles: 'padding: 0.75rem; height: 160px;' }, // varied
  ];
  const r = detectIdenticalCardGrids(props);
  assert.equal(r.hits.length, 0);
});

test('detectIdenticalCardGrids skips when fewer than 3 cards', () => {
  const { detectIdenticalCardGrids } = require('./ai-fingerprint-detector.cjs');
  const r = detectIdenticalCardGrids([
    { selector: '.layout', styles: 'grid-template-columns: repeat(3, 1fr);' },
    { selector: '.card', styles: 'padding: 1rem; height: 200px;' },
    { selector: '.card', styles: 'padding: 1rem; height: 200px;' },
  ]);
  assert.equal(r.hits.length, 0);
});

test('buildReport includes both new detectors', () => {
  const { buildReport } = require('./ai-fingerprint-detector.cjs');
  const r = buildReport({
    componentProps: [
      { selector: '.glass', styles: 'backdrop-filter: blur(10px); background: rgba(255,255,255,0.08);' },
      { selector: '.layout', styles: 'grid-template-columns: repeat(3, 1fr);' },
      { selector: '.card', styles: 'padding: 1rem; height: 200px;' },
      { selector: '.feature-card', styles: 'padding: 1rem; height: 200px;' },
      { selector: '.card-item', styles: 'padding: 1rem; height: 200px;' },
    ],
    register: 'product',
  });
  assert.equal(r.summary.total_detectors, 9); // 7 originais + 2 novos
  assert.ok(r.detected_fingerprints.some(h => h.ban_id === 'ban_03_glassmorphism_default'));
  assert.ok(r.detected_fingerprints.some(h => h.ban_id === 'ban_05_identical_card_grids'));
});
