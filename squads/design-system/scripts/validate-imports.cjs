'use strict'
/**
 * validate-imports.cjs — resolves all imports in .tsx file against filesystem
 * Story: STORY-119.33
 */

const fs = require('fs'), path = require('path')

function run(filePath) {
  const start = Date.now()
  if (!fs.existsSync(filePath)) return { file: filePath, checks: [{ check: 'file-exists', pass: false }], pass_all: false }

  const content = fs.readFileSync(filePath, 'utf8')
  const dir = path.dirname(filePath)
  const checks = []

  // Find relative imports only
  const relativeImports = [...content.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map(m => m[1])

  for (const imp of relativeImports) {
    const candidates = [imp, imp + '.ts', imp + '.tsx', imp + '/index.ts', imp + '/index.tsx']
    const exists = candidates.some(c => fs.existsSync(path.resolve(dir, c)))
    checks.push({ check: `import:${imp}`, pass: exists, error: exists ? undefined : `Cannot resolve: ${imp}` })
  }

  if (checks.length === 0) checks.push({ check: 'relative-imports', pass: true, note: 'No relative imports' })

  return { file: filePath, checks, pass_all: checks.every(c => c.pass), elapsed_ms: Date.now() - start }
}

if (require.main === module) {
  const file = process.argv[2]
  if (!file) { console.error('Usage: node validate-imports.cjs <file.tsx>'); process.exit(1) }
  const result = run(file)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.pass_all ? 0 : 1)
}

module.exports = { run }
