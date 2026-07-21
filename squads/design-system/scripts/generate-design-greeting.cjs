#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { buildOutput } = require('./load-context.cjs');
const runtimePaths = require('./runtime-paths.cjs');

const ROOT = process.cwd();
const SQUAD_NAME = 'design-system';
const AGENT_NAME = 'design-chief';
const DEFAULT_CONFIG_PATH = path.join(ROOT, 'squads', SQUAD_NAME, 'config.yaml');
const DEFAULT_AGENT_PATH = path.join(ROOT, 'squads', SQUAD_NAME, 'agents', `${AGENT_NAME}.md`);
const DEFAULT_SESSION_COMMAND = 'node squads/design-system/scripts/set-active-context.cjs --business=default';

function loadYamlFile(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8')) || {};
}

function loadAgentDefinition(agentPath) {
  const content = fs.readFileSync(agentPath, 'utf8');
  const match = content.match(/```ya?ml\n([\s\S]*?)\n```/);
  if (!match) {
    throw new Error(`No YAML block found in ${path.relative(ROOT, agentPath)}`);
  }
  return yaml.load(match[1]) || {};
}

function formatPathList(paths, maxItems) {
  return (paths || []).slice(0, maxItems).map((item) => `  - \`${item}\``).join('\n');
}

function formatCommandList(commands, maxItems) {
  return (commands || []).slice(0, maxItems).map((item) => `- \`${item}\``).join('\n');
}

function buildContextSection(context, settings) {
  if (settings.activation?.show_context_report === false) {
    return '';
  }

  if (!context || !context.design_system) {
    return '## Active DS Context\n\nNo configured Design System context is active.';
  }

  const appId = context.app && context.app.id ? context.app.id : 'n/a';
  const theme = context.design_system.theme_selected || context.design_system.default_theme || 'n/a';
  const sourceRoot = context.resolved_paths && context.resolved_paths.ds_root
    ? context.resolved_paths.ds_root
    : context.design_system.source.ds_root_abs;
  const maxTokenFiles = settings.preload?.max_token_files || 5;
  const maxBlueprintFiles = settings.preload?.max_blueprint_files || 3;

  const lines = [
    '## Active DS Context',
    '',
    `- Business: \`${context.business_slug}\``,
    `- Design System: \`${context.design_system.id}\``,
    `- Theme: \`${theme}\``,
    `- App: \`${appId}\``,
    `- Source: \`${sourceRoot}\``,
  ];

  if (context.app) {
    lines.push(`- Framework: \`${context.app.framework}\``);
    lines.push(`- UI primitives: \`${context.app.ui_primitives}\``);
  }

  if (settings.activation?.show_preload_report !== false) {
    lines.push('');
    lines.push('## Preloaded References');
    lines.push('');
    lines.push(`- Session context: \`${context.session_context_path || '.aiox/squad-runtime/design/design-chief/session-context.yaml'}\``);
    lines.push(`- DS config: \`${context.config_path}\``);

    if ((context.resolved_paths.theme_token_files || []).length > 0) {
      lines.push('- Theme token files:');
      lines.push(formatPathList(context.resolved_paths.theme_token_files, maxTokenFiles));
    }

    if ((context.resolved_paths.blueprint_files || []).length > 0) {
      lines.push('- Blueprint files:');
      lines.push(formatPathList(context.resolved_paths.blueprint_files, maxBlueprintFiles));
    }
  }

  return lines.join('\n');
}

function buildQuickCommands(agentDef, settings) {
  if (settings.activation?.show_quick_commands === false) {
    return '';
  }

  return [
    '## Starter Commands',
    '',
    formatCommandList(agentDef.commands, settings.activation?.quick_commands_limit || 6),
  ].join('\n');
}

function inferDesignNextAction(context) {
  if (!context) {
    return DEFAULT_SESSION_COMMAND;
  }

  if (context.status === 'not_configured' && context.business_slug) {
    return `*resolve-ds ${context.business_slug}`;
  }

  if (context.status === 'not_applicable' && context.business_slug) {
    return `*handoff /Brand`;
  }

  if (!context.app || !context.app.id) {
    return `*resolve-ds ${context.business_slug || 'business_slug_or_app_id'}`;
  }

  if ((context.resolved_paths?.theme_token_files || []).length === 0) {
    return '*show-context';
  }

  if ((context.resolved_paths?.blueprint_files || []).length === 0) {
    return '*review-plan {deliverable_type}';
  }

  return '*triage {request}';
}

function buildDesignNextActionCallout(context) {
  const nextAction = inferDesignNextAction(context);
  return nextAction ? `**Next Action:** \`${nextAction}\`` : '';
}

function generateGreeting() {
  const config = loadYamlFile(DEFAULT_CONFIG_PATH);
  const agentDef = loadAgentDefinition(DEFAULT_AGENT_PATH);
  const settings = config.settings || {};
  const sessionPath = runtimePaths.getDesignSessionContextPath();
  let context = null;
  if (fs.existsSync(sessionPath)) {
    try {
      context = buildOutput({
        business: null,
        app: null,
        codebase: null,
        task: AGENT_NAME,
        format: 'json',
      });
    } catch (_err) {
      // Session context exists but DS resolution failed (e.g. not configured).
      // Fall through to null context so greeting shows bootstrap instructions.
      context = null;
    }
  }

  const intro = context
    ? 'Design Chief ativo. Orquestração de Design System com contexto carregado do runtime da sessão.'
    : [
        'Design Chief ativo. Nenhum contexto de Design System foi inicializado nesta sessao.',
        '',
        '## Session Bootstrap',
        '',
        `- Inicialize com: \`${DEFAULT_SESSION_COMMAND}\` ou \`node squads/design-system/scripts/set-active-context.cjs --app=<id>\``,
        '- Depois rode `*show-context` para validar o DS e o tema ativos.',
        `- Runtime path: \`${runtimePaths.toWorkspaceRelative(sessionPath)}\``,
      ]
        .filter(Boolean)
        .join('\n');

  const parts = [
    intro,
    context ? buildContextSection(context, settings) : null,
    buildQuickCommands(agentDef, settings),
    buildDesignNextActionCallout(context),
  ].filter(Boolean);

  return `${parts.join('\n\n')}\n`;
}

function main() {
  process.stdout.write(generateGreeting());
}

if (require.main === module) {
  main();
}

module.exports = {
  buildDesignNextActionCallout,
  generateGreeting,
  inferDesignNextAction,
};
