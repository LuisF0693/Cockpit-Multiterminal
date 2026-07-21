#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { buildOutput } = require('./load-context.cjs');
const resolver = require('./resolve-business-design-system.cjs');

const ROOT = process.cwd();
const DEFAULT_MAX_SNIPPETS = 6;
const DEFAULT_MAX_CHARS = 1200;

function parseArgs(argv) {
  const args = {
    business: null,
    app: null,
    format: 'json',
    maxSnippets: DEFAULT_MAX_SNIPPETS,
    maxChars: DEFAULT_MAX_CHARS,
  };

  for (const raw of argv) {
    if (raw.startsWith('--business=')) {
      args.business = raw.slice('--business='.length).trim() || null;
      continue;
    }
    if (raw.startsWith('--bu=')) {
      args.business = raw.slice('--bu='.length).trim() || null;
      continue;
    }
    if (raw.startsWith('--app=')) {
      args.app = raw.slice('--app='.length).trim() || null;
      continue;
    }
    if (raw.startsWith('--format=')) {
      args.format = raw.slice('--format='.length).trim() || 'json';
      continue;
    }
    if (raw.startsWith('--max-snippets=')) {
      const value = Number.parseInt(raw.slice('--max-snippets='.length).trim(), 10);
      if (Number.isFinite(value) && value > 0) {
        args.maxSnippets = value;
      }
      continue;
    }
    if (raw.startsWith('--max-chars=')) {
      const value = Number.parseInt(raw.slice('--max-chars='.length).trim(), 10);
      if (Number.isFinite(value) && value > 100) {
        args.maxChars = value;
      }
      continue;
    }
  }

  return args;
}

function normalizePath(targetPath) {
  return targetPath.split(path.sep).join('/');
}

function toRelative(targetPath) {
  return normalizePath(path.relative(ROOT, targetPath) || '.');
}

function readSnippet(filePath, maxChars) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw.length > maxChars ? `${raw.slice(0, maxChars)}\n...[truncated]` : raw;
}

function deriveWorkspaceConfigPath(context) {
  if (context && typeof context.config_path === 'string' && context.config_path.trim() !== '') {
    return path.resolve(ROOT, context.config_path);
  }
  const business = context && context.business_slug ? String(context.business_slug).trim() : '';
  if (!business) {
    return null;
  }
  return path.resolve(ROOT, `workspace/businesses/${business}/L2-tactical/design/design-system-config.yaml`);
}

