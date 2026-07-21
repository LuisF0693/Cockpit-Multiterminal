"use strict";

/**
 * Local-source adapter for /design-md.
 *
 * Replaces fetch.cjs#fetchHtml + collectCss when --source local is used.
 * Reads canonical CSS files from a Next.js/Tailwind project + parses
 * layout.tsx to synthesize the minimum HTML scaffold required by the
 * STATIC phase detectors that probe DOM attributes (theme-default,
 * dark-mode, html className).
 *
 * Epistemological invariant: no LLM rewrite of tokens. CSS is read
 * verbatim from disk. Synthesized HTML is reconstructed from explicit
 * source (layout.tsx, metadata, Tailwind config), never inferred.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_CSS_GLOBS = [
  "src/app/globals.css",
  "src/components/brandbook/styles/tokens.css",
  "src/components/brandbook/styles/primitives.css",
  "src/components/brandbook/styles/keyframes.css",
  "src/components/brandbook/styles/patterns.css",
  "src/components/brandbook/styles/components-lib.css",
];

function shortSha(buf) {
  return crypto.createHash("sha1").update(buf).digest("hex").slice(0, 12);
}

function listCssFiles(projectRoot) {
  const found = [];
  for (const rel of DEFAULT_CSS_GLOBS) {
    const abs = path.join(projectRoot, rel);
    if (fs.existsSync(abs)) found.push({ abs, rel });
  }
  return found;
}

/**
 * Parse layout.tsx for <html className=...> + lang.
 * Heuristic and bounded — no LLM, only direct regex over committed source.
 */
function parseRootLayout(projectRoot) {
  const candidates = [
    "src/app/layout.tsx",
    "src/app/layout.jsx",
    "app/layout.tsx",
    "app/layout.jsx",
  ];
  for (const rel of candidates) {
    const abs = path.join(projectRoot, rel);
    if (!fs.existsSync(abs)) continue;
    const src = fs.readFileSync(abs, "utf8");
    // <html ... className="dark" ...> or className={`...`} variants
    const classNameMatch =
      src.match(/<html[^>]*className=["']([^"']+)["']/i) ||
      src.match(/<html[^>]*className=\{`([^`]+)`\}/i);
    const langMatch = src.match(/<html[^>]*lang=["']([^"']+)["']/i) ||
      src.match(/<html[^>]*lang=\{[^}]*["']([a-z]{2}(?:-[A-Z]{2})?)["']/i);
    return {
      file: rel,
      htmlClassName: classNameMatch ? classNameMatch[1].trim() : "",
      htmlLang: langMatch ? langMatch[1] : "en",
    };
  }
  return { file: null, htmlClassName: "", htmlLang: "en" };
}

/**
 * Parse package.json for stack fingerprinting.
 */
function parsePackageJson(projectRoot) {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Read + concat CSS, preserving source provenance as inline comments.
 * Returns { css, meta } shape compatible with collectCss() from fetch.cjs.
 */
function collectLocalCss(projectRoot) {
  const files = listCssFiles(projectRoot);
  const chunks = [];
  const fileMeta = [];
  for (const { abs, rel } of files) {
    const buf = fs.readFileSync(abs);
    chunks.push(`/* === ${rel} === */\n${buf.toString("utf8")}`);
    fileMeta.push({ path: rel, bytes: buf.length, sha: shortSha(buf) });
  }
  const css = chunks.join("\n\n");
  return {
    css,
    meta: {
      external: fileMeta.map((f) => f.path),
      preload: [],
      inline_style_blocks: 0,
      inline_style_attrs: 0,
      imports_resolved: 0,
      failed: [],
      fetch_strategy: "local-source",
      source: "local",
      files: fileMeta,
    },
  };
}

/**
 * Synthesize minimum HTML scaffold for STATIC detectors that probe DOM.
 * Embeds <link> tags pointing to local CSS files (relative paths) and
 * captures <html className> + lang from the parsed layout. NO content
 * is fabricated — DOM-content-dependent detectors (component-properties,
 * atomic-classification) MUST consume TSX AST adapter instead (PoC 3+).
 */
function synthesizeHtmlScaffold(projectRoot, cssMeta, layoutInfo, pkgInfo) {
  const linkTags = cssMeta.files
    .map((f) => `    <link rel="stylesheet" href="${f.path}">`)
    .join("\n");
  const classAttr = layoutInfo.htmlClassName
    ? ` class="${layoutInfo.htmlClassName}"`
    : "";
  const langAttr = ` lang="${layoutInfo.htmlLang || "en"}"`;
  const generator = pkgInfo?.dependencies?.next
    ? `Next.js ${pkgInfo.dependencies.next}`
    : "local";
  return `<!DOCTYPE html>
<html${langAttr}${classAttr}>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="generator" content="${generator}">
    <title>${pkgInfo?.name || path.basename(projectRoot)}</title>
${linkTags}
  </head>
  <body>
    <!-- Local-source extraction: DOM content intentionally minimal.
         Component variants and atomic structure must be derived from
         TSX AST, not from this scaffold. -->
  </body>
</html>
`;
}

/**
 * Top-level adapter: produces { html, headers, status, css, cssMeta, source }
 * shape compatible with the run.cjs pipeline expectations.
 */
async function loadLocalSource(projectRoot) {
  const root = path.resolve(projectRoot);
  if (!fs.existsSync(root)) {
    throw new Error(`local-source: project root not found: ${root}`);
  }
  const layoutInfo = parseRootLayout(root);
  const pkgInfo = parsePackageJson(root);
  const { css, meta: cssMeta } = collectLocalCss(root);
  if (cssMeta.files.length === 0) {
    throw new Error(
      `local-source: no CSS files found under ${root}. Expected at least one of: ${DEFAULT_CSS_GLOBS.join(", ")}`
    );
  }
  const html = synthesizeHtmlScaffold(root, cssMeta, layoutInfo, pkgInfo);
  return {
    html,
    css,
    cssMeta,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-sinkra-source": "local",
      "x-sinkra-project": path.relative(process.cwd(), root) || ".",
    },
    status: 200,
    strategy: "local-source",
    source: "local",
    projectRoot: root,
    layoutInfo,
    pkgInfo: pkgInfo
      ? {
          name: pkgInfo.name,
          version: pkgInfo.version,
          next: pkgInfo.dependencies?.next || null,
          tailwind:
            pkgInfo.devDependencies?.tailwindcss ||
            pkgInfo.dependencies?.tailwindcss ||
            null,
        }
      : null,
  };
}

module.exports = {
  loadLocalSource,
  collectLocalCss,
  parseRootLayout,
  parsePackageJson,
  synthesizeHtmlScaffold,
  DEFAULT_CSS_GLOBS,
};
