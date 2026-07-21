#!/usr/bin/env node
/**
 * Generate tokens-runtime.json — Compact token file for LLM context injection
 *
 * Reads brand tokens from workspace/businesses/{slug}/L2-tactical/design/
 * and generates tokens-runtime.json optimized for agent context.
 * Falls back to SINKRA defaults when brand tokens are not yet extracted.
 *
 * Usage: node generate-tokens-runtime.cjs --bu=aiox
 *
 * [Story 129.3]
 */

const fs = require('fs');
const path = require('path');

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const BUSINESSES_DIR = path.join(ROOT, 'workspace', 'businesses');

// SINKRA default tokens — sourced from .claude/rules/design-system-generation.md
const SINKRA_DEFAULTS = {
  color: {
    'brand-primary': { value: '#3B82F6', css_var: '--color-brand-primary', use_for: 'CTAs, links, primary actions, interactive elements' },
    'brand-accent': { value: '#8B5CF6', css_var: '--color-brand-accent', use_for: 'Highlights, secondary actions' },
    'background': { value: '#FAFAFA', css_var: '--background', use_for: 'Page backgrounds' },
    'foreground': { value: '#0F172A', css_var: '--foreground', use_for: 'Primary text' },
    'muted': { value: '#F1F5F9', css_var: '--muted', use_for: 'Secondary backgrounds, disabled states' },
    'muted-foreground': { value: '#6B7280', css_var: '--muted-foreground', use_for: 'Secondary text, placeholders' },
    'border': { value: '#E2E8F0', css_var: '--border', use_for: 'Borders, dividers' },
    'success': { value: '#22C55E', css_var: '--color-success', use_for: 'Success states, confirmations' },
    'warning': { value: '#F59E0B', css_var: '--color-warning', use_for: 'Warning states, caution indicators' },
    'error': { value: '#EF4444', css_var: '--color-error', use_for: 'Error states, destructive actions' },
    'info': { value: '#3B82F6', css_var: '--color-info', use_for: 'Informational states, help text' },
  },
  typography: {
    'font-sans': { value: 'Inter, system-ui', css_var: '--font-sans', use_for: 'Body text, UI labels' },
    'font-mono': { value: 'JetBrains Mono, monospace', css_var: '--font-mono', use_for: 'Code blocks, technical data' },
    'text-display': { value: '3rem / 600', css_var: '--text-display', use_for: 'Hero headings, page titles' },
    'text-heading': { value: '1.875rem / 600', css_var: '--text-heading', use_for: 'Section headings' },
    'text-body': { value: '1rem / 400', css_var: '--text-body', use_for: 'Paragraph text' },
    'text-small': { value: '0.875rem / 400', css_var: '--text-small', use_for: 'Captions, labels, metadata' },
  },
  spacing: {
    'xs': { value: '0.25rem', css_var: '--space-xs', use_for: 'Tight gaps between inline elements' },
    'sm': { value: '0.5rem', css_var: '--space-sm', use_for: 'Small component padding' },
    'md': { value: '1rem', css_var: '--space-md', use_for: 'Standard component padding' },
    'lg': { value: '1.5rem', css_var: '--space-lg', use_for: 'Section spacing' },
    'xl': { value: '2rem', css_var: '--space-xl', use_for: 'Large section gaps' },
    '2xl': { value: '3rem', css_var: '--space-2xl', use_for: 'Page-level spacing' },
  },
  radius: {
    'sm': { value: 'calc(0.75rem - 4px)', css_var: '--radius-sm', use_for: 'Small components: badges, tags' },
    'md': { value: 'calc(0.75rem - 2px)', css_var: '--radius-md', use_for: 'Inputs, buttons' },
    'lg': { value: '0.75rem', css_var: '--radius-lg', use_for: 'Cards, panels' },
  },
  motion: {
    'duration-fast': { value: '100ms', css_var: '--duration-fast', use_for: 'Quick feedback (hover, focus)' },
    'duration-normal': { value: '200ms', css_var: '--duration-normal', use_for: 'Standard transitions' },
    'duration-slow': { value: '300ms', css_var: '--duration-slow', use_for: 'Complex animations, modals' },
    'easing-standard': { value: 'cubic-bezier(0.4, 0, 0.2, 1)', css_var: '--easing-standard', use_for: 'General transitions' },
    'easing-in': { value: 'cubic-bezier(0.4, 0, 1, 1)', css_var: '--easing-in', use_for: 'Enter animations' },
    'easing-out': { value: 'cubic-bezier(0, 0, 0.2, 1)', css_var: '--easing-out', use_for: 'Exit animations' },
  },
  shadow: {
    'card': { value: '0 1px 3px rgba(0,0,0,0.1)', css_var: '--shadow-card', use_for: 'Card elevation' },
    'elevated': { value: '0 4px 6px rgba(0,0,0,0.1)', css_var: '--shadow-elevated', use_for: 'Dropdowns, popovers' },
    'overlay': { value: '0 10px 25px rgba(0,0,0,0.15)', css_var: '--shadow-overlay', use_for: 'Modals, sheets' },
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { bu: null };
  for (const raw of argv) {
    if (raw.startsWith('--bu=')) {
      args.bu = raw.slice('--bu='.length).trim() || null;
    } else if (raw.startsWith('--business=')) {
      args.bu = raw.slice('--business='.length).trim() || null;
    }
  }
  return args;
}

/**
 * Try to load tokens-normalized.json from the business design directory.
 * Returns null if not found.
 */
function loadNormalizedTokens(businessSlug) {
  const candidates = [
    path.join(BUSINESSES_DIR, businessSlug, 'L2-tactical', 'design', 'tokens-normalized.json'),
    path.join(BUSINESSES_DIR, businessSlug, 'L2-tactical', 'design', 'tokens-resolved.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        return { data: JSON.parse(fs.readFileSync(candidate, 'utf8')), path: candidate };
      } catch {
        // Corrupted JSON — skip
      }
    }
  }
  return null;
}