function readDesignSystemConfig(configPath) {
  if (!configPath || !fs.existsSync(configPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return yaml.load(raw);
  } catch {
    return null;
  }
}

function resolveWorkspaceContracts(context) {
  const configPath = deriveWorkspaceConfigPath(context);
  const config = readDesignSystemConfig(configPath);
  const configRel = configPath ? toRelative(configPath) : null;
  let businessSlug = context && context.business_slug ? String(context.business_slug).trim() : '';
  if (!businessSlug && configRel) {
    const match = configRel.match(/^workspace\/businesses\/([^/]+)\//);
    if (match && match[1]) {
      businessSlug = match[1];
    }
  }
  const mapping =
    config &&
    config.governance &&
    config.governance.workspace_first_contracts &&
    typeof config.governance.workspace_first_contracts === 'object'
      ? config.governance.workspace_first_contracts
      : null;

  if (!mapping) {
    return {
      config_path: configRel,
      source_of_truth: null,
      contracts: [],
    };
  }

  const contracts = Object.entries(mapping).map(([key, relativePath]) => {
    const rel = String(relativePath || '').trim();
    const absolutePath = rel && businessSlug ? path.resolve(ROOT, 'workspace/businesses', businessSlug, rel) : null;
    const exists = absolutePath ? fs.existsSync(absolutePath) : false;
    return {
      id: key,
      relative_path: rel || null,
      absolute_path: absolutePath ? toRelative(absolutePath) : null,
      exists,
    };
  });

  return {
    config_path: configRel,
    source_of_truth:
      config &&
      config.governance &&
      typeof config.governance.source_of_truth === 'string'
        ? config.governance.source_of_truth
        : null,
    contracts,
  };
}

function collectCuratedCandidates(context) {
  const files = [
    // workspace-first bridge: canonical contracts go first
    ...resolveWorkspaceContracts(context).contracts
      .filter((contract) => contract.absolute_path && contract.exists)
      .map((contract) => contract.absolute_path),
    // provider-owned curated knowledge
    'squads/design-ops/data/design-tokens-spec.yaml',
    'squads/design-ops/data/token-registry.yaml',
    'squads/design-ops/data/motion-primitives-registry.yaml',
    // legacy curated knowledge remains available as secondary reference
    'squads/design-system/data/component-index.json',
    'squads/design-system/data/anti-ai-look-patterns.md',
    'squads/design-system/data/page-type-patterns.md',
    'squads/design-system/data/typography-hierarchy-rules.md',
    'squads/design-system/data/spacing-rhythm-system.md',
  ];

  const configPath = deriveWorkspaceConfigPath(context);
  if (configPath && fs.existsSync(configPath)) {
    files.unshift(toRelative(configPath));
  }

  return files
    .map((relativePath) => path.resolve(ROOT, relativePath))
    .filter((absolutePath, index, list) => list.indexOf(absolutePath) === index)
    .filter((absolutePath) => fs.existsSync(absolutePath));
}

function summarizeContext(context) {
  return {
    business_slug: context.business_slug || null,
    app: context.app || null,
    design_system: context.design_system
      ? {
          id: context.design_system.id || null,
          default_theme: context.design_system.default_theme || null,
          theme_selected: context.design_system.theme_selected || null,
          source: context.design_system.source || null,
        }
      : null,
    resolved_paths: context.resolved_paths
      ? {
          ds_root: context.resolved_paths.ds_root || null,
          app_root: context.resolved_paths.app_root || null,
          components_root: context.resolved_paths.components_root || null,
          token_files: context.resolved_paths.token_files || [],
          theme_token_files: context.resolved_paths.theme_token_files || [],
          blueprint_files: context.resolved_paths.blueprint_files || [],
          hooks_dir: context.resolved_paths.hooks_dir || null,
          data_dir: context.resolved_paths.data_dir || null,
          app_dir: context.resolved_paths.app_dir || null,
        }
      : null,
  };
}

function buildFallbackContext(args, errorMessage) {
  const workspaceConfig = resolver.getWorkspaceConfig();
  let base = null;

  if (args.business) {
    base = resolver.buildBusinessResult(workspaceConfig, args.business);
  } else if (args.app) {
    base = resolver.resolveByApp(workspaceConfig, args.app);
  } else {
    throw new Error('Fallback requires --business=<slug> or --app=<id>');
  }

  return {
    business_slug: base.business_slug || null,
    app: base.design_system && base.design_system.app ? base.design_system.app : null,
    design_system: base.design_system
      ? {
          id: base.design_system.id || null,
          default_theme: base.design_system.default_theme || null,
          theme_selected: null,
          source: base.design_system.source || null,
        }
      : null,
    resolved_paths: null,
    config_path: base.config_path || null,
    status: base.status || 'not_configured',
    degraded_mode: true,
    degraded_reason: errorMessage || 'load-context failed',
  };
}

function buildInjectionPacket(args = {}) {
  let context = null;
  let warning = null;

  try {
    context = buildOutput({
      business: args.business || null,
      app: args.app || null,
      format: 'json',
    });
  } catch (error) {
    warning = error instanceof Error ? error.message : String(error);
    context = buildFallbackContext(args, warning);
  }

  const workspaceContracts = resolveWorkspaceContracts(context);
  const curatedFiles = collectCuratedCandidates(context).slice(0, args.maxSnippets || DEFAULT_MAX_SNIPPETS);
  const snippets = curatedFiles.map((absolutePath) => ({
    path: toRelative(absolutePath),
    snippet: readSnippet(absolutePath, args.maxChars || DEFAULT_MAX_CHARS),
  }));

  return {
    pipeline: 'design-ops-minimal-v0-like',
    generated_at: new Date().toISOString(),
    mode: 'curated-context-injection',
    context: summarizeContext(context),
    workspace_contracts: workspaceContracts,
    warning,
    snippet_count: snippets.length,
    snippets,
  };
}

function printPacket(packet, format) {
  if (format === 'yaml') {
    process.stdout.write(yaml.dump(packet, { lineWidth: 120, noRefs: true, sortKeys: false }));
    return;
  }
  if (format === 'md' || format === 'markdown') {
    const lines = [
      '# Design Ops Context Packet',
      '',
      `- pipeline: \`${packet.pipeline}\``,
      `- generated_at: \`${packet.generated_at}\``,
      `- business: \`${packet.context.business_slug || 'n/a'}\``,
      `- app: \`${packet.context.app?.id || 'n/a'}\``,
      `- ds: \`${packet.context.design_system?.id || 'n/a'}\``,
      `- workspace_source_of_truth: \`${packet.workspace_contracts?.source_of_truth || 'n/a'}\``,
      `- workspace_contracts_resolved: \`${packet.workspace_contracts?.contracts?.filter((c) => c.exists).length || 0}\``,
      '',
      '## Snippets',
      '',
    ];
    for (const item of packet.snippets) {
      lines.push(`### ${item.path}`);
      lines.push('');
      lines.push('```text');
      lines.push(item.snippet || '');
      lines.push('```');
      lines.push('');
    }
    process.stdout.write(`${lines.join('\n')}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const packet = buildInjectionPacket(args);
  printPacket(packet, args.format);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildInjectionPacket,
  collectCuratedCandidates,
  parseArgs,
  resolveWorkspaceContracts,
  summarizeContext,
};
