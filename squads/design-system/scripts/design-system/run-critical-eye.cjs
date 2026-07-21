#!/usr/bin/env node

/**
 * run-critical-eye.cjs
 *
 * Critical Eye scoring engine for design system capture quality.
 * Evaluates 5 dimensions (100 pts total): Breadth, Quality, Consistency,
 * Maturity, Simplicity. Generates critical-eye-report.yaml per brand.
 *
 * Usage:
 *   node run-critical-eye.cjs --bu=aiox
 *
 * Exit codes:
 *   0 — PASS (score >= 80, no blockers)
 *   1 — FAIL (score < 80 or accessibility blocker)
 *   3 — Argument/environment error
 *
 * [STORY-129.6]
 */

const fs = require('fs');
const path = require('path');

// --- Constants ---

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PASS_THRESHOLD = 80;
const WARNING_THRESHOLD = 70;

// Expected components based on @sinkra/ds-core registry
// (14 atoms + 8 molecules + 8 organisms = 30 minimum, 46 full catalog)
const EXPECTED_COMPONENT_COUNT = 46;

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
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function toISODate() {
  return new Date().toISOString().slice(0, 10);
}

// --- Dimension Scorers ---

/**
 * Breadth (25 pts): How many components are adapted vs expected total.
 * Prorated: (adapted / expected) * 25
 */
function scoreBreadth(components) {
  const adapted = components.length;
  const ratio = Math.min(adapted / EXPECTED_COMPONENT_COUNT, 1);
  const score = Math.round(ratio * 25);
  const notes = `${adapted}/${EXPECTED_COMPONENT_COUNT} components adapted`;
  return { score, max: 25, notes };
}

/**
 * Quality (30 pts):
 *   - a11y_notes present (10 pts, BLOCKER if 0)
 *   - design_tokens with >= 3 categories (10 pts)
 *   - quando_usar (when_to_use) defined (10 pts)
 */
function scoreQuality(components) {
  const total = components.length;
  if (total === 0) return { score: 0, max: 30, notes: 'No components', a11y_count: 0 };

  const withA11y = components.filter(
    (c) => c.accessibility_notes && c.accessibility_notes.trim().length > 0
  );
  const withTokens3 = components.filter((c) => {
    if (!c.design_tokens || typeof c.design_tokens !== 'object') return false;
    return Object.keys(c.design_tokens).length >= 3;
  });
  const withWhenToUse = components.filter(
    (c) => c.when_to_use && c.when_to_use.trim().length > 0
  );

  const a11yScore = Math.round((withA11y.length / total) * 10);
  const tokensScore = Math.round((withTokens3.length / total) * 10);
  const whenToUseScore = Math.round((withWhenToUse.length / total) * 10);

  const score = a11yScore + tokensScore + whenToUseScore;
  const parts = [
    `a11y: ${withA11y.length}/${total}`,
    `tokens>=3: ${withTokens3.length}/${total}`,
    `when_to_use: ${withWhenToUse.length}/${total}`,
  ];

  return {
    score,
    max: 30,
    notes: parts.join(', '),
    a11y_count: withA11y.length,
  };
}

/**
 * Consistency (20 pts):
 *   - import_path uses @sinkra/ds-core (10 pts)
 *   - naming pattern: PascalCase component names (5 pts)
 *   - has related_components field (5 pts)
 */
function scoreConsistency(components) {
  const total = components.length;
  if (total === 0) return { score: 0, max: 20, notes: 'No components' };

  // Import path check — @sinkra/ds-core is canonical, @/components/ui/ is acceptable
  // (local alias before package migration)
  const withCorrectImport = components.filter((c) => {
    if (!c.import_path) return false;
    return (
      c.import_path.startsWith('@sinkra/ds-core') ||
      c.import_path.startsWith('@/components/ui/')
    );
  });

  // Naming pattern: PascalCase (first char uppercase)
  const withPascalCase = components.filter((c) => {
    if (!c.name) return false;
    return /^[A-Z][a-zA-Z]*$/.test(c.name);
  });

  // Related components field present
  const withRelated = components.filter(
    (c) => Array.isArray(c.related_components) && c.related_components.length > 0
  );

  const importScore = Math.round((withCorrectImport.length / total) * 10);
  const namingScore = Math.round((withPascalCase.length / total) * 5);
  const relatedScore = Math.round((withRelated.length / total) * 5);

  const score = importScore + namingScore + relatedScore;
  const parts = [];
  if (withCorrectImport.length === total) {
    parts.push('All imports correct');
  } else {
    parts.push(`imports: ${withCorrectImport.length}/${total}`);
  }
  if (withPascalCase.length < total) {
    parts.push(`naming: ${withPascalCase.length}/${total} PascalCase`);
  }
  if (withRelated.length < total) {
    parts.push(`related: ${withRelated.length}/${total}`);
  }

  return { score, max: 20, notes: parts.join(', ') || 'All checks pass' };
}

