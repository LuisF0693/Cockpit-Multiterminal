#!/usr/bin/env node
/**
 * validate-ds-readiness.cjs
 * Step 0 gate for page-composition.yaml
 * Verifies the DS for a brand is captured and ready for UI generation.
 *
 * Usage: node validate-ds-readiness.cjs --bu=rewvo
 * Exit 0: PASS
 * Exit 1: FAIL — DS missing or incomplete
 * Exit 2: WARNING — DS present but possibly stale
 */
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const buArg = args.find(a => a.startsWith('--bu='))
const bu = buArg ? buArg.split('=')[1] : null

if (!bu) {
  console.error('ERROR: --bu={slug} required')
  process.exit(1)
}

const ROOT = path.resolve(__dirname, '../../../..')
const designPath = path.join(ROOT, 'workspace', 'businesses', bu, 'L2-tactical', 'design')

// Check 1: design folder exists
if (!fs.existsSync(designPath)) {
  console.error(`ERROR: DS not found for '${bu}'.`)
  console.error(`ACTION: Run /capture-ds --brand ${bu} first.`)
  process.exit(1)
}

// Check 2: tokens-runtime.json exists
const tokensPath = path.join(designPath, 'tokens-runtime.json')
if (!fs.existsSync(tokensPath)) {
  console.error(`ERROR: tokens-runtime.json missing for '${bu}'.`)
  console.error(`ACTION: Run /capture-ds --brand ${bu} to generate tokens.`)
  process.exit(1)
}

// Check 3: component-index.json exists with >= 14 components
const indexPath = path.join(designPath, 'component-index.json')
if (!fs.existsSync(indexPath)) {
  console.error(`ERROR: component-index.json missing for '${bu}'.`)
  console.error(`ACTION: Run /capture-ds --brand ${bu} to generate component index.`)
  process.exit(1)
}

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
const components = Array.isArray(index) ? index : (index.components || Object.values(index))
if (components.length < 14) {
  console.error(`ERROR: component-index.json has only ${components.length} components (minimum: 14).`)
  console.error(`ACTION: Run /capture-ds --brand ${bu} --force to re-capture.`)
  process.exit(1)
}

// Check 4: staleness warning
const tokensStat = fs.statSync(tokensPath)
const indexStat = fs.statSync(indexPath)
if (tokensStat.mtimeMs > indexStat.mtimeMs + 3600000) { // 1h threshold
  console.warn(`WARNING: tokens-runtime.json is newer than component-index.json for '${bu}'.`)
  console.warn(`SUGGESTION: Run /capture-ds --brand ${bu} to sync components with updated tokens.`)
  // Exit 0 — warning only, not a blocker
}

console.log(`PASS: DS ready for '${bu}' — ${components.length} components, tokens present.`)
process.exit(0)
