#!/usr/bin/env node
/**
 * detect-pipeline-state.cjs
 *
 * Detects which pipeline steps have been completed for a business's
 * design system. Used by `--source pasta` mode to resume from the
 * correct step instead of re-running everything.
 *
 * Usage:
 *   node detect-pipeline-state.cjs --bu=aiox [--json]
 *
 * Exit codes:
 *   0 — Detection completed successfully
 *   3 — Argument/environment error
 *
 * [STORY-129.8]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// --- Constants ---

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const STEP_DEFINITIONS = [
  {
    step: 0,
    name: 'design_dir_exists',
    label: 'Design directory exists',
    phase: 'setup',
  },
  {
    step: 4,
    name: 'tokens_normalized',
    label: 'F1 complete (tokens normalized)',
    phase: 'F1',
  },
  {
    step: 7,
    name: 'component_index',
    label: 'F2 complete (component index)',
    phase: 'F2',
  },
  {
    step: 9,
    name: 'derived_components',
    label: 'F3 complete (derived components)',
    phase: 'F3',
  },
  {
    step: 11,
    name: 'ai_readiness',
    label: 'AI readiness validated (score >= 90)',
    phase: 'validation',
  },
  {
    step: 12,
    name: 'storybook_stories',
    label: 'Storybook stories generated',
    phase: 'storybook',
  },
  {
    step: 15,
    name: 'critical_eye',
    label: 'Critical Eye report generated',
    phase: 'critical-eye',
  },
];

// --- Helpers ---

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(3);
}

function parseArgs(argv) {
  const args = { bu: null, json: false };
  for (const raw of argv) {
    if (raw.startsWith('--bu=')) {
      args.bu = raw.slice('--bu='.length).trim() || null;
    }
    if (raw.startsWith('--business=')) {
      args.bu = raw.slice('--business='.length).trim() || null;
    }
    if (raw === '--json') {
      args.json = true;
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

// --- Step Detection ---

function detectStep0(designDir) {
  return fs.existsSync(designDir);
}

function detectStep4(designDir) {
  // tokens-normalized.json OR tokens-runtime.json (runtime implies normalization happened
  // or SINKRA defaults were applied, which counts as F1 complete)
  const normalizedPath = path.join(designDir, 'tokens-normalized.json');
  const runtimePath = path.join(designDir, 'tokens-runtime.json');
  return fs.existsSync(normalizedPath) || fs.existsSync(runtimePath);
}

function detectStep7(designDir) {
  const indexPath = path.join(designDir, 'component-index.json');
  const index = readJson(indexPath);
  return !!(index && Array.isArray(index.components) && index.components.length > 0);
}

function detectStep9(designDir) {
  const indexPath = path.join(designDir, 'component-index.json');
  const index = readJson(indexPath);
  if (!index || !Array.isArray(index.components)) return false;

  // Derived = components with atomic_category 'molecule' or 'organism'
  const derived = index.components.filter(
    (c) => c.atomic_category === 'molecule' || c.atomic_category === 'organism'
  );
  return derived.length > 0;
}

function detectStep11(bu) {
  // Run validate-ai-readiness.cjs and check exit code
  const scriptPath = path.join(__dirname, 'validate-ai-readiness.cjs');
  if (!fs.existsSync(scriptPath)) return false;

  try {
    execFileSync('node', [scriptPath, `--bu=${bu}`], {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 30000,
    });
    return true; // exit 0 = score >= 90
  } catch {
    return false; // exit 1 = score < 90
  }
}

function detectStep12(designDir) {
  const storybookDir = path.join(designDir, 'storybook');
  if (!fs.existsSync(storybookDir)) return false;

  try {
    const files = fs.readdirSync(storybookDir);
    const storyFiles = files.filter((f) => f.endsWith('.stories.tsx'));
    return storyFiles.length >= 1;
  } catch {
    return false;
  }
}

function detectStep15(designDir) {
  const reportPath = path.join(designDir, 'critical-eye-report.yaml');
  return fs.existsSync(reportPath);
}

// --- Main Detection ---

function detectPipelineState(bu) {
  const designDir = path.join(ROOT, 'workspace', 'businesses', bu, 'L2-tactical', 'design');

  const detectors = {
    0: () => detectStep0(designDir),
    4: () => detectStep4(designDir),
    7: () => detectStep7(designDir),
    9: () => detectStep9(designDir),
    11: () => detectStep11(bu),
    12: () => detectStep12(designDir),
    15: () => detectStep15(designDir),
  };

  const completedSteps = [];
  const stepDetails = [];

  for (const def of STEP_DEFINITIONS) {
    const detector = detectors[def.step];
    const done = detector ? detector() : false;

    stepDetails.push({
      step: def.step,
      name: def.name,
      label: def.label,
      phase: def.phase,
      completed: done,
    });

    if (done) {
      completedSteps.push(def.step);
    }
  }

  // Determine next step: first incomplete step
  const incompleteSteps = stepDetails.filter((s) => !s.completed);
  const nextStep = incompleteSteps.length > 0 ? incompleteSteps[0] : null;

  // Determine resume_from name
  const resumeFrom = nextStep ? nextStep.name : 'all_complete';
  const resumeLabel = nextStep ? nextStep.label : 'All steps completed';

  return {
    business: bu,
    completed_steps: completedSteps,
    total_steps: STEP_DEFINITIONS.length,
    steps: stepDetails,
    next_step: nextStep ? nextStep.step : null,
    resume_from: resumeFrom,
    resume_label: resumeLabel,
    all_complete: incompleteSteps.length === 0,
  };
}

// --- Main ---

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.bu) {
    fail('Missing required flag --bu={slug}. Usage: node detect-pipeline-state.cjs --bu=aiox');
  }

  // Validate business directory exists
  const businessDir = path.join(ROOT, 'workspace', 'businesses', args.bu);
  if (!fs.existsSync(businessDir)) {
    fail(`Business directory not found: workspace/businesses/${args.bu}`);
  }

  const state = detectPipelineState(args.bu);

  if (args.json) {
    console.log(JSON.stringify(state, null, 2));
    return;
  }

  // Human-readable output
  if (state.all_complete) {
    console.log(`DS completo para ${args.bu}. Todos os ${state.total_steps} steps completados: ${state.completed_steps.join(', ')}.`);
  } else {
    console.log(
      `DS parcial detectado para ${args.bu}. Steps completados: ${state.completed_steps.join(', ')}. ` +
      `Retomando de Step ${state.next_step} (${state.resume_label}).`
    );
  }

  // Detailed step list
  console.log('');
  for (const step of state.steps) {
    const status = step.completed ? 'DONE' : 'PENDING';
    console.log(`  Step ${String(step.step).padStart(2)}: [${status.padEnd(7)}] ${step.label}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { detectPipelineState, STEP_DEFINITIONS };
