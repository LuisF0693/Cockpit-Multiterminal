#!/usr/bin/env node
/**
 * ingest-from-prints.cjs
 * STORY-129.7 — Ingests design system from screenshot prints.
 *
 * Strategy: No computer vision. Node.js only.
 * For each image in the prints directory, reports filename and generates
 * a pre-filled token template with SINKRA defaults. All tokens marked
 * as confidence LOW (manual inference required).
 *
 * Usage:
 *   node ingest-from-prints.cjs --bu={slug} [--prints-dir={path}]
 *
 * Output:
 *   workspace/businesses/{slug}/L2-tactical/design/tokens-from-prints.json
 *
 * Exit codes:
 *   0 — Template generated successfully
 *   1 — Validation error (missing prints, bad args)
 *   3 — Argument/environment error
 */

const fs = require('fs')
const path = require('path')

// --- Argument parsing ---
const args = process.argv.slice(2)
const buArg = args.find(a => a.startsWith('--bu='))
const printsDirArg = args.find(a => a.startsWith('--prints-dir='))

const bu = buArg ? buArg.split('=')[1] : null
const ROOT = path.resolve(__dirname, '..', '..', '..', '..')

if (!bu) {
  console.error('ERROR: --bu={slug} is required. Example: --bu=aiox')
  process.exit(3)
}

// --- Resolve prints directory ---
const defaultPrintsDir = path.join(ROOT, 'workspace', 'businesses', bu, 'L2-tactical', 'design', 'raw')
const printsDir = printsDirArg ? path.resolve(printsDirArg.split('=')[1]) : defaultPrintsDir

// --- Validate business exists ---
const buPath = path.join(ROOT, 'workspace', 'businesses', bu)
if (!fs.existsSync(buPath)) {
  console.error(`ERROR: Business '${bu}' not found at ${buPath}`)
  console.error(`ACTION: Create the folder first: mkdir -p workspace/businesses/${bu}/L2-tactical/design`)
  process.exit(3)
}

// --- Validate prints directory ---
if (!fs.existsSync(printsDir)) {
  console.error(`ERROR: Prints directory not found: ${printsDir}`)
  console.error('ACTION: Provide --prints-dir={path} or create the default directory:')
  console.error(`  mkdir -p workspace/businesses/${bu}/L2-tactical/design/raw/`)
  console.error('  Then add screenshot images (.png, .jpg, .jpeg, .webp) to that folder.')
  process.exit(1)
}

// --- Scan for image files ---
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.svg'])
const files = fs.readdirSync(printsDir).filter(f => {
  const ext = path.extname(f).toLowerCase()
  return IMAGE_EXTENSIONS.has(ext)
})

if (files.length === 0) {
  console.error(`ERROR: No image files found in ${printsDir}`)
  console.error('ACTION: Add screenshot images (.png, .jpg, .jpeg, .webp) to the prints directory.')
  process.exit(1)
}

console.log(`INFO: Found ${files.length} image(s) in ${printsDir}:`)
files.forEach((f, i) => {
  console.log(`  ${i + 1}. ${f}`)
})

