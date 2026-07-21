#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const STARTER_ROOT = path.join(ROOT, "apps", "aiox-design-starter");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractCssBlock(source, pattern, label) {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not find CSS block for ${label}`);
  }
  return match[1];
}

function extractVars(block) {
  const vars = {};
  const varPattern = /(--[\w-]+):\s*([^;]+);/g;
  let match = varPattern.exec(block);
  while (match) {
    vars[match[1]] = match[2].trim();
    match = varPattern.exec(block);
  }
  return vars;
}

function extractYamlAccentHex(yamlSource, themeName) {
  const themePattern = new RegExp(
    `\\n\\s{2}${themeName}:([\\s\\S]*?)\\n\\s{2}(?:[a-zA-Z0-9_-]+:|apps:|governance:)`,
    "m"
  );
  const match = yamlSource.match(themePattern);
  if (!match) {
    throw new Error(`Could not find theme ${themeName} in design-system config`);
  }
  const accentMatch = match[1].match(/accent_hex:\s*"?([#A-Fa-f0-9]+)"?/);
  if (!accentMatch) {
    throw new Error(`Could not find accent_hex for theme ${themeName}`);
  }
  return accentMatch[1];
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const parsed = Number.parseInt(value, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function parseColor(value, vars, seen = new Set()) {
  const trimmed = value.trim();

  if (trimmed.startsWith("var(")) {
    const varMatch = trimmed.match(/^var\((--[\w-]+)(?:,\s*([^)]+))?\)$/);
    if (!varMatch) {
      throw new Error(`Unsupported var() expression: ${trimmed}`);
    }
    const [, varName, fallback] = varMatch;
    if (seen.has(varName)) {
      throw new Error(`Circular variable reference detected for ${varName}`);
    }
    if (vars[varName]) {
      seen.add(varName);
      return parseColor(vars[varName], vars, seen);
    }
    if (fallback) {
      return parseColor(fallback, vars, seen);
    }
    throw new Error(`Missing variable reference: ${varName}`);
  }

  if (/^#[0-9a-fA-F]{3,6}$/.test(trimmed)) {
    return { type: "solid", ...hexToRgb(trimmed) };
  }

  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\)$/
  );
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    const alpha = a === undefined ? 1 : Number.parseFloat(a);
    return {
      type: alpha < 1 ? "alpha" : "solid",
      r: Number.parseFloat(r),
      g: Number.parseFloat(g),
      b: Number.parseFloat(b),
      a: alpha,
    };
  }

  throw new Error(`Unsupported color value: ${trimmed}`);
}

function composite(fg, bg) {
  if (fg.type !== "alpha") {
    return fg;
  }
  return {
    type: "solid",
    r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
    g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
    b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
  };
}

function channelToLinear(value) {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

function luminance(color) {
  return (
    0.2126 * channelToLinear(color.r) +
    0.7152 * channelToLinear(color.g) +
    0.0722 * channelToLinear(color.b)
  );
}

function contrastRatio(foreground, background) {
  const fg = composite(foreground, background);
  const bg = composite(background, { type: "solid", r: 255, g: 255, b: 255 });
  const lighter = Math.max(luminance(fg), luminance(bg));
  const darker = Math.min(luminance(fg), luminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function validatePair(label, foregroundValue, backgroundValue, vars, threshold = 4.5) {
  const foreground = parseColor(foregroundValue, vars);
  const background = parseColor(backgroundValue, vars);
  const ratio = contrastRatio(foreground, background);

  if (ratio < threshold) {
    throw new Error(`${label} failed contrast (${ratio.toFixed(2)} < ${threshold})`);
  }

  console.log(`PASS: ${label} (${ratio.toFixed(2)}:1)`);
}

function main() {
  const globalsCss = read(path.join(STARTER_ROOT, "src", "app", "globals.css"));
  const variantTokensCss = read(
    path.join(STARTER_ROOT, "starter", "variants", "variant2", "tokens.css")
  );
  const starterDs = read(path.join(STARTER_ROOT, "starter", "design-system.config.yaml"));
  const variantDs = read(
    path.join(STARTER_ROOT, "starter", "variants", "variant2", "design-system.config.yaml")
  );

  const defaultMainVars = extractVars(
    extractCssBlock(globalsCss, /\.brandbook-root\s*\{([\s\S]*?)\n\}/m, "starter default main")
  );
  const defaultSecondaryVars = {
    ...defaultMainVars,
    ...extractVars(
      extractCssBlock(
        globalsCss,
        /\.brandbook-root\[data-bb-theme="secondary"\],[\s\S]*?\{([\s\S]*?)\n\}/m,
        "starter default secondary"
      )
    ),
  };
  const variantVars = extractVars(
    extractCssBlock(variantTokensCss, /\.brandbook-root\s*\{([\s\S]*?)\n\}/m, "variant2 main")
  );

  const defaultMainAccent = extractYamlAccentHex(starterDs, "main");
  const defaultSecondaryAccent = extractYamlAccentHex(starterDs, "secondary");
  const variantMainAccent = extractYamlAccentHex(variantDs, "main");
  const variantSecondaryAccent = extractYamlAccentHex(variantDs, "secondary");

  validatePair("starter main cream on dark", defaultMainVars["--bb-cream"], defaultMainVars["--bb-dark"], defaultMainVars);
  validatePair("starter main cream on surface", defaultMainVars["--bb-cream"], defaultMainVars["--bb-surface"], defaultMainVars);
  validatePair("starter main dim on dark", defaultMainVars["--bb-dim"], defaultMainVars["--bb-dark"], defaultMainVars);
  validatePair("starter main accent on dark", defaultMainAccent, defaultMainVars["--bb-dark"], defaultMainVars);
  validatePair("starter main flare on dark", defaultMainVars["--bb-flare"], defaultMainVars["--bb-dark"], defaultMainVars);
  validatePair(
    "starter secondary accent on dark",
    defaultSecondaryAccent,
    defaultSecondaryVars["--bb-dark"],
    defaultSecondaryVars
  );
  validatePair(
    "starter secondary flare on dark",
    defaultSecondaryVars["--bb-flare"],
    defaultSecondaryVars["--bb-dark"],
    defaultSecondaryVars
  );

  validatePair("variant2 cream on dark", variantVars["--bb-cream"], variantVars["--bb-dark"], variantVars);
  validatePair("variant2 cream on surface", variantVars["--bb-cream"], variantVars["--bb-surface"], variantVars);
  validatePair("variant2 dim on dark", variantVars["--bb-dim"], variantVars["--bb-dark"], variantVars);
  validatePair("variant2 accent on dark", variantMainAccent, variantVars["--bb-dark"], variantVars);
  validatePair("variant2 flare on dark", variantVars["--bb-flare"], variantVars["--bb-dark"], variantVars);
  validatePair("variant2 secondary accent on dark", variantSecondaryAccent, variantVars["--bb-dark"], variantVars);

  console.log("PASS: brandbook contrast semantic pairs validated");
}

try {
  main();
} catch (error) {
  console.error("FAIL: brandbook contrast validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
