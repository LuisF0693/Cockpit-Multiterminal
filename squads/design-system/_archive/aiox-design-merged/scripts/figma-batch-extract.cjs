#!/usr/bin/env node
/**
 * Batch extract design tokens from ALL pages of a Figma file
 *
 * Walks every page in the file, extracts tokens using the same logic as
 * figma-extract-tokens.cjs, saves per-page JSON, and generates a merged
 * cross-page aggregation.
 *
 * Usage:
 *   node squads/aiox-design/scripts/figma-batch-extract.cjs [--resume] [--delay=2000]
 *
 * Outputs:
 *   extraction/pages/{slug}.json        — tokens per page
 *   extraction/batch-manifest.json      — progress tracking
 *   extraction/all-pages-merged.json    — aggregated cross-page tokens
 *   docs/research/design-system-extraction/{brand}/coverage-report.md — coverage report
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Load .env ───────────────────────────────────────────────────────────────
const ROOT = process.cwd();

const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .replace(/\r/g, '')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    });
}

const TOKEN = process.env.FIGMA_API_KEY;
const FILE_ID = process.env.FIGMA_FILE_ID;

if (!TOKEN || !FILE_ID) {
  console.error('Missing FIGMA_API_KEY or FIGMA_FILE_ID in .env');
  process.exit(1);
}

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const RESUME = args.includes('--resume');
const DELAY_ARG = args.find((a) => a.startsWith('--delay='));
const DELAY_MS = DELAY_ARG ? parseInt(DELAY_ARG.split('=')[1], 10) : 2000;
const DEPTH = 100; // High depth to capture full component tree (API default is unlimited)

// ── Paths ───────────────────────────────────────────────────────────────────
const EXTRACTION_DIR = path.join(ROOT, 'workspace', 'domains', 'design-system', 'extraction');
const PAGES_DIR = path.join(EXTRACTION_DIR, 'pages');
const MANIFEST_PATH = path.join(EXTRACTION_DIR, 'batch-manifest.json');
const MERGED_PATH = path.join(EXTRACTION_DIR, 'all-pages-merged.json');
const BRAND = process.env.DS_BRAND || process.argv.find(a => a.startsWith('--brand='))?.split('=')[1] || 'default';
const REPORTS_DIR = path.join(ROOT, 'docs', 'research', 'design-system-extraction', BRAND);
const REPORT_PATH = path.join(REPORTS_DIR, 'coverage-report.md');
const STYLES_PATH = path.join(EXTRACTION_DIR, 'figma-styles.json');
const VARIABLES_PATH = path.join(EXTRACTION_DIR, 'figma-variables.json');

// ── Skip patterns ───────────────────────────────────────────────────────────
const SKIP_PATTERNS = [
  /^-{3,}$/,           // "----", "-----", etc.
  /^COVER$/i,          // "COVER"
  /^\/+\s*BACKUP$/i,   // "//// BACKUP"
];

function shouldSkip(pageName) {
  return SKIP_PATTERNS.some((p) => p.test(pageName.trim()));
}

// ── Figma API ───────────────────────────────────────────────────────────────
const REQUEST_TIMEOUT_MS = 600000; // 10 minutes per request (large pages have 31K+ nodes)

function figmaGet(endpoint) {
  return new Promise((resolve, reject) => {
    const url = 'https://api.figma.com/v1' + endpoint;
    const req = https.get(
      url,
      { headers: { 'X-Figma-Token': TOKEN }, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        if (res.statusCode === 429) {
          const retryAfter = parseInt(res.headers['retry-after'] || '30', 10);
          reject(new Error(`RATE_LIMITED:${retryAfter}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            if (res.statusCode >= 400) {
              reject(new Error(`API ${res.statusCode}: ${body.err || body.message || 'unknown'}`));
            } else {
              resolve(body);
            }
          } catch (e) {
            reject(new Error('Parse failed'));
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('REQUEST_TIMEOUT'));
    });
    req.on('error', reject);
  });
}

async function figmaGetWithRetry(endpoint, maxRetries = 3) {
  let delay = DELAY_MS;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await figmaGet(endpoint);
    } catch (err) {
      if (err.message.startsWith('RATE_LIMITED:') && attempt < maxRetries) {
        const retryAfter = parseInt(err.message.split(':')[1], 10) * 1000;
        const wait = Math.max(retryAfter, delay);
        console.log(`  ⏳ Rate limited, waiting ${Math.round(wait / 1000)}s (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(wait);
        delay *= 2; // exponential backoff
      } else {
        throw err;
      }
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Figma metadata endpoints ─────────────────────────────────────────────────
async function fetchStyles() {
  try {
    console.log('📋 Fetching Figma styles...');
    const data = await figmaGetWithRetry(`/files/${FILE_ID}/styles`);
    const styles = data.meta?.styles || [];
    fs.writeFileSync(STYLES_PATH, JSON.stringify(styles, null, 2));
    console.log(`  ✓ ${styles.length} styles saved to ${STYLES_PATH}`);
    return styles;
  } catch (err) {
    console.warn(`  ⚠ /styles endpoint failed: ${err.message}`);
    return [];
  }
}

async function fetchVariables() {
  try {
    console.log('🔢 Fetching Figma variables...');
    const data = await figmaGetWithRetry(`/files/${FILE_ID}/variables/local`);
    const result = data.meta || { variables: {}, variableCollections: {} };
    fs.writeFileSync(VARIABLES_PATH, JSON.stringify(result, null, 2));
    const varCount = Object.keys(result.variables || {}).length;
    const colCount = Object.keys(result.variableCollections || {}).length;
    console.log(`  ✓ ${varCount} variables in ${colCount} collections saved to ${VARIABLES_PATH}`);
    return result;
  } catch (err) {
    console.warn(`  ⚠ /variables endpoint failed: ${err.message}`);
    return { variables: {}, variableCollections: {} };
  }
}

// ── Token extraction (same logic as figma-extract-tokens.cjs) ───────────────
function rgbaToHex(color) {
  if (!color) return null;
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function createCollectors() {
  return {
    colors: new Map(),
    fonts: new Map(),
    spacings: new Map(),
    radii: new Map(),
    shadows: new Map(),
    components: new Map(),
    textStyles: new Map(),
    nodeCount: 0,
    instanceCount: 0,
    textCount: 0,
    // Extended collectors (Fase 1)
    hiddenNodeCount: 0,
    imageRefs: [],
    strokeDetails: [],
    blurs: [],
    opacityValues: [],
    layoutNodes: [],
    blendModes: [],
  };
}

function addColor(col, hex, opacity, context) {
  if (!hex) return;
  const key =
    opacity !== undefined && opacity < 1
      ? `${hex} ${Math.round(opacity * 100)}%`
      : hex;
  const entry = col.colors.get(key) || {
    hex,
    opacity: opacity ?? 1,
    count: 0,
    contexts: new Set(),
  };
  entry.count++;
  if (context) entry.contexts.add(context);
  col.colors.set(key, entry);
}

function addFont(col, family, weight, size, context) {
  if (!family) return;
  const key = `${family}/${weight || 400}/${size || 0}`;
  const entry = col.fonts.get(key) || {
    family,
    weight: weight || 400,
    size: size || 0,
    count: 0,
    contexts: new Set(),
  };
  entry.count++;
  if (context) entry.contexts.add(context);
  col.fonts.set(key, entry);
}

function addSpacing(col, value, type, context) {
  if (value === undefined || value === null) return;
  const key = `${type}:${value}`;
  const entry = col.spacings.get(key) || {
    value,
    type,
    count: 0,
    contexts: new Set(),
  };
  entry.count++;
  if (context) entry.contexts.add(context);
  col.spacings.set(key, entry);
}

function addRadius(col, value, context) {
  if (value === undefined || value === null) return;
  const key = String(value);
  const entry = col.radii.get(key) || { value, count: 0, contexts: new Set() };
  entry.count++;
  if (context) entry.contexts.add(context);
  col.radii.set(key, entry);
}

function addShadow(col, effect, context) {
  const hex = rgbaToHex(effect.color);
  const ox = effect.offset ? effect.offset.x : 0;
  const oy = effect.offset ? effect.offset.y : 0;
  const r = effect.radius || 0;
  const s = effect.spread || 0;
  const key = `${effect.type}|${hex}|${ox},${oy}|${r}|${s}`;
  const entry = col.shadows.get(key) || {
    type: effect.type,
    color: hex,
    offsetX: ox,
    offsetY: oy,
    blurRadius: r,
    spread: s,
    count: 0,
    contexts: new Set(),
  };
  entry.count++;
  if (context) entry.contexts.add(context);
  col.shadows.set(key, entry);
}

function addTextStyle(col, node, context) {
  const s = node.style || {};
  if (!s.fontFamily) return;
  const hex =
    node.fills && node.fills[0] && node.fills[0].type === 'SOLID'
      ? rgbaToHex(node.fills[0].color)
      : null;
  const key = `${s.fontFamily}/${s.fontWeight || 400}/${s.fontSize || 0}/${Math.round(s.lineHeightPx || 0)}/${s.letterSpacing || 0}/${hex || 'inherit'}`;
  const entry = col.textStyles.get(key) || {
    fontFamily: s.fontFamily,
    fontWeight: s.fontWeight || 400,
    fontSize: s.fontSize || 0,
    lineHeight: s.lineHeightPx ? Math.round(s.lineHeightPx * 100) / 100 : null,
    letterSpacing: s.letterSpacing || 0,
    textAlign: s.textAlignHorizontal || 'LEFT',
    textDecoration: s.textDecoration || 'NONE',
    textCase: s.textCase || 'ORIGINAL',
    paragraphSpacing: s.paragraphSpacing || 0,
    paragraphIndent: s.paragraphIndent || 0,
    color: hex,
    count: 0,
    sampleTexts: [],
    contexts: new Set(),
  };
  entry.count++;
  if (node.characters && entry.sampleTexts.length < 3) {
    const sample = node.characters.slice(0, 60);
    if (!entry.sampleTexts.includes(sample)) entry.sampleTexts.push(sample);
  }
  if (context) entry.contexts.add(context);
  col.textStyles.set(key, entry);
}

function walkNode(col, node, parentContext) {
  col.nodeCount++;
  const shortCtx = node.name;

  // Hidden nodes tracking
  if (node.visible === false) {
    col.hiddenNodeCount = (col.hiddenNodeCount || 0) + 1;
  }

  // Opacity values (non-default)
  if (node.opacity !== undefined && node.opacity < 1) {
    col.opacityValues.push({ value: node.opacity, context: shortCtx });
  }

  // BlendMode (non-default)
  if (node.blendMode && node.blendMode !== 'NORMAL' && node.blendMode !== 'PASS_THROUGH') {
    col.blendModes.push({ mode: node.blendMode, context: shortCtx });
  }

  // Fills
  if (node.fills) {
    for (const fill of node.fills) {
      if (!fill.visible && fill.visible !== undefined) continue;
      if (fill.type === 'SOLID') {
        addColor(col, rgbaToHex(fill.color), fill.opacity, shortCtx);
      } else if (
        fill.type === 'GRADIENT_LINEAR' ||
        fill.type === 'GRADIENT_RADIAL' ||
        fill.type === 'GRADIENT_ANGULAR' ||
        fill.type === 'GRADIENT_DIAMOND'
      ) {
        for (const stop of fill.gradientStops || []) {
          addColor(col, rgbaToHex(stop.color), undefined, `gradient-${fill.type.toLowerCase()} in ${shortCtx}`);
        }
      } else if (fill.type === 'IMAGE') {
        addColor(col, null, fill.opacity, `image:${shortCtx}`);
        col.imageRefs.push({ nodeId: node.id, name: shortCtx, scaleMode: fill.scaleMode || 'FILL' });
      }
    }
  }

  // Strokes
  if (node.strokes) {
    for (const stroke of node.strokes) {
      if (!stroke.visible && stroke.visible !== undefined) continue;
      if (stroke.type === 'SOLID') {
        addColor(col, rgbaToHex(stroke.color), stroke.opacity, `stroke:${shortCtx}`);
      }
    }
    if (node.strokes.length > 0) {
      col.strokeDetails.push({
        weight: node.strokeWeight,
        align: node.strokeAlign,
        cap: node.strokeCap,
        join: node.strokeJoin,
        dashPattern: node.strokeDashes,
        context: shortCtx,
      });
    }
  }

  // Effects
  if (node.effects) {
    for (const eff of node.effects) {
      if (!eff.visible && eff.visible !== undefined) continue;
      if (eff.type === 'DROP_SHADOW' || eff.type === 'INNER_SHADOW') {
        addShadow(col, eff, shortCtx);
        if (eff.color) addColor(col, rgbaToHex(eff.color), eff.color.a, `shadow:${shortCtx}`);
      } else if (eff.type === 'LAYER_BLUR' || eff.type === 'BACKGROUND_BLUR') {
        col.blurs.push({
          type: eff.type,
          radius: eff.radius,
          context: shortCtx,
        });
      }
    }
  }

  // Radius
  if (node.cornerRadius !== undefined && node.cornerRadius > 0) {
    addRadius(col, node.cornerRadius, shortCtx);
  }
  if (node.rectangleCornerRadii) {
    for (const r of node.rectangleCornerRadii) {
      if (r > 0) addRadius(col, r, shortCtx);
    }
  }

  // Layout spacing
  if (node.layoutMode) {
    if (node.itemSpacing !== undefined) addSpacing(col, node.itemSpacing, 'gap', shortCtx);
    if (node.paddingLeft !== undefined) {
      addSpacing(col, node.paddingLeft, 'padding-left', shortCtx);
      addSpacing(col, node.paddingRight, 'padding-right', shortCtx);
      addSpacing(col, node.paddingTop, 'padding-top', shortCtx);
      addSpacing(col, node.paddingBottom, 'padding-bottom', shortCtx);
    }
    // Extended layout metadata
    col.layoutNodes.push({
      direction: node.layoutMode,
      wrap: node.layoutWrap || 'NO_WRAP',
      align: node.primaryAxisAlignItems || 'MIN',
      crossAlign: node.counterAxisAlignItems || 'MIN',
      sizing: {
        horizontal: node.primaryAxisSizingMode || 'AUTO',
        vertical: node.counterAxisSizingMode || 'AUTO',
      },
      context: shortCtx,
    });
  }

  // Typography
  if (node.type === 'TEXT') {
    col.textCount++;
    const s = node.style || {};
    if (s.fontFamily) {
      addFont(col, s.fontFamily, s.fontWeight, s.fontSize, shortCtx);
      addTextStyle(col, node, shortCtx);
    }
    if (node.fills && node.fills[0] && node.fills[0].type === 'SOLID') {
      addColor(col, rgbaToHex(node.fills[0].color), node.fills[0].opacity, `text:${shortCtx}`);
    }
  }

  // Component instances
  if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
    col.instanceCount++;
    const size = node.absoluteBoundingBox
      ? `${Math.round(node.absoluteBoundingBox.width)}x${Math.round(node.absoluteBoundingBox.height)}`
      : 'unknown';
    const entry = col.components.get(node.name) || {
      name: node.name,
      type: node.type,
      sizes: new Set(),
      count: 0,
      componentId: null,
      componentProperties: {},
      variantProperties: null,
      pages: new Set(),
    };
    entry.count++;
    entry.sizes.add(size);
    // Enrich with component metadata
    if (node.componentId && !entry.componentId) entry.componentId = node.componentId;
    if (node.componentProperties && Object.keys(node.componentProperties).length > 0) {
      // Merge property keys (accumulate known prop names)
      for (const propKey of Object.keys(node.componentProperties)) {
        if (!entry.componentProperties[propKey]) {
          entry.componentProperties[propKey] = node.componentProperties[propKey];
        }
      }
    }
    if (node.type === 'COMPONENT' && node.componentPropertyDefinitions) {
      entry.variantProperties = node.componentPropertyDefinitions;
    }
    col.components.set(node.name, entry);
  }

  // Recurse
  if (node.children) {
    for (const child of node.children) {
      walkNode(col, child, shortCtx);
    }
  }
}

function serializeMap(map, maxContexts) {
  const arr = [];
  for (const [key, val] of map) {
    const entry = { ...val };
    if (!entry.name && key) entry.name = key;
    if (entry.contexts instanceof Set) {
      entry.contexts = [...entry.contexts].slice(0, maxContexts || 5);
    }
    if (entry.sizes instanceof Set) {
      entry.sizes = [...entry.sizes];
    }
    if (entry.pages instanceof Set) {
      entry.pages = [...entry.pages];
    }
    arr.push(entry);
  }
  return arr.sort((a, b) => (b.count || 0) - (a.count || 0));
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[↳→←↑↓]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// ── Extract a single page ───────────────────────────────────────────────────
async function extractPage(pageId, pageName, depth) {
  depth = depth || DEPTH;
  const col = createCollectors();

  const data = await figmaGetWithRetry(
    `/files/${FILE_ID}/nodes?ids=${encodeURIComponent(pageId)}&depth=${depth}`
  );
  const nodes = data.nodes || {};
  const target = nodes[pageId];

  if (!target || !target.document) {
    return { status: 'empty', stats: null, output: null };
  }

  const page = target.document;
  const frameInventory = [];

  if (page.children) {
    for (const frame of page.children) {
      frameInventory.push({
        name: frame.name,
        type: frame.type,
        size: frame.absoluteBoundingBox
          ? `${Math.round(frame.absoluteBoundingBox.width)}x${Math.round(frame.absoluteBoundingBox.height)}`
          : 'unknown',
        childCount: frame.children ? frame.children.length : 0,
      });
      walkNode(col, frame, '');
    }
  }

  if (col.nodeCount === 0) {
    return { status: 'empty', stats: null, output: null };
  }

  const stats = {
    totalNodes: col.nodeCount,
    textNodes: col.textCount,
    componentInstances: col.instanceCount,
    topLevelFrames: frameInventory.length,
    uniqueColors: col.colors.size,
    uniqueFonts: col.fonts.size,
    uniqueSpacings: col.spacings.size,
    uniqueRadii: col.radii.size,
    uniqueShadows: col.shadows.size,
    uniqueTextStyles: col.textStyles.size,
    uniqueComponents: col.components.size,
    // Extended stats
    hiddenNodes: col.hiddenNodeCount,
    imageRefs: col.imageRefs.length,
    strokeDetails: col.strokeDetails.length,
    blurs: col.blurs.length,
    opacityValues: col.opacityValues.length,
    layoutNodes: col.layoutNodes.length,
    blendModes: col.blendModes.length,
  };

  const output = {
    meta: {
      source: 'figma',
      fileId: FILE_ID,
      nodeId: pageId,
      pageName: pageName,
      extractedAt: new Date().toISOString(),
      stats,
    },
    frames: frameInventory,
    colors: serializeMap(col.colors, 3),
    fonts: serializeMap(col.fonts, 3),
    textStyles: serializeMap(col.textStyles, 3),
    spacings: serializeMap(col.spacings, 3),
    radii: serializeMap(col.radii, 3),
    shadows: serializeMap(col.shadows, 3),
    components: serializeMap(col.components, 5),
    // Extended data
    imageRefs: col.imageRefs,
    strokeDetails: col.strokeDetails,
    blurs: col.blurs,
    opacityValues: col.opacityValues.slice(0, 50),
    layoutNodes: col.layoutNodes.slice(0, 100),
    blendModes: col.blendModes,
  };

  return { status: 'success', stats, output };
}

// ── Merge logic ─────────────────────────────────────────────────────────────
function mergeTokenArrays(target, source, keyFn, mergeFn) {
  const map = new Map();

  for (const item of target) {
    map.set(keyFn(item), { ...item });
  }

  for (const item of source) {
    const key = keyFn(item);
    if (map.has(key)) {
      mergeFn(map.get(key), item);
    } else {
      map.set(key, { ...item });
    }
  }

  return [...map.values()].sort((a, b) => (b.count || 0) - (a.count || 0));
}

function mergeCountContexts(existing, incoming) {
  existing.count = (existing.count || 0) + (incoming.count || 0);
  if (incoming.contexts) {
    const ctxSet = new Set(existing.contexts || []);
    for (const c of incoming.contexts) ctxSet.add(c);
    existing.contexts = [...ctxSet].slice(0, 10);
  }
}

function mergePageIntoMerged(merged, pageOutput) {
  // Colors
  merged.colors = mergeTokenArrays(
    merged.colors || [],
    pageOutput.colors || [],
    (c) => `${c.hex}|${c.opacity}`,
    mergeCountContexts
  );

  // Fonts
  merged.fonts = mergeTokenArrays(
    merged.fonts || [],
    pageOutput.fonts || [],
    (f) => `${f.family}/${f.weight}/${f.size}`,
    mergeCountContexts
  );

  // Text Styles
  merged.textStyles = mergeTokenArrays(
    merged.textStyles || [],
    pageOutput.textStyles || [],
    (t) =>
      `${t.fontFamily}/${t.fontWeight}/${t.fontSize}/${t.lineHeight}/${t.letterSpacing}/${t.color || 'inherit'}`,
    (existing, incoming) => {
      mergeCountContexts(existing, incoming);
      if (incoming.sampleTexts) {
        const samples = new Set(existing.sampleTexts || []);
        for (const s of incoming.sampleTexts) samples.add(s);
        existing.sampleTexts = [...samples].slice(0, 5);
      }
    }
  );

  // Spacings
  merged.spacings = mergeTokenArrays(
    merged.spacings || [],
    pageOutput.spacings || [],
    (s) => `${s.type}:${s.value}`,
    mergeCountContexts
  );

  // Radii
  merged.radii = mergeTokenArrays(
    merged.radii || [],
    pageOutput.radii || [],
    (r) => String(r.value),
    mergeCountContexts
  );

  // Shadows
  merged.shadows = mergeTokenArrays(
    merged.shadows || [],
    pageOutput.shadows || [],
    (s) => `${s.type}|${s.color}|${s.offsetX},${s.offsetY}|${s.blurRadius}|${s.spread}`,
    mergeCountContexts
  );

  // Components — merge by name (primary key), not by size
  merged.components = mergeTokenArrays(
    merged.components || [],
    pageOutput.components || [],
    (c) => (c.name || 'unnamed') + ':' + c.type,
    (existing, incoming) => {
      existing.count = (existing.count || 0) + (incoming.count || 0);
      const sizeSet = new Set([...(existing.sizes || []), ...(incoming.sizes || [])]);
      existing.sizes = [...sizeSet];
      existing.pages = [...new Set([...(existing.pages || []), ...(incoming.pages || [])])];
    }
  );

  // Frames — just concatenate (each page has its own frames)
  merged.frames = [...(merged.frames || []), ...(pageOutput.frames || [])];

  // Extended data — concatenate (dedup not needed, these are diagnostic)
  merged.imageRefs = [...(merged.imageRefs || []), ...(pageOutput.imageRefs || [])];
  merged.strokeDetails = [...(merged.strokeDetails || []), ...(pageOutput.strokeDetails || [])];
  merged.blurs = [...(merged.blurs || []), ...(pageOutput.blurs || [])];
  merged.blendModes = [...(merged.blendModes || []), ...(pageOutput.blendModes || [])];
}

// ── Generate coverage report ────────────────────────────────────────────────
function generateCoverageReport(manifest, merged, singlePageStats) {
  const pages = manifest.pages || [];
  const successPages = pages.filter((p) => p.status === 'success');
  const emptyPages = pages.filter((p) => p.status === 'empty');
  const errorPages = pages.filter((p) => p.status === 'error');
  const skippedPages = pages.filter((p) => p.status === 'skipped');

  // Top 10 pages by node count
  const topByNodes = [...successPages]
    .filter((p) => p.stats)
    .sort((a, b) => (b.stats.totalNodes || 0) - (a.stats.totalNodes || 0))
    .slice(0, 10);

  // Cross-page vs single-page delta
  const crossColors = merged.colors ? merged.colors.length : 0;
  const crossFonts = merged.fonts ? merged.fonts.length : 0;
  const crossTextStyles = merged.textStyles ? merged.textStyles.length : 0;
  const crossSpacings = merged.spacings ? merged.spacings.length : 0;
  const crossRadii = merged.radii ? merged.radii.length : 0;
  const crossShadows = merged.shadows ? merged.shadows.length : 0;
  const crossComponents = merged.components ? merged.components.length : 0;

  // Component usage across pages
  const componentPageCount = new Map();
  for (const page of successPages) {
    if (!page.stats) continue;
    // We need page outputs for this — use the page files
    const pageFile = path.join(PAGES_DIR, page.slug + '.json');
    if (fs.existsSync(pageFile)) {
      try {
        const pageData = JSON.parse(fs.readFileSync(pageFile, 'utf8'));
        for (const comp of pageData.components || []) {
          const key = `${comp.name || 'unnamed'}:${comp.type}`;
          const entry = componentPageCount.get(key) || { name: comp.name, count: 0, totalUsage: 0, sizes: comp.sizes };
          entry.count++;
          entry.totalUsage += comp.count || 0;
          const sizeSet = new Set([...(entry.sizes || []), ...(comp.sizes || [])]);
          entry.sizes = [...sizeSet];
          componentPageCount.set(key, entry);
        }
      } catch (_) {
        // skip
      }
    }
  }

  const topCrossPageComponents = [...componentPageCount.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20);

  let report = `# Figma Batch Extraction — Coverage Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**File ID:** ${FILE_ID}\n\n`;

  report += `## Summary\n\n`;
  report += `| Metric | Count |\n`;
  report += `|--------|-------|\n`;
  report += `| Total pages in file | ${manifest.totalPages} |\n`;
  report += `| Pages extracted (success) | ${successPages.length} |\n`;
  report += `| Pages empty | ${emptyPages.length} |\n`;
  report += `| Pages with errors | ${errorPages.length} |\n`;
  report += `| Pages skipped (separators) | ${skippedPages.length} |\n`;
  report += `| **Content pages read** | **${successPages.length + emptyPages.length}/${manifest.totalPages - skippedPages.length}** |\n`;
  report += `\n`;

  report += `## Token Counts: Cross-Page vs Single-Page (0.0 Estrutura Base)\n\n`;
  report += `| Token Type | Single-Page | Cross-Page | Delta |\n`;
  report += `|------------|-------------|------------|-------|\n`;
  report += `| Colors | ${singlePageStats.colors} | ${crossColors} | +${crossColors - singlePageStats.colors} |\n`;
  report += `| Fonts | ${singlePageStats.fonts} | ${crossFonts} | +${crossFonts - singlePageStats.fonts} |\n`;
  report += `| Text Styles | ${singlePageStats.textStyles} | ${crossTextStyles} | +${crossTextStyles - singlePageStats.textStyles} |\n`;
  report += `| Spacings | ${singlePageStats.spacings} | ${crossSpacings} | +${crossSpacings - singlePageStats.spacings} |\n`;
  report += `| Radii | ${singlePageStats.radii} | ${crossRadii} | +${crossRadii - singlePageStats.radii} |\n`;
  report += `| Shadows | ${singlePageStats.shadows} | ${crossShadows} | +${crossShadows - singlePageStats.shadows} |\n`;
  report += `| Components | ${singlePageStats.components} | ${crossComponents} | +${crossComponents - singlePageStats.components} |\n`;
  report += `\n`;

  report += `## Top 10 Pages by Node Count\n\n`;
  report += `| # | Page | Nodes | Colors | Fonts | Components |\n`;
  report += `|---|------|-------|--------|-------|------------|\n`;
  for (let i = 0; i < topByNodes.length; i++) {
    const p = topByNodes[i];
    report += `| ${i + 1} | ${p.name} | ${p.stats.totalNodes} | ${p.stats.uniqueColors} | ${p.stats.uniqueFonts} | ${p.stats.uniqueComponents} |\n`;
  }
  report += `\n`;

  if (emptyPages.length > 0) {
    report += `## Empty Pages\n\n`;
    for (const p of emptyPages) {
      report += `- ${p.name} (${p.nodeId})\n`;
    }
    report += `\n`;
  }

  if (errorPages.length > 0) {
    report += `## Pages with Errors\n\n`;
    for (const p of errorPages) {
      report += `- ${p.name} (${p.nodeId}): ${p.error}\n`;
    }
    report += `\n`;
  }

  if (topCrossPageComponents.length > 0) {
    report += `## Most Reused Components (cross-page)\n\n`;
    report += `Components appearing in the most pages — strong candidates for the canonical DS.\n\n`;
    report += `| # | Name | Sizes | Pages | Total Usage |\n`;
    report += `|---|------|-------|-------|-------------|\n`;
    for (let i = 0; i < topCrossPageComponents.length; i++) {
      const [, val] = topCrossPageComponents[i];
      report += `| ${i + 1} | ${val.name || 'unnamed'} | ${(val.sizes || []).join(', ')} | ${val.count} | ${val.totalUsage} |\n`;
    }
    report += `\n`;
  }

  // ── Extended Properties Coverage ──────────────────────────────
  report += `## Extended Properties Coverage\n\n`;
  report += `New properties captured in this extraction run.\n\n`;
  report += `| Property | Count |\n`;
  report += `|----------|-------|\n`;
  report += `| Image references | ${(merged.imageRefs || []).length} |\n`;
  report += `| Stroke details | ${(merged.strokeDetails || []).length} |\n`;
  report += `| Blur effects | ${(merged.blurs || []).length} |\n`;
  report += `| Blend modes (non-default) | ${(merged.blendModes || []).length} |\n`;
  report += `\n`;

  // ── Figma API Coverage ──────────────────────────────────────
  const stylesCount = merged.meta?.stats?.figmaStylesCount || 0;
  const varsCount = merged.meta?.stats?.figmaVariablesCount || 0;
  const collectionsCount = merged.meta?.stats?.figmaCollectionsCount || 0;

  report += `## Figma API Coverage\n\n`;
  report += `| Endpoint | Status | Count |\n`;
  report += `|----------|--------|-------|\n`;
  report += `| /v1/files/:id/styles | ${stylesCount > 0 ? '✓' : '✗'} | ${stylesCount} styles |\n`;
  report += `| /v1/files/:id/variables/local | ${varsCount > 0 ? '✓' : '✗'} | ${varsCount} variables in ${collectionsCount} collections |\n`;
  report += `\n`;

  // ── Hidden Nodes ────────────────────────────────────────────
  const totalHidden = successPages.reduce((sum, p) => sum + ((p.stats && p.stats.hiddenNodes) || 0), 0);
  const totalNodes = successPages.reduce((sum, p) => sum + ((p.stats && p.stats.totalNodes) || 0), 0);
  report += `## Hidden Nodes\n\n`;
  report += `- **Hidden nodes:** ${totalHidden}\n`;
  report += `- **Total nodes:** ${totalNodes}\n`;
  report += `- **Visibility coverage:** ${totalNodes > 0 ? Math.round(((totalNodes - totalHidden) / totalNodes) * 1000) / 10 : 100}%\n`;
  report += `\n`;

  // ── Property Completeness Score ─────────────────────────────
  const propChecks = [
    { name: 'Colors', present: crossColors > 0 },
    { name: 'Fonts', present: crossFonts > 0 },
    { name: 'Text Styles', present: crossTextStyles > 0 },
    { name: 'Spacings', present: crossSpacings > 0 },
    { name: 'Radii', present: crossRadii > 0 },
    { name: 'Shadows', present: crossShadows > 0 },
    { name: 'Components', present: crossComponents > 0 },
    { name: 'Image refs', present: (merged.imageRefs || []).length > 0 },
    { name: 'Stroke details', present: (merged.strokeDetails || []).length > 0 },
    { name: 'Blur effects', present: (merged.blurs || []).length > 0 },
    { name: 'Figma styles', present: stylesCount > 0 },
    { name: 'Figma variables', present: varsCount > 0 },
  ];
  const completeness = Math.round((propChecks.filter((p) => p.present).length / propChecks.length) * 100);

  report += `## Property Completeness Score\n\n`;
  report += `**${completeness}%** (${propChecks.filter((p) => p.present).length}/${propChecks.length} property types captured)\n\n`;
  for (const p of propChecks) {
    report += `- ${p.present ? '✓' : '✗'} ${p.name}\n`;
  }
  report += `\n`;

  report += `## Extraction Duration\n\n`;
  report += `- **Started:** ${manifest.startedAt}\n`;
  report += `- **Finished:** ${manifest.finishedAt}\n`;
  const durationMs = new Date(manifest.finishedAt) - new Date(manifest.startedAt);
  const durationMin = Math.round(durationMs / 60000);
  report += `- **Duration:** ~${durationMin} minutes\n`;

  return report;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== FIGMA BATCH EXTRACTION ===');
  console.log(`File: ${FILE_ID}`);
  console.log(`Depth: ${DEPTH}`);
  console.log(`Delay: ${DELAY_MS}ms`);
  console.log(`Resume: ${RESUME}`);
  console.log();

  // Ensure directories
  fs.mkdirSync(PAGES_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  // Load or create manifest
  let manifest = {
    fileId: FILE_ID,
    totalPages: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    pages: [],
  };

  if (RESUME && fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    console.log(`Resuming from manifest (${manifest.pages.filter((p) => p.status === 'success').length} pages already done)`);
  }

  // Get all pages
  console.log('Fetching file structure...');
  const file = await figmaGetWithRetry(`/files/${FILE_ID}?depth=1`);
  const allPages = file.document.children;
  manifest.totalPages = allPages.length;

  console.log(`File: ${file.name}`);
  console.log(`Total pages: ${allPages.length}\n`);

  // Fetch global Figma metadata (1 call each, rate-limit safe)
  const figmaStyles = await fetchStyles();
  await sleep(DELAY_MS);
  const figmaVariables = await fetchVariables();
  await sleep(DELAY_MS);

  // Build set of already-done page IDs
  const doneIds = new Set(
    manifest.pages.filter((p) => p.status === 'success' || p.status === 'skipped').map((p) => p.nodeId)
  );

  // Reference stats from single-page extraction (page 0.0)
  const singlePageStats = {
    colors: 146,
    fonts: 76,
    textStyles: 102,
    spacings: 52,
    radii: 18,
    shadows: 52,
    components: 164,
  };

  let processed = 0;
  const total = allPages.length;

  for (let i = 0; i < allPages.length; i++) {
    const page = allPages[i];
    const pageId = page.id;
    const pageName = page.name;
    const slug = slugify(pageName) || `page-${i}`;

    // Skip already done
    if (RESUME && doneIds.has(pageId)) {
      processed++;
      continue;
    }

    // Check skip patterns
    if (shouldSkip(pageName)) {
      console.log(`[${processed + 1}/${total}] SKIP: "${pageName}" (separator/cover)`);
      const entry = manifest.pages.find((p) => p.nodeId === pageId);
      if (!entry) {
        manifest.pages.push({
          index: i,
          nodeId: pageId,
          name: pageName,
          slug,
          status: 'skipped',
          reason: 'separator/cover',
          stats: null,
          error: null,
        });
      }
      processed++;
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      continue;
    }

    console.log(`[${processed + 1}/${total}] Extracting: "${pageName}" (${pageId})...`);

    let result = null;
    let lastError = null;
    const depthAttempts = [DEPTH, 5, 3];

    for (const tryDepth of depthAttempts) {
      try {
        result = await extractPage(pageId, pageName, tryDepth);
        break;
      } catch (err) {
        lastError = err;
        if (err.message === 'REQUEST_TIMEOUT' && tryDepth > 3) {
          console.log(`  ⏳ Timeout at depth=${tryDepth}, retrying with depth=${depthAttempts[depthAttempts.indexOf(tryDepth) + 1]}...`);
          await sleep(DELAY_MS);
        } else {
          break;
        }
      }
    }

    if (result) {
      const pageFile = path.join(PAGES_DIR, slug + '.json');

      if (result.status === 'success') {
        fs.writeFileSync(pageFile, JSON.stringify(result.output, null, 2));
        console.log(
          `  ✓ ${result.stats.totalNodes} nodes, ${result.stats.uniqueColors} colors, ${result.stats.uniqueFonts} fonts, ${result.stats.uniqueComponents} components`
        );
      } else {
        console.log(`  ○ Empty page (no content nodes)`);
      }

      // Update/add manifest entry
      const existingIdx = manifest.pages.findIndex((p) => p.nodeId === pageId);
      const entry = {
        index: i,
        nodeId: pageId,
        name: pageName,
        slug,
        status: result.status,
        stats: result.stats,
        error: null,
      };
      if (existingIdx >= 0) {
        manifest.pages[existingIdx] = entry;
      } else {
        manifest.pages.push(entry);
      }
    } else {
      console.error(`  ✗ Error: ${lastError ? lastError.message : 'unknown'}`);
      const existingIdx = manifest.pages.findIndex((p) => p.nodeId === pageId);
      const entry = {
        index: i,
        nodeId: pageId,
        name: pageName,
        slug,
        status: 'error',
        stats: null,
        error: lastError ? lastError.message : 'unknown',
      };
      if (existingIdx >= 0) {
        manifest.pages[existingIdx] = entry;
      } else {
        manifest.pages.push(entry);
      }
    }

    processed++;
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    // Delay between pages
    if (i < allPages.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  manifest.finishedAt = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  // ── Merge all pages ─────────────────────────────────────────────────────
  console.log('\n=== MERGING ALL PAGES ===');
  const merged = {
    meta: {
      source: 'figma',
      fileId: FILE_ID,
      mergedAt: new Date().toISOString(),
      pagesIncluded: 0,
      stats: {},
    },
    frames: [],
    colors: [],
    fonts: [],
    textStyles: [],
    spacings: [],
    radii: [],
    shadows: [],
    components: [],
    // Extended data
    imageRefs: [],
    strokeDetails: [],
    blurs: [],
    blendModes: [],
  };

  const pageFiles = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.json'));
  for (const pf of pageFiles) {
    try {
      const pageData = JSON.parse(fs.readFileSync(path.join(PAGES_DIR, pf), 'utf8'));
      mergePageIntoMerged(merged, pageData);
      merged.meta.pagesIncluded++;
    } catch (_) {
      console.warn(`  Warning: could not read ${pf}`);
    }
  }

  merged.meta.stats = {
    totalColors: merged.colors.length,
    totalFonts: merged.fonts.length,
    totalTextStyles: merged.textStyles.length,
    totalSpacings: merged.spacings.length,
    totalRadii: merged.radii.length,
    totalShadows: merged.shadows.length,
    totalComponents: merged.components.length,
    totalFrames: merged.frames.length,
    // Extended stats
    totalImageRefs: merged.imageRefs.length,
    totalStrokeDetails: merged.strokeDetails.length,
    totalBlurs: merged.blurs.length,
    totalBlendModes: merged.blendModes.length,
    // Figma API metadata
    figmaStylesCount: figmaStyles.length,
    figmaVariablesCount: Object.keys(figmaVariables.variables || {}).length,
    figmaCollectionsCount: Object.keys(figmaVariables.variableCollections || {}).length,
  };

  fs.writeFileSync(MERGED_PATH, JSON.stringify(merged, null, 2));
  console.log(`Merged ${merged.meta.pagesIncluded} pages into ${MERGED_PATH}`);
  console.log(`  Colors: ${merged.meta.stats.totalColors}`);
  console.log(`  Fonts: ${merged.meta.stats.totalFonts}`);
  console.log(`  Text Styles: ${merged.meta.stats.totalTextStyles}`);
  console.log(`  Spacings: ${merged.meta.stats.totalSpacings}`);
  console.log(`  Radii: ${merged.meta.stats.totalRadii}`);
  console.log(`  Shadows: ${merged.meta.stats.totalShadows}`);
  console.log(`  Components: ${merged.meta.stats.totalComponents}`);
  console.log(`  Frames: ${merged.meta.stats.totalFrames}`);

  // ── Coverage report ─────────────────────────────────────────────────────
  console.log('\n=== GENERATING COVERAGE REPORT ===');
  const report = generateCoverageReport(manifest, merged, singlePageStats);
  fs.writeFileSync(REPORT_PATH, report);
  console.log(`Report: ${REPORT_PATH}`);

  // ── Final summary ───────────────────────────────────────────────────────
  const successCount = manifest.pages.filter((p) => p.status === 'success').length;
  const emptyCount = manifest.pages.filter((p) => p.status === 'empty').length;
  const errorCount = manifest.pages.filter((p) => p.status === 'error').length;
  const skipCount = manifest.pages.filter((p) => p.status === 'skipped').length;

  console.log('\n=== BATCH EXTRACTION COMPLETE ===');
  console.log(`  Success: ${successCount}`);
  console.log(`  Empty: ${emptyCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Total: ${manifest.totalPages}`);

  if (errorCount > 0) {
    console.log('\n  Pages with errors:');
    for (const p of manifest.pages.filter((pp) => pp.status === 'error')) {
      console.log(`    - ${p.name}: ${p.error}`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch((e) => {
  console.error('Batch extraction failed:', e.message);
  process.exit(1);
});
