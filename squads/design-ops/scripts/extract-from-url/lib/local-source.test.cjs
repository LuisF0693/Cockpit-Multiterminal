"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const localSource = require("./local-source.cjs");

function mkProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "local-source-test-"));
  // Minimum Next.js-ish layout the adapter knows how to read.
  fs.mkdirSync(path.join(root, "src", "app"), { recursive: true });
  fs.mkdirSync(path.join(root, "src", "components", "brandbook", "styles"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "test-app",
    version: "0.1.0",
    dependencies: { next: "15.0.0" },
    devDependencies: { tailwindcss: "4.0.0" },
  }));
  fs.writeFileSync(path.join(root, "src", "app", "globals.css"), ":root { --bg: #000; }\n");
  fs.writeFileSync(path.join(root, "src", "app", "layout.tsx"), `
import "./globals.css";
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
`);
  fs.writeFileSync(path.join(root, "src", "components", "brandbook", "styles", "tokens.css"), "/* tokens */\n.brand { --primary: #d1ff00; }\n");
  fs.writeFileSync(path.join(root, "src", "components", "brandbook", "styles", "primitives.css"), "/* primitives */\n");
  fs.writeFileSync(path.join(root, "src", "components", "brandbook", "styles", "keyframes.css"), "/* keyframes */\n");
  fs.writeFileSync(path.join(root, "src", "components", "brandbook", "styles", "patterns.css"), "/* patterns */\n");
  fs.writeFileSync(path.join(root, "src", "components", "brandbook", "styles", "components-lib.css"), "/* components */\n");
  return root;
}

test("collectLocalCss reads all 6 canonical CSS files", () => {
  const root = mkProject();
  try {
    const { css, meta } = localSource.collectLocalCss(root);
    assert.equal(meta.files.length, 6);
    assert.equal(meta.fetch_strategy, "local-source");
    assert.equal(meta.source, "local");
    assert.ok(css.includes("--bg: #000"));
    assert.ok(css.includes("--primary: #d1ff00"));
    // Provenance comments inserted between concatenated files
    assert.ok(css.includes("/* === src/app/globals.css === */"));
    assert.ok(css.includes("/* === src/components/brandbook/styles/tokens.css === */"));
    // Each file has a sha
    for (const f of meta.files) {
      assert.match(f.sha, /^[0-9a-f]{12}$/);
      assert.ok(f.bytes > 0);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("collectLocalCss skips files that do not exist", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "local-source-empty-"));
  try {
    fs.mkdirSync(path.join(root, "src", "app"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "app", "globals.css"), ":root {}\n");
    // Only globals.css exists — the other 5 are missing.
    const { meta } = localSource.collectLocalCss(root);
    assert.equal(meta.files.length, 1);
    assert.equal(meta.files[0].path, "src/app/globals.css");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("parseRootLayout extracts className and lang from layout.tsx", () => {
  const root = mkProject();
  try {
    const info = localSource.parseRootLayout(root);
    assert.equal(info.file, "src/app/layout.tsx");
    assert.equal(info.htmlClassName, "dark");
    assert.equal(info.htmlLang, "en");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("parseRootLayout returns defaults when no layout.tsx present", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "local-source-nolayout-"));
  try {
    const info = localSource.parseRootLayout(root);
    assert.equal(info.file, null);
    assert.equal(info.htmlClassName, "");
    assert.equal(info.htmlLang, "en");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("parsePackageJson returns parsed object when present", () => {
  const root = mkProject();
  try {
    const pkg = localSource.parsePackageJson(root);
    assert.equal(pkg.name, "test-app");
    assert.equal(pkg.dependencies.next, "15.0.0");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("parsePackageJson returns null when missing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "local-source-nopkg-"));
  try {
    assert.equal(localSource.parsePackageJson(root), null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("synthesizeHtmlScaffold emits valid HTML with link tags + html attrs", () => {
  const root = mkProject();
  try {
    const cssBundle = localSource.collectLocalCss(root);
    const layoutInfo = localSource.parseRootLayout(root);
    const pkgInfo = localSource.parsePackageJson(root);
    const html = localSource.synthesizeHtmlScaffold(root, cssBundle.meta, layoutInfo, pkgInfo);
    assert.match(html, /<!DOCTYPE html>/);
    assert.match(html, /<html lang="en" class="dark">/);
    assert.match(html, /Next\.js 15\.0\.0/);
    assert.match(html, /src\/app\/globals\.css/);
    assert.match(html, /src\/components\/brandbook\/styles\/tokens\.css/);
    // No content is fabricated.
    assert.doesNotMatch(html, /Lorem ipsum|placeholder/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("loadLocalSource returns full bundle shape compatible with run.cjs", async () => {
  const root = mkProject();
  try {
    const bundle = await localSource.loadLocalSource(root);
    assert.equal(bundle.source, "local");
    assert.equal(bundle.status, 200);
    assert.equal(bundle.strategy, "local-source");
    assert.ok(bundle.html);
    assert.ok(bundle.css.length > 0);
    assert.ok(bundle.cssMeta);
    assert.equal(bundle.cssMeta.files.length, 6);
    assert.equal(bundle.headers["x-sinkra-source"], "local");
    assert.ok(bundle.headers["x-sinkra-project"]);
    assert.equal(bundle.layoutInfo.htmlClassName, "dark");
    assert.equal(bundle.pkgInfo.name, "test-app");
    assert.equal(bundle.pkgInfo.next, "15.0.0");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("loadLocalSource throws when project root does not exist", async () => {
  await assert.rejects(
    () => localSource.loadLocalSource("/nonexistent/path/that/should/not/exist/12345"),
    /project root not found/
  );
});

test("loadLocalSource throws when no CSS files are found", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "local-source-nocss-"));
  try {
    fs.mkdirSync(path.join(root, "src", "app"), { recursive: true });
    fs.writeFileSync(path.join(root, "package.json"), '{"name":"empty"}');
    // No CSS files anywhere.
    await assert.rejects(
      () => localSource.loadLocalSource(root),
      /no CSS files found/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("DEFAULT_CSS_GLOBS lists exactly the 6 canonical paths", () => {
  assert.equal(localSource.DEFAULT_CSS_GLOBS.length, 6);
  assert.ok(localSource.DEFAULT_CSS_GLOBS.includes("src/app/globals.css"));
  assert.ok(localSource.DEFAULT_CSS_GLOBS.includes("src/components/brandbook/styles/tokens.css"));
});
