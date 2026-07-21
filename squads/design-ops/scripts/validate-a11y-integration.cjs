#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..', '..');

function parseArgs(argv) {
  const args = { business: 'aiox' };
  for (const raw of argv) {
    if (raw.startsWith('--business=')) {
      args.business = raw.slice('--business='.length).trim() || 'aiox';
    }
  }
  return args;
}

function assertFilesExist(requiredPaths) {
  const missing = [];
  for (const rel of requiredPaths) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      missing.push(rel);
    }
  }
  if (missing.length > 0) {
    for (const rel of missing) {
      process.stderr.write(`FAIL missing file: ${rel}\n`);
    }
    process.exit(1);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const requiredPaths = [
    'squads/design-ops/checklists/ds-core-accessibility-minimum.yaml',
    'squads/design-ops/checklists/dops-accessibility-wcag-aa.yaml',
    'squads/design-ops/checklists/dops-a11y-release-gate.yaml',
    'squads/design-ops/checklists/dops-component-quality.yaml',
    'squads/design-ops/data/quality-gates.yaml',
    'squads/design-ops/data/design-tokens-spec.yaml',
    `workspace/businesses/${args.business}/L2-tactical/design/tokens.yaml`,
    `workspace/businesses/${args.business}/L2-tactical/design/foundations.yaml`,
    `workspace/businesses/${args.business}/L2-tactical/design/component-contracts.yaml`,
    `workspace/businesses/${args.business}/L2-tactical/design/motion-primitives.yaml`,
  ];

  assertFilesExist(requiredPaths);

  execFileSync(
    'node',
    [
      'squads/design-ops/scripts/validate-workspace-contracts.cjs',
      `--business=${args.business}`,
      '--strict',
      '--format=json',
    ],
    { cwd: ROOT, stdio: 'inherit' }
  );

  process.stdout.write('PASS design-ops accessibility integration\n');
}

main();
