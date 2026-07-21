'use strict'
/**
 * validate-component-registry.cjs — validates shadcn/ui imports against component-index.json
 * Story: STORY-119.33
 */

const fs = require('fs'), path = require('path')
const ROOT = path.resolve(__dirname, '../../..')
const INDEX_PATH = path.join(ROOT, 'squads/design-system/data/component-index.json')

function run(filePath) {
  const start = Date.now()
  if (!fs.existsSync(filePath)) {
    return { file: filePath, checks: [{ check: 'file-exists', pass: false }], pass_all: false }
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const checks = []

  // Load registry
  let registeredComponents = new Set()
  if (fs.existsSync(INDEX_PATH)) {
    const idx = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'))
    for (const c of (idx.components ?? [])) registeredComponents.add(c.name)
  }

  // Find @/components/ui imports
  const uiImports = [...content.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]@\/components\/ui\/([^'"]+)['"]/g)]
  if (uiImports.length === 0) {
    checks.push({ check: 'shadcn-imports', pass: true, note: 'No @/components/ui imports' })
  } else {
    for (const [, names, importPath] of uiImports) {
      const componentNames = names.split(',').map(n => n.trim()).filter(Boolean)
      for (const name of componentNames) {
        const valid = registeredComponents.has(name) || registeredComponents.size === 0
        checks.push({ check: `component:${name}`, pass: valid, error: valid ? undefined : `${name} not in component-index.json` })
      }
    }
  }

  return { file: filePath, checks, pass_all: checks.every(c => c.pass), elapsed_ms: Date.now() - start }
}

if (require.main === module) {
  const file = process.argv[2]
  if (!file) { console.error('Usage: node validate-component-registry.cjs <file.tsx>'); process.exit(1) }
  const result = run(file)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.pass_all ? 0 : 1)
}

module.exports = { run }
