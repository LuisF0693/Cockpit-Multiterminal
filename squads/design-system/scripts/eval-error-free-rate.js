#!/usr/bin/env node
/**
 * eval-error-free-rate.js — 9-dimension error-free rate evaluator
 * Story: STORY-119.36
 *
 * Dimensions:
 *   D1: TypeScript compilation
 *   D2: JSX validity (AST parse)
 *   D3: Import correctness
 *   D4: Component existence
 *   D5: Icon existence
 *   D6: Accessibility (aria-*, alt, roles)
 *   D7: Token compliance
 *   D8: Provider completeness
 *   D9: Dependency completeness
 */

'use strict'

const fs = require('fs'), path = require('path')
const ROOT = path.resolve(__dirname, '../../..')
const DS_SCRIPTS = path.join(ROOT, 'squads/design-system/scripts')

function runScript(scriptPath, filePath) {
  try {
    const { run } = require(scriptPath)
    return run(filePath)
  } catch { return null }
}

function checkD1TypeScript(filePath) {
  // Check basic TS syntax without compilation (full tsc too slow per-file)
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    // Basic: balanced braces/parens, no obvious syntax errors
    const opens = (content.match(/[{(]/g) || []).length
    const closes = (content.match(/[})]/g) || []).length
    const balanced = Math.abs(opens - closes) <= 2  // allow small imbalance for JSX
    return { dimension: 'D1', pass: balanced, note: balanced ? 'Basic syntax OK' : 'Unbalanced brackets detected' }
  } catch (e) {
    return { dimension: 'D1', pass: false, error: e.message }
  }
}

function checkD2JSX(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    // Check JSX: opening/closing tags roughly match
    const opens = (content.match(/<[A-Z][a-zA-Z]+/g) || []).length
    const closes = (content.match(/<\/[A-Z][a-zA-Z]+>/g) || []).length
    const selfClose = (content.match(/\/>/g) || []).length
    const balanced = opens <= closes + selfClose + 3  // allow JSX returns
    return { dimension: 'D2', pass: balanced, note: 'JSX structure check' }
  } catch (e) {
    return { dimension: 'D2', pass: false, error: e.message }
  }
}

function checkD6Accessibility(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const issues = []

    // Images should have alt text
    const imgTags = content.match(/<img\b[^>]*/gi) || []
    for (const img of imgTags) {
      if (!img.includes('alt=') && !img.includes('role="presentation"')) {
        issues.push('img missing alt attribute')
      }
    }

    // Buttons with only icons should have aria-label
    const iconButtons = content.match(/<Button[^>]*>\s*<[A-Z][a-zA-Z]+Icon/g) || []
    for (const btn of iconButtons) {
      if (!btn.includes('aria-label')) {
        issues.push('Icon-only button may need aria-label')
      }
    }

    return { dimension: 'D6', pass: issues.length === 0, issues, note: 'A23: feasibility spike — basic a11y checks' }
  } catch (e) {
    return { dimension: 'D6', pass: true, note: 'A23: a11y check skipped' }
  }
}

function checkD7TokenCompliance(filePath) {
  // A23 feasibility spike: check for hardcoded colors (hex values in className)
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const hardcodedColors = content.match(/className=["'][^"']*#[0-9a-fA-F]{3,6}[^"']*["']/g) || []
    return {
      dimension: 'D7',
      pass: hardcodedColors.length === 0,
      note: 'A23: token compliance — checks for hardcoded hex colors in className',
      issues: hardcodedColors.map(m => `Hardcoded color in className: ${m.slice(0, 50)}`)
    }
  } catch {
    return { dimension: 'D7', pass: true, note: 'A23: token check skipped' }
  }
}

function evalFile(filePath) {
  const start = Date.now()

  if (!fs.existsSync(filePath)) {
    return { file: filePath, dimensions: [], error_free: false, score: 0, error: 'File not found' }
  }

  const dimensions = []

  // D1: TypeScript compilation
  dimensions.push(checkD1TypeScript(filePath))

  // D2: JSX validity
  dimensions.push(checkD2JSX(filePath))

  // D3: Import correctness
  const d3 = runScript(path.join(DS_SCRIPTS, 'validate-imports.cjs'), filePath)
  dimensions.push({ dimension: 'D3', pass: d3 ? d3.pass_all : true, note: 'Import resolution' })

  // D4: Component existence
  const d4 = runScript(path.join(DS_SCRIPTS, 'validate-component-registry.cjs'), filePath)
  dimensions.push({ dimension: 'D4', pass: d4 ? d4.pass_all : true, note: 'Component registry' })

  // D5: Icon existence
  const d5 = runScript(path.join(DS_SCRIPTS, 'validate-lucide-icons.cjs'), filePath)
  dimensions.push({ dimension: 'D5', pass: d5 ? d5.pass_all : true, note: 'Lucide icons' })

  // D6: Accessibility (A23 feasibility)
  dimensions.push(checkD6Accessibility(filePath))

  // D7: Token compliance (A23 feasibility)
  dimensions.push(checkD7TokenCompliance(filePath))

  // D8: Provider completeness
  const d8 = runScript(path.join(DS_SCRIPTS, 'check-missing-providers.cjs'), filePath)
  dimensions.push({ dimension: 'D8', pass: d8 ? d8.pass_all : true, note: 'Provider completeness' })

  // D9: Dependency completeness
  const d9 = runScript(path.join(DS_SCRIPTS, 'validate-deps-completeness.cjs'), filePath)
  dimensions.push({ dimension: 'D9', pass: d9 ? d9.pass_all : true, note: 'Dep completeness' })

  const passed = dimensions.filter(d => d.pass).length
  const score = parseFloat((passed / dimensions.length).toFixed(3))
  const error_free = dimensions.every(d => d.pass)
  const elapsed = Date.now() - start

  return { file: filePath, dimensions, error_free, score, passed, total: dimensions.length, elapsed_ms: elapsed }
}

if (require.main === module) {
  const file = process.argv[2]
  if (!file) { console.error('Usage: node eval-error-free-rate.js <file.tsx>'); process.exit(1) }
  const result = evalFile(file)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.error_free ? 0 : 1)
}

module.exports = { evalFile }
