#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { buildInjectionPacket, parseArgs: parseContextArgs } = require('./context-injector.cjs');
const { runAutofix, parseArgs: parseAutofixArgs } = require('./autofix-deterministic.cjs');
const { runValidation } = require('./validate-workspace-contracts.cjs');

const ROOT = process.cwd();
const DEFAULT_OUTPUT_DIR = path.join(ROOT, 'outputs', 'design-ops');

function parseArgs(argv) {
  const contextArgs = parseContextArgs(argv);
  const autofixArgs = parseAutofixArgs(argv);
  const args = {
    business: contextArgs.business,
    app: contextArgs.app,
    maxSnippets: contextArgs.maxSnippets,
    maxChars: contextArgs.maxChars,
    dsRoot: 'apps/aiox-brandbook/src/components/brandbook',
    prepareArtifacts: false,
    target: autofixArgs.target,
    write: autofixArgs.write,
    out: null,
    format: 'json',
  };

  for (const raw of argv) {
    if (raw.startsWith('--out=')) {
      args.out = raw.slice('--out='.length).trim() || null;
      continue;
    }
    if (raw.startsWith('--format=')) {
      args.format = raw.slice('--format='.length).trim() || 'json';
      continue;
    }
    if (raw.startsWith('--ds-root=')) {
      args.dsRoot = raw.slice('--ds-root='.length).trim() || args.dsRoot;
      continue;
    }
    if (raw === '--prepare-artifacts') {
      args.prepareArtifacts = true;
    }
  }

  return args;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolveOutPath(customOut) {
  if (customOut && customOut.trim() !== '') {
    return path.resolve(ROOT, customOut);
  }
  ensureDir(DEFAULT_OUTPUT_DIR);
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(DEFAULT_OUTPUT_DIR, `minimal-pipeline-${now}.json`);
}

function buildReport(args) {
  const artifactsPreparation =
    args.business && String(args.business).trim() !== '' && args.prepareArtifacts
      ? (() => {
          try {
            execFileSync(
              'node',
              ['squads/design-ops/scripts/generate-components-metadata.cjs', `--business=${args.business}`],
              { cwd: ROOT, stdio: 'pipe' }
            );
            execFileSync('node', ['squads/design-ops/scripts/sync-design-manifest.cjs'], {
              cwd: ROOT,
              stdio: 'pipe',
            });
            return {
              mode: 'mutable_prepare_artifacts',
              ok: true,
            };
          } catch (error) {
            return {
              mode: 'mutable_prepare_artifacts',
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })()
      : {
          mode: 'read_only_default',
          skipped: true,
          reason: args.business ? 'prepare_artifacts_flag_not_provided' : 'business_not_provided',
        };

  const contextPacket = buildInjectionPacket({
    business: args.business,
    app: args.app,
    maxSnippets: args.maxSnippets,
    maxChars: args.maxChars,
  });

  const autofixResult = args.target
    ? runAutofix({
        target: args.target,
        write: args.write,
      })
    : {
        pipeline: 'design-ops-minimal-v0-like',
        mode: 'deterministic-autofix',
        skipped: true,
        reason: 'target_not_provided',
      };

  const contractValidation =
    args.business && String(args.business).trim() !== ''
      ? runValidation({
          business: args.business,
          strict: false,
          format: 'json',
        })
      : {
          pipeline: 'design-ops-minimal-v0-like',
          mode: 'workspace-contract-validation',
          skipped: true,
          reason: 'business_not_provided',
        };

  const checklistsValidation =
    args.business && String(args.business).trim() !== ''
      ? (() => {
          try {
            execFileSync(
              'node',
              [
                'squads/design-ops/scripts/validate-checklists-gate.cjs',
                `--business=${args.business}`,
                `--ds-root=${args.dsRoot}`,
              ],
              { cwd: ROOT, stdio: 'pipe' }
            );
            return {
              pipeline: 'design-ops-minimal-v0-like',
              mode: 'checklists-gate-validation',
              ok: true,
            };
          } catch (error) {
            return {
              pipeline: 'design-ops-minimal-v0-like',
              mode: 'checklists-gate-validation',
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })()
      : {
          pipeline: 'design-ops-minimal-v0-like',
          mode: 'checklists-gate-validation',
          skipped: true,
          reason: 'business_not_provided',
        };

  return {
    pipeline: 'design-ops-minimal-v0-like',
    generated_at: new Date().toISOString(),
    execution_mode: args.prepareArtifacts ? 'mutable_prepare_artifacts' : 'read_only_default',
    artifacts_preparation: artifactsPreparation,
    context_injection: contextPacket,
    contract_validation: contractValidation,
    checklists_validation: checklistsValidation,
    autofix: autofixResult,
  };
}

function printReport(report, format) {
  if (format === 'text') {
    const lines = [
      'Design Ops Minimal Pipeline',
      `generated_at: ${report.generated_at}`,
      `business: ${report.context_injection.context.business_slug || 'n/a'}`,
      `app: ${report.context_injection.context.app?.id || 'n/a'}`,
      `snippets: ${report.context_injection.snippet_count}`,
      `execution_mode: ${report.execution_mode}`,
      `contracts_ok: ${report.contract_validation && report.contract_validation.ok === true ? 'true' : 'false'}`,
      `checklists_ok: ${report.checklists_validation && report.checklists_validation.ok === true ? 'true' : 'false'}`,
      `autofix_mode: ${report.autofix.mode}`,
      `autofix_changed_files: ${report.autofix.changed_files || 0}`,
    ];
    process.stdout.write(`${lines.join('\n')}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = buildReport(args);
  const outPath = resolveOutPath(args.out);
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  printReport(report, args.format);
  process.stderr.write(`[design-ops] report saved at ${path.relative(ROOT, outPath)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildReport,
  parseArgs,
};
