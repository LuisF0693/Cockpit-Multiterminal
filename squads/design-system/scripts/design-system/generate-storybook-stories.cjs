#!/usr/bin/env node
/**
 * generate-storybook-stories.cjs
 *
 * Gera stories CSF3 automaticamente a partir do component-index.json de uma marca.
 * Usado como Step 12 do foundations-pipeline.yaml.
 *
 * Uso: node generate-storybook-stories.cjs --bu=aiox
 *
 * [STORY-129.5]
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const buArg = args.find((a) => a.startsWith('--bu='));
if (!buArg) {
  console.error('Erro: --bu={slug} e obrigatorio.');
  console.error('Uso: node generate-storybook-stories.cjs --bu=aiox');
  process.exit(1);
}
const bu = buArg.split('=')[1];

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const INDEX_PATH = path.join(
  REPO_ROOT,
  'workspace',
  'businesses',
  bu,
  'L2-tactical',
  'design',
  'component-index.json'
);
const OUT_DIR = path.join(
  REPO_ROOT,
  'workspace',
  'businesses',
  bu,
  'L2-tactical',
  'design',
  'storybook'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map atomic_category -> Storybook title prefix (story-title-hierarchy from storybook-expert) */
function categoryToTitle(atomicCategory) {
  switch (atomicCategory) {
    case 'atom':
      return 'Base Components';
    case 'molecule':
      return 'Core Components';
    case 'organism':
      return 'Patterns';
    default:
      return 'Components';
  }
}

/** Convert variant slug to PascalCase export name */
function variantToPascal(variant) {
  return variant
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/** PT-BR label for common variant names */
function variantLabel(variant) {
  const map = {
    default: 'Padrao',
    destructive: 'Destrutivo',
    outline: 'Contorno',
    secondary: 'Secundario',
    ghost: 'Fantasma',
    link: 'Link',
  };
  return map[variant] || variantToPascal(variant);
}

// ---------------------------------------------------------------------------
// Story generator
// ---------------------------------------------------------------------------

function generateStory(component) {
  const { name, atomic_category, variants, when_to_use } = component;
  const titlePrefix = categoryToTitle(atomic_category);

  const lines = [];

  // Imports
  lines.push(`import type { Meta, StoryObj } from '@storybook/react'`);
  lines.push(`import { ${name} } from '@sinkra/ds-core'`);
  lines.push('');

  // Meta
  lines.push('const meta = {');
  lines.push(`  title: '${titlePrefix}/${name}',`);
  lines.push(`  component: ${name},`);
  lines.push(`  tags: ['autodocs'],`);
  lines.push('  parameters: {');
  lines.push('    docs: {');
  lines.push('      description: {');
  lines.push(`        component: '${(when_to_use || '').replace(/'/g, "\\'")}'`);
  lines.push('      }');
  lines.push('    }');
  lines.push('  }');
  lines.push(`} satisfies Meta<typeof ${name}>`);
  lines.push('');
  lines.push('export default meta');
  lines.push('type Story = StoryObj<typeof meta>');
  lines.push('');

  // Default story
  lines.push('export const Default: Story = {}');

  // Variant stories
  if (variants && variants.length > 0) {
    for (const v of variants) {
      if (v === 'default') continue; // Default already covered
      const exportName = variantToPascal(v);
      const label = variantLabel(v);
      lines.push('');
      lines.push(`export const ${exportName}: Story = {`);
      lines.push(`  args: { variant: '${v}', children: '${label}' }`);
      lines.push('}');
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Parse validation — verifica que o conteudo gerado e TS/JS parseavel
// ---------------------------------------------------------------------------

function smokeTestContent(content, fileName) {
  // Strip TypeScript-only syntax so we can validate basic JS structure
  let jsContent = content
    .replace(/import type \{[^}]+\} from '[^']+'/g, '')
    .replace(/type Story = StoryObj<typeof meta>/g, '')
    .replace(/satisfies Meta<typeof \w+>/g, '')
    .replace(/: Story/g, '');

  // Check for balanced braces
  let braceCount = 0;
  for (const ch of jsContent) {
    if (ch === '{') braceCount++;
    if (ch === '}') braceCount--;
    if (braceCount < 0) return { ok: false, error: `Unbalanced braces in ${fileName}` };
  }
  if (braceCount !== 0) {
    return { ok: false, error: `Unbalanced braces (${braceCount}) in ${fileName}` };
  }

  // Check for balanced parentheses
  let parenCount = 0;
  for (const ch of jsContent) {
    if (ch === '(') parenCount++;
    if (ch === ')') parenCount--;
    if (parenCount < 0) return { ok: false, error: `Unbalanced parentheses in ${fileName}` };
  }
  if (parenCount !== 0) {
    return { ok: false, error: `Unbalanced parentheses (${parenCount}) in ${fileName}` };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // 1. Read component-index
  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`Erro: component-index.json nao encontrado em ${INDEX_PATH}`);
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
  const components = index.components;
  if (!components || !Array.isArray(components)) {
    console.error('Erro: component-index.json nao contem array "components".');
    process.exit(1);
  }

  // 2. Select first 10 target components (story spec)
  const TARGET_NAMES = [
    'Button',
    'Card',
    'Badge',
    'Input',
    'Alert',
    'Dialog',
    'Select',
    'Checkbox',
    'Switch',
  ];

  const targets = TARGET_NAMES.map((name) => components.find((c) => c.name === name)).filter(
    Boolean
  );

  if (targets.length === 0) {
    console.error('Erro: Nenhum componente alvo encontrado no component-index.');
    process.exit(1);
  }

  // 3. Ensure output directory
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 4. Generate stories
  let generated = 0;
  let warnings = 0;

  for (const comp of targets) {
    const fileName = `${comp.name}.stories.tsx`;
    const filePath = path.join(OUT_DIR, fileName);
    const content = generateStory(comp);

    // Smoke test
    const result = smokeTestContent(content, fileName);
    if (!result.ok) {
      console.warn(`WARNING: ${result.error}`);
      warnings++;
      // Write anyway — non-blocking per AC-3
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    generated++;
  }

  // 5. Report
  const relOut = path.relative(REPO_ROOT, OUT_DIR);
  console.log('');
  console.log(`Storybook: ${generated} stories geradas em ${relOut}`);
  if (warnings > 0) {
    console.log(`WARNING: ${warnings} stories com problemas de parse.`);
  }
  console.log('');

  // List generated files
  for (const comp of targets) {
    console.log(`  - ${comp.name}.stories.tsx`);
  }

  // Exit 0 even with warnings (non-blocking per AC-3)
  process.exit(0);
}

main();
