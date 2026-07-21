#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');

function parseArgs(argv) {
  const args = {
    dsRoot: 'apps/aiox-brandbook/src/components/brandbook',
    minBodyContrast: 4.5,
    minUiContrast: 3,
  };
  for (const raw of argv) {
    if (raw.startsWith('--ds-root=')) {
      args.dsRoot = raw.slice('--ds-root='.length).trim() || args.dsRoot;
      continue;
    }
    if (raw.startsWith('--min-body-contrast=')) {
      args.minBodyContrast = Number(raw.slice('--min-body-contrast='.length));
      continue;
    }
    if (raw.startsWith('--min-ui-contrast=')) {
      args.minUiContrast = Number(raw.slice('--min-ui-contrast='.length));
    }
  }
  return args;
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractVars(css) {
  const vars = {};
  const varPattern = /(--[\w-]+):\s*([^;]+);/g;
  let match = varPattern.exec(css);
  while (match) {
    vars[match[1]] = match[2].trim();
    match = varPattern.exec(css);
  }
  return vars;
}

function extractThemeHexes(themeDisplaySource) {
  const hexes = [];
  const pattern = /accentHex:\s*"([#A-Fa-f0-9]+)".*?darkHex:\s*"([#A-Fa-f0-9]+)"/gs;
  let match = pattern.exec(themeDisplaySource);
  while (match) {
    hexes.push({ accent: match[1], dark: match[2] });
    match = pattern.exec(themeDisplaySource);
  }
  return hexes;
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((ch) => `${ch}${ch}`)
          .join('')
      : normalized;
  const n = Number.parseInt(full, 16);
  return { type: 'solid', r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function parseColor(value, vars, seen = new Set()) {
  const trimmed = value.trim();
  if (trimmed.startsWith('var(')) {
    const withFallback = trimmed.match(/^var\((--[\w-]+)\s*,\s*(.+)\)$/);
    const withoutFallback = trimmed.match(/^var\((--[\w-]+)\)$/);
    const varName = withFallback ? withFallback[1] : withoutFallback ? withoutFallback[1] : null;
    const fallback = withFallback ? withFallback[2] : null;
    if (!varName) throw new Error(`Unsupported var() expression: ${trimmed}`);
    if (seen.has(varName)) throw new Error(`Circular var reference: ${varName}`);
    if (vars[varName]) {
      seen.add(varName);
      return parseColor(vars[varName], vars, seen);
    }
    if (fallback) return parseColor(fallback, vars, seen);
    throw new Error(`Missing variable reference: ${varName}`);
  }
  if (/^#[0-9a-fA-F]{3,6}$/.test(trimmed)) return hexToRgb(trimmed);

  const rgba = trimmed.match(
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\)$/
  );
  if (rgba) {
    const [, r, g, b, a] = rgba;
    const alpha = a === undefined ? 1 : Number.parseFloat(a);
    return {
      type: alpha < 1 ? 'alpha' : 'solid',
      r: Number.parseFloat(r),
      g: Number.parseFloat(g),
      b: Number.parseFloat(b),
      a: alpha,
    };
  }
  throw new Error(`Unsupported color value: ${trimmed}`);
}

function composite(fg, bg) {
  if (fg.type !== 'alpha') return fg;
  return {
    type: 'solid',
    r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
    g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
    b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
  };
}

function linear(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(color) {
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

function contrastRatio(foreground, background) {
  const fg = composite(foreground, background);
  const bg = composite(background, { type: 'solid', r: 255, g: 255, b: 255 });
  const lighter = Math.max(luminance(fg), luminance(bg));
  const darker = Math.min(luminance(fg), luminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function assertContrast(label, fgValue, bgValue, vars, min) {
  const fg = parseColor(fgValue, vars);
  const bg = parseColor(bgValue, vars);
  const ratio = contrastRatio(fg, bg);
  if (ratio < min) {
    throw new Error(`${label} failed contrast (${ratio.toFixed(2)} < ${min})`);
  }
  process.stdout.write(`PASS: ${label} (${ratio.toFixed(2)}:1)\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const tokensCssPath = path.join(ROOT, args.dsRoot, 'styles', 'tokens.css');
  const themePath = path.join(ROOT, args.dsRoot, 'theme', 'brandbook-theme-display.ts');

  if (!fs.existsSync(tokensCssPath)) throw new Error(`Missing tokens.css at ${tokensCssPath}`);
  if (!fs.existsSync(themePath)) throw new Error(`Missing theme display file at ${themePath}`);

  const vars = extractVars(read(tokensCssPath));
  const themeHexes = extractThemeHexes(read(themePath));
  if (themeHexes.length === 0) throw new Error('Could not parse theme accent/dark hex pairs');

  assertContrast(
    'cream on dark',
    vars['--cream'] || 'var(--cream)',
    vars['--dark'] || 'var(--dark)',
    vars,
    args.minBodyContrast
  );
  assertContrast(
    'cream on surface',
    vars['--cream'] || 'var(--cream)',
    vars['--surface'] || 'var(--surface)',
    vars,
    args.minBodyContrast
  );
  assertContrast(
    'dim on dark',
    vars['--dim'] || 'var(--dim)',
    vars['--dark'] || 'var(--dark)',
    vars,
    args.minUiContrast
  );

  for (const [index, theme] of themeHexes.entries()) {
    assertContrast(
      `theme-${index + 1} accent on dark`,
      theme.accent,
      theme.dark,
      vars,
      args.minBodyContrast
    );
  }

  process.stdout.write('PASS: brandbook contrast semantic pairs validated\n');
}

try {
  main();
} catch (error) {
  process.stderr.write('FAIL: brandbook contrast validation\n');
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
