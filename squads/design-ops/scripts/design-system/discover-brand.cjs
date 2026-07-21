#!/usr/bin/env node
/**
 * discover-brand.cjs — Organism 0 of ds-static-to-dynamic-migration.
 *
 * PRINCIPLE: Code > screenshots. This script reads CSS/HTML source and lifts EXACT
 * values (hex codes, HSL tuples, font stacks, class names). It does NOT rely on
 * vision analysis of screenshots. Per archetype forbid: "Recreating a target UI
 * from screenshots when the source code is accessible." Screenshots are for
 * ambiguity resolution only, never the primary source of truth.
 *
 * PRINCIPLE: Missing assets get placeholders, never approximations. If a logo,
 * icon, or typography file is unavailable, discovery flags it as missing; the
 * downstream scaffold step emits a placeholder + README caveat. "In hi-fi design,
 * a placeholder is better than a bad attempt at the real thing."
 *
 * Scans a static DS source directory and emits brand-profile.yaml:
 *   - Extracts HSL/hex color tokens from CSS
 *   - Classifies colors into roles (foundation / text / border / brand_accent / feedback)
 *   - Extracts typography (@import URLs + --font-* families)
 *   - Matches source against archetype.invariant.baseline_primitives (24)
 *   - Detects specialized primitives via archetype.emergent.discovery.primitives.specialized_detection.catalog
 *   - Lists kit surfaces from ui_kits subdirectories and infers category
 *
 * Usage:
 *   node discover-brand.cjs --source=<dir> [--output=<path>] [--archetype=<yaml>]
 *
 * Exit codes: 0 OK | 1 bad args | 2 archetype load fail | 3 source dir missing
 */

"use strict";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// ── CLI parsing ───────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = {};
  for (const token of argv) {
    const eq = token.indexOf("=");
    if (eq > 0) a[token.slice(2, eq)] = token.slice(eq + 1);
    else if (token.startsWith("--")) a[token.slice(2)] = true;
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));

if (!args.source) {
  process.stderr.write(
    "usage: discover-brand.cjs --source=<dir> [--output=<file>] [--archetype=<yaml>]\n"
  );
  process.exit(1);
}

const SOURCE_DIR = path.resolve(args.source);
const OUTPUT_PATH = args.output ? path.resolve(args.output) : null;
const ARCHETYPE_PATH = path.resolve(
  args.archetype || path.join(__dirname, "../../data/ds-archetype.yaml")
);

if (!fs.existsSync(SOURCE_DIR)) {
  process.stderr.write(`ERR: source dir missing: ${SOURCE_DIR}\n`);
  process.exit(3);
}

let ARCHETYPE;
try {
  ARCHETYPE = yaml.load(fs.readFileSync(ARCHETYPE_PATH, "utf8"));
} catch (e) {
  process.stderr.write(`ERR loading archetype: ${e.message}\n`);
  process.exit(2);
}

// ── File walk ─────────────────────────────────────────────────────────────
function walk(dir, filter) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, filter));
    else if (!filter || filter(p)) out.push(p);
  }
  return out;
}

// ── Color extraction ──────────────────────────────────────────────────────
function extractColors(sourceDir) {
  const cssFiles = walk(sourceDir, (p) => p.endsWith(".css"));
  const colors = [];
  for (const f of cssFiles) {
    const css = fs.readFileSync(f, "utf8");
    // HSL raw (space-separated): --name: H S% L%;
    const hslRawRe = /--([a-z0-9_-]+):\s*(\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%)/gi;
    for (const m of css.matchAll(hslRawRe)) {
      colors.push({
        name: m[1],
        value: m[2].trim(),
        format: "hsl-raw",
        source: path.relative(sourceDir, f),
      });
    }
    // hsl() function
    const hslFnRe = /--([a-z0-9_-]+):\s*(hsl\([^)]+\))/gi;
    for (const m of css.matchAll(hslFnRe)) {
      colors.push({
        name: m[1],
        value: m[2].trim(),
        format: "hsl-fn",
        source: path.relative(sourceDir, f),
      });
    }
    // Hex
    const hexRe = /--([a-z0-9_-]+):\s*(#[0-9a-fA-F]{3,8})/g;
    for (const m of css.matchAll(hexRe)) {
      colors.push({
        name: m[1],
        value: m[2],
        format: "hex",
        source: path.relative(sourceDir, f),
      });
    }
  }
  return colors;
}

