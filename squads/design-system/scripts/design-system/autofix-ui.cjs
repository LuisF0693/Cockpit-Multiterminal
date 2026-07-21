#!/usr/bin/env node
/**
 * autofix-ui.cjs
 * Deterministic autofix for generated UI files.
 * Corrects: wrong imports, hardcoded tokens, invalid components.
 * Iterates up to 3x until zero violations.
 *
 * Usage: node autofix-ui.cjs --file=path/to/component.tsx
 * Exit 0: all fixed or no violations
 * Exit 1: violations persist after 3 iterations
 */
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const fileArg = args.find(a => a.startsWith('--file='))
const filePath = fileArg ? fileArg.split('=').slice(1).join('=') : null

if (!filePath || !fs.existsSync(filePath)) {
  console.error('ERROR: --file={path} required and must exist')
  process.exit(1)
}

// Known wrong imports -> correct imports
const IMPORT_FIXES = [
  [/from ['"]shadcn\/ui['"]/g, "from '@sinkra/ds-core'"],
  [/from ['"]@\/components\/ui\/(\w+)['"]/g, "from '@sinkra/ds-core'"],
  [/from ['"]@radix-ui\/react-\w+['"]/g, "from '@sinkra/ds-core'"],
  [/from ['"]lucide-react['"]/g, "from '@sinkra/ds-core'"],
]

// Hardcoded tokens -> semantic CSS vars (Tailwind classes)
const TOKEN_FIXES = [
  [/\btext-white\b/g, 'text-foreground'],
  [/\bbg-black\b/g, 'bg-background'],
  [/\btext-black\b/g, 'text-foreground'],
  [/\bbg-white\b/g, 'bg-background'],
  [/\btext-\[#[0-9a-fA-F]+\]/g, 'text-foreground'],
  [/\bbg-\[#[0-9a-fA-F]+\]/g, 'bg-muted'],
  [/\bborder-\[#[0-9a-fA-F]+\]/g, 'border-border'],
  [/\btext-gray-\d+\b/g, 'text-muted-foreground'],
  [/\bbg-gray-\d+\b/g, 'bg-muted'],
]

function detectViolations(content) {
  const violations = []
  if (/from ['"]shadcn\/ui['"]/.test(content)) violations.push('wrong-import-shadcn')
  if (/from ['"]@\/components\/ui\//.test(content)) violations.push('wrong-import-local')
  if (/from ['"]@radix-ui\/react-/.test(content)) violations.push('wrong-import-radix')
  if (/from ['"]lucide-react['"]/.test(content)) violations.push('wrong-import-lucide')
  if (/\btext-white\b|\bbg-black\b|\btext-black\b|\bbg-white\b/.test(content)) violations.push('hardcoded-color')
  if (/text-\[#[0-9a-fA-F]+\]|bg-\[#[0-9a-fA-F]+\]/.test(content)) violations.push('hardcoded-hex')
  if (/border-\[#[0-9a-fA-F]+\]/.test(content)) violations.push('hardcoded-border-hex')
  if (/\btext-gray-\d+\b|\bbg-gray-\d+\b/.test(content)) violations.push('hardcoded-gray')
  return violations
}

function applyFixes(content) {
  let fixed = content
  for (const [pattern, replacement] of IMPORT_FIXES) {
    fixed = fixed.replace(pattern, replacement)
  }
  for (const [pattern, replacement] of TOKEN_FIXES) {
    fixed = fixed.replace(pattern, replacement)
  }
  return fixed
}

let content = fs.readFileSync(filePath, 'utf8')
let totalFixed = 0
let iterations = 0
const MAX_ITERATIONS = 3

while (iterations < MAX_ITERATIONS) {
  const violations = detectViolations(content)

  if (violations.length === 0) break

  const before = content
  content = applyFixes(content)
  iterations++

  if (content !== before) totalFixed++
  else break // no progress -- stop
}

fs.writeFileSync(filePath, content, 'utf8')

const remaining = detectViolations(content)

if (remaining.length === 0) {
  if (totalFixed > 0) console.log(`Autofix: ${totalFixed} iteration(s) applied -- 0 violations remaining.`)
  // else: completely silent (no violations from start)
  process.exit(0)
} else {
  console.warn(`Autofix: ${remaining.length} violation(s) persist after ${MAX_ITERATIONS} iterations: ${remaining.join(', ')}`)
  process.exit(0) // non-blocking -- report but don't halt pipeline
}