/**
 * Merge business-specific token overrides onto SINKRA defaults.
 * Normalized tokens may have a flat or grouped structure.
 */
function mergeTokens(normalized) {
  const result = JSON.parse(JSON.stringify(SINKRA_DEFAULTS));

  if (!normalized) return { tokens: result, source: 'sinkra-defaults' };

  // If normalized has group keys matching our structure, merge per-group
  for (const group of Object.keys(result)) {
    if (normalized[group] && typeof normalized[group] === 'object') {
      for (const [key, val] of Object.entries(normalized[group])) {
        if (val && typeof val === 'object' && val.value) {
          result[group][key] = {
            value: val.value,
            css_var: val.css_var || result[group][key]?.css_var || `--${group}-${key}`,
            use_for: val.use_for || result[group][key]?.use_for || '',
          };
        }
      }
    }
  }

  return { tokens: result, source: 'figma' };
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.bu) {
    fail('Missing --bu argument. Usage: node generate-tokens-runtime.cjs --bu=aiox');
  }

  const designDir = path.join(BUSINESSES_DIR, args.bu, 'L2-tactical', 'design');

  // Ensure design directory exists
  if (!fs.existsSync(designDir)) {
    fs.mkdirSync(designDir, { recursive: true });
    console.log(`Created design directory: ${path.relative(ROOT, designDir)}`);
  }

  // Load business tokens (if available)
  const normalized = loadNormalizedTokens(args.bu);
  const { tokens, source } = mergeTokens(normalized?.data || null);

  // Build output
  const output = {
    meta: {
      business: args.bu,
      generated_at: new Date().toISOString().slice(0, 10),
      source,
    },
    color: tokens.color,
    typography: tokens.typography,
    spacing: tokens.spacing,
    radius: tokens.radius,
    motion: tokens.motion,
    shadow: tokens.shadow,
  };

  // Validate: 7 groups (meta excluded), each token has value/css_var/use_for
  const groups = ['color', 'typography', 'spacing', 'radius', 'motion', 'shadow'];
  for (const group of groups) {
    if (!output[group] || typeof output[group] !== 'object') {
      fail(`Missing token group: ${group}`);
    }
    for (const [key, token] of Object.entries(output[group])) {
      if (!token.value || !token.css_var || typeof token.use_for !== 'string') {
        fail(`Token ${group}.${key} missing required fields (value, css_var, use_for)`);
      }
    }
  }

  // Write output
  const outputPath = path.join(designDir, 'tokens-runtime.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');

  console.log(`tokens-runtime.json generated successfully`);
  console.log(`  Business: ${args.bu}`);
  console.log(`  Source: ${source}`);
  console.log(`  Groups: ${groups.length} (${groups.join(', ')})`);
  console.log(`  Output: ${path.relative(ROOT, outputPath)}`);
}

main();
