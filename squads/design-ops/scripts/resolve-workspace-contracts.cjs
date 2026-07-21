#!/usr/bin/env node

const yaml = require('js-yaml');
const { buildInjectionPacket, parseArgs } = require('./context-injector.cjs');

function print(result, format) {
  if (format === 'yaml') {
    process.stdout.write(yaml.dump(result, { noRefs: true, sortKeys: false, lineWidth: 120 }));
    return;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const packet = buildInjectionPacket({
    business: args.business,
    app: args.app,
    maxSnippets: 1,
    maxChars: 200,
  });

  const contracts = packet.workspace_contracts || { source_of_truth: null, contracts: [] };
  const existing = (contracts.contracts || []).filter((item) => item.exists);

  const result = {
    pipeline: 'design-ops-minimal-v0-like',
    generated_at: new Date().toISOString(),
    business: packet.context && packet.context.business_slug ? packet.context.business_slug : null,
    app: packet.context && packet.context.app ? packet.context.app.id || null : null,
    source_of_truth: contracts.source_of_truth || null,
    config_path: contracts.config_path || null,
    resolved_contracts: contracts.contracts || [],
    resolved_count: existing.length,
  };

  print(result, args.format === 'yaml' ? 'yaml' : 'json');
}

if (require.main === module) {
  main();
}

