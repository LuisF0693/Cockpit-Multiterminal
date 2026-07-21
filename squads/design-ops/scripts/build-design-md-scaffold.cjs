#!/usr/bin/env node
"use strict";

/**
 * build-design-md-scaffold — generate a v2.2 design.md scaffold from extract sidecars.
 *
 * Usage:
 *   node squads/design-ops/scripts/build-design-md-scaffold.cjs --slug <slug> [options]
 *
 * Options:
 *   --slug <slug>    Brand slug (must match outputs/design-ops/url-extracts/<slug>/)
 *   --from <dir>     Source extract dir (default: outputs/design-ops/url-extracts/<slug>)
 *   --out <path>     Output design.md path (default: apps/design/src/data/designs/<slug>/design.md)
 *   --force          Overwrite existing output (default: refuse if exists)
 *   --stdout         Print to stdout instead of writing file
 *   --help           Show this help
 *
 * Behaviour:
 *   - Refuses to overwrite an existing design.md unless --force is passed.
 *     The curated Anthropic file is the gold standard — never silently
 *     replaced.
 *   - Reads all available sidecars and gracefully degrades when files are
 *     missing (each sidecar is optional).
 *   - Emits a scaffold with `extraction_gap(...)` metadata for all fields that
 *     were not extracted. NEVER fabricates default values (founder principle:
 *     "nada é FIXED").
 *
 * Exit codes:
 *   0 — success
 *   1 — usage error or missing required flag
 *   2 — extract source dir not found
 *   3 — output exists and --force not passed
 */

const fs = require("fs");
const path = require("path");
const { buildDesignMdScaffold } = require("../scripts/extract-from-url/lib/design-md-builder.cjs");
const {
  extractMetaAssets,
  extractHeroBlock,
  detectVoiceHeuristic,
  detectHeroVariant,
  detectCtaVariants,
  generateMetaDefaults,
} = require("../scripts/extract-from-url/lib/extractors.cjs");

/**
 * analyzeCoverageBySection — split the YAML frontmatter into top-level sections
 * and count extracted / aliased / extraction-gap entries per section. Returns
 * an array of `{ name, extracted, aliased, gaps, coverage_pct }` rows ordered
 * by appearance.
 *
 * A "top-level section" starts at column 0 with `<key>:` (no space prefix) and
 * ends at the next column-0 key. We also track the prose tail (lines after `---`
 * frontmatter close) as `prose`.
 *
 * Lines are classified the same way as the global stats:
 *   - extracted: `^  <key>: "<value>"` without `extraction_gap(`
 *   - aliased:   line contains `# aliased from`
 *   - gaps:      `extraction_gap(`
 */
