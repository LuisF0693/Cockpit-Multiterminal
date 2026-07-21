#!/usr/bin/env node
/**
 * Figma file scanner - extracts pages, components, styles, and variables
 * Usage: node squads/design-system/scripts/figma-scan.cjs
 * Requires: FIGMA_API_KEY and FIGMA_FILE_ID in .env
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env
const ROOT = process.cwd();

const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
}

const TOKEN = process.env.FIGMA_API_KEY;
const FILE_ID = process.env.FIGMA_FILE_ID;

if (!TOKEN || !FILE_ID) {
  console.error('Missing FIGMA_API_KEY or FIGMA_FILE_ID in .env');
  process.exit(1);
}

function figmaGet(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `https://api.figma.com/v1${endpoint}`;
    const req = https.get(url, {
      headers: { 'X-Figma-Token': TOKEN }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(new Error('Failed to parse response'));
        }
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  const mode = process.argv[2] || 'all';

  console.log('=== FIGMA SCAN ===');
  console.log('File ID:', FILE_ID);
  console.log('Mode:', mode);
  console.log();

  if (mode === 'all' || mode === 'pages') {
    console.log('--- PAGES ---');
    const file = await figmaGet(`/files/${FILE_ID}?depth=1`);
    console.log('File:', file.name);
    console.log('Last Modified:', file.lastModified);
    console.log('Total Pages:', file.document.children.length);
    console.log();
    file.document.children.forEach((p, i) => {
      console.log(`  [${String(i + 1).padStart(2, '0')}] ${p.id.padStart(15)}  ${p.name}`);
    });
    console.log();
  }

  if (mode === 'all' || mode === 'components') {
    console.log('--- COMPONENTS ---');
    const compData = await figmaGet(`/files/${FILE_ID}/components`);
    const components = (compData.meta && compData.meta.components) || [];
    console.log('Total Components:', components.length);
    console.log();

    const byPage = {};
    components.forEach(c => {
      const page = (c.containing_frame && c.containing_frame.pageName) || 'unknown';
      if (!byPage[page]) byPage[page] = [];
      byPage[page].push({ name: c.name, description: c.description || '' });
    });

    Object.entries(byPage).forEach(([page, comps]) => {
      console.log(`  PAGE: ${page} (${comps.length} components)`);
      comps.slice(0, 10).forEach(c => {
        console.log(`    - ${c.name}${c.description ? ' — ' + c.description.slice(0, 60) : ''}`);
      });
      if (comps.length > 10) console.log(`    ... +${comps.length - 10} more`);
      console.log();
    });
  }

  if (mode === 'all' || mode === 'styles') {
    console.log('--- STYLES ---');
    const styleData = await figmaGet(`/files/${FILE_ID}/styles`);
    const styles = (styleData.meta && styleData.meta.styles) || [];
    console.log('Total Styles:', styles.length);
    console.log();

    const byType = {};
    styles.forEach(s => {
      const t = s.style_type || 'unknown';
      if (!byType[t]) byType[t] = [];
      byType[t].push(s.name);
    });

    Object.entries(byType).forEach(([type, items]) => {
      console.log(`  ${type}: ${items.length} styles`);
      items.slice(0, 10).forEach(n => console.log(`    - ${n}`));
      if (items.length > 10) console.log(`    ... +${items.length - 10} more`);
      console.log();
    });
  }

  if (mode === 'all' || mode === 'variables') {
    console.log('--- VARIABLES (DESIGN TOKENS) ---');
    const varData = await figmaGet(`/files/${FILE_ID}/variables/local`);
    const meta = varData.meta || {};
    const vars = meta.variables ? Object.values(meta.variables) : [];
    const collections = meta.variableCollections ? Object.values(meta.variableCollections) : [];
    console.log('Total Variables:', vars.length);
    console.log('Total Collections:', collections.length);
    console.log();

    collections.forEach(coll => {
      const collVars = vars.filter(v => v.variableCollectionId === coll.id);
      const modeNames = coll.modes.map(m => m.name).join(', ');
      console.log(`  COLLECTION: ${coll.name} (${collVars.length} vars, modes: ${modeNames})`);

      const byType = {};
      collVars.forEach(v => {
        if (!byType[v.resolvedType]) byType[v.resolvedType] = [];
        byType[v.resolvedType].push(v.name);
      });

      Object.entries(byType).forEach(([type, names]) => {
        console.log(`    ${type}: ${names.length}`);
        names.slice(0, 5).forEach(n => console.log(`      - ${n}`));
        if (names.length > 5) console.log(`      ... +${names.length - 5} more`);
      });
      console.log();
    });
  }

  console.log('=== SCAN COMPLETE ===');
}

main().catch(err => {
  console.error('Scan failed:', err.message);
  process.exit(1);
});
