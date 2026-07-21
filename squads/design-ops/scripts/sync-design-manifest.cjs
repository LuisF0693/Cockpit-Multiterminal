#!/usr/bin/env node

const process = require('process');
const {
  buildGeneratedManifest,
  getDesignOpsPaths,
  writeYaml,
} = require('./design-manifest-lib.cjs');

function main() {
  const paths = getDesignOpsPaths(process.cwd());
  const generated = buildGeneratedManifest(paths);
  writeYaml(paths.manifestPath, generated);

  process.stdout.write('PASS: synced squads/design-ops/data/design-manifest.yaml\n');
  process.stdout.write(`  tasks=${generated.files.tasks.length}\n`);
  process.stdout.write(`  workflows=${generated.files.workflows.length}\n`);
  process.stdout.write(`  checklists=${generated.files.checklists.length}\n`);
}

main();
