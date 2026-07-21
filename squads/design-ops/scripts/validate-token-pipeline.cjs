#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function parseArgs(argv) {
  const args = {
    business: 'aiox',
    outDir: null,
  };

  for (const raw of argv) {
    if (raw.startsWith('--business=')) {
      args.business = raw.slice('--business='.length).trim() || 'aiox';
      continue;
    }
    if (raw.startsWith('--out-dir=')) {
      args.outDir = raw.slice('--out-dir='.length).trim() || null;
    }
  }

  return args;
}

function fail(message) {
  process.stderr.write(`FAIL: ${message}\n`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputRoot = args.outDir
    ? path.resolve(ROOT, args.outDir)
    : path.join(ROOT, 'outputs', 'design-ops', 'token-pipeline', args.business);

  const jsonPath = path.join(outputRoot, 'tokens.json');
  const cssPath = path.join(outputRoot, 'tokens.css');
  const manifestPath = path.join(outputRoot, 'manifest.json');

  for (const filePath of [jsonPath, cssPath, manifestPath]) {
    if (!fs.existsSync(filePath)) {
      fail(`Missing token pipeline artifact: ${path.relative(ROOT, filePath)}`);
    }
  }

  const tokenPayload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const manifestPayload = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const cssPayload = fs.readFileSync(cssPath, 'utf8');

  if (!Array.isArray(tokenPayload.tokens) || tokenPayload.tokens.length === 0) {
    fail('tokens.json has no tokens');
  }
  if (!Array.isArray(manifestPayload.input_contracts) || manifestPayload.input_contracts.length < 4) {
    fail('manifest.json missing input contracts');
  }
  if (!cssPayload.includes(':root {')) {
    fail('tokens.css missing :root block');
  }

  process.stdout.write('PASS: token pipeline artifacts validated\n');
  process.stdout.write(`  artifacts_root=${path.relative(ROOT, outputRoot)}\n`);
  process.stdout.write(`  token_count=${tokenPayload.tokens.length}\n`);
}

main();
