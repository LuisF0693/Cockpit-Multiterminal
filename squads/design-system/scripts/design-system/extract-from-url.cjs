#!/usr/bin/env node
/**
 * extract-from-url.cjs
 * Extracts Design System tokens from any live website using Playwright.
 * Output: tokens-normalized.json compatible with foundations-pipeline F1.
 *
 * Usage: node extract-from-url.cjs --url=https://stripe.com --bu=stripe-clone
 *
 * What it extracts:
 * - CSS custom properties from :root (--color-*, --font-*, --space-*, --radius-*)
 * - Computed colors from body, nav, main, footer
 * - Font families in use
 * - Screenshots of key sections
 *
 * Requires: Playwright installed locally (npx playwright)
 *
 * Exit codes:
 *   0 — Success (tokens-normalized.json written)
 *   1 — Extraction failed (with fallback instructions)
 *   3 — Argument error
 *
 * [STORY-129.9]
 */

'use strict'

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// --- Arg parsing ---

const args = process.argv.slice(2)
const urlArg = args.find(a => a.startsWith('--url='))
const buArg = args.find(a => a.startsWith('--bu='))

// URL may contain '=' (query params), so rejoin everything after first '='
const targetUrl = urlArg ? urlArg.slice('--url='.length) : null
const bu = buArg ? buArg.split('=')[1] : null

if (!targetUrl || !bu) {
  console.error('ERROR: --url={site} and --bu={slug} required')
  console.error('Example: node extract-from-url.cjs --url=https://stripe.com --bu=stripe-clone')
  process.exit(3)
}

// Basic URL validation
try {
  new URL(targetUrl)
} catch {
  console.error(`ERROR: Invalid URL: ${targetUrl}`)
  console.error('Provide a full URL including protocol (https://...)')
  process.exit(3)
}

const ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const designPath = path.join(ROOT, 'workspace', 'businesses', bu, 'L2-tactical', 'design')
const refPath = path.join(designPath, 'reference')

// Create directories
fs.mkdirSync(designPath, { recursive: true })
fs.mkdirSync(refPath, { recursive: true })

console.log(`Extracting DS from ${targetUrl} for brand '${bu}'...`)

// --- Resolve Playwright module path ---
// Playwright may be installed globally, via npx cache, or locally.
// We need the path so the temp script can require() it.

let playwrightModulePath = null

// Try 1: local node_modules
try {
  playwrightModulePath = require.resolve('playwright')
} catch { /* not local */ }

// Try 2: global node_modules
if (!playwrightModulePath) {
  try {
    const { execSync } = require('child_process')
    const globalRoot = execSync('npm root -g', { encoding: 'utf8', timeout: 10000 }).trim()
    const globalPw = path.join(globalRoot, 'playwright')
    if (fs.existsSync(globalPw)) {
      playwrightModulePath = globalPw
    }
  } catch { /* no global */ }
}

// Try 3: npx check (just to confirm playwright CLI is reachable)
if (!playwrightModulePath) {
  const playwrightCheck = spawnSync('npx', ['playwright', '--version'], {
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 15000
  })
  if (playwrightCheck.status === 0) {
    // npx can run it but we don't have a require path -- attempt install
    console.log('Playwright CLI found via npx but not as module. Installing locally...')
    const install = spawnSync('npm', ['install', '--no-save', 'playwright'], {
      encoding: 'utf8',
      stdio: 'inherit',
      timeout: 120000,
      cwd: ROOT
    })
    if (install.status === 0) {
      try {
        playwrightModulePath = require.resolve('playwright')
      } catch { /* still failed */ }
    }
  }
}

if (!playwrightModulePath) {
  console.error('Playwright module not found (checked local, global, and npx).')
  printFallbackInstructions()
  process.exit(1)
}

console.log(`Playwright resolved at: ${path.dirname(playwrightModulePath)}`)

// --- Build extraction script ---
// Written to a temp file and executed via node to avoid shell injection (R1).

const fullPageScreenshotPath = path.join(refPath, 'full-page.png')
const heroScreenshotPath = path.join(refPath, 'hero.png')
const navScreenshotPath = path.join(refPath, 'nav.png')

// Use the resolved path so the temp script can require() playwright regardless of cwd
const pwRequirePath = playwrightModulePath.replace(/\\/g, '/')

