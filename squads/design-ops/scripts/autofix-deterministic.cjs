#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.css', '.scss', '.mdx']);

function parseArgs(argv) {
  const args = {
    target: null,
    write: false,
    format: 'json',
  };

  for (const raw of argv) {
    if (raw.startsWith('--target=')) {
      args.target = raw.slice('--target='.length).trim() || null;
      continue;
    }
    if (raw === '--write') {
      args.write = true;
      continue;
    }
    if (raw.startsWith('--format=')) {
      args.format = raw.slice('--format='.length).trim() || 'json';
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

function collectFiles(targetPath, bucket = []) {
  if (!fs.existsSync(targetPath)) {
    return bucket;
  }

  const stats = fs.statSync(targetPath);
  if (stats.isFile()) {
    if (SUPPORTED_EXTENSIONS.has(path.extname(targetPath))) {
      bucket.push(targetPath);
    }
    return bucket;
  }

  if (!stats.isDirectory()) {
    return bucket;
  }

  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist' || entry.name === 'build') {
      continue;
    }
    collectFiles(path.join(targetPath, entry.name), bucket);
  }
  return bucket;
}

function normalizeClassNameSpacing(input) {
  return input
    .replace(/className="([^"]*)"/g, (_, classValue) => {
      const normalized = classValue.replace(/\s+/g, ' ').trim();
      return `className="${normalized}"`;
    })
    .replace(/className='([^']*)'/g, (_, classValue) => {
      const normalized = classValue.replace(/\s+/g, ' ').trim();
      return `className='${normalized}'`;
    });
}

function applyDeterministicFixes(input) {
  let output = input;
  output = output.replace(/\r\n/g, '\n');
  output = output.replace(/[ \t]+$/gm, '');
  output = output.replace(/\n{3,}/g, '\n\n');
  output = normalizeClassNameSpacing(output);
  return output;
}

function runAutofix(args = {}) {
  if (!args.target) {
    throw new Error('Missing --target=<file-or-dir>');
  }

  const targetAbs = path.resolve(ROOT, args.target);
  const files = collectFiles(targetAbs);
  const changedFiles = [];

  for (const absolutePath of files) {
    const original = fs.readFileSync(absolutePath, 'utf8');
    const fixed = applyDeterministicFixes(original);

    if (fixed === original) {
      continue;
    }

    changedFiles.push(toRelative(absolutePath));
    if (args.write) {
      fs.writeFileSync(absolutePath, fixed, 'utf8');
    }
  }

  return {
    pipeline: 'design-ops-minimal-v0-like',
    mode: 'deterministic-autofix',
    target: toRelative(targetAbs),
    write: Boolean(args.write),
    scanned_files: files.length,
    changed_files: changedFiles.length,
    files: changedFiles,
  };
}

function printResult(result, format) {
  if (format === 'text') {
    process.stdout.write(
      [
        'Design Ops Deterministic Autofix',
        `target: ${result.target}`,
        `write: ${result.write}`,
        `scanned_files: ${result.scanned_files}`,
        `changed_files: ${result.changed_files}`,
      ].join('\n') + '\n'
    );
    return;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = runAutofix(args);
  printResult(result, args.format);
}

if (require.main === module) {
  main();
}

module.exports = {
  applyDeterministicFixes,
  parseArgs,
  runAutofix,
};
