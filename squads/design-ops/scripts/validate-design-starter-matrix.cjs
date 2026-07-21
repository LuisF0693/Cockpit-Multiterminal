#!/usr/bin/env node

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = process.cwd();

function parseArgs(argv) {
  const args = {
    sourceApp: 'apps/aiox-brandbook',
    starterApp: 'apps/aiox-design-starter',
  };
  for (const raw of argv) {
    if (raw.startsWith('--source-app=')) {
      args.sourceApp = raw.slice('--source-app='.length).trim() || args.sourceApp;
      continue;
    }
    if (raw.startsWith('--starter-app=')) {
      args.starterApp = raw.slice('--starter-app='.length).trim() || args.starterApp;
    }
  }
  return args;
}

function runStep(label, command, commandArgs, options = {}) {
  process.stdout.write(`== ${label} ==\n`);
  execFileSync(command, commandArgs, {
    cwd: options.cwd || ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });
}

function assertExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing ${label}: ${targetPath}`);
  }
}

function canValidateSourceApp() {
  return fs.existsSync(path.join(ROOT, 'workspace.yaml')) || fs.existsSync(path.join(ROOT, 'workspace', 'workspace.yaml'));
}

function validateStandaloneExport(starterAppAbs) {
  const exportRoot = path.join(os.tmpdir(), 'aiox-design-starter-matrix-export');
  fs.rmSync(exportRoot, { recursive: true, force: true });

  runStep('Starter Standalone Export', 'npm', ['run', 'export:standalone', '--', `--target=${exportRoot}`], {
    cwd: starterAppAbs,
  });

  assertExists(path.join(exportRoot, 'README.md'), 'standalone README');
  assertExists(path.join(exportRoot, 'package.json'), 'standalone package.json');
  assertExists(path.join(exportRoot, 'starter', 'site.config.yaml'), 'standalone site config');
  assertExists(path.join(exportRoot, 'src', 'vendor', 'brandbook-primitives', 'index.ts'), 'vendored primitives');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceAppAbs = path.join(ROOT, args.sourceApp);
  const starterAppAbs = path.join(ROOT, args.starterApp);

  if (canValidateSourceApp()) {
    runStep('Source App Build', 'npm', ['run', 'build'], {
      cwd: sourceAppAbs,
      env: { WORKSPACE_ROOT: ROOT },
    });
  } else {
    process.stdout.write('== Source App Build ==\n');
    process.stdout.write('SKIP: source app parity build requires workspace.yaml markers; starter validation continues\n');
  }

  runStep('Starter Lint', 'npm', ['run', 'lint'], { cwd: starterAppAbs });
  runStep('Starter Typecheck', 'npm', ['run', 'typecheck'], { cwd: starterAppAbs });
  runStep('Starter Default Build', 'npm', ['run', 'build'], { cwd: starterAppAbs });
  runStep('Starter Variant2 Build', 'npm', ['run', 'build:variant2'], { cwd: starterAppAbs });

  validateStandaloneExport(starterAppAbs);
  process.stdout.write('PASS: design starter matrix validated\n');
}

try {
  main();
} catch (error) {
  process.stderr.write('FAIL: design starter matrix validation\n');
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