const playwrightCode = `
'use strict';
const { chromium } = require(${JSON.stringify(pwRequirePath)});

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  try {
    await page.goto(${JSON.stringify(targetUrl)}, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for CSS to settle
    await page.waitForTimeout(2000);

    // --- Extract tokens in browser context ---
    const data = await page.evaluate(() => {
      const results = {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        css_vars: {},
        computed_colors: {},
        fonts: [],
        spacing: [],
        radius: []
      };

      // 1. CSS custom properties from :root
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules || []) {
            if (rule.selectorText === ':root' || (rule.selectorText && rule.selectorText.includes(':root'))) {
              const cssText = rule.cssText || '';
              const matches = cssText.matchAll(/--([\\\\w-]+):\\\\s*([^;]+);/g);
              for (const [, name, value] of matches) {
                results.css_vars[name] = value.trim();
              }
            }
          }
        } catch (e) { /* cross-origin sheets, skip */ }
      }

      // 2. Computed styles from key elements
      const fontSet = new Set();
      const elements = {
        body: document.body,
        nav: document.querySelector('nav, header, [role=navigation]'),
        main: document.querySelector('main, [role=main], .main'),
        footer: document.querySelector('footer, [role=contentinfo]'),
        button: document.querySelector('button:not([disabled]), a[class*=button], a[class*=btn]'),
        h1: document.querySelector('h1'),
        p: document.querySelector('p')
      };

      for (const [key, el] of Object.entries(elements)) {
        if (!el) continue;
        const style = window.getComputedStyle(el);
        results.computed_colors[key] = {
          color: style.color,
          background: style.backgroundColor,
          borderColor: style.borderColor
        };
        if (style.fontFamily) {
          style.fontFamily.split(',').forEach(f => fontSet.add(f.trim().replace(/['"]/g, '')));
        }
      }

      // 3. Spacing from gap/padding/margin patterns
      const spacingSet = new Set();
      const allEls = document.querySelectorAll('section, .container, .wrapper, main > *');
      for (const el of Array.from(allEls).slice(0, 20)) {
        const s = window.getComputedStyle(el);
        ['padding', 'gap', 'margin'].forEach(p => {
          const v = s[p];
          if (v && v !== '0px') spacingSet.add(v);
        });
      }

      // 4. Border radius from interactive elements
      const radiusSet = new Set();
      const interactiveEls = document.querySelectorAll('button, input, [class*=card], [class*=modal]');
      for (const el of Array.from(interactiveEls).slice(0, 10)) {
        const r = window.getComputedStyle(el).borderRadius;
        if (r && r !== '0px') radiusSet.add(r);
      }

      results.fonts = Array.from(fontSet);
      results.spacing = Array.from(spacingSet);
      results.radius = Array.from(radiusSet);
      return results;
    });

    // --- Screenshots (non-fatal -- failures do not abort token extraction) ---
    try {
      await page.screenshot({
        path: ${JSON.stringify(fullPageScreenshotPath)},
        fullPage: true,
        timeout: 15000
      });
    } catch (e) {
      console.error('WARN: Full-page screenshot failed:', e.message);
    }

    try {
      const hero = await page.$('section:first-of-type, .hero, [class*=hero], main > *:first-child');
      if (hero) {
        await hero.screenshot({ path: ${JSON.stringify(heroScreenshotPath)}, timeout: 10000 });
      }
    } catch (e) {
      console.error('WARN: Hero screenshot failed:', e.message);
    }

    try {
      const nav = await page.$('nav, header');
      if (nav) {
        await nav.screenshot({ path: ${JSON.stringify(navScreenshotPath)}, timeout: 10000 });
      }
    } catch (e) {
      console.error('WARN: Nav screenshot failed:', e.message);
    }

    // Output JSON to stdout
    console.log(JSON.stringify(data));
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error('PLAYWRIGHT_ERROR:', e.message);
  process.exit(1);
});
`

// Write temp script and execute (avoids shell interpolation — R1 compliant)
const tmpScript = path.join(require('os').tmpdir(), `extract-ds-${Date.now()}.js`)
fs.writeFileSync(tmpScript, playwrightCode)

console.log('Opening browser...')
const result = spawnSync('node', [tmpScript], {
  encoding: 'utf8',
  timeout: 90000,
  stdio: ['pipe', 'pipe', 'pipe']
})

