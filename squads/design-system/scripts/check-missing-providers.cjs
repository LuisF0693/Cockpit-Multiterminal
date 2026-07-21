'use strict'
/**
 * check-missing-providers.cjs — detects hooks used without wrapping Providers
 * Story: STORY-119.33
 */

const fs = require('fs')

// Hooks that require specific providers
const HOOK_PROVIDER_MAP = {
  'useToast': '<Toaster>',
  'useTheme': '<ThemeProvider>',
  'useSession': '<SessionProvider>',
  'useAuth': '<AuthProvider>',
  'useQuery': '<QueryClientProvider>',
  'useTRPC': '<TRPCProvider>',
}

function run(filePath) {
  const start = Date.now()
  if (!fs.existsSync(filePath)) return { file: filePath, checks: [{ check: 'file-exists', pass: false }], pass_all: false }

  const content = fs.readFileSync(filePath, 'utf8')
  const checks = []

  for (const [hook, provider] of Object.entries(HOOK_PROVIDER_MAP)) {
    const usesHook = content.includes(`${hook}(`)
    if (!usesHook) continue

    // Check if provider is present in the same file
    const providerName = provider.replace(/[<>]/g, ""); const hasProvider = new RegExp("<" + providerName + "[\\s/>]").test(content)
    if (!hasProvider) {
      checks.push({
        check: `provider:${hook}`,
        pass: false,
        error: `${hook}() used but ${provider} not found in file — ensure provider wraps the component tree`,
        severity: 'warn'
      })
    } else {
      checks.push({ check: `provider:${hook}`, pass: true })
    }
  }

  if (checks.length === 0) checks.push({ check: 'providers', pass: true, note: 'No provider-dependent hooks found' })

  return { file: filePath, checks, pass_all: checks.every(c => c.pass), elapsed_ms: Date.now() - start }
}

if (require.main === module) {
  const file = process.argv[2]
  if (!file) { console.error('Usage: node check-missing-providers.cjs <file.tsx>'); process.exit(1) }
  const result = run(file)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.pass_all ? 0 : 1)
}

module.exports = { run }