function analyzeCoverageBySection(scaffold) {
  const fmMatch = scaffold.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return [];
  const frontmatter = fmMatch[1];
  const proseTail = scaffold.slice(fmMatch[0].length);

  // Split frontmatter into top-level sections.
  const sectionLines = frontmatter.split("\n");
  const sections = [];
  let current = null;
  for (const line of sectionLines) {
    if (/^[a-z][\w-]*:\s*/i.test(line)) {
      // Flush previous
      if (current) sections.push(current);
      const name = line.match(/^([a-z][\w-]*):/i)[1];
      current = { name, lines: [] };
    }
    if (current) current.lines.push(line);
  }
  if (current) sections.push(current);

  // Tail prose handled as a virtual "prose" section
  if (proseTail.trim().length > 0) {
    sections.push({ name: "prose", lines: proseTail.split("\n") });
  }

  // Classify lines per section.
  //   - extracted: `<key>: <value>` lines where the value is a quoted string,
  //     a bare number (lineHeight: 1.4), a bare length/unit (fontSize: 4.5rem),
  //     a list item starting with `- "..."`, or a top-level inline value
  //     (`name: "Anthropic"`, no indent — single-line section).
  return sections.map((sec) => {
    const body = sec.lines.join("\n");
    const gaps = (body.match(/extraction_gap\(/g) || []).length;
    const aliased = (body.match(/# aliased from/g) || []).length;
    const extracted = sec.lines.filter((l) => {
      if (l.includes("extraction_gap(")) return false;
      // YAML keys come in four shapes (indent + 3 prefix patterns):
      //   1. camelCase / kebab-case (`fontFamily:`, `primary-foreground:`)
      //   2. quoted numeric / special (`"1":`, `"2.5":`, `"2xl":`)
      //   3. list items (`- "Serif body"`)
      //   4. top-level inline values (`name: "Anthropic"`, no indent)
      if (/^\s+[A-Za-z_][\w-]*:\s+\"/.test(l)) return true;     // indented unquoted key, quoted value
      if (/^\s+[A-Za-z_][\w-]*:\s+[0-9.]/.test(l)) return true; // indented unquoted key, bare value
      if (/^\s+\"[^"]+\":\s+\"/.test(l)) return true;           // indented quoted key, quoted value
      if (/^\s+\"[^"]+\":\s+[0-9.]/.test(l)) return true;       // indented quoted key, bare value
      if (/^\s+-\s+\"/.test(l)) return true;                    // YAML list item
      // Top-level (no indent) — only count `<key>: <quoted-or-bare-value>` for
      // the section's own header row when that row already carries a value.
      if (/^[A-Za-z_][\w-]*:\s+\"/.test(l)) return true;        // top-level, quoted value
      if (/^[A-Za-z_][\w-]*:\s+(true|false|[0-9.])/.test(l)) return true; // top-level, bool/number
      return false;
    }).length;
    const total = gaps + aliased + extracted;
    const coverage_pct = total > 0
      ? Math.round(((extracted + aliased) / total) * 100)
      : null;
    return {
      name: sec.name,
      extracted,
      aliased,
      gaps,
      todos: gaps,
      coverage_pct,
    };
  });
}

/**
 * validateScaffoldFrontmatter — extract YAML frontmatter and validate against
 * the v2.2 JSON Schema. Returns { ok, errors[] } — errors are advisory warnings
 * (we don't block scaffold emission on schema mismatch, since the scaffold is
 * meant to carry extraction gaps that the schema's `required` may not satisfy yet).
 *
 * The schema lives at squads/design-ops/templates/design-md.schema.json.
 */
function validateScaffoldFrontmatter(scaffold) {
  const fmMatch = scaffold.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    return { ok: false, errors: [{ message: "no YAML frontmatter detected" }] };
  }
  let parsed;
  try {
    parsed = require("js-yaml").load(fmMatch[1]);
  } catch (e) {
    return { ok: false, errors: [{ message: `YAML parse error: ${e.message}` }] };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, errors: [{ message: "frontmatter is not an object" }] };
  }
  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(
      path.join(__dirname, "..", "templates", "design-md.schema.json"),
      "utf8"
    ));
  } catch (e) {
    return { ok: false, errors: [{ message: `schema load error: ${e.message}` }] };
  }
  // Use Ajv's draft-2020-12 build to match $schema in design-md.schema.json.
  const Ajv2020 = require("ajv/dist/2020");
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(parsed);
  if (valid) return { ok: true, errors: [] };
  // Filter noise: extraction gaps produce null values that can fail $defs/colorValue.
  // We surface every error but mark colorValue mismatches as "warnings_likely_gap"
  // so the user knows they're scaffold artifacts, not real schema bugs.
  // A field whose only value in the parsed object is null/undefined is almost
  // always an extraction gap. Treat those as gap-related.
  function fetchByPath(obj, instancePath) {
    if (!instancePath) return undefined;
    const parts = instancePath.replace(/^\//, "").split("/");
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return cur;
      const key = p.replace(/~1/g, "/").replace(/~0/g, "~");
      cur = Array.isArray(cur) ? cur[Number(key)] : cur[key];
    }
    return cur;
  }
  const errors = (validate.errors || []).map((err) => {
    const value = fetchByPath(parsed, err.instancePath || "");
    const likely_gap =
      err.schemaPath?.includes("colorValue") ||
      value === null ||
      value === undefined;
    return {
      path: err.instancePath || err.schemaPath,
      message: err.message,
      keyword: err.keyword,
      likely_todo: likely_gap,
      likely_gap,
    };
  });
  return { ok: false, errors };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { help: true };
    if (a === "--force") out.force = true;
    else if (a === "--stdout") out.stdout = true;
    else if (a === "--slug") out.slug = argv[++i];
    else if (a === "--from") out.from = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else out._.push(a);
  }
  return out;
}

function tryReadJson(absPath) {
  try {
    if (!fs.existsSync(absPath)) return null;
    return JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch (e) {
    process.stderr.write(`[warn] failed to parse ${absPath}: ${e.message}\n`);
    return null;
  }
}

function tryReadFile(absPath) {
  try {
    if (!fs.existsSync(absPath)) return null;
    return fs.readFileSync(absPath, "utf8");
  } catch {
    return null;
  }
}

function showHelp() {
  process.stdout.write(
    `build-design-md-scaffold — generate v2.2 design.md scaffold from extract sidecars

Usage:
  node squads/design-ops/scripts/build-design-md-scaffold.cjs --slug <slug> [options]

Options:
  --slug <slug>    Brand slug (matches outputs/design-ops/url-extracts/<slug>)
  --from <dir>     Source extract dir override
  --out <path>     Output design.md path override
  --force          Overwrite existing output
  --stdout         Print to stdout
  --help           Show this help

Default output: apps/design/src/data/designs/<slug>/design.md
`
  );
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    showHelp();
    process.exit(0);
  }
  if (!args.slug) {
    process.stderr.write("error: --slug is required\n\n");
    showHelp();
    process.exit(1);
  }

  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const fromDir = args.from
    ? path.resolve(args.from)
    : path.join(repoRoot, "outputs", "design-ops", "url-extracts", args.slug);
  if (!fs.existsSync(fromDir)) {
    process.stderr.write(`error: extract source dir not found: ${fromDir}\n`);
    process.stderr.write(`hint: run extract-from-url first to populate it\n`);
    process.exit(2);
  }

  const outPath = args.out
    ? path.resolve(args.out)
    : path.join(repoRoot, "apps", "design", "src", "data", "designs", args.slug, "DESIGN.md");
  if (!args.stdout && fs.existsSync(outPath) && !args.force) {
    process.stderr.write(`error: output exists: ${outPath}\n`);
    process.stderr.write(`hint: pass --force to overwrite, or --stdout to print without writing\n`);
    process.exit(3);
  }

  // Sidecar paths
  const inputsDir = path.join(fromDir, "inputs");
  const sidecars = {
    slug: args.slug,
    tokens: tryReadJson(path.join(fromDir, "tokens.json")),
    metaDefaults: tryReadJson(path.join(fromDir, "meta-defaults.json")),
    metaAssets: tryReadJson(path.join(inputsDir, "meta-assets.json")),
    heroBlock: tryReadJson(path.join(inputsDir, "hero-block.json")),
    heroVariant: tryReadJson(path.join(inputsDir, "hero-variant.json")),
    ctaVariants: tryReadJson(path.join(inputsDir, "cta-variants.json")),
    voiceHeuristic: tryReadJson(path.join(inputsDir, "voice-heuristic.json")),
    styleFingerprint: tryReadJson(path.join(fromDir, "style-fingerprint.json")),
    componentProperties: tryReadJson(path.join(inputsDir, "component-properties.json")),
    shadows: tryReadJson(path.join(inputsDir, "shadows.json")),
    motion: tryReadJson(path.join(inputsDir, "motion.json")),
    fontFaces: tryReadJson(path.join(inputsDir, "font-faces.json")),
    darkMode: tryReadJson(path.join(inputsDir, "dark-mode.json")),
    themeDefault: tryReadJson(path.join(inputsDir, "theme-default.json")),
    cssVars: tryReadJson(path.join(inputsDir, "css-vars-detected.json")),
    logo: tryReadJson(path.join(inputsDir, "logo.json")),
    favicon: tryReadJson(path.join(inputsDir, "favicon.json")),
  };

  // Backfill new sidecars on-the-fly if missing (older extracts)
  if (!sidecars.metaAssets || !sidecars.heroBlock || !sidecars.voiceHeuristic ||
      !sidecars.heroVariant || !sidecars.ctaVariants) {
    const html = tryReadFile(path.join(inputsDir, "page.html"));
    const css = tryReadFile(path.join(inputsDir, "css-collected.css"));
    const md = tryReadFile(path.join(inputsDir, "page.md"));
    if (html) {
      if (!sidecars.metaAssets) sidecars.metaAssets = extractMetaAssets(html);
      if (!sidecars.heroBlock) sidecars.heroBlock = extractHeroBlock(html);
      if (!sidecars.heroVariant && css) sidecars.heroVariant = detectHeroVariant(html, css);
      if (!sidecars.ctaVariants && css) {
        const primary = sidecars.tokens?.colors?.primary?.value || sidecars.tokens?.colors?.primary;
        sidecars.ctaVariants = detectCtaVariants(css, sidecars.componentProperties, primary);
      }
    }
    if (md && !sidecars.voiceHeuristic) sidecars.voiceHeuristic = detectVoiceHeuristic(md);
  }

  // Backfill metaDefaults from other sidecars if missing
  if (!sidecars.metaDefaults) {
    sidecars.metaDefaults = generateMetaDefaults({
      tokens: sidecars.tokens,
      metaAssets: sidecars.metaAssets,
      heroBlock: sidecars.heroBlock,
      styleFingerprint: sidecars.styleFingerprint,
      voiceHeuristic: sidecars.voiceHeuristic,
      url: null,
      slug: args.slug,
    });
  }

  const scaffold = buildDesignMdScaffold(sidecars);

  // Stats
  const lines = scaffold.split("\n").length;
  const gaps = (scaffold.match(/extraction_gap\(/g) || []).length;
  const aliased = (scaffold.match(/# aliased from/g) || []).length;
  // YAML keys may be camelCase (fontFamily), kebab-case (primary-foreground),
  // quoted numeric/special ("1.5", "2xl"), or top-level inline (name:
  // "Anthropic"). Match all shapes.
  const KEY_PATTERNS = [
    /^\s+[A-Za-z_][\w-]*:\s+\"/,           // indented unquoted key, quoted value
    /^\s+[A-Za-z_][\w-]*:\s+[0-9.]/,       // indented unquoted key, bare value
    /^\s+\"[^"]+\":\s+\"/,                 // indented quoted key, quoted value
    /^\s+\"[^"]+\":\s+[0-9.]/,             // indented quoted key, bare value
    /^\s+-\s+\"/,                          // YAML list item: - "value"
    /^[A-Za-z_][\w-]*:\s+\"/,              // top-level inline quoted value
    /^[A-Za-z_][\w-]*:\s+(true|false|[0-9.])/, // top-level inline bool/number
  ];
  const directExtracted = scaffold.split("\n").filter((l) => {
    if (l.includes("extraction_gap(")) return false;
    return KEY_PATTERNS.some((re) => re.test(l));
  }).length;

  if (args.stdout) {
    process.stdout.write(scaffold);
  } else {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, scaffold, "utf8");
  }

  // Coverage report (always to stderr to keep stdout clean for --stdout mode)
  const stats = {
    slug: args.slug,
    output: args.stdout ? "(stdout)" : outPath,
    total_lines: lines,
    gaps_remaining: gaps,
    todos_remaining: gaps,
    aliased_values: aliased,
    extracted_values: directExtracted,
    coverage_pct: directExtracted + aliased > 0
      ? Math.round(((directExtracted + aliased) / (directExtracted + aliased + gaps)) * 100)
      : 0,
  };
  process.stderr.write(`\n=== Scaffold built ===\n`);
  process.stderr.write(`slug:          ${stats.slug}\n`);
  process.stderr.write(`output:        ${stats.output}\n`);
  process.stderr.write(`lines:         ${stats.total_lines}\n`);
  process.stderr.write(`extracted:     ${stats.extracted_values} (direct from CSS/tokens)\n`);
  process.stderr.write(`aliased:       ${stats.aliased_values} (resolved via semantic synonym)\n`);
  process.stderr.write(`gaps:          ${stats.gaps_remaining} (explicit extraction gaps)\n`);
  process.stderr.write(`coverage:      ${stats.coverage_pct}% mechanical\n`);

  // Per-section coverage breakdown — surfaces where the scaffold is dense
  // (colors usually high; spacing/elevation depend on extract quality;
  // brand_primitives + showcase typically gap-heavy because editorial).
  const sections = analyzeCoverageBySection(scaffold);
  const interesting = sections.filter((s) => s.gaps + s.extracted + s.aliased > 0);
  if (interesting.length > 0) {
    process.stderr.write(`\n=== Coverage by section ===\n`);
    const nameWidth = Math.max(...interesting.map((s) => s.name.length), 12);
    for (const s of interesting) {
      const pad = s.name.padEnd(nameWidth);
      const cov = s.coverage_pct == null ? "  -" : `${String(s.coverage_pct).padStart(3)}%`;
      process.stderr.write(
        `  ${pad}  ${cov}  (${s.extracted} extracted + ${s.aliased} aliased / ${s.gaps} gaps)\n`
      );
    }
  }

  // Schema validation (advisory) — emit warnings to stderr so CI/users see
  // structural drift but scaffold emission isn't blocked. Reference:
  // squads/design-ops/templates/design-md.schema.json (ADR-022 v2).
  const validation = validateScaffoldFrontmatter(scaffold);
  if (!validation.ok) {
    const realErrors = validation.errors.filter((e) => !e.likely_todo);
    const gapNoise = validation.errors.length - realErrors.length;
    process.stderr.write(`\n=== Schema validation (advisory) ===\n`);
    if (realErrors.length === 0) {
      process.stderr.write(`schema:        ${gapNoise} gap-related warnings (expected for partial scaffolds)\n`);
    } else {
      process.stderr.write(`schema:        ${realErrors.length} structural warning(s) + ${gapNoise} gap-related\n`);
      realErrors.slice(0, 5).forEach((e) => {
        process.stderr.write(`  - ${e.path || "(root)"} ${e.message}\n`);
      });
      if (realErrors.length > 5) {
        process.stderr.write(`  ... and ${realErrors.length - 5} more\n`);
      }
    }
  } else {
    process.stderr.write(`schema:        valid against design-md.schema.json\n`);
  }

  if (!args.stdout) {
    process.stderr.write(`\nnext: review extraction gaps in ${outPath}\n`);
    process.stderr.write(`      grep -n "extraction_gap(" ${outPath} | wc -l\n`);
  }
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`fatal: ${e.message}\n${e.stack}\n`);
  process.exit(1);
});
