#!/usr/bin/env node
/**
 * retrieve-sections.cjs
 * Deterministic snippet retrieval by page_type + sections[].
 * No LLM involved — pure glob-based lookup.
 *
 * Usage: node retrieve-sections.cjs --page=landing --sections=hero,features,cta
 * Usage: node retrieve-sections.cjs --coverage
 * Output: JSON array of { section, variant, file_path, content }
 *
 * [STORY-130.10] --coverage flag added to report snippet coverage vs registry.
 */
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const coverageMode = args.includes('--coverage')

// ── Coverage mode ──────────────────────────────────────────────────────────
if (coverageMode) {
  const SECTIONS_DIR = path.resolve(__dirname, '../../data/knowledge/sections')
  const REGISTRY_PATH = path.resolve(__dirname, '../../data/registries/ds-page-types-registry.yaml')

  let yaml
  try { yaml = require('js-yaml') } catch { console.error('js-yaml required for --coverage'); process.exit(1) }

  if (!fs.existsSync(REGISTRY_PATH)) { console.error('Registry not found: ' + REGISTRY_PATH); process.exit(1) }

  const registry = yaml.load(fs.readFileSync(REGISTRY_PATH, 'utf8'))
  const files = fs.existsSync(SECTIONS_DIR) ? fs.readdirSync(SECTIONS_DIR) : []
  const pageTypes = Object.keys(registry.page_types || {})

  let totalSections = 0
  let coveredSections = 0
  const report = []

  for (const pt of pageTypes) {
    const reqSections = (registry.page_types[pt].required_sections || []).map(s => s.id)
    const covered = []
    const missing = []

    for (const sid of reqSections) {
      totalSections++
      if (files.some(f => f.startsWith(sid + '--'))) {
        coveredSections++
        covered.push(sid)
      } else {
        missing.push(sid)
      }
    }

    report.push({
      page_type: pt,
      total: reqSections.length,
      covered: covered.length,
      missing,
      status: missing.length === 0 ? 'FULL' : missing.length === reqSections.length ? 'NONE' : 'PARTIAL'
    })
  }

  const coverage_pct = totalSections > 0 ? Math.round(coveredSections / totalSections * 100) : 0
  console.log(JSON.stringify({ page_types: pageTypes.length, total_sections: totalSections, covered: coveredSections, missing: totalSections - coveredSections, coverage_pct, details: report }, null, 2))
  process.exit(0)
}

// ── Normal retrieval mode ──────────────────────────────────────────────────
const pageArg = args.find(a => a.startsWith('--page='))
const sectionsArg = args.find(a => a.startsWith('--sections='))

const pageType = pageArg ? pageArg.split('=')[1] : null
const sections = sectionsArg ? sectionsArg.split('=')[1].split(',') : []

if (!pageType || sections.length === 0) {
  console.error('Usage: node retrieve-sections.cjs --page=<page_type> --sections=<s1,s2,...>')
  console.error('       node retrieve-sections.cjs --coverage')
  process.exit(1)
}

const SECTIONS_DIR = path.resolve(__dirname, '../../data/knowledge/sections')

const results = []

for (const section of sections) {
  const trimmed = section.trim()

  // Find all variants for this section
  let files = []
  if (fs.existsSync(SECTIONS_DIR)) {
    files = fs.readdirSync(SECTIONS_DIR)
      .filter(f => f.startsWith(`${trimmed}--`) && f.endsWith('.tsx'))
      .sort() // Alphabetical for determinism
  }

  if (files.length === 0) {
    results.push({
      section: trimmed,
      variant: null,
      file_path: null,
      content: null,
      warning: `No snippet found for section: ${trimmed}`
    })
    continue
  }

  // Return ALL variants for the section
  for (const file of files) {
    const filePath = path.join(SECTIONS_DIR, file)
    const content = fs.readFileSync(filePath, 'utf8')

    results.push({
      section: trimmed,
      variant: file.replace(`${trimmed}--`, '').replace('.tsx', ''),
      file_path: filePath,
      content
    })
  }
}

console.log(JSON.stringify(results, null, 2))
