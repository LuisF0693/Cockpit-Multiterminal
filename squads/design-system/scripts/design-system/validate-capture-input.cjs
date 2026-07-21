#!/usr/bin/env node
/**
 * validate-capture-input.cjs
 * Step 0 gate for foundations-pipeline.yaml
 * Validates all prerequisites before F1 starts.
 *
 * Usage:
 *   node validate-capture-input.cjs --bu=rewvo [--source=figma]
 *   node validate-capture-input.cjs --bu=rewvo --source=prints [--prints-dir={path}]
 *   node validate-capture-input.cjs --bu=rewvo --source=pasta [--force]
 *   node validate-capture-input.cjs --bu=rewvo --validate-prints
 *
 * Exit 0: PASS — pipeline can proceed
 * Exit 1: FAIL — pipeline must stop (prints reason)
 *
 * --source=pasta: Detect existing DS artifacts, skip completed steps.
 * --source=url: Extract DS from live website via Playwright.
 * --force: Reprocess all steps even if already completed (only with --source=pasta).
 *
 * [STORY-129.8] Added --source pasta and --force support
 * [STORY-129.9] Added --source url with Playwright extraction
 */

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const buArg = args.find(a => a.startsWith('--bu='))
const sourceArg = args.find(a => a.startsWith('--source='))
const printsDirArg = args.find(a => a.startsWith('--prints-dir='))
const validatePrints = args.includes('--validate-prints')
const forceFlag = args.includes('--force')

const urlArg = args.find(a => a.startsWith('--url='))
const bu = buArg ? buArg.split('=')[1] : null
const source = sourceArg ? sourceArg.split('=')[1] : 'figma'
const targetUrl = urlArg ? urlArg.slice('--url='.length) : null

// Check 1: --bu is required
if (!bu) {
  console.error('ERROR: --bu={slug} is required. Example: --bu=rewvo')
  process.exit(1)
}

// Check 2: business slug must exist in workspace/businesses/
const ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const buPath = path.join(ROOT, 'workspace', 'businesses', bu)

if (!fs.existsSync(buPath)) {
  console.error(`ERROR: Business '${bu}' not found at ${buPath}`)
  console.error(`ACTION: Create the folder first: mkdir -p workspace/businesses/${bu}/L2-tactical/design`)
  process.exit(1)
}

// Auto-create design folder if missing
const designPath = path.join(buPath, 'L2-tactical', 'design')
if (!fs.existsSync(designPath)) {
  fs.mkdirSync(designPath, { recursive: true })
  console.log(`INFO: Created ${designPath}`)
}

// --- Validate prints tokens (Step 0.5 gate) ---
// Runs before source-specific checks because --validate-prints is a standalone
// command that should not depend on Figma API keys or other source prerequisites.
if (validatePrints) {
  const tokensPath = path.join(designPath, 'tokens-from-prints.json')

  if (!fs.existsSync(tokensPath)) {
    console.error(`ERROR: tokens-from-prints.json not found at ${tokensPath}`)
    console.error('ACTION: Run ingest-from-prints.cjs first to generate the template.')
    process.exit(1)
  }

  let tokens
  try {
    tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'))
  } catch (e) {
    console.error(`ERROR: Failed to parse ${tokensPath}: ${e.message}`)
    process.exit(1)
  }

  // Check for PENDING_VALIDATION values
  const pending = []
  const categories = ['color', 'typography', 'spacing', 'radius', 'shadows']
  for (const cat of categories) {
    if (!tokens[cat]) continue
    for (const [key, def] of Object.entries(tokens[cat])) {
      if (def.value === 'PENDING_VALIDATION') {
        pending.push(`${cat}.${key}`)
      }
    }
  }

  if (pending.length > 0) {
    console.error('FAIL: Tokens still marked PENDING_VALIDATION:')
    pending.forEach(p => console.error(`  - ${p}`))
    console.error('')
    console.error(`ACTION: Open ${tokensPath} and fill in the ${pending.length} pending value(s).`)
    console.error('Pipeline CANNOT advance to F2 until all tokens are validated.')
    process.exit(1)
  }

  // Check meta.requires_human_validation
  if (tokens.meta && tokens.meta.requires_human_validation === true) {
    console.warn('WARN: meta.requires_human_validation is still true.')
    console.warn('ACTION: Set to false after reviewing all tokens to confirm human validation is complete.')
  }

  console.log('PASS: All tokens validated. No PENDING_VALIDATION values remain.')
  console.log('INFO: Pipeline may proceed to F2.')
  process.exit(0)
}

// --- Source-specific validation ---

