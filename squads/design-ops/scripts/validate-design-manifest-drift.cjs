#!/usr/bin/env node

const fs = require('fs');
const process = require('process');
const {
  buildGeneratedManifest,
  getCanonicalProjection,
  getDesignOpsPaths,
  readYaml,
  stableJson,
} = require('./design-manifest-lib.cjs');

function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}

function main() {
  const paths = getDesignOpsPaths(process.cwd());
  if (!fs.existsSync(paths.manifestPath)) {
    fail('Missing squads/design-ops/data/design-manifest.yaml. Run node squads/design-ops/scripts/sync-design-manifest.cjs');
  }

  const expected = buildGeneratedManifest(paths);
  const actual = readYaml(paths.manifestPath);
  const expectedCanonical = getCanonicalProjection(expected);
  const actualCanonical = getCanonicalProjection(actual);

  if (stableJson(expectedCanonical) !== stableJson(actualCanonical)) {
    fail('Design-ops manifest drift detected. Run node squads/design-ops/scripts/sync-design-manifest.cjs');
  }

  process.stdout.write('PASS: design-ops manifest is synchronized\n');
}

main();
