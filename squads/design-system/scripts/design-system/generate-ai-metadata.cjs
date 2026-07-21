#!/usr/bin/env node

/**
 * generate-ai-metadata.cjs
 *
 * Generates a brand-adapted component-index.json for AI agent consumption.
 * Reads the base component-index.json and overlays business-specific design tokens.
 *
 * Usage:
 *   node generate-ai-metadata.cjs --bu=aiox
 *
 * Output:
 *   workspace/businesses/{slug}/L2-tactical/design/component-index.json
 *
 * [STORY-129.4] AC-1, AC-2
 */

const fs = require('fs');
const path = require('path');

// --- Constants ---

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const BASE_INDEX_PATH = path.join(ROOT, 'squads', 'design-system', 'data', 'knowledge', 'component-index.json');

// 7 mandatory fields per component (AC-2)
const MANDATORY_FIELDS = [
  'name',
  'atomic_category',
  'import_path',
  'props',
  'variants',
  'design_tokens',
  'when_to_use',
  'when_not_to_use',
  'page_sections',
  'accessibility_notes',
];

// --- Helpers ---

function fail(message, code = 1) {
  console.error(`ERROR: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { bu: null };
  for (const raw of argv) {
    if (raw.startsWith('--bu=')) {
      args.bu = raw.slice('--bu='.length).trim() || null;
    }
    if (raw.startsWith('--business=')) {
      args.bu = raw.slice('--business='.length).trim() || null;
    }
  }
  return args;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  // Lazy-load js-yaml only when needed
  const yaml = require('js-yaml');
  return yaml.load(fs.readFileSync(filePath, 'utf8')) || {};
}

/**
 * Attempts to load brand-specific design tokens from the business workspace.
 * Looks for tokens.yaml in the L2-tactical/design directory.
 * Returns a flat object mapping token categories to arrays of token names.
 */
function loadBrandTokens(businessSlug) {
  const tokensPath = path.join(
    ROOT, 'workspace', 'businesses', businessSlug,
    'L2-tactical', 'design', 'tokens.yaml'
  );
  const tokensData = readYaml(tokensPath);
  if (!tokensData) {
    return null;
  }

  const result = {
    colors: [],
    spacing: [],
    typography: [],
    motion: [],
  };

  const inventory = ((tokensData.extraction || {}).token_inventory || {});

  // Collect semantic color tokens
  if (Array.isArray(inventory.semantic_tokens)) {
    result.colors = inventory.semantic_tokens.filter((t) =>
      t.includes('color') || t.includes('border') || t.includes('bg') || t.includes('focus')
    );
  }
  // Fallback to core brand tokens
  if (result.colors.length === 0 && Array.isArray(inventory.core_brand_tokens)) {
    result.colors = inventory.core_brand_tokens;
  }

  // Motion tokens
  if (Array.isArray(inventory.motion_tokens)) {
    result.motion = inventory.motion_tokens;
  }

  return result;
}

/**
 * Adapts a single component entry for the target brand.
 * If brandTokens are available, replaces the design_tokens.colors
 * with brand-specific semantic tokens relevant to this component.
 */
function adaptComponent(component, brandTokens) {
  // Start with a copy
  const adapted = { ...component };

  // Ensure all mandatory fields exist
  for (const field of MANDATORY_FIELDS) {
    if (adapted[field] === undefined) {
      adapted[field] = field === 'props' || field === 'variants' || field === 'page_sections'
        ? []
        : field === 'design_tokens'
          ? { colors: [], spacing: [], typography: [] }
          : '';
    }
  }

  // If brand tokens are available, overlay them
  if (brandTokens && adapted.design_tokens) {
    const dt = { ...adapted.design_tokens };

    // Replace base color tokens with brand-specific ones where applicable
    if (brandTokens.colors.length > 0) {
      // Keep the original token names as semantic references,
      // but add brand-specific mappings
      dt.brand_colors = brandTokens.colors;
    }

    // Add motion tokens if brand defines them
    if (brandTokens.motion && brandTokens.motion.length > 0) {
      dt.brand_motion = brandTokens.motion;
    }

    adapted.design_tokens = dt;
  }

  return adapted;
}

// --- Main ---

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.bu) {
    fail('Missing required flag --bu={slug}', 3);
  }

  // Validate business directory exists
  const businessDir = path.join(ROOT, 'workspace', 'businesses', args.bu);
  if (!fs.existsSync(businessDir)) {
    fail(`Business directory not found: workspace/businesses/${args.bu}`, 3);
  }

  // Read base component index
  const baseIndex = readJson(BASE_INDEX_PATH);
  if (!baseIndex || !Array.isArray(baseIndex.components)) {
    fail(`Base component-index.json not found or invalid at: ${path.relative(ROOT, BASE_INDEX_PATH)}`);
  }

  // Load brand tokens (optional — will be null if not found)
  const brandTokens = loadBrandTokens(args.bu);
  const hasBrandTokens = brandTokens !== null;

  // Adapt each component
  const adaptedComponents = baseIndex.components.map((component) =>
    adaptComponent(component, brandTokens)
  );

  // Build output
  const output = {
    version: baseIndex.version || '1.0.0',
    generated: new Date().toISOString().split('T')[0],
    business_slug: args.bu,
    brand_tokens_applied: hasBrandTokens,
    source: 'squads/design-system/data/knowledge/component-index.json',
    total_components: adaptedComponents.length,
    components: adaptedComponents,
  };

  // Ensure output directory exists
  const outputDir = path.join(
    ROOT, 'workspace', 'businesses', args.bu,
    'L2-tactical', 'design'
  );
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'component-index.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

  const relPath = path.relative(ROOT, outputPath);
  console.log(`OK: Generated ${relPath}`);
  console.log(`    Components: ${output.total_components}`);
  console.log(`    Brand tokens applied: ${hasBrandTokens}`);
  console.log(`    Mandatory fields per component: ${MANDATORY_FIELDS.length}`);
}

if (require.main === module) {
  main();
}

module.exports = { adaptComponent, loadBrandTokens, MANDATORY_FIELDS, parseArgs };