// URL mode: extract DS tokens from live website via Playwright [STORY-129.9]
if (source === 'url') {
  if (!targetUrl) {
    console.error('ERROR: --url={site} is required when --source=url')
    console.error('Example: node validate-capture-input.cjs --bu=stripe-clone --source=url --url=https://stripe.com')
    process.exit(1)
  }

  // Validate URL format
  try {
    new URL(targetUrl)
  } catch {
    console.error(`ERROR: Invalid URL: ${targetUrl}`)
    console.error('Provide a full URL including protocol (https://...)')
    process.exit(1)
  }

  console.log(`INFO: URL source mode. Will extract DS from ${targetUrl}`)

  // Run extract-from-url.cjs
  const extractScript = path.join(__dirname, 'extract-from-url.cjs')
  if (!fs.existsSync(extractScript)) {
    console.error(`ERROR: extract-from-url.cjs not found at ${extractScript}`)
    process.exit(1)
  }

  const { spawnSync } = require('child_process')
  const extractResult = spawnSync('node', [extractScript, `--url=${targetUrl}`, `--bu=${bu}`], {
    encoding: 'utf8',
    stdio: 'inherit',
    timeout: 120000,
    cwd: ROOT
  })

  if (extractResult.error || extractResult.status !== 0) {
    const exitCode = extractResult.status || 1
    // Exit code 1 = extraction failed but fallback instructions printed
    // Exit code 3 = argument error
    if (exitCode === 3) {
      process.exit(1)
    }
    // Extraction failed but fallback was shown — exit gracefully
    console.log('')
    console.log('INFO: Extraction did not complete. Follow the fallback instructions above,')
    console.log(`      then run: /capture-ds --source pasta --brand ${bu}`)
    process.exit(1)
  }

  // Extraction succeeded — tokens-normalized.json exists, pipeline can skip F1
  const tokensPath = path.join(designPath, 'tokens-normalized.json')
  if (fs.existsSync(tokensPath)) {
    console.log(`PASS: URL extraction complete. tokens-normalized.json ready at ${path.relative(ROOT, tokensPath)}`)
    console.log('INFO: Pipeline may skip F1 (ingest tokens) and proceed from F2.')
    console.log(`PIPELINE_STATE:${JSON.stringify({ source: 'url', url: targetUrl, skip_f1: true })}`)
  } else {
    console.error('ERROR: Extraction ran but tokens-normalized.json was not created.')
    process.exit(1)
  }
  process.exit(0)
}

// Pasta mode: detect existing DS state and configure pipeline to skip completed steps
if (source === 'pasta') {
  const { detectPipelineState } = require('./detect-pipeline-state.cjs')

  if (!fs.existsSync(designPath)) {
    console.error(`ERROR: Design directory not found at ${path.relative(ROOT, designPath)}`)
    console.error('ACTION: --source=pasta requires an existing design directory with partial DS artifacts.')
    console.error('        Use --source=figma for a fresh DS capture.')
    process.exit(1)
  }

  const state = detectPipelineState(bu)

  if (forceFlag) {
    console.log(`PASS: Input validation passed for --bu=${bu} --source=pasta --force`)
    console.log('INFO: --force flag set. All steps will be reprocessed regardless of existing artifacts.')
    console.log(`PIPELINE_STATE:${JSON.stringify({ ...state, force: true, skip_steps: [] })}`)
    process.exit(0)
  }

  if (state.all_complete) {
    console.log(`PASS: DS already complete for ${bu}. All ${state.total_steps} steps done.`)
    console.log('INFO: Use --force to reprocess all steps.')
    console.log(`PIPELINE_STATE:${JSON.stringify({ ...state, force: false, skip_steps: state.completed_steps })}`)
    process.exit(0)
  }

  // Report which steps will be skipped
  console.log(`PASS: Input validation passed for --bu=${bu} --source=pasta`)
  console.log(
    `DS parcial detectado para ${bu}. Steps completados: ${state.completed_steps.join(', ')}. ` +
    `Retomando de Step ${state.next_step} (${state.resume_label}).`
  )
  console.log(`PIPELINE_STATE:${JSON.stringify({ ...state, force: false, skip_steps: state.completed_steps })}`)
  process.exit(0)
}

if (source === 'prints') {
  // Prints mode: validate prints directory exists and has images
  const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.svg'])
  const defaultPrintsDir = path.join(designPath, 'raw')
  const printsDir = printsDirArg ? path.resolve(printsDirArg.split('=')[1]) : defaultPrintsDir

  if (!fs.existsSync(printsDir)) {
    console.error(`ERROR: Prints directory not found: ${printsDir}`)
    console.error('')
    console.error('ACTION: Either provide --prints-dir={path} or create the default directory:')
    console.error(`  mkdir -p workspace/businesses/${bu}/L2-tactical/design/raw/`)
    console.error('')
    console.error('Then add screenshot images (.png, .jpg, .jpeg, .webp) to that folder.')
    console.error('These should be screenshots of the existing design system (colors, typography, components).')
    process.exit(1)
  }

  const imageFiles = fs.readdirSync(printsDir).filter(f => {
    const ext = path.extname(f).toLowerCase()
    return IMAGE_EXTENSIONS.has(ext)
  })

  if (imageFiles.length === 0) {
    console.error(`ERROR: No image files found in ${printsDir}`)
    console.error('ACTION: Add screenshot images (.png, .jpg, .jpeg, .webp) of the design system.')
    process.exit(1)
  }

  console.log(`INFO: Found ${imageFiles.length} print image(s) in ${printsDir}`)
}

if (source === 'figma') {
  // Figma mode: check API key
  const envPath = path.join(ROOT, '.env')
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8')
    if (!env.includes('FIGMA_API_KEY=') || env.includes('FIGMA_API_KEY=\n') || env.includes('FIGMA_API_KEY=""')) {
      console.error('ERROR: FIGMA_API_KEY not set in .env')
      console.error('ACTION: Add FIGMA_API_KEY=your_token to .env')
      process.exit(1)
    }
  } else {
    console.warn('WARN: .env not found — FIGMA_API_KEY may be missing')
  }
}

console.log(`PASS: Input validation passed for --bu=${bu} --source=${source}`)
process.exit(0)
