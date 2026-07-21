#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function readYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8')) || {};
}

function writeYaml(filePath, data) {
  const text = yaml.dump(data, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
  fs.writeFileSync(filePath, text, 'utf8');
}

function listIdsByFolder(baseDir, extension) {
  if (!fs.existsSync(baseDir)) return [];
  return fs
    .readdirSync(baseDir)
    .filter((name) => name.endsWith(extension))
    .map((name) => name.replace(new RegExp(`${extension.replace('.', '\\.')}$`), ''))
    .sort();
}

function getDesignOpsPaths(rootDir) {
  const base = path.join(rootDir, 'squads/design-ops');
  return {
    configPath: path.join(base, 'config.yaml'),
    squadIoPath: path.join(base, 'squad-io.yaml'),
    manifestPath: path.join(base, 'data/design-manifest.yaml'),
    agentsDir: path.join(base, 'agents'),
    tasksDir: path.join(base, 'tasks'),
    workflowsDir: path.join(base, 'workflows'),
    checklistsDir: path.join(base, 'checklists'),
    dataDir: path.join(base, 'data'),
  };
}

function buildGeneratedManifest(paths) {
  const config = readYaml(paths.configPath);
  const squadIo = readYaml(paths.squadIoPath);

  return {
    id: 'design-ops-manifest',
    version: config.metadata && config.metadata.version ? config.metadata.version : '1.0.0',
    squad: 'design-ops',
    generated_at: new Date().toISOString(),
    entry_agent: config.entry_agent || 'design-chief',
    ownership: (config.provider_scope && config.provider_scope.owns) || [],
    delegates: (config.provider_scope && config.provider_scope.delegates) || {},
    artifacts: (config.artifact_contracts || []).map((item) => item.artifact_id).sort(),
    io_contracts: {
      inputs: (squadIo.inputs || []).map((item) => item.id).sort(),
      outputs: (squadIo.outputs || []).map((item) => item.id).sort(),
    },
    files: {
      agents: listIdsByFolder(paths.agentsDir, '.md'),
      tasks: listIdsByFolder(paths.tasksDir, '.md'),
      workflows: listIdsByFolder(paths.workflowsDir, '.yaml'),
      checklists: listIdsByFolder(paths.checklistsDir, '.yaml'),
      data_assets: fs.existsSync(paths.dataDir) ? fs.readdirSync(paths.dataDir).sort() : [],
    },
  };
}

function sortObjectDeep(value) {
  if (Array.isArray(value)) return value.map(sortObjectDeep);
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortObjectDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(sortObjectDeep(value), null, 2);
}

function getCanonicalProjection(manifest) {
  return {
    id: manifest.id,
    version: manifest.version,
    squad: manifest.squad,
    entry_agent: manifest.entry_agent,
    ownership: manifest.ownership || [],
    delegates: manifest.delegates || {},
    artifacts: manifest.artifacts || [],
    io_contracts: manifest.io_contracts || {},
    files: manifest.files || {},
  };
}

module.exports = {
  buildGeneratedManifest,
  getCanonicalProjection,
  getDesignOpsPaths,
  readYaml,
  stableJson,
  writeYaml,
};
