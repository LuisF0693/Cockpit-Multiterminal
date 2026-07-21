#!/usr/bin/env node
/**
 * Extract design tokens from a Figma page — comprehensive extraction
 * Walks ALL frames at ALL depths, collects unique colors, fonts, spacing, radii, shadows
 * Outputs structured JSON ready for design-system metadata
 *
 * Usage: FIGMA_API_KEY=x FIGMA_FILE_ID=x node squads/aiox-design/scripts/figma-extract-tokens.cjs [node-id] [depth]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.FIGMA_API_KEY;
const FILE_ID = process.env.FIGMA_FILE_ID;
const NODE_ID = process.argv[2] || '7081:22278';
const DEPTH = parseInt(process.argv[3] || '10', 10);

if (!TOKEN || !FILE_ID) {
  console.error('Missing FIGMA_API_KEY or FIGMA_FILE_ID');
  process.exit(1);
}

function figmaGet(endpoint) {
  return new Promise((resolve, reject) => {
    const url = 'https://api.figma.com/v1' + endpoint;
    https.get(url, { headers: { 'X-Figma-Token': TOKEN } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(new Error('Parse failed'));
        }
      });
    }).on('error', reject);
  });
}

function rgbaToHex(color) {
  if (!color) return null;
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// Collectors
const colors = new Map(); // hex -> { count, contexts[] }
const fonts = new Map(); // "family weight size" -> { count, contexts[] }
const spacings = new Map(); // value -> { count, type (gap|padding), contexts[] }
const radii = new Map(); // value -> { count, contexts[] }
const shadows = new Map(); // key -> { type, color, offset, radius, spread, count }
const components = new Map(); // name -> { type, size, count }
const textStyles = new Map(); // key -> { font, size, weight, lineHeight, letterSpacing, color, count }

function addColor(hex, opacity, context) {
  if (!hex) return;
  const key = opacity !== undefined && opacity < 1 ? `${hex} ${Math.round(opacity * 100)}%` : hex;
  const entry = colors.get(key) || { hex, opacity: opacity ?? 1, count: 0, contexts: new Set() };
  entry.count++;
  if (context) entry.contexts.add(context);
  colors.set(key, entry);
}

function addFont(family, weight, size, context) {
  if (!family) return;
  const key = `${family}/${weight || 400}/${size || 0}`;
  const entry = fonts.get(key) || { family, weight: weight || 400, size: size || 0, count: 0, contexts: new Set() };
  entry.count++;
  if (context) entry.contexts.add(context);
  fonts.set(key, entry);
}

function addSpacing(value, type, context) {
  if (value === undefined || value === null) return;
  const key = `${type}:${value}`;
  const entry = spacings.get(key) || { value, type, count: 0, contexts: new Set() };
  entry.count++;
  if (context) entry.contexts.add(context);
  spacings.set(key, entry);
}

function addRadius(value, context) {
  if (value === undefined || value === null) return;
  const key = String(value);
  const entry = radii.get(key) || { value, count: 0, contexts: new Set() };
  entry.count++;
  if (context) entry.contexts.add(context);
  radii.set(key, entry);
}

function addShadow(effect, context) {
  const hex = rgbaToHex(effect.color);
  const ox = effect.offset ? effect.offset.x : 0;
  const oy = effect.offset ? effect.offset.y : 0;
  const r = effect.radius || 0;
  const s = effect.spread || 0;
  const key = `${effect.type}|${hex}|${ox},${oy}|${r}|${s}`;
  const entry = shadows.get(key) || {
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
  shadows.set(key, entry);
}

function addTextStyle(node, context) {
  const s = node.style || {};
  if (!s.fontFamily) return;
  const hex = node.fills && node.fills[0] && node.fills[0].type === 'SOLID' ? rgbaToHex(node.fills[0].color) : null;
  const key = `${s.fontFamily}/${s.fontWeight || 400}/${s.fontSize || 0}/${Math.round(s.lineHeightPx || 0)}/${s.letterSpacing || 0}/${hex || 'inherit'}`;
  const entry = textStyles.get(key) || {
    fontFamily: s.fontFamily,
    fontWeight: s.fontWeight || 400,
    fontSize: s.fontSize || 0,
    lineHeight: s.lineHeightPx ? Math.round(s.lineHeightPx * 100) / 100 : null,
    letterSpacing: s.letterSpacing || 0,
    textAlign: s.textAlignHorizontal || 'LEFT',
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
  textStyles.set(key, entry);
}

let nodeCount = 0;
let instanceCount = 0;
let textCount = 0;

function walkNode(node, parentContext) {
  nodeCount++;
  const ctx = parentContext ? `${parentContext} > ${node.name}` : node.name;
  const shortCtx = node.name;

  // Fills
  if (node.fills) {
    for (const fill of node.fills) {
      if (!fill.visible && fill.visible !== undefined) continue;
      if (fill.type === 'SOLID') {
        addColor(rgbaToHex(fill.color), fill.opacity, shortCtx);
      } else if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') {
        for (const stop of fill.gradientStops || []) {
          addColor(rgbaToHex(stop.color), undefined, `gradient in ${shortCtx}`);
        }
      }
    }
  }

  // Strokes
  if (node.strokes) {
    for (const stroke of node.strokes) {
      if (!stroke.visible && stroke.visible !== undefined) continue;
      if (stroke.type === 'SOLID') {
        addColor(rgbaToHex(stroke.color), stroke.opacity, `stroke:${shortCtx}`);
      }
    }
  }

  // Effects
  if (node.effects) {
    for (const eff of node.effects) {
      if (!eff.visible && eff.visible !== undefined) continue;
      if (eff.type === 'DROP_SHADOW' || eff.type === 'INNER_SHADOW') {
        addShadow(eff, shortCtx);
        if (eff.color) addColor(rgbaToHex(eff.color), eff.color.a, `shadow:${shortCtx}`);
      }
    }
  }

  // Radius
  if (node.cornerRadius !== undefined && node.cornerRadius > 0) {
    addRadius(node.cornerRadius, shortCtx);
  }
  if (node.rectangleCornerRadii) {
    for (const r of node.rectangleCornerRadii) {
      if (r > 0) addRadius(r, shortCtx);
    }
  }

  // Layout spacing
  if (node.layoutMode) {
    if (node.itemSpacing !== undefined) addSpacing(node.itemSpacing, 'gap', shortCtx);
    if (node.paddingLeft !== undefined) {
      addSpacing(node.paddingLeft, 'padding-left', shortCtx);
      addSpacing(node.paddingRight, 'padding-right', shortCtx);
      addSpacing(node.paddingTop, 'padding-top', shortCtx);
      addSpacing(node.paddingBottom, 'padding-bottom', shortCtx);
    }
  }

  // Typography
  if (node.type === 'TEXT') {
    textCount++;
    const s = node.style || {};
    if (s.fontFamily) {
      addFont(s.fontFamily, s.fontWeight, s.fontSize, shortCtx);
      addTextStyle(node, shortCtx);
    }
    // Text color
    if (node.fills && node.fills[0] && node.fills[0].type === 'SOLID') {
      addColor(rgbaToHex(node.fills[0].color), node.fills[0].opacity, `text:${shortCtx}`);
    }
  }

  // Component instances
  if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
    instanceCount++;
    const size = node.absoluteBoundingBox
      ? `${Math.round(node.absoluteBoundingBox.width)}x${Math.round(node.absoluteBoundingBox.height)}`
      : 'unknown';
    const entry = components.get(node.name) || { type: node.type, sizes: new Set(), count: 0 };
    entry.count++;
    entry.sizes.add(size);
    components.set(node.name, entry);
  }

  // Recurse
  if (node.children) {
    for (const child of node.children) {
      walkNode(child, ctx);
    }
  }
}

function serializeMap(map, maxContexts) {
  const arr = [];
  for (const [key, val] of map) {
    const entry = { ...val };
    if (entry.contexts instanceof Set) {
      entry.contexts = [...entry.contexts].slice(0, maxContexts || 5);
    }
    if (entry.sizes instanceof Set) {
      entry.sizes = [...entry.sizes];
    }
    arr.push(entry);
  }
  return arr.sort((a, b) => (b.count || 0) - (a.count || 0));
}

async function main() {
  console.log(`=== FIGMA TOKEN EXTRACTION ===`);
  console.log(`Node: ${NODE_ID}  Depth: ${DEPTH}\n`);

  const data = await figmaGet(`/files/${FILE_ID}/nodes?ids=${NODE_ID}&depth=${DEPTH}`);
  const nodes = data.nodes || {};
  const target = nodes[NODE_ID];

  if (!target || !target.document) {
    console.log('Node not found or empty');
    process.exit(1);
  }

  const page = target.document;
  console.log(`Page: ${page.name}`);
  console.log(`Top-level frames: ${page.children ? page.children.length : 0}`);

  // Frame inventory
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
      walkNode(frame, '');
    }
  }

  console.log(`\nNodes scanned: ${nodeCount}`);
  console.log(`Text nodes: ${textCount}`);
  console.log(`Component instances: ${instanceCount}`);
  console.log(`Unique colors: ${colors.size}`);
  console.log(`Unique fonts: ${fonts.size}`);
  console.log(`Unique spacings: ${spacings.size}`);
  console.log(`Unique radii: ${radii.size}`);
  console.log(`Unique shadows: ${shadows.size}`);
  console.log(`Unique text styles: ${textStyles.size}`);
  console.log(`Unique components: ${components.size}\n`);

  // Build output
  const output = {
    meta: {
      source: 'figma',
      fileId: FILE_ID,
      nodeId: NODE_ID,
      pageName: page.name,
      extractedAt: new Date().toISOString(),
      stats: {
        totalNodes: nodeCount,
        textNodes: textCount,
        componentInstances: instanceCount,
        topLevelFrames: frameInventory.length,
      },
    },
    frames: frameInventory,
    colors: serializeMap(colors, 3),
    fonts: serializeMap(fonts, 3),
    textStyles: serializeMap(textStyles, 3),
    spacings: serializeMap(spacings, 3),
    radii: serializeMap(radii, 3),
    shadows: serializeMap(shadows, 3),
    components: serializeMap(components, 5),
  };

  // Write JSON
  const ROOT = process.cwd();
  const outDir = path.join(ROOT, 'workspace', 'domains', 'design-system', 'extraction');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'figma-tokens-raw.json');
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`Output: ${outFile}`);

  // Print summary
  console.log('\n--- COLOR PALETTE ---');
  for (const c of output.colors.slice(0, 25)) {
    console.log(`  ${c.hex.padEnd(10)} opacity:${String(c.opacity).padEnd(5)} used:${String(c.count).padEnd(5)} contexts: ${c.contexts.join(', ')}`);
  }

  console.log('\n--- TYPOGRAPHY ---');
  for (const t of output.textStyles.slice(0, 15)) {
    console.log(`  ${t.fontFamily} ${t.fontWeight} ${t.fontSize}px lh:${t.lineHeight || '-'}px color:${t.color || 'inherit'} used:${t.count}x`);
    if (t.sampleTexts.length > 0) console.log(`    samples: "${t.sampleTexts[0]}"`);
  }

  console.log('\n--- SPACING SCALE ---');
  const gapValues = output.spacings.filter((s) => s.type === 'gap').sort((a, b) => a.value - b.value);
  const paddingValues = new Map();
  for (const s of output.spacings.filter((sp) => sp.type.startsWith('padding'))) {
    const v = s.value;
    paddingValues.set(v, (paddingValues.get(v) || 0) + s.count);
  }
  console.log('  Gaps:', gapValues.map((g) => `${g.value}px(${g.count}x)`).join(', '));
  console.log(
    '  Paddings:',
    [...paddingValues.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([v, c]) => `${v}px(${c}x)`)
      .join(', ')
  );

  console.log('\n--- BORDER RADIUS ---');
  for (const r of output.radii) {
    console.log(`  ${r.value}px used:${r.count}x`);
  }

  console.log('\n--- SHADOWS ---');
  for (const s of output.shadows) {
    console.log(`  ${s.type} color:${s.color} offset:(${s.offsetX},${s.offsetY}) blur:${s.blurRadius} spread:${s.spread} used:${s.count}x`);
  }

  console.log('\n--- COMPONENT INSTANCES (top 20) ---');
  for (const c of output.components.slice(0, 20)) {
    console.log(`  "${c.type === 'COMPONENT' ? '📦' : '🔗'} ${c.sizes ? [...c.sizes].join(', ') : ''}" — used:${c.count}x`);
  }

  console.log('\n--- FRAMES INVENTORY ---');
  for (const f of output.frames) {
    console.log(`  [${f.type}] ${f.name} (${f.size}, ${f.childCount} children)`);
  }

  console.log('\n=== EXTRACTION COMPLETE ===');
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
