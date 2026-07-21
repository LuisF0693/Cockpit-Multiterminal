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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const contractsPath = path.join(
    ROOT,
    'workspace',
    'businesses',
    args.business,
    'L2-tactical',
    'design',
    'component-contracts.yaml'
  );
  const outputPath = path.join(ROOT, 'squads', 'design-ops', 'data', 'components-metadata.json');

  if (!fs.existsSync(contractsPath)) {
    fail(`Missing component contracts: ${path.relative(ROOT, contractsPath)}`);
  }

  const doc = readYaml(contractsPath);
  const components = Array.isArray(doc.components) ? doc.components : [];

  const payload = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    source: path.relative(ROOT, contractsPath),
    business: args.business,
    components: components.map((item) => ({
      id: item.id || null,
      layer: item.layer || null,
      status: item.status || null,
      primitives: item.primitives || [],
      tokens: item.tokens || [],
      accessibility: item.accessibility || {},
      implementation_refs: item.implementation_refs || [],
      class_contract: item.class_contract || {},
    })),
    integrity: {
      component_count: components.length,
    },
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`PASS: generated ${payload.integrity.component_count} component metadata entries at ${path.relative(ROOT, outputPath)}\n`);
}

main();
