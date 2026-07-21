'use strict'
/**
 * validate-deps-completeness.cjs — validates imports exist in package.json
 * Story: STORY-119.33
 */

const fs = require('fs'), path = require('path')
const ROOT = path.resolve(__dirname, '../../..')

function run(filePath) {
  const start = Date.now()
  if (!fs.existsSync(filePath)) return { file: filePath, checks: [{ check: 'file-exists', pass: false }], pass_all: false }

  const content = fs.readFileSync(filePath, 'utf8')
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const allDeps = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    'react', 'react-dom', 'next', // always available in Next.js context
  ])

  const checks = []
  // Find external imports (not relative, not node built-ins)
  const builtins = new Set(['fs', 'path', 'crypto', 'os', 'child_process', 'url', 'util', 'stream', 'http', 'https', 'events'])
  const imports = [...content.matchAll(/from\s+['"]([^.@][^'"]*)['"]/g)]
    .map(m => m[1].split('/')[0])  // get root package name
    .filter(n => !builtins.has(n))

  for (const pkg of [...new Set(imports)]) {
    const valid = allDeps.has(pkg)
    if (!valid) checks.push({ check: `dep:${pkg}`, pass: false, error: `${pkg} not in package.json dependencies` })
    else checks.push({ check: `dep:${pkg}`, pass: true })
  }

  if (checks.length === 0) checks.push({ check: 'external-deps', pass: true, note: 'No external imports to validate' })
  return { file: filePath, checks, pass_all: checks.every(c => c.pass), elapsed_ms: Date.now() - start }
}

if (require.main === module) {
  const file = process.argv[2]
  if (!file) { console.error('Usage: node validate-deps-completeness.cjs <file.tsx>'); process.exit(1) }
  const result = run(file)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.pass_all ? 0 : 1)
}

module.exports = { run }
