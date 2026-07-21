#!/usr/bin/env node
/**
 * Deep scan of a specific Figma page - extracts element-level properties
 * Usage: FIGMA_API_KEY=x FIGMA_FILE_ID=x node squads/aiox-design/scripts/figma-deep-scan.cjs <node-id> [depth]
 */

const https = require('https');
const TOKEN = process.env.FIGMA_API_KEY;
const FILE_ID = process.env.FIGMA_FILE_ID;
const NODE_ID = process.argv[2] || '7081:22278';
const DEPTH = parseInt(process.argv[3] || '5', 10);

if (!TOKEN || !FILE_ID) {
  console.error('Missing FIGMA_API_KEY or FIGMA_FILE_ID');
  process.exit(1);
}

function figmaGet(endpoint) {
  return new Promise((resolve, reject) => {
    const url = 'https://api.figma.com/v1' + endpoint;
    https.get(url, { headers: { 'X-Figma-Token': TOKEN } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(new Error('Parse failed')); }
      });
    }).on('error', reject);
  });
}

function rgbaToHex(color) {
  if (!color) return 'n/a';
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  const a = color.a !== undefined ? color.a : 1;
  const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  return a < 1 ? hex + ' (' + Math.round(a * 100) + '%)' : hex;
}

function extractProps(node, indent) {
  const pad = '  '.repeat(indent);
  const lines = [];

  lines.push(pad + '--- ' + (node.name || 'unnamed') + ' [' + node.type + '] ---');

  // Bounding box
  if (node.absoluteBoundingBox) {
    const bb = node.absoluteBoundingBox;
    lines.push(pad + '  size: ' + Math.round(bb.width) + 'x' + Math.round(bb.height));
  }

  // Fills (colors, gradients)
  if (node.fills && node.fills.length > 0) {
    node.fills.forEach((fill, i) => {
      if (fill.type === 'SOLID') {
        lines.push(pad + '  fill[' + i + ']: SOLID ' + rgbaToHex(fill.color) + (fill.opacity !== undefined ? ' opacity:' + fill.opacity : ''));
      } else if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') {
        const stops = (fill.gradientStops || []).map(s => rgbaToHex(s.color) + '@' + Math.round(s.position * 100) + '%').join(', ');
        lines.push(pad + '  fill[' + i + ']: ' + fill.type + ' [' + stops + ']');
      } else if (fill.type === 'IMAGE') {
        lines.push(pad + '  fill[' + i + ']: IMAGE ref=' + (fill.imageRef || 'n/a'));
      } else {
        lines.push(pad + '  fill[' + i + ']: ' + fill.type);
      }
    });
  }

  // Strokes (borders)
  if (node.strokes && node.strokes.length > 0) {
    node.strokes.forEach((stroke, i) => {
      lines.push(pad + '  stroke[' + i + ']: ' + rgbaToHex(stroke.color) + ' weight:' + (node.strokeWeight || 'n/a') + ' align:' + (node.strokeAlign || 'n/a'));
    });
  }

  // Corner radius
  if (node.cornerRadius !== undefined) {
    lines.push(pad + '  cornerRadius: ' + node.cornerRadius);
  }
  if (node.rectangleCornerRadii) {
    lines.push(pad + '  cornerRadii: [' + node.rectangleCornerRadii.join(', ') + ']');
  }

  // Effects (shadows, blurs)
  if (node.effects && node.effects.length > 0) {
    node.effects.forEach((eff, i) => {
      if (eff.type === 'DROP_SHADOW' || eff.type === 'INNER_SHADOW') {
        lines.push(pad + '  effect[' + i + ']: ' + eff.type + ' ' + rgbaToHex(eff.color) + ' offset:(' + (eff.offset ? eff.offset.x + ',' + eff.offset.y : 'n/a') + ') radius:' + (eff.radius || 0) + ' spread:' + (eff.spread || 0));
      } else {
        lines.push(pad + '  effect[' + i + ']: ' + eff.type + ' radius:' + (eff.radius || 0));
      }
    });
  }

  // Layout (auto-layout)
  if (node.layoutMode) {
    lines.push(pad + '  layout: ' + node.layoutMode + ' gap:' + (node.itemSpacing || 0));
    if (node.paddingLeft !== undefined) {
      lines.push(pad + '  padding: L' + node.paddingLeft + ' R' + node.paddingRight + ' T' + node.paddingTop + ' B' + node.paddingBottom);
    }
    if (node.primaryAxisAlignItems) lines.push(pad + '  mainAxis: ' + node.primaryAxisAlignItems);
    if (node.counterAxisAlignItems) lines.push(pad + '  crossAxis: ' + node.counterAxisAlignItems);
  }

  // Typography
  if (node.type === 'TEXT') {
    if (node.characters) lines.push(pad + '  text: "' + node.characters.slice(0, 80) + '"');
    const s = node.style || {};
    if (s.fontFamily) lines.push(pad + '  font: ' + s.fontFamily + ' ' + (s.fontWeight || '') + ' ' + (s.fontSize || '') + 'px');
    if (s.lineHeightPx) lines.push(pad + '  lineHeight: ' + Math.round(s.lineHeightPx * 100) / 100 + 'px');
    if (s.letterSpacing) lines.push(pad + '  letterSpacing: ' + s.letterSpacing);
    if (s.textAlignHorizontal) lines.push(pad + '  align: ' + s.textAlignHorizontal);
    // Text fills (color)
    if (node.fills && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
      lines.push(pad + '  textColor: ' + rgbaToHex(node.fills[0].color));
    }
  }

  // Constraints
  if (node.constraints) {
    lines.push(pad + '  constraints: H=' + node.constraints.horizontal + ' V=' + node.constraints.vertical);
  }

  // Opacity
  if (node.opacity !== undefined && node.opacity !== 1) {
    lines.push(pad + '  opacity: ' + node.opacity);
  }

  // Blend mode
  if (node.blendMode && node.blendMode !== 'PASS_THROUGH' && node.blendMode !== 'NORMAL') {
    lines.push(pad + '  blendMode: ' + node.blendMode);
  }

  return lines.join('\n');
}

function walkTree(node, indent, maxDepth) {
  if (indent > maxDepth) return;
  console.log(extractProps(node, indent));

  if (node.children) {
    node.children.forEach(child => walkTree(child, indent + 1, maxDepth));
  }
}

async function main() {
  console.log('=== DEEP SCAN: Node ' + NODE_ID + ' depth=' + DEPTH + ' ===\n');

  const data = await figmaGet('/files/' + FILE_ID + '/nodes?ids=' + NODE_ID + '&depth=' + DEPTH);
  const nodes = data.nodes || {};
  const target = nodes[NODE_ID];

  if (!target || !target.document) {
    console.log('Node not found or empty');
    return;
  }

  const page = target.document;
  console.log('PAGE: ' + page.name);
  console.log('TYPE: ' + page.type);
  console.log('TOP-LEVEL FRAMES: ' + (page.children ? page.children.length : 0));
  console.log();

  // Walk first 5 top-level frames with depth
  if (page.children) {
    page.children.slice(0, 8).forEach(frame => {
      walkTree(frame, 0, 3);
      console.log();
    });

    if (page.children.length > 8) {
      console.log('... +' + (page.children.length - 8) + ' more top-level frames');
    }
  }

  console.log('\n=== SCAN COMPLETE ===');
}

main().catch(e => console.error('Failed:', e.message));
