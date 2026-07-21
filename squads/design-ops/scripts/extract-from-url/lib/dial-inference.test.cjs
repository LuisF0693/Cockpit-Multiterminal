'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  inferDesignVariance,
  inferMotionIntensity,
  inferVisualDensity,
  buildReport,
} = require('./dial-inference.cjs');

test('inferDesignVariance returns no_input when both inputs missing', () => {
  const r = inferDesignVariance(null, null, null);
  assert.equal(r.status, 'no_input');
  assert.equal(r.score, null);
  assert.equal(r.confidence, 0);
});

test('inferDesignVariance bumps with asymmetric grid', () => {
  const r = inferDesignVariance(
    null,
    [
      { selector: '.layout', styles: 'grid-template-columns: 2fr 1fr 1fr;' },
      { selector: '.layout2', styles: 'grid-template-columns: 3fr 1fr;' },
    ],
    null
  );
  assert.equal(r.status, 'evaluated');
  assert.ok(r.score > 5);
  assert.ok(r.signals.some((s) => s.type === 'asymmetric_grid'));
});

test('inferDesignVariance reduces with strict symmetric grids', () => {
  const r = inferDesignVariance(
    null,
    [
      { selector: '.l1', styles: 'grid-template-columns: repeat(12, 1fr);' },
      { selector: '.l2', styles: 'grid-template-columns: repeat(12, 1fr);' },
      { selector: '.l3', styles: 'grid-template-columns: repeat(12, 1fr);' },
    ],
    null
  );
  assert.equal(r.status, 'evaluated');
  assert.ok(r.score < 5);
  assert.ok(r.signals.some((s) => s.type === 'strict_symmetric_grid_dominant'));
});

test('inferDesignVariance detects masonry', () => {
  const r = inferDesignVariance(
    null,
    [{ selector: '.gallery', styles: 'column-count: 3;' }],
    null
  );
  assert.ok(r.signals.some((s) => s.type === 'masonry_or_column_layout'));
});

test('inferMotionIntensity returns no_input when motion missing', () => {
  const r = inferMotionIntensity(null);
  assert.equal(r.status, 'no_input');
  assert.equal(r.score, null);
});

test('inferMotionIntensity bumps with spring physics', () => {
  const r = inferMotionIntensity({ animation: 'spring with stiffness 100 damping 20' });
  assert.equal(r.status, 'evaluated');
  assert.ok(r.score > 4);
  assert.ok(r.signals.some((s) => s.type === 'spring_physics_detected'));
});

test('inferMotionIntensity bumps high with scroll-driven', () => {
  const r = inferMotionIntensity({ scroll: 'parallax + scroll-snap + useScroll' });
  assert.ok(r.score >= 7);
});

test('inferMotionIntensity reduces for hover-only transitions', () => {
  const r = inferMotionIntensity({
    transitions: [{ id: 'a', selector: 'a', state: 'hover' }, { id: 'b', selector: 'btn', state: 'hover' }],
  });
  assert.ok(r.score < 4);
});

test('inferVisualDensity returns no_input when both inputs missing', () => {
  const r = inferVisualDensity(null, null);
  assert.equal(r.status, 'no_input');
  assert.equal(r.score, null);
});

test('inferVisualDensity bumps for tight spacing scale', () => {
  const r = inferVisualDensity(
    { spacing: { xs: '2px', sm: '4px', md: '6px' } },
    null
  );
  assert.ok(r.score >= 5);
  assert.ok(r.signals.some((s) => s.type === 'spacing_scale_tight_lt_8px'));
});

test('inferVisualDensity reduces for airy spacing', () => {
  const r = inferVisualDensity(
    { spacing: { xs: '32px', sm: '64px', md: '96px' } },
    null
  );
  assert.ok(r.score < 5);
});

test('inferVisualDensity bumps for mono on numeric data', () => {
  const r = inferVisualDensity(
    { spacing: { md: '8px' } },
    [
      { selector: 'table.metric', styles: 'font-family: JetBrains Mono;' },
      { selector: '.stat', styles: 'font-family: Geist Mono;' },
    ]
  );
  assert.ok(r.signals.some((s) => s.type === 'mono_for_numeric_data'));
});

test('buildReport returns complete shape', () => {
  const r = buildReport({
    tokens: { spacing: { md: '8px' } },
    atomicClassification: { atoms: [], molecules: [], organisms: [] },
    componentProps: [{ selector: '.grid', styles: 'grid-template-columns: 2fr 1fr;' }],
    motion: { transitions: [{ state: 'hover' }] },
    sourceUrl: 'https://example.com',
  });
  assert.equal(r.schema_version, '1.0');
  assert.equal(r.source_url, 'https://example.com');
  assert.ok(r.dials.DESIGN_VARIANCE);
  assert.ok(r.dials.MOTION_INTENSITY);
  assert.ok(r.dials.VISUAL_DENSITY);
  assert.ok(typeof r.overall_confidence === 'number');
});

test('buildReport returns null scores when all inputs missing', () => {
  const r = buildReport({});
  assert.equal(r.dials.DESIGN_VARIANCE.status, 'no_input');
  assert.equal(r.dials.MOTION_INTENSITY.status, 'no_input');
  assert.equal(r.dials.VISUAL_DENSITY.status, 'no_input');
});
