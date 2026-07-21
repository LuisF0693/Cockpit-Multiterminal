#!/usr/bin/env node

const { execFileSync } = require('child_process');

function parseArgs(argv) {
  const ci = String(process.env.CI || '').trim().toLowerCase();
  const ciDetected = ci === '1' || ci === 'true';
  const args = {
    business: 'aiox',
    dsRoot: 'apps/aiox-brandbook/src/components/brandbook',
    withStarterMatrix: ciDetected,
    skipStarterMatrix: false,
  };

  for (const raw of argv) {
    if (raw.startsWith('--business=')) {
      args.business = raw.slice('--business='.length).trim() || 'aiox';
      continue;
    }
    if (raw.startsWith('--ds-root=')) {
      args.dsRoot = raw.slice('--ds-root='.length).trim() || args.dsRoot;
      continue;
    }
    if (raw === '--with-starter-matrix') {
      args.withStarterMatrix = true;
      continue;
    }
    if (raw === '--skip-starter-matrix') {
      args.skipStarterMatrix = true;
      args.withStarterMatrix = false;
    }
  }

  return args;
}

function run(label, cmd, cmdArgs) {
  process.stdout.write(`== ${label} ==\n`);
  execFileSync(cmd, cmdArgs, { stdio: 'inherit' });
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  run('Workspace Contracts (strict)', 'node', [
    'squads/design-ops/scripts/validate-workspace-contracts.cjs',
    `--business=${args.business}`,
    '--strict',
    '--format=json',
  ]);

  run('A11y Integration', 'node', [
    'squads/design-ops/scripts/validate-a11y-integration.cjs',
    `--business=${args.business}`,
  ]);

  run('Brandbook Contrast', 'node', [
    'squads/design-ops/scripts/validate-brandbook-contrast.cjs',
    `--ds-root=${args.dsRoot}`,
  ]);

  run('Motion Coverage', 'node', [
    'squads/design-ops/scripts/validate-motion-coverage.cjs',
    `--business=${args.business}`,
  ]);

  run('Components Metadata', 'node', [
    'squads/design-ops/scripts/validate-components-metadata.cjs',
  ]);

  run('Design Manifest Drift', 'node', [
    'squads/design-ops/scripts/validate-design-manifest-drift.cjs',
  ]);

  if (args.withStarterMatrix && !args.skipStarterMatrix) {
    run('Design Starter Matrix', 'node', ['squads/design-ops/scripts/validate-design-starter-matrix.cjs']);
  } else {
    process.stdout.write('== Design Starter Matrix ==\n');
    process.stdout.write('SKIP: starter matrix disabled (local default). In CI it runs by default; use --skip-starter-matrix only for explicit bypass.\n');
  }

  process.stdout.write('PASS: checklists gate validated (read-only)\n');
  process.stdout.write(
    'NOTE: if metadata/manifest are stale, run node squads/design-ops/scripts/generate-components-metadata.cjs --business=<slug> and node squads/design-ops/scripts/sync-design-manifest.cjs before retrying.\n'
  );
}

try {
  main();
} catch (error) {
  process.stderr.write('FAIL: checklists gate validation\n');
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