// --- SINKRA default tokens (fallback values from tokens-base) ---
const SINKRA_DEFAULTS = {
  color: {
    'brand-primary': { value: '#3B82F6', css_var: '--color-brand-primary' },
    'brand-accent': { value: '#8B5CF6', css_var: '--color-brand-accent' },
    'background-light': { value: '#FAFAFA', css_var: '--color-background' },
    'background-dark': { value: '#0F172A', css_var: '--color-background-dark' },
    'foreground-light': { value: '#0F172A', css_var: '--color-foreground' },
    'foreground-dark': { value: '#F8FAFC', css_var: '--color-foreground-dark' },
    'success': { value: '#22C55E', css_var: '--color-success' },
    'warning': { value: '#F59E0B', css_var: '--color-warning' },
    'error': { value: '#EF4444', css_var: '--color-error' },
    'info': { value: '#3B82F6', css_var: '--color-info' },
    'muted-light': { value: '#F1F5F9', css_var: '--color-muted' },
    'muted-dark': { value: 'rgba(255,255,255,0.06)', css_var: '--color-muted-dark' },
    'border-light': { value: '#E2E8F0', css_var: '--color-border' },
    'border-dark': { value: 'rgba(255,255,255,0.08)', css_var: '--color-border-dark' },
  },
  typography: {
    'font-sans': { value: 'Inter', css_var: '--font-sans' },
    'font-mono': { value: 'JetBrains Mono', css_var: '--font-mono' },
    'font-size-base': { value: '16px', css_var: '--font-size-base' },
    'line-height-base': { value: '1.5', css_var: '--line-height-base' },
    'font-weight-normal': { value: '400', css_var: '--font-weight-normal' },
    'font-weight-semibold': { value: '600', css_var: '--font-weight-semibold' },
    'font-weight-bold': { value: '700', css_var: '--font-weight-bold' },
  },
  spacing: {
    'xs': { value: '0.25rem', css_var: '--spacing-xs' },
    'sm': { value: '0.5rem', css_var: '--spacing-sm' },
    'md': { value: '1rem', css_var: '--spacing-md' },
    'lg': { value: '1.5rem', css_var: '--spacing-lg' },
    'xl': { value: '2rem', css_var: '--spacing-xl' },
    '2xl': { value: '3rem', css_var: '--spacing-2xl' },
  },
  radius: {
    'sm': { value: 'calc(0.75rem - 4px)', css_var: '--radius-sm' },
    'md': { value: 'calc(0.75rem - 2px)', css_var: '--radius-md' },
    'lg': { value: '0.75rem', css_var: '--radius-lg' },
  },
  shadows: {
    'sm': { value: '0 1px 2px 0 rgba(0,0,0,0.05)', css_var: '--shadow-sm' },
    'md': { value: '0 4px 6px -1px rgba(0,0,0,0.1)', css_var: '--shadow-md' },
  },
}

// --- Build output template ---
// All brand-specific tokens start as PENDING_VALIDATION.
// Semantic/utility tokens use SINKRA defaults but still LOW confidence.
function buildTokenCategory(defaults) {
  const result = {}
  for (const [key, def] of Object.entries(defaults)) {
    const isBrandSpecific = key.startsWith('brand-')
    result[key] = {
      value: isBrandSpecific ? 'PENDING_VALIDATION' : def.value,
      confidence: 'LOW',
      css_var: def.css_var,
      source: isBrandSpecific ? 'needs_manual_input' : 'sinkra_default',
    }
  }
  return result
}

const output = {
  meta: {
    source: 'prints',
    confidence: 'LOW',
    requires_human_validation: true,
    business: bu,
    prints_dir: printsDir,
    prints_count: files.length,
    prints_files: files,
    generated_at: new Date().toISOString(),
    generator: 'ingest-from-prints.cjs',
    story: 'STORY-129.7',
  },
  color: buildTokenCategory(SINKRA_DEFAULTS.color),
  typography: buildTokenCategory(SINKRA_DEFAULTS.typography),
  spacing: buildTokenCategory(SINKRA_DEFAULTS.spacing),
  radius: buildTokenCategory(SINKRA_DEFAULTS.radius),
  shadows: buildTokenCategory(SINKRA_DEFAULTS.shadows),
  note: 'Review and update values before running F2. All values marked PENDING_VALIDATION must be filled. Tokens with source=sinkra_default use framework defaults and should be replaced with brand-specific values where available.',
}

// --- Ensure output directory exists ---
const designDir = path.join(buPath, 'L2-tactical', 'design')
if (!fs.existsSync(designDir)) {
  fs.mkdirSync(designDir, { recursive: true })
  console.log(`INFO: Created ${designDir}`)
}

// --- Write output ---
const outputPath = path.join(designDir, 'tokens-from-prints.json')
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8')

console.log('')
console.log('=== PRINTS TOKEN TEMPLATE GENERATED ===')
console.log(`OUTPUT: ${outputPath}`)
console.log('')
console.log('NEXT STEPS:')
console.log('  1. Open tokens-from-prints.json')
console.log('  2. Review each print screenshot and update PENDING_VALIDATION values')
console.log('  3. Update confidence from LOW to MEDIUM/HIGH as you validate each token')
console.log('  4. Run: node validate-capture-input.cjs --bu=' + bu + ' --validate-prints')
console.log('  5. Once validated, pipeline continues to F2')
console.log('')
console.log('WARNING: Pipeline will NOT advance to F2 until human validation is complete.')
console.log('         All PENDING_VALIDATION tokens MUST be resolved first.')

process.exit(0)
