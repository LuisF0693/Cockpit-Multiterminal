#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const metadataPath = path.join(ROOT, 'squads', 'design-ops', 'data', 'components-metadata.json');

function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(metadataPath)) {
    fail('Missing components metadata. Run node squads/design-ops/scripts/generate-components-metadata.cjs');
  }

  const doc = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const components = Array.isArray(doc.components) ? doc.components : [];
  if (components.length === 0) {
    fail('components-metadata has zero components');
  }

  const requiredIds = ['button', 'input', 'dialog'];
  const ids = new Set(components.map((item) => item.id));
  for (const id of requiredIds) {
    if (!ids.has(id)) fail(`Missing required component metadata: ${id}`);
  }

  for (const item of components) {
    if (!item.id) fail('Component metadata item missing id');
    if (!Array.isArray(item.tokens)) fail(`Component ${item.id} missing tokens array`);
    if (!item.accessibility || typeof item.accessibility !== 'object') {
      fail(`Component ${item.id} missing accessibility contract`);
    }
  }

  process.stdout.write(`PASS: components metadata valid (${components.length} components)\n`);
}

main();