function classifyColorRole(name) {
  const n = name.toLowerCase();
  if (/^_?(bg|background)/.test(n) || /(cream|paper|snow|ivory)/.test(n))
    return "foundation";
  if (/^_?(text|fg|foreground|ink|content)/.test(n)) return "text";
  if (/^_?border/.test(n)) return "border";
  if (/(brand|accent|primary|clay|orange|red|lime|cobalt|indigo|mauve|terracotta|green-brand)/.test(n))
    return "brand_accent";
  if (/(success|info|warn|warning|danger|error|destructive|pro-|pro$)/.test(n))
    return "feedback";
  return "unclassified";
}

function classifyColors(colors) {
  const roles = {
    foundation: [],
    text: [],
    border: [],
    brand_accent: [],
    feedback: [],
    unclassified: [],
  };
  for (const c of colors) {
    roles[classifyColorRole(c.name)].push(c);
  }
  return roles;
}

// ── Typography extraction ─────────────────────────────────────────────────
function extractTypography(sourceDir) {
  const cssFiles = walk(sourceDir, (p) => p.endsWith(".css"));
  const imports = [];
  const families = [];
  for (const f of cssFiles) {
    const css = fs.readFileSync(f, "utf8");
    // @import url('...')
    const impRe = /@import\s+url\(\s*['"]?([^'"\)]+)['"]?\s*\)/g;
    for (const m of css.matchAll(impRe)) {
      imports.push(m[1]);
    }
    // --font-*: value
    const famRe = /--(font-[a-z0-9_-]+):\s*([^;]+);/g;
    for (const m of css.matchAll(famRe)) {
      families.push({
        var: m[1],
        stack: m[2].trim().replace(/\s+/g, " "),
      });
    }
  }
  // Extract first family from each --font-* stack
  const primary = {};
  for (const fam of families) {
    const first = fam.stack.split(",")[0].trim().replace(/^["']|["']$/g, "");
    if (/display/.test(fam.var)) primary.display = first;
    else if (/mono/.test(fam.var)) primary.mono = first;
    else if (/serif/.test(fam.var) && !/sans/.test(fam.var)) primary.serif = first;
    else if (/sans/.test(fam.var) || /ui/.test(fam.var) || fam.var === "font-sans")
      primary.sans = first;
  }
  return { imports, families, primary };
}

// ── Baseline primitive match ──────────────────────────────────────────────
function matchBaseline(sourceDir, baseline) {
  const previewDir = path.join(sourceDir, "preview");
  const allHtml = walk(sourceDir, (p) => p.endsWith(".html"));
  const allContent = allHtml
    .map((p) => fs.readFileSync(p, "utf8"))
    .join("\n")
    .toLowerCase();

  const result = {};
  for (const primitive of baseline) {
    const variants = [
      `components-${primitive}.html`,
      `components-${primitive}s.html`,
    ];
    let dedicatedFile = null;
    for (const v of variants) {
      if (fs.existsSync(path.join(previewDir, v))) {
        dedicatedFile = v;
        break;
      }
    }
    // Keyword presence as secondary signal
    const keyword = primitive.toLowerCase();
    const mentioned = allContent.includes(keyword);
    let status;
    if (dedicatedFile) status = "matched_dedicated_preview";
    else if (mentioned) status = "mentioned_in_html";
    else status = "missing_from_source";
    result[primitive] = {
      status,
      evidence: dedicatedFile || (mentioned ? "keyword_match" : null),
    };
  }
  return result;
}

// ── Specialized primitive detection ───────────────────────────────────────
function detectSpecialized(sourceDir, catalog) {
  const allHtml = walk(sourceDir, (p) => p.endsWith(".html"));
  const corpus = allHtml
    .map((p) => fs.readFileSync(p, "utf8"))
    .join("\n")
    .toLowerCase();

  const results = [];
  for (const entry of catalog || []) {
    const signals = entry.signals || [];
    let signalHits = 0;
    const matched = [];

    // Signal-prose heuristic (original pass)
    for (const sig of signals) {
      const tokens = sig
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !["with", "that", "this", "from", "into", "over", "plain", "list", "text", "size", "full", "some"].includes(w));
      if (tokens.length === 0) continue;
      const found = tokens.filter((t) => corpus.includes(t));
      if (found.length / tokens.length >= 0.5) {
        signalHits += 1;
        matched.push(sig);
      }
    }
    const signalScore = signals.length > 0 ? signalHits / signals.length : 0;

    // Structural heuristic — primitive name as class/id/tag attribute
    // Handles multi-word names: "pillar-card" → matches `class="pillar-card"` or `pillar-card`.
    const canonicalNames = [entry.name, entry.name.split(/[\s\/]/)[0]];
    let structuralHit = false;
    for (const n of canonicalNames) {
      const slug = n.toLowerCase().replace(/[^\w-]/g, "").trim();
      if (!slug) continue;
      // class="slug" or class="... slug ..." or id="slug"
      const classRe = new RegExp(
        `class\\s*=\\s*["'][^"']*\\b${slug}\\b[^"']*["']|id\\s*=\\s*["']${slug}["']`,
        "i"
      );
      if (classRe.test(corpus)) {
        structuralHit = true;
        matched.push(`class/id "${slug}"`);
        break;
      }
    }

    // Combined score — structural hit alone is worth 0.6; prose hits add up to remaining 0.4
    let evidence_score = signalScore;
    if (structuralHit) {
      evidence_score = Math.max(evidence_score, 0.6) + Math.min(signalScore * 0.4, 0.4);
    }
    evidence_score = Number(Math.min(evidence_score, 1).toFixed(2));

    if (evidence_score > 0) {
      results.push({
        name: entry.name,
        evidence: entry.evidence,
        evidence_score,
        signals_matched: matched,
      });
    }
  }
  return results.sort((a, b) => b.evidence_score - a.evidence_score);
}

// ── Surface discovery ─────────────────────────────────────────────────────
const CATEGORY_SIGNALS = {
  product: /chat|composer|message|sidebar|artifact|project|dashboard|settings/,
  marketing: /hero|pillar|pricing|blog|article|newsroom|cta-band|marketing|landing|footer|nav/,
  docs: /api|reference|cookbook|docs|guide|sdk/,
  "pitch-deck": /deck|slide|investor|pitch/,
  ops: /incident|alert|risk|monitor|safety|incident/,
};

function inferSurfaceCategory(files, dirname) {
  const flat = (files.join(" ") + " " + dirname).toLowerCase();
  for (const [cat, re] of Object.entries(CATEGORY_SIGNALS)) {
    if (re.test(flat)) return cat;
  }
  return "unknown";
}

function discoverSurfaces(sourceDir) {
  const kitsDir = path.join(sourceDir, "ui_kits");
  if (!fs.existsSync(kitsDir)) return [];
  const subdirs = fs
    .readdirSync(kitsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  return subdirs.map((name) => {
    const dir = path.join(kitsDir, name);
    const files = fs.readdirSync(dir);
    return {
      name,
      category: inferSurfaceCategory(files, name),
      file_count: files.length,
      files,
    };
  });
}

// ── Composition hints ─────────────────────────────────────────────────────
function discoverCompositionHints(sourceDir) {
  const hints = {
    logos: [],
    typography_specimens: [],
    nav_patterns: [],
  };
  // Logos in assets/
  const assetsDir = path.join(sourceDir, "assets");
  if (fs.existsSync(assetsDir)) {
    for (const f of fs.readdirSync(assetsDir)) {
      if (/logo|mark|wordmark|symbol|icon/i.test(f) && f.endsWith(".svg")) {
        hints.logos.push(f);
      }
    }
  }
  // Typography specimen files
  const previewDir = path.join(sourceDir, "preview");
  if (fs.existsSync(previewDir)) {
    for (const f of fs.readdirSync(previewDir)) {
      if (/^type-/.test(f)) hints.typography_specimens.push(f);
    }
  }
  return hints;
}

// ── Run ───────────────────────────────────────────────────────────────────
const invariant = ARCHETYPE.invariant || (ARCHETYPE.archetype && ARCHETYPE.archetype.invariant);
const emergent = ARCHETYPE.emergent || (ARCHETYPE.archetype && ARCHETYPE.archetype.emergent);
if (!invariant || !emergent) {
  process.stderr.write("ERR: archetype missing invariant/emergent sections\n");
  process.exit(2);
}
const baselineList = invariant.baseline_primitives.list;
const catalog = emergent.discovery.primitives.specialized_detection.catalog;

const colors = extractColors(SOURCE_DIR);
const colorRoles = classifyColors(colors);
const typography = extractTypography(SOURCE_DIR);
const baselineMatch = matchBaseline(SOURCE_DIR, baselineList);
const specialized = detectSpecialized(SOURCE_DIR, catalog);
const surfaces = discoverSurfaces(SOURCE_DIR);
const composition = discoverCompositionHints(SOURCE_DIR);

// Coverage stats
const baselineStats = Object.values(baselineMatch).reduce(
  (acc, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1;
    return acc;
  },
  {}
);

const profile = {
  brand_profile: {
    generated_at: new Date().toISOString(),
    source_dir: path.relative(process.cwd(), SOURCE_DIR) || SOURCE_DIR,
    archetype_ref: path.relative(process.cwd(), ARCHETYPE_PATH),
    archetype_version: (ARCHETYPE.archetype && ARCHETYPE.archetype.version) || ARCHETYPE.version || "unknown",
    colors: {
      total_declared: colors.length,
      by_role_count: Object.fromEntries(
        Object.entries(colorRoles).map(([k, v]) => [k, v.length])
      ),
      roles: colorRoles,
    },
    typography: {
      import_urls: typography.imports,
      declared_families: typography.families,
      primary_by_tier: typography.primary,
    },
    primitives: {
      baseline: {
        expected_count: baselineList.length,
        coverage_stats: baselineStats,
        per_primitive: baselineMatch,
      },
      proposed_specialized: specialized,
    },
    surfaces,
    composition_hints: composition,
    notes: {
      policy:
        "Baseline (24) is INVARIANT — always generated. Specialized entries in proposed_specialized require approval (interactive) or evidence_score >= 0.7 (yolo). Surfaces come from ui_kits/*/ — no hardcoding.",
      next_step:
        "Feed this profile into Organism 1 (scaffold-ds.sh) via --brand-profile=... or into @design-chief for interactive approval of specialized primitives.",
    },
  },
};

const yamlOut = yaml.dump(profile, { lineWidth: 120, noRefs: true });

if (OUTPUT_PATH) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, yamlOut);
  process.stderr.write(`wrote ${OUTPUT_PATH}\n`);
  // Stderr summary for human scan
  process.stderr.write(
    `  colors: ${colors.length} declared, ${colorRoles.brand_accent.length} brand, ${colorRoles.feedback.length} feedback\n`
  );
  process.stderr.write(
    `  baseline: ${baselineStats.matched_dedicated_preview || 0} dedicated / ${baselineStats.mentioned_in_html || 0} mentioned / ${baselineStats.missing_from_source || 0} missing\n`
  );
  process.stderr.write(
    `  specialized: ${specialized.length} proposed (max score ${specialized[0]?.evidence_score || 0})\n`
  );
  process.stderr.write(`  surfaces: ${surfaces.length} discovered\n`);
} else {
  process.stdout.write(yamlOut);
}
