#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = process.cwd();

function parseArgs(argv) {
  const args = { business: 'aiox' };
  for (const raw of argv) {
    if (raw.startsWith('--business=')) {
      args.business = raw.slice('--business='.length).trim() || 'aiox';
    }
  }
  return args;
}

function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}

function readYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8')) || {};
}

function flattenPresetContracts(doc) {
  const contracts = doc.preset_contracts || {};
  const ids = [];
  for (const list of Object.values(contracts)) {
    if (Array.isArray(list)) ids.push(...list);
  }
  return [...new Set(ids)];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const registryPath = path.join(ROOT, 'squads', 'design-ops', 'data', 'motion-primitives-registry.yaml');
  const contractPath = path.join(
    ROOT,
    'workspace',
    'businesses',
    args.business,
    'L2-tactical',
    'design',
    'motion-primitives.yaml'
  );

  if (!fs.existsSync(registryPath)) fail(`Missing registry: ${path.relative(ROOT, registryPath)}`);
  if (!fs.existsSync(contractPath)) fail(`Missing motion contract: ${path.relative(ROOT, contractPath)}`);

  const registry = readYaml(registryPath);
  const contract = readYaml(contractPath);

  const required = [];
  for (const list of Object.values(registry.required_presets || {})) {
    if (Array.isArray(list)) required.push(...list);
  }
  const requiredIds = [...new Set(required)];
  const actualIds = flattenPresetContracts(contract);
  const actualSet = new Set(actualIds);

  const missing = requiredIds.filter((id) => !actualSet.has(id));
  const coverage = requiredIds.length === 0 ? 1 : (requiredIds.length - missing.length) / requiredIds.length;

  const result = {
    gate: 'motion-coverage',
    business: args.business,
    required_count: requiredIds.length,
    actual_count: actualIds.length,
    missing,
    coverage,
    ok: missing.length === 0,
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (missing.length > 0) {
    fail(`Motion coverage below 100%. Missing presets: ${missing.join(', ')}`);
  }
}

main();