// Clean up temp file
try { fs.unlinkSync(tmpScript) } catch { /* ignore */ }

if (result.error || result.status !== 0) {
  console.error('Browser extraction failed.')
  if (result.stderr) {
    // Show first 500 chars of error for debugging
    console.error(result.stderr.slice(0, 500))
  }
  console.log('')
  printFallbackInstructions()
  process.exit(1)
}

// --- Parse extraction result ---

let extractedData
try {
  // Find JSON line in output (skip non-JSON lines like deprecation warnings)
  const lines = result.stdout.split('\n')
  const jsonLine = lines.find(l => l.trim().startsWith('{'))
  if (!jsonLine) throw new Error('No JSON found in output')
  extractedData = JSON.parse(jsonLine)
} catch (e) {
  console.error('Could not parse extraction data:', e.message)
  if (result.stdout) console.error('Raw output (first 300 chars):', result.stdout.slice(0, 300))
  printFallbackInstructions()
  process.exit(1)
}

// --- Convert to tokens-normalized.json ---

const cssVars = extractedData.css_vars || {}
const computedColors = extractedData.computed_colors || {}

const tokensNormalized = {
  meta: {
    source: 'url',
    url: targetUrl,
    business: bu,
    extracted_at: extractedData.timestamp || new Date().toISOString(),
    confidence: 'MEDIUM',
    note: 'Extracted via Playwright from live site. Review values before advancing pipeline.'
  },
  color: {},
  typography: {},
  spacing: {},
  radius: {},
  shadow: {},
  motion: {
    'duration-normal': { value: '200ms', source: 'sinkra-default' },
    'duration-fast': { value: '100ms', source: 'sinkra-default' },
    'easing-standard': { value: 'cubic-bezier(0.4, 0, 0.2, 1)', source: 'sinkra-default' }
  }
}

// Map CSS vars to semantic token categories
for (const [name, value] of Object.entries(cssVars)) {
  const lower = name.toLowerCase()
  if (lower.includes('color') || lower.includes('background') || lower.includes('foreground') ||
      lower.includes('primary') || lower.includes('secondary') || lower.includes('accent') ||
      lower.includes('border') || lower.includes('ring') || lower.includes('muted') ||
      lower.includes('destructive') || lower.includes('success') || lower.includes('warning')) {
    tokensNormalized.color[name] = { value, css_var: `--${name}`, source: 'css-var' }
  } else if (lower.includes('font') || lower.includes('text') || lower.includes('size') ||
             lower.includes('weight') || lower.includes('line-height') || lower.includes('letter')) {
    tokensNormalized.typography[name] = { value, css_var: `--${name}`, source: 'css-var' }
  } else if (lower.includes('space') || lower.includes('gap') || lower.includes('padding') || lower.includes('margin')) {
    tokensNormalized.spacing[name] = { value, css_var: `--${name}`, source: 'css-var' }
  } else if (lower.includes('radius') || lower.includes('rounded')) {
    tokensNormalized.radius[name] = { value, css_var: `--${name}`, source: 'css-var' }
  } else if (lower.includes('shadow')) {
    tokensNormalized.shadow[name] = { value, css_var: `--${name}`, source: 'css-var' }
  }
}

// Add computed colors as fallback when no CSS vars found for colors
if (Object.keys(tokensNormalized.color).length === 0) {
  const body = computedColors.body || {}
  const nav = computedColors.nav || {}
  const btn = computedColors.button || {}
  const h1 = computedColors.h1 || {}

  if (body.background) tokensNormalized.color['background'] = { value: body.background, source: 'computed' }
  if (body.color) tokensNormalized.color['foreground'] = { value: body.color, source: 'computed' }
  if (nav.background) tokensNormalized.color['nav-background'] = { value: nav.background, source: 'computed' }
  if (btn.background) tokensNormalized.color['brand-primary'] = { value: btn.background, source: 'computed' }
  if (h1.color) tokensNormalized.color['heading'] = { value: h1.color, source: 'computed' }
}

// Add font families
if (extractedData.fonts && extractedData.fonts.length > 0) {
  tokensNormalized.typography['font-sans'] = { value: extractedData.fonts[0], source: 'computed' }
  if (extractedData.fonts.length > 1) {
    tokensNormalized.typography['font-secondary'] = { value: extractedData.fonts[1], source: 'computed' }
  }
  // Check for monospace font
  const monoFont = extractedData.fonts.find(f =>
    f.toLowerCase().includes('mono') || f.toLowerCase().includes('courier') || f.toLowerCase().includes('consolas')
  )
  if (monoFont) {
    tokensNormalized.typography['font-mono'] = { value: monoFont, source: 'computed' }
  }
}

