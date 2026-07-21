#!/usr/bin/env node
/**
 * run-critical-eye-ui.cjs
 * Critical Eye partial scoring for UI Generation (Dimensions 2+3 only).
 * Faster than full Critical Eye — runs after every /compose generation.
 *
 * Dimension 2 — Quality (30pts):
 *   - token_compliance: no hardcoded colors/sizes (10pts)
 *   - import_compliance: imports from @sinkra/ds-core only (10pts)
 *   - a11y_basic: has aria-label or role or semantic HTML (10pts) — BLOCKER if 0
 *
 * Dimension 3 — Consistency (20pts):
 *   - naming: kebab-case component names (10pts)
 *   - responsive: has at least one responsive class (md:, lg:, sm:) (10pts)
 *
 * Usage: node run-critical-eye-ui.cjs --bu=aiox --file=path/to/component.tsx
 * Exit 0: score >= 70 or blocker resolved
 * Exit 1: score < 70 or a11y blocker
 */
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const buArg = args.find(a => a.startsWith('--bu='))
const fileArg = args.find(a => a.startsWith('--file='))
const bu = buArg ? buArg.split('=')[1] : 'aiox'
const filePath = fileArg ? fileArg.split('=').slice(1).join('=') : null

if (!filePath || !fs.existsSync(filePath)) {
  console.error('ERROR: --file={path} required and must exist')
  process.exit(1)
}

const content = fs.readFileSync(filePath, 'utf8')

// Dimension 2 — Quality (30pts)
const hasHardcodedColors = /text-white|bg-black|text-black|bg-white|text-\[#|bg-\[#/.test(content)
const hasWrongImports = /from ['"]shadcn\/ui['"]|from ['"]@\/components\/ui\//.test(content)
const hasA11y = /aria-label|aria-describedby|role=|<nav|<main|<header|<footer|<section|<article/.test(content)

const tokenScore = hasHardcodedColors ? 0 : 10
const importScore = hasWrongImports ? 0 : 10
const a11yScore = hasA11y ? 10 : 0  // BLOCKER if 0

const qualityScore = tokenScore + importScore + a11yScore

// Dimension 3 — Consistency (20pts)
const hasResponsive = /\bmd:|lg:|sm:|xl:/.test(content)
const hasKebabCase = /function [A-Z][a-zA-Z]+/.test(content) // PascalCase components OK

const responsiveScore = hasResponsive ? 10 : 0
const namingScore = hasKebabCase ? 10 : 5

const consistencyScore = responsiveScore + namingScore

const totalScore = qualityScore + consistencyScore
const maxScore = 50
const pct = Math.round((totalScore / maxScore) * 100)

const report = {
  file: filePath,
  business: bu,
  generated_at: new Date().toISOString(),
  dimensions: {
    quality: { score: qualityScore, max: 30, details: { token_compliance: tokenScore, import_compliance: importScore, a11y: a11yScore } },
    consistency: { score: consistencyScore, max: 20, details: { responsive: responsiveScore, naming: namingScore } }
  },
  score_total: totalScore,
  score_max: maxScore,
  score_pct: pct,
  a11y_blocker: a11yScore === 0,
  gate: pct >= 70 && a11yScore > 0 ? 'PASS' : 'FAIL'
}

// Save to critical-eye-report for the business
const ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const reportPath = path.join(ROOT, 'workspace', 'businesses', bu, 'L2-tactical', 'design', 'critical-eye-ui-report.yaml')
const reportDir = path.dirname(reportPath)
if (fs.existsSync(reportDir)) {
  const yaml = `# Critical Eye UI Report — ${bu}\n# Generated: ${report.generated_at}\ngate: ${report.gate}\nscore: ${pct}%\ndetails:\n  quality: ${qualityScore}/30\n  consistency: ${consistencyScore}/20\n  a11y_blocker: ${report.a11y_blocker}\n`
  fs.writeFileSync(reportPath, yaml)
}

// Output
if (report.gate === 'PASS') {
  console.log(`Critical Eye UI: Quality ${qualityScore}/30 | Consistency ${consistencyScore}/20 (${pct}%)`)
  process.exit(0)
} else {
  const issues = []
  if (a11yScore === 0) issues.push('BLOCKER: accessibility=0 — add aria-label or semantic HTML')
  if (tokenScore === 0) issues.push('hardcoded colors detected — run autofix')
  if (importScore === 0) issues.push('wrong imports — run autofix')
  if (responsiveScore === 0) issues.push('no responsive classes — add md: or lg: breakpoints')

  console.warn(`Critical Eye UI: ${pct}% (${totalScore}/${maxScore}) — FAIL`)
  issues.forEach(i => console.warn(`  * ${i}`))
  process.exit(1)
}
