#!/usr/bin/env node
/**
 * add-story-after-compose.cjs
 * Generates a CSF3 Storybook story from a composed .tsx file.
 * Extracts the first exported function component name and creates
 * Default + tone variant stories (minimal, premium, bold).
 *
 * Usage: node add-story-after-compose.cjs --bu=aiox --file=path/to/generated.tsx
 * Exit 0: story created (or warning on parse failure)
 * Exit 1: missing args or file not found
 *
 * [STORY-130.9]
 */

'use strict'

const fs = require('fs')
const path = require('path')

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const buArg = args.find((a) => a.startsWith('--bu='))
const fileArg = args.find((a) => a.startsWith('--file='))

if (!buArg || !fileArg) {
  console.error('Erro: --bu={slug} e --file={path} sao obrigatorios.')
  console.error('Uso: node add-story-after-compose.cjs --bu=aiox --file=path/to/component.tsx')
  process.exit(1)
}

const bu = buArg.split('=')[1]
const filePath = fileArg.split('=').slice(1).join('=')

if (!fs.existsSync(filePath)) {
  console.error(`Erro: Arquivo nao encontrado: ${filePath}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const OUT_DIR = path.join(
  REPO_ROOT,
  'workspace',
  'businesses',
  bu,
  'L2-tactical',
  'design',
  'storybook'
)

// ---------------------------------------------------------------------------
// Extract component name
// ---------------------------------------------------------------------------

function extractComponentName(content) {
  // Match: export function ComponentName(
  // Match: export const ComponentName =
  // Match: export default function ComponentName(
  const patterns = [
    /export\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9]*)\s*\(/,
    /export\s+(?:default\s+)?const\s+([A-Z][A-Za-z0-9]*)\s*[=:]/,
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match) return match[1]
  }

  return null
}

// ---------------------------------------------------------------------------
// Smoke test — parse validation
// ---------------------------------------------------------------------------

function smokeTestContent(content, fileName) {
  let braceCount = 0
  for (const ch of content) {
    if (ch === '{') braceCount++
    if (ch === '}') braceCount--
    if (braceCount < 0) return { ok: false, error: `Chaves desbalanceadas em ${fileName}` }
  }
  if (braceCount !== 0) {
    return { ok: false, error: `Chaves desbalanceadas (${braceCount}) em ${fileName}` }
  }

  let parenCount = 0
  for (const ch of content) {
    if (ch === '(') parenCount++
    if (ch === ')') parenCount--
    if (parenCount < 0) return { ok: false, error: `Parenteses desbalanceados em ${fileName}` }
  }
  if (parenCount !== 0) {
    return { ok: false, error: `Parenteses desbalanceados (${parenCount}) em ${fileName}` }
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Story generator — CSF3 with tone variants
// ---------------------------------------------------------------------------

function generateStory(componentName, sourceFile) {
  const tones = [
    { key: 'Minimal', label: 'Variante minimalista', className: 'max-w-4xl mx-auto' },
    { key: 'Premium', label: 'Variante premium com espacamento generoso', className: 'max-w-6xl mx-auto py-8' },
    { key: 'Bold', label: 'Variante ousada com contraste alto', className: 'bg-foreground text-background p-8 rounded-xl' },
  ]

  const lines = []

  // Header comment
  lines.push(`// ${componentName}.stories.tsx`)
  lines.push(`// Story CSF3 gerada automaticamente apos /compose.`)
  lines.push(`// Fonte: ${path.basename(sourceFile)}`)
  lines.push('')

  // Imports
  lines.push(`import type { Meta, StoryObj } from '@storybook/react'`)
  lines.push(`import { ${componentName} } from './${path.basename(sourceFile, '.tsx')}'`)
  lines.push('')

  // Meta
  lines.push('const meta = {')
  lines.push(`  title: 'Paginas Compostas/${componentName}',`)
  lines.push(`  component: ${componentName},`)
  lines.push(`  tags: ['autodocs'],`)
  lines.push('  parameters: {')
  lines.push('    layout: \'fullscreen\',')
  lines.push('    docs: {')
  lines.push('      description: {')
  lines.push(`        component: 'Pagina gerada via /compose. Inclui variantes de tom visual.'`)
  lines.push('      }')
  lines.push('    }')
  lines.push('  }')
  lines.push(`} satisfies Meta<typeof ${componentName}>`)
  lines.push('')
  lines.push('export default meta')
  lines.push(`type Story = StoryObj<typeof meta>`)
  lines.push('')

  // Default story
  lines.push('/** Versao padrao conforme gerada pelo pipeline. */')
  lines.push('export const Padrao: Story = {}')

  // Tone variants
  for (const tone of tones) {
    lines.push('')
    lines.push(`/** ${tone.label}. */`)
    lines.push(`export const ${tone.key}: Story = {`)
    lines.push('  decorators: [')
    lines.push(`    (Story) => (`)
    lines.push(`      <div className="${tone.className}">`)
    lines.push('        <Story />')
    lines.push('      </div>')
    lines.push('    )')
    lines.push('  ]')
    lines.push('}')
  }

  lines.push('')
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const content = fs.readFileSync(filePath, 'utf-8')
  const componentName = extractComponentName(content)

  if (!componentName) {
    console.warn('WARNING: Nao foi possivel extrair nome do componente. Story nao gerada.')
    process.exit(0)
  }

  // Ensure output directory
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // Generate story
  const storyContent = generateStory(componentName, filePath)
  const storyFileName = `${componentName}.stories.tsx`
  const storyPath = path.join(OUT_DIR, storyFileName)

  // Smoke test
  const result = smokeTestContent(storyContent, storyFileName)
  if (!result.ok) {
    console.warn(`WARNING: ${result.error}`)
    // Write anyway — non-blocking per AC-3
  }

  fs.writeFileSync(storyPath, storyContent, 'utf-8')

  const relOut = path.relative(REPO_ROOT, storyPath)
  console.log(`Storybook: story gerada em ${relOut}`)
  console.log(`  Componente: ${componentName}`)
  console.log(`  Variantes: Padrao, Minimal, Premium, Bold`)

  process.exit(0)
}

main()
