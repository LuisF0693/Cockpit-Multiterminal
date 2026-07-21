#!/usr/bin/env node

/**
 * validate-ai-readiness.cjs
 *
 * Validates that a business's design system has all required artifacts
 * for AI agent consumption. Returns a score (0-100) and lists gaps.
 *
 * Usage:
 *   node validate-ai-readiness.cjs --bu=aiox
 *
 * Exit codes:
 *   0 — PASS (score >= 90)
 *   1 — FAIL (score < 90)
 *   3 — Argument/environment error
 *
 * [STORY-129.4] AC-3
 */

const fs = require('fs');
const path = require('path');

// --- Constants ---

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MIN_COMPONENTS = 14;
const PASS_THRESHOLD = 90;

const MANDATORY_COMPONENT_FIELDS = [
  'name',
  'atomic_category',
  'import_path',
  'props',
  'variants',
  'design_tokens',
  'when_to_use',
  'when_not_to_use',
  'page_sections',
  'accessibility_notes',
];

// --- Scoring weights ---
// Total: 100 points
const WEIGHTS = {
  component_index_exists: 15,       // component-index.json exists
  min_component_count: 15,          // >= 14 components
  mandatory_fields_coverage: 30,    // each component has all mandatory fields
  when_to_use_populated: 15,        // every component has non-empty when_to_use
  page_sections_populated: 10,      // every component has non-empty page_sections
  tokens_runtime_exists: 15,        // tokens-runtime.json exists
};

// --- Helpers ---