/**
 * Maturity (15 pts):
 *   - tokens-runtime.json exists (5 pts)
 *   - component-index.json has all mandatory fields per component (5 pts)
 *   - design-system-config.yaml exists (5 pts)
 */
function scoreMaturity(components, designDir) {
  let score = 0;
  const parts = [];

  // tokens-runtime.json
  const tokensRuntimePath = path.join(designDir, 'tokens-runtime.json');
  if (fs.existsSync(tokensRuntimePath)) {
    score += 5;
    parts.push('tokens-runtime.json present');
  } else {
    parts.push('tokens-runtime.json MISSING');
  }

  // All mandatory fields present in every component
  const mandatoryFields = [
    'name', 'atomic_category', 'import_path', 'props', 'variants',
    'design_tokens', 'when_to_use', 'when_not_to_use', 'accessibility_notes',
    'page_sections',
  ];
  const total = components.length;
  if (total > 0) {
    const completeComponents = components.filter((c) =>
      mandatoryFields.every((f) => {
        const v = c[f];
        return v !== undefined && v !== null && v !== '';
      })
    );
    const ratio = completeComponents.length / total;
    const fieldScore = Math.round(ratio * 5);
    score += fieldScore;
    if (ratio < 1) {
      parts.push(`complete fields: ${completeComponents.length}/${total}`);
    } else {
      parts.push('all components have mandatory fields');
    }
  }

  // design-system-config.yaml
  const configPath = path.join(designDir, 'design-system-config.yaml');
  if (fs.existsSync(configPath)) {
    score += 5;
    parts.push('config.yaml present');
  } else {
    parts.push('design-system-config.yaml MISSING');
  }

  return { score, max: 15, notes: parts.join(', ') };
}

/**
 * Simplicity (10 pts): DS captured = simple by definition.
 * Always awards full points — the capture pipeline already enforces
 * simplicity by extracting only what exists in shadcn/ui.
 */
function scoreSimplicity() {
  return { score: 10, max: 10, notes: 'Captured DS is simple by definition' };
}

// --- Report Generation ---

function generateReport(bu, dimensions, blockers, warnings) {
  const scoreTotal =
    dimensions.breadth.score +
    dimensions.quality.score +
    dimensions.consistency.score +
    dimensions.maturity.score +
    dimensions.simplicity.score;

  const gate = blockers.length > 0 ? 'BLOCKED' : scoreTotal >= PASS_THRESHOLD ? 'PASS' : 'FAIL';

  const summary = [
    `Critical Eye: ${scoreTotal}/100 ${gate === 'PASS' ? 'PASS' : gate === 'BLOCKED' ? 'BLOCKED' : 'FAIL'}`,
    `Breadth: ${dimensions.breadth.score}`,
    `Quality: ${dimensions.quality.score}`,
    `Consistency: ${dimensions.consistency.score}`,
    `Maturity: ${dimensions.maturity.score}`,
    `Simplicity: ${dimensions.simplicity.score}`,
  ].join(' | ');

  return { scoreTotal, gate, summary };
}