// Add extracted spacing values
if (extractedData.spacing && extractedData.spacing.length > 0) {
  extractedData.spacing.forEach((val, i) => {
    tokensNormalized.spacing[`extracted-${i}`] = { value: val, source: 'computed' }
  })
} else {
  // SINKRA defaults
  tokensNormalized.spacing = {
    'xs': { value: '0.25rem', source: 'sinkra-default' },
    'sm': { value: '0.5rem', source: 'sinkra-default' },
    'md': { value: '1rem', source: 'sinkra-default' },
    'lg': { value: '1.5rem', source: 'sinkra-default' },
    'xl': { value: '2rem', source: 'sinkra-default' }
  }
}

// Add extracted radius values
if (extractedData.radius && extractedData.radius.length > 0) {
  extractedData.radius.forEach((val, i) => {
    tokensNormalized.radius[`extracted-${i}`] = { value: val, source: 'computed' }
  })
} else {
  tokensNormalized.radius = {
    'sm': { value: '0.375rem', source: 'sinkra-default' },
    'md': { value: '0.5rem', source: 'sinkra-default' },
    'lg': { value: '0.75rem', source: 'sinkra-default' }
  }
}

// --- Write output ---

const outputPath = path.join(designPath, 'tokens-normalized.json')
fs.writeFileSync(outputPath, JSON.stringify(tokensNormalized, null, 2))

// --- Summary ---

const colorCount = Object.keys(tokensNormalized.color).length
const typCount = Object.keys(tokensNormalized.typography).length
const spacingCount = Object.keys(tokensNormalized.spacing).length
const radiusCount = Object.keys(tokensNormalized.radius).length
const cssVarCount = Object.keys(cssVars).length

let screenshotCount = 0
try {
  screenshotCount = fs.readdirSync(refPath).filter(f => f.endsWith('.png')).length
} catch { /* ignore */ }

console.log('')
console.log(`Extraction complete for '${bu}':`)
console.log(`  Source URL: ${targetUrl}`)
console.log(`  CSS vars found: ${cssVarCount}`)
console.log(`  Color tokens: ${colorCount}`)
console.log(`  Typography tokens: ${typCount}`)
console.log(`  Spacing tokens: ${spacingCount}`)
console.log(`  Radius tokens: ${radiusCount}`)
console.log(`  Screenshots: ${screenshotCount} saved to reference/`)
console.log(`  Output: ${outputPath}`)
console.log('')
console.log(`Next: /capture-ds --source pasta --brand ${bu}`)
console.log('  (Will use extracted tokens-normalized.json and skip F1)')

// --- Fallback instructions ---

function printFallbackInstructions() {
  console.log('')
  console.log('FALLBACK: Playwright extraction unavailable.')
  console.log('To extract tokens manually:')
  console.log('')
  console.log('  1. Open the target site in Chrome/Firefox')
  console.log('  2. Open DevTools (F12) > Console tab')
  console.log('  3. Run this snippet to extract :root CSS vars:')
  console.log('')
  console.log('     const root = getComputedStyle(document.documentElement);')
  console.log('     const vars = {};')
  console.log('     for (const sheet of document.styleSheets) {')
  console.log('       try { for (const r of sheet.cssRules) {')
  console.log('         if (r.selectorText?.includes(":root")) {')
  console.log('           r.cssText.matchAll(/--([\\w-]+):\\s*([^;]+);/g)')
  console.log('             .forEach(m => vars[m[1]] = m[2].trim());')
  console.log('         }')
  console.log('       }} catch(e) {}')
  console.log('     }')
  console.log('     copy(JSON.stringify(vars, null, 2));')
  console.log('')
  console.log('  4. Paste the JSON into a file named tokens-raw.json')
  console.log(`  5. Save at: workspace/businesses/${bu}/L2-tactical/design/tokens-raw.json`)
  console.log(`  6. Take screenshots and save to: workspace/businesses/${bu}/L2-tactical/design/reference/`)
  console.log(`  7. Run: /capture-ds --source pasta --brand ${bu}`)
}