function fail(message, code = 3) {
  console.error(`ERROR: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { bu: null };
  for (const raw of argv) {
    if (raw.startsWith('--bu=')) {
      args.bu = raw.slice('--bu='.length).trim() || null;
    }
    if (raw.startsWith('--business=')) {
      args.bu = raw.slice('--business='.length).trim() || null;
    }
  }
  return args;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// --- Validation checks ---

function validate(businessSlug) {
  const designDir = path.join(
    ROOT, 'workspace', 'businesses', businessSlug,
    'L2-tactical', 'design'
  );
  const componentIndexPath = path.join(designDir, 'component-index.json');
  const tokensRuntimePath = path.join(designDir, 'tokens-runtime.json');

  const gaps = [];
  let score = 0;

  // Check 1: component-index.json exists
  const index = readJson(componentIndexPath);
  if (index && Array.isArray(index.components)) {
    score += WEIGHTS.component_index_exists;
  } else {
    gaps.push({
      check: 'component_index_exists',
      severity: 'CRITICAL',
      message: `component-index.json missing or invalid at ${path.relative(ROOT, componentIndexPath)}`,
      points_lost: WEIGHTS.component_index_exists,
    });
    // Cannot continue without the index
    gaps.push({
      check: 'min_component_count',
      severity: 'CRITICAL',
      message: 'Cannot evaluate — component-index.json missing',
      points_lost: WEIGHTS.min_component_count,
    });
    gaps.push({
      check: 'mandatory_fields_coverage',
      severity: 'CRITICAL',
      message: 'Cannot evaluate — component-index.json missing',
      points_lost: WEIGHTS.mandatory_fields_coverage,
    });
    gaps.push({
      check: 'when_to_use_populated',
      severity: 'CRITICAL',
      message: 'Cannot evaluate — component-index.json missing',
      points_lost: WEIGHTS.when_to_use_populated,
    });
    gaps.push({
      check: 'page_sections_populated',
      severity: 'MEDIUM',
      message: 'Cannot evaluate — component-index.json missing',
      points_lost: WEIGHTS.page_sections_populated,
    });

    // Check tokens-runtime separately
    if (fs.existsSync(tokensRuntimePath)) {
      score += WEIGHTS.tokens_runtime_exists;
    } else {
      gaps.push({
        check: 'tokens_runtime_exists',
        severity: 'MEDIUM',
        message: `tokens-runtime.json missing at ${path.relative(ROOT, tokensRuntimePath)}`,
        points_lost: WEIGHTS.tokens_runtime_exists,
      });
    }

    return { score, gaps };
  }

  const components = index.components;

  // Check 2: Minimum component count
  if (components.length >= MIN_COMPONENTS) {
    score += WEIGHTS.min_component_count;
  } else {
    gaps.push({
      check: 'min_component_count',
      severity: 'CRITICAL',
      message: `Only ${components.length} components found, minimum is ${MIN_COMPONENTS}`,
      points_lost: WEIGHTS.min_component_count,
    });
  }

  // Check 3: Mandatory fields coverage
  let totalFields = 0;
  let presentFields = 0;
  const missingFieldsByComponent = [];

  for (const comp of components) {
    const missing = [];
    for (const field of MANDATORY_COMPONENT_FIELDS) {
      totalFields++;
      const value = comp[field];
      if (value !== undefined && value !== null && value !== '') {
        presentFields++;
      } else {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      missingFieldsByComponent.push({ name: comp.name || '(unnamed)', missing });
    }
  }

  if (totalFields > 0) {
    const fieldCoverage = presentFields / totalFields;
    score += Math.round(WEIGHTS.mandatory_fields_coverage * fieldCoverage);
    if (fieldCoverage < 1) {
      const examples = missingFieldsByComponent.slice(0, 5);
      gaps.push({
        check: 'mandatory_fields_coverage',
        severity: fieldCoverage < 0.8 ? 'CRITICAL' : 'MEDIUM',
        message: `${presentFields}/${totalFields} mandatory fields present (${(fieldCoverage * 100).toFixed(1)}%)`,
        examples: examples.map((e) => `${e.name}: missing [${e.missing.join(', ')}]`),
        points_lost: WEIGHTS.mandatory_fields_coverage - Math.round(WEIGHTS.mandatory_fields_coverage * fieldCoverage),
      });
    }
  }

  // Check 4: when_to_use populated on every component
  const withoutWhenToUse = components.filter((c) => !c.when_to_use || c.when_to_use.trim() === '');
  if (withoutWhenToUse.length === 0) {
    score += WEIGHTS.when_to_use_populated;
  } else {
    const ratio = 1 - (withoutWhenToUse.length / components.length);
    score += Math.round(WEIGHTS.when_to_use_populated * ratio);
    gaps.push({
      check: 'when_to_use_populated',
      severity: 'MEDIUM',
      message: `${withoutWhenToUse.length} components missing when_to_use`,
      examples: withoutWhenToUse.slice(0, 5).map((c) => c.name || '(unnamed)'),
      points_lost: WEIGHTS.when_to_use_populated - Math.round(WEIGHTS.when_to_use_populated * ratio),
    });
  }

  // Check 5: page_sections populated on every component
  const withoutPageSections = components.filter(
    (c) => !c.page_sections || !Array.isArray(c.page_sections) || c.page_sections.length === 0
  );
  if (withoutPageSections.length === 0) {
    score += WEIGHTS.page_sections_populated;
  } else {
    const ratio = 1 - (withoutPageSections.length / components.length);
    score += Math.round(WEIGHTS.page_sections_populated * ratio);
    gaps.push({
      check: 'page_sections_populated',
      severity: 'MEDIUM',
      message: `${withoutPageSections.length} components missing page_sections`,
      examples: withoutPageSections.slice(0, 5).map((c) => c.name || '(unnamed)'),
      points_lost: WEIGHTS.page_sections_populated - Math.round(WEIGHTS.page_sections_populated * ratio),
    });
  }

  // Check 6: tokens-runtime.json exists
  if (fs.existsSync(tokensRuntimePath)) {
    score += WEIGHTS.tokens_runtime_exists;
  } else {
    gaps.push({
      check: 'tokens_runtime_exists',
      severity: 'MEDIUM',
      message: `tokens-runtime.json missing at ${path.relative(ROOT, tokensRuntimePath)}`,
      points_lost: WEIGHTS.tokens_runtime_exists,
    });
  }

  return { score, gaps };
}

// --- Main ---

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.bu) {
    fail('Missing required flag --bu={slug}');
  }

  // Validate business directory exists
  const businessDir = path.join(ROOT, 'workspace', 'businesses', args.bu);
  if (!fs.existsSync(businessDir)) {
    fail(`Business directory not found: workspace/businesses/${args.bu}`);
  }

  const { score, gaps } = validate(args.bu);
  const passed = score >= PASS_THRESHOLD;

  if (passed) {
    console.log(`PASS: score=${score}/100 (business=${args.bu})`);
    if (gaps.length > 0) {
      console.log(`  Minor gaps (${gaps.length}):`);
      for (const gap of gaps) {
        console.log(`    - [${gap.severity}] ${gap.check}: ${gap.message}`);
      }
    }
    process.exit(0);
  } else {
    console.log(`FAIL: score=${score}/100 (business=${args.bu}, threshold=${PASS_THRESHOLD})`);
    console.log(`  Gaps (${gaps.length}):`);
    for (const gap of gaps) {
      console.log(`    - [${gap.severity}] ${gap.check}: ${gap.message} (-${gap.points_lost}pts)`);
      if (gap.examples && gap.examples.length > 0) {
        for (const ex of gap.examples) {
          console.log(`        ${ex}`);
        }
      }
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validate, parseArgs, MANDATORY_COMPONENT_FIELDS, WEIGHTS, PASS_THRESHOLD };