function toYaml(report) {
  // Hand-serialized YAML to avoid dependency on js-yaml for a small output
  const lines = [];
  lines.push(`business: ${report.business}`);
  lines.push(`generated_at: "${report.generated_at}"`);
  lines.push(`score_total: ${report.score_total}`);
  lines.push(`gate: ${report.gate}`);
  lines.push('dimensions:');
  for (const [key, dim] of Object.entries(report.dimensions)) {
    const notesStr = dim.notes ? `, notes: "${dim.notes}"` : '';
    lines.push(`  ${key}: { score: ${dim.score}, max: ${dim.max}${notesStr} }`);
  }
  lines.push('blockers:');
  if (report.blockers.length === 0) {
    lines.push('  []');
  } else {
    for (const b of report.blockers) {
      lines.push(`  - "${b}"`);
    }
  }
  lines.push('warnings:');
  if (report.warnings.length === 0) {
    lines.push('  []');
  } else {
    for (const w of report.warnings) {
      lines.push(`  - "${w}"`);
    }
  }
  lines.push(`summary: "${report.summary}"`);
  return lines.join('\n') + '\n';
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

  const designDir = path.join(businessDir, 'L2-tactical', 'design');
  const componentIndexPath = path.join(designDir, 'component-index.json');

  // Load component-index.json
  const index = readJson(componentIndexPath);
  if (!index || !Array.isArray(index.components)) {
    fail(
      `component-index.json missing or invalid at workspace/businesses/${args.bu}/L2-tactical/design/component-index.json`,
      1
    );
  }

  const components = index.components;

  // Score all 5 dimensions
  const breadth = scoreBreadth(components);
  const quality = scoreQuality(components);
  const consistency = scoreConsistency(components);
  const maturity = scoreMaturity(components, designDir);
  const simplicity = scoreSimplicity();

  const dimensions = { breadth, quality, consistency, maturity, simplicity };

  // Detect blockers and warnings
  const blockers = [];
  const warnings = [];

  // AC-3: accessibility=0 BLOCKS absolutely
  if (quality.a11y_count === 0) {
    blockers.push('ACCESSIBILITY BLOCKER: 0 components have a11y notes — absolute block');
  }

  const { scoreTotal, gate, summary } = generateReport(args.bu, dimensions, blockers, warnings);

  // Warning zone: 70-79
  if (scoreTotal >= WARNING_THRESHOLD && scoreTotal < PASS_THRESHOLD && blockers.length === 0) {
    if (breadth.score < breadth.max) {
      warnings.push(`Breadth: ${breadth.notes}`);
    }
    if (consistency.score < consistency.max) {
      warnings.push(`Consistency: ${consistency.notes}`);
    }
    if (maturity.score < maturity.max) {
      warnings.push(`Maturity: ${maturity.notes}`);
    }
  }

  // Build report object
  const report = {
    business: args.bu,
    generated_at: toISODate(),
    score_total: scoreTotal,
    gate,
    dimensions: {
      breadth: { score: breadth.score, max: breadth.max, notes: breadth.notes },
      quality: { score: quality.score, max: quality.max, notes: quality.notes },
      consistency: { score: consistency.score, max: consistency.max, notes: consistency.notes },
      maturity: { score: maturity.score, max: maturity.max, notes: maturity.notes },
      simplicity: { score: simplicity.score, max: simplicity.max, notes: simplicity.notes },
    },
    blockers,
    warnings,
    summary,
  };

  // Write report YAML
  const reportPath = path.join(designDir, 'critical-eye-report.yaml');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, toYaml(report), 'utf8');

  // Console output formatted by severity (AC-4)
  if (gate === 'PASS') {
    // One-line output for score >= 80
    console.log(`PASS: ${summary}`);
  } else if (gate === 'BLOCKED') {
    // Full report for blockers
    console.log(`BLOCKED: ${summary}`);
    console.log('');
    console.log('Blockers:');
    for (const b of blockers) {
      console.log(`  - ${b}`);
    }
    console.log('');
    console.log(`Report: ${path.relative(ROOT, reportPath)}`);
  } else {
    // FAIL: summary + top issues
    console.log(`FAIL: ${summary}`);
    if (warnings.length > 0) {
      console.log('');
      console.log('Top issues:');
      for (const w of warnings) {
        console.log(`  - ${w}`);
      }
    }
    console.log('');
    console.log(`Report: ${path.relative(ROOT, reportPath)}`);
  }

  // Exit code
  if (gate === 'PASS') {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  scoreBreadth,
  scoreQuality,
  scoreConsistency,
  scoreMaturity,
  scoreSimplicity,
  PASS_THRESHOLD,
  EXPECTED_COMPONENT_COUNT,
};
