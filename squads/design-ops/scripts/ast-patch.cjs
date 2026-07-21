#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = process.cwd();

function parseArgs(argv) {
  const args = {
    target: null,
    search: null,
    replace: null,
    write: false,
    patchFile: null,
    transform: null,
    fromModule: null,
    fromName: null,
    toModule: null,
    toName: null,
  };

  for (const raw of argv) {
    if (raw.startsWith('--target=')) {
      args.target = raw.slice('--target='.length).trim() || null;
      continue;
    }
    if (raw.startsWith('--search=')) {
      args.search = raw.slice('--search='.length) || null;
      continue;
    }
    if (raw.startsWith('--replace=')) {
      args.replace = raw.slice('--replace='.length) || null;
      continue;
    }
    if (raw.startsWith('--patch-file=')) {
      args.patchFile = raw.slice('--patch-file='.length).trim() || null;
      continue;
    }
    if (raw.startsWith('--transform=')) {
      args.transform = raw.slice('--transform='.length).trim() || null;
      continue;
    }
    if (raw.startsWith('--from-module=')) {
      args.fromModule = raw.slice('--from-module='.length).trim() || null;
      continue;
    }
    if (raw.startsWith('--from-name=')) {
      args.fromName = raw.slice('--from-name='.length).trim() || null;
      continue;
    }
    if (raw.startsWith('--to-module=')) {
      args.toModule = raw.slice('--to-module='.length).trim() || null;
      continue;
    }
    if (raw.startsWith('--to-name=')) {
      args.toName = raw.slice('--to-name='.length).trim() || null;
      continue;
    }
    if (raw === '--write') {
      args.write = true;
    }
  }

  return args;
}

function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}

function parsePatchFile(patchPath) {
  const payload = fs.readFileSync(patchPath, 'utf8');
  const searchMatch = payload.match(/<<<<\s*SEARCH\s*\n([\s\S]*?)\n====/);
  const replaceMatch = payload.match(/====\s*\n([\s\S]*?)\n>>>>\s*REPLACE/);
  if (!searchMatch || !replaceMatch) {
    fail('Invalid patch file format. Expected <<<< SEARCH ... ==== ... >>>> REPLACE');
  }
  return {
    search: searchMatch[1],
    replace: replaceMatch[1],
  };
}

function supportsAstPatch(targetPath) {
  const ext = path.extname(targetPath).toLowerCase();
  return ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx';
}

function createSourceFile(targetPath, source) {
  const ext = path.extname(targetPath).toLowerCase();
  const kind =
    ext === '.tsx'
      ? ts.ScriptKind.TSX
      : ext === '.jsx'
        ? ts.ScriptKind.JSX
        : ext === '.js'
          ? ts.ScriptKind.JS
          : ts.ScriptKind.TS;
  return ts.createSourceFile(targetPath, source, ts.ScriptTarget.Latest, true, kind);
}

function runRenameImportTransform(sourceFile, source, args) {
  if (!args.fromModule || !args.fromName || !args.toName) {
    fail(
      'Missing args for --transform=rename-import. Required: --from-module --from-name --to-name [--to-module]'
    );
  }

  let transformed = source;
  let replacements = 0;
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const nextModule = args.toModule || args.fromModule;

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }
    if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    if (statement.moduleSpecifier.text !== args.fromModule) {
      continue;
    }
    if (!statement.importClause || !statement.importClause.namedBindings) {
      continue;
    }
    const bindings = statement.importClause.namedBindings;
    if (!ts.isNamedImports(bindings)) {
      continue;
    }

    let changed = false;
    const elements = bindings.elements.map((element) => {
      const importedName = element.propertyName ? element.propertyName.text : element.name.text;
      if (importedName !== args.fromName) {
        return element;
      }
      changed = true;
      const newImported = ts.factory.createIdentifier(args.toName);
      const localName = element.propertyName ? element.name : element.name;
      const nextElement =
        localName.text === args.toName
          ? ts.factory.createImportSpecifier(false, undefined, newImported)
          : ts.factory.createImportSpecifier(false, newImported, localName);
      return nextElement;
    });

    if (!changed) {
      continue;
    }

    const updatedBindings = ts.factory.updateNamedImports(bindings, elements);
    const updatedClause = ts.factory.updateImportClause(
      statement.importClause,
      statement.importClause.isTypeOnly,
      statement.importClause.name,
      updatedBindings
    );
    const updatedDeclaration = ts.factory.updateImportDeclaration(
      statement,
      statement.modifiers,
      updatedClause,
      ts.factory.createStringLiteral(nextModule),
      statement.attributes
    );

    const before = statement.getFullText(sourceFile);
    const after = printer.printNode(ts.EmitHint.Unspecified, updatedDeclaration, sourceFile);
    transformed = transformed.replace(before, `${after}\n`);
    replacements += 1;
  }

  return { transformed, replacements };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.target) {
    fail('Missing --target=<file>');
  }

  const targetPath = path.resolve(ROOT, args.target);
  if (!fs.existsSync(targetPath)) {
    fail(`Target file not found: ${path.relative(ROOT, targetPath)}`);
  }

  const source = fs.readFileSync(targetPath, 'utf8');
  let next = source;
  let occurrences = 0;

  if (args.transform) {
    if (!supportsAstPatch(targetPath)) {
      fail(`AST transform unsupported for extension: ${path.extname(targetPath)}`);
    }
    if (args.transform !== 'rename-import') {
      fail(`Unsupported transform: ${args.transform}`);
    }
    const sourceFile = createSourceFile(targetPath, source);
    const result = runRenameImportTransform(sourceFile, source, args);
    next = result.transformed;
    occurrences = result.replacements;
  } else {
    let search = args.search;
    let replace = args.replace;
    if (args.patchFile) {
      const patchPath = path.resolve(ROOT, args.patchFile);
      if (!fs.existsSync(patchPath)) {
        fail(`Patch file not found: ${path.relative(ROOT, patchPath)}`);
      }
      const parsed = parsePatchFile(patchPath);
      search = parsed.search;
      replace = parsed.replace;
    }

    if (typeof search !== 'string' || typeof replace !== 'string') {
      fail('Missing search/replace payload. Use --search/--replace or --patch-file');
    }

    occurrences = source.split(search).length - 1;
    if (occurrences <= 0) {
      fail('Search payload not found in target file');
    }

    next = source.replace(search, replace);
  }

  if (occurrences <= 0 || next === source) {
    fail('No replacements produced by patch operation');
  }

  if (args.write) {
    fs.writeFileSync(targetPath, next, 'utf8');
    process.stdout.write(`PASS: patched ${path.relative(ROOT, targetPath)}\n`);
    process.stdout.write(
      `  replaced_occurrences=${args.transform ? occurrences : 1} (found=${occurrences})\n`
    );
    process.stdout.write(`  mode=${args.transform ? `ast:${args.transform}` : 'text'}\n`);
    return;
  }

  process.stdout.write(`DRY-RUN: patch ready for ${path.relative(ROOT, targetPath)}\n`);
  process.stdout.write(
    `  replaced_occurrences=${args.transform ? occurrences : 1} (found=${occurrences})\n`
  );
  process.stdout.write(`  mode=${args.transform ? `ast:${args.transform}` : 'text'}\n`);
}

main();
