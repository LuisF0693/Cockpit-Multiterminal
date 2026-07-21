#!/usr/bin/env node
/**
 * load-ds-context.cjs
 * Loads the full DS context for a business into a structured payload
 * optimized for LLM context injection.
 *
 * Usage: node load-ds-context.cjs --bu=aiox [--page-type=landing]
 * Output: JSON to stdout with tokens_runtime + component_index + page_types
 *
 * Story: STORY-130.3
 */
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const buArg = args.find(a => a.startsWith('--bu='))
const pageTypeArg = args.find(a => a.startsWith('--page-type='))
const bu = buArg ? buArg.split('=')[1] : null
const pageType = pageTypeArg ? pageTypeArg.split('=')[1] : null

if (!bu) {
  console.error('ERROR: --bu={slug} required')
  process.exit(1)
}

const { spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const designPath = path.join(ROOT, 'workspace', 'businesses', bu, 'L2-tactical', 'design')

// Load tokens-runtime.json
let tokensRuntime = {}
const tokensPath = path.join(designPath, 'tokens-runtime.json')
if (fs.existsSync(tokensPath)) {
  tokensRuntime = JSON.parse(fs.readFileSync(tokensPath, 'utf8'))
}

// ---------------------------------------------------------------------------
// Tier 1: Supabase RAG similarity search (STORY-130.6)
// Attempts to use retrieve-components.cjs for dynamic, intent-based retrieval.
// Falls back to static index (Tier 2) if Supabase/OpenAI not configured or fails.
// ---------------------------------------------------------------------------
let componentIndex = []
let retrievalSource = 'static'

const RETRIEVE_SCRIPT = path.join(ROOT, 'services', 'design-embeddings', 'retrieve-components.cjs')
const hasSupabaseEnv = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.OPENAI_API_KEY

if (hasSupabaseEnv && fs.existsSync(RETRIEVE_SCRIPT)) {
  // Build an intent from page-type or generic query
  const intent = pageType
    ? `${pageType} page layout with common components`
    : 'general purpose UI components for web application'

  const result = spawnSync('node', [
    RETRIEVE_SCRIPT,
    `--bu=${bu}`,
    `--intent=${intent}`,
    '--limit=20'
  ], {
    cwd: ROOT,
    timeout: 10000,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  if (result.status === 0 && result.stdout) {
    try {
      const ragResults = JSON.parse(result.stdout)
      if (Array.isArray(ragResults) && ragResults.length > 0) {
        componentIndex = ragResults.map(r => ({
          name: r.component_name,
          atomic_category: r.metadata?.atomic_category || 'unknown',
          import_path: r.metadata?.import_path || '@sinkra/ds-core',
          variants: r.metadata?.variants || [],
          when_to_use: r.content,
          when_not_to_use: '',
          page_sections: r.metadata?.page_sections || [],
          similarity: r.similarity
        }))
        retrievalSource = 'supabase-rag'
        process.stderr.write(`[ds-context] Using Supabase RAG for ${bu} (${componentIndex.length} components)\n`)
      }
    } catch {
      // Parse failed, fall through to static
    }
  }
}

// ---------------------------------------------------------------------------
// Tier 2: Static component-index.json (fallback) — original behavior
// ---------------------------------------------------------------------------
if (componentIndex.length === 0) {
  if (retrievalSource !== 'static') {
    process.stderr.write(`[ds-context] Fallback to static index for ${bu}\n`)
  }
  retrievalSource = 'static'

  const indexPath = path.join(designPath, 'component-index.json')
  const baseIndexPath = path.join(ROOT, 'squads', 'design-system', 'data', 'knowledge', 'component-index.json')
  const sourceIndex = fs.existsSync(indexPath) ? indexPath : baseIndexPath
  if (fs.existsSync(sourceIndex)) {
    const raw = JSON.parse(fs.readFileSync(sourceIndex, 'utf8'))
    const components = Array.isArray(raw) ? raw : (raw.components || Object.values(raw))
    // Sort by page_sections count descending, take top 20
    componentIndex = components
      .sort((a, b) => (b.page_sections?.length || 0) - (a.page_sections?.length || 0))
      .slice(0, 20)
      .map(c => ({
        name: c.name,
        atomic_category: c.atomic_category,
        import_path: c.import_path || '@sinkra/ds-core',
        variants: c.variants || [],
        when_to_use: c.when_to_use,
        when_not_to_use: c.when_not_to_use,
        page_sections: c.page_sections || []
      }))
  }
}

// Build payload
const payload = {
  business: bu,
  generated_at: new Date().toISOString(),
  retrieval_source: retrievalSource,
  tokens_runtime: tokensRuntime,
  component_index: componentIndex,
  component_count: componentIndex.length,
  page_type: pageType
}

// Check size — target < 50K chars
const json = JSON.stringify(payload, null, 2)
if (json.length > 50000) {
  // Truncate component_index further
  payload.component_index = componentIndex.slice(0, 10)
  payload.truncated = true
}

console.log(JSON.stringify(payload, null, 2))
