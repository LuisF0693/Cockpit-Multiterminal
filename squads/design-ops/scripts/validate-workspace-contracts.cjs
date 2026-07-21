#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = process.cwd();
const CATALOG_PATH = path.resolve(ROOT, 'squads/design-ops/data/ds-core-catalog.yaml');
const REQUIRED_IDS = {
  tokens: 'L2-006',
  foundations: 'L2-007',
  component_contracts: 'L2-008',
  motion_primitives: 'L2-009',
};
const REQUIRED_FILES = {
  tokens: 'tokens.yaml',
  foundations: 'foundations.yaml',
  component_contracts: 'component-contracts.yaml',
  motion_primitives: 'motion-primitives.yaml',
};

function parseArgs(argv) {
  const args = {
    business: null,
    format: 'json',
    strict: false,
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
    if (raw.startsWith('--format=')) {
      args.format = raw.slice('--format='.length).trim() || 'json';
      continue;
    }
    if (raw === '--strict') {
      args.strict = true;
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

function readYamlSafe(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, data: null, error: null };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(raw);
    return { exists: true, data, error: null };
  } catch (error) {
    return {
      exists: true,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function resolveDesignRoot(business) {
  return path.resolve(ROOT, `workspace/businesses/${business}/L2-tactical/design`);
}

function validateContractShape(kind, doc, issues) {
  if (!doc || typeof doc !== 'object') {
    issues.push(`${kind}: invalid_yaml_object`);
    return;
  }
  if (!doc._meta || typeof doc._meta !== 'object') {
    issues.push(`${kind}: missing__meta`);
    return;
  }
  const expectedId = REQUIRED_IDS[kind];
  if (doc._meta.id !== expectedId) {
    issues.push(`${kind}: expected_id_${expectedId}_got_${String(doc._meta.id || 'null')}`);
  }
  if (!doc.contract || typeof doc.contract !== 'object') {
    issues.push(`${kind}: missing_contract_block`);
    return;
  }
  if (doc.contract.source_of_truth !== 'workspace') {
    issues.push(`${kind}: contract.source_of_truth_must_be_workspace`);
  }
}

function validateCoreCatalog(componentContractsDoc, catalogDoc, issues) {
  if (!catalogDoc || typeof catalogDoc !== 'object') {
    issues.push('core_catalog: invalid_or_missing');
    return;
  }

  const required = Array.isArray(catalogDoc.required_components) ? catalogDoc.required_components : [];
  const declared = componentContractsDoc && Array.isArray(componentContractsDoc.components) ? componentContractsDoc.components : [];
  const declaredIds = new Set(declared.map((item) => item && item.id).filter(Boolean));

  for (const component of required) {
    if (!component || !component.id) {
      issues.push('core_catalog: required_component_missing_id');
      continue;
    }
    if (!declaredIds.has(component.id)) {
      issues.push(`core_catalog: component_missing_in_workspace_contracts:${component.id}`);
    }
  }
}

function runValidation(args = {}) {
  if (!args.business) {
    throw new Error('Missing --business=<slug>');
  }

  const designRoot = resolveDesignRoot(args.business);
  const contracts = {};
  const issues = [];

  for (const [kind, fileName] of Object.entries(REQUIRED_FILES)) {
    const absolutePath = path.join(designRoot, fileName);
    const loaded = readYamlSafe(absolutePath);
    contracts[kind] = {
      file: toRelative(absolutePath),
      exists: loaded.exists,
      parse_error: loaded.error,
    };

    if (!loaded.exists) {
      issues.push(`${kind}: missing_file:${toRelative(absolutePath)}`);
      continue;
    }
    if (loaded.error) {
      issues.push(`${kind}: parse_error:${loaded.error}`);
      continue;
    }

    validateContractShape(kind, loaded.data, issues);
    contracts[kind].state = loaded.data && loaded.data._meta ? loaded.data._meta.state || null : null;
    contracts[kind].id = loaded.data && loaded.data._meta ? loaded.data._meta.id || null : null;
    contracts[kind].source_of_truth =
      loaded.data && loaded.data.contract ? loaded.data.contract.source_of_truth || null : null;
    contracts[kind].doc = loaded.data;
  }

  const catalogLoaded = readYamlSafe(CATALOG_PATH);
  const catalog = {
    file: toRelative(CATALOG_PATH),
    exists: catalogLoaded.exists,
    parse_error: catalogLoaded.error,
  };
  if (catalogLoaded.exists && !catalogLoaded.error) {
    validateCoreCatalog(contracts.component_contracts && contracts.component_contracts.doc, catalogLoaded.data, issues);
  } else if (!catalogLoaded.exists) {
    issues.push('core_catalog: missing_file');
  } else {
    issues.push(`core_catalog: parse_error:${catalogLoaded.error}`);
  }

  for (const key of Object.keys(contracts)) {
    delete contracts[key].doc;
  }

  const ok = issues.length === 0;
  return {
    pipeline: 'design-ops-minimal-v0-like',
    mode: 'workspace-contract-validation',
    generated_at: new Date().toISOString(),
    business: args.business,
    design_root: toRelative(designRoot),
    ok,
    issues,
    contract_count: Object.keys(contracts).length,
    contracts,
    catalog,
  };
}

function printResult(result, format) {
  if (format === 'yaml') {
    process.stdout.write(yaml.dump(result, { noRefs: true, sortKeys: false, lineWidth: 120 }));
    return;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = runValidation(args);
  printResult(result, args.format);

  if (!result.ok && args.strict) {
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  runValidation,
};

