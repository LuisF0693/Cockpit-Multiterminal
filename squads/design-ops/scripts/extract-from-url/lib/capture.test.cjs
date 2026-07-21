"use strict";

// Tests for lib/capture.cjs — uses a stubbed puppeteer to avoid launching a
// real browser. Verifies quality-gate logic + manifest shape + fallback path.

const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { test } = require("node:test");

const { runCapture, evaluateQualityGate, DEFAULT_VIEWPORTS } = require("./capture.cjs");

// ── Stubbed puppeteer ─────────────────────────────────────────────────
// Each call to page.screenshot writes a fixture buffer of the requested size.
// Tracks page index across newPage calls. Pages 0..N-1 (one per viewport) get
// `domFixtures` for their single evaluate (dom-stat). Page N (the sectioned
// page) gets sectionFixtures sequentially (detectSections, then scroll evals).
function makeStubPuppeteer({ pageBytes, domFixtures, sectionFixtures = [], viewportCount = 4 }) {
  let pageNum = 0;
  return {
    launch: async () => ({
      newPage: async () => {
        const myPageIdx = pageNum++;
        const screenshots = [];
        let sectionEvalIdx = 0;
        return {
          setViewport: async () => {},
          goto: async () => {},
          screenshot: async ({ path: filePath, type }) => {
            const bytes = pageBytes[screenshots.length] ?? pageBytes[pageBytes.length - 1] ?? 1024;
            const buf = Buffer.alloc(bytes, 0xab);
            fs.writeFileSync(filePath, buf);
            screenshots.push({ filePath, type, bytes });
          },
          evaluate: async () => {
            if (myPageIdx < viewportCount) {
              return domFixtures[myPageIdx] ?? domFixtures[domFixtures.length - 1];
            }
            const v = sectionFixtures[sectionEvalIdx];
            sectionEvalIdx++;
            return v;
          },
          close: async () => {},
        };
      },
      close: async () => {},
    }),
  };
}

const SILENT_LOGGER = { log: () => {}, warn: () => {}, error: () => {} };

test("evaluateQualityGate PASS when all signals healthy", () => {
  const r = evaluateQualityGate({
    bytes: 100 * 1024,
    dom: { text_length: 5000, headings: 12, images: 8 },
    vp: { minSizeKb: 50 },
  });
  assert.equal(r.passed, true);
  assert.deepEqual(r.failures, []);
});

test("evaluateQualityGate FAIL on small file size", () => {
  const r = evaluateQualityGate({
    bytes: 5 * 1024,
    dom: { text_length: 5000, headings: 12, images: 8 },
    vp: { minSizeKb: 80 },
  });
  assert.equal(r.passed, false);
  assert.match(r.failures[0], /size_too_small/);
});

test("evaluateQualityGate FAIL on insufficient text", () => {
  const r = evaluateQualityGate({
    bytes: 200 * 1024,
    dom: { text_length: 50, headings: 12, images: 8 },
    vp: { minSizeKb: 50 },
  });
  assert.equal(r.passed, false);
  assert.ok(r.failures.some((f) => f.includes("text_length_too_short")));
});

test("evaluateQualityGate FAIL when no headings detected", () => {
  const r = evaluateQualityGate({
    bytes: 200 * 1024,
    dom: { text_length: 5000, headings: 0, images: 8 },
    vp: { minSizeKb: 50 },
  });
  assert.equal(r.passed, false);
  assert.ok(r.failures.some((f) => f.includes("no_headings_detected")));
});

test("runCapture writes manifest + captures with stubbed puppeteer (all PASS)", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "capture-test-"));
  const inputsDir = path.join(tmp, "inputs");
  fs.mkdirSync(inputsDir, { recursive: true });

  const stub = makeStubPuppeteer({
    pageBytes: [200 * 1024], // every screenshot ≥ minSizeKb thresholds
    domFixtures: [{ text_length: 5000, headings: 20, images: 30, title: "Stub" }],
  });

  const manifest = await runCapture({
    url: "https://stub.example.com",
    inputsDir,
    logger: SILENT_LOGGER,
    puppeteer: stub,
    sectioned: false,
  });

  assert.equal(manifest.viewports.length, DEFAULT_VIEWPORTS.length);
  assert.equal(manifest.summary.viewports.ok, DEFAULT_VIEWPORTS.length);
  assert.equal(manifest.summary.viewports.retries, 0);
  for (const vp of manifest.viewports) {
    assert.equal(vp.format, "webp");
    assert.equal(vp.retried, false);
    assert.ok(fs.existsSync(path.join(inputsDir, vp.file)), `capture file should exist: ${vp.file}`);
  }
  assert.ok(fs.existsSync(path.join(inputsDir, "captures-manifest.json")));

  fs.rmSync(tmp, { recursive: true, force: true });
});

test("runCapture triggers PNG fallback when WebP fails the gate", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "capture-test-fallback-"));
  const inputsDir = path.join(tmp, "inputs");
  fs.mkdirSync(inputsDir, { recursive: true });

  // Stub interleaves page renders: each viewport will run captureOnce twice
  // (webp first → fail → png retry). dom fixtures are evaluate() return values
  // in call order; pad for both calls per viewport.
  const stub = makeStubPuppeteer({
    pageBytes: [5 * 1024], // far below the 20KB+ minSize thresholds
    domFixtures: [{ text_length: 100, headings: 0, images: 0, title: "Stub" }],
  });

  const manifest = await runCapture({
    url: "https://stub-broken.example.com",
    inputsDir,
    logger: SILENT_LOGGER,
    puppeteer: stub,
    sectioned: false,
  });

  assert.equal(manifest.viewports.length, DEFAULT_VIEWPORTS.length);
  for (const vp of manifest.viewports) {
    assert.equal(vp.retried, true, `${vp.id} should have retried`);
    assert.equal(vp.format, "png", `${vp.id} should fall back to png`);
    assert.ok(Array.isArray(vp.retry_reason));
    assert.ok(vp.retry_reason.length > 0);
  }
  assert.equal(manifest.summary.viewports.retries, DEFAULT_VIEWPORTS.length);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test("runCapture with sectioned=true emits per-section captures + summary", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "capture-test-sectioned-"));
  const inputsDir = path.join(tmp, "inputs");
  fs.mkdirSync(inputsDir, { recursive: true });

  // domFixtures: 4 dom-stat returns (one per viewport) — all PASS
  // sectionFixtures: alternating [detectSections result, scrollTo (undefined)] per section
  const domStat = { text_length: 5000, headings: 20, images: 30, title: "Stub" };
  const sections = [
    { y: 0,    height: 800, headingText: "Hero",      tag: "section", slug: "hero" },
    { y: 900,  height: 600, headingText: "Features",  tag: "section", slug: "features" },
    { y: 1600, height: 500, headingText: "Pricing",   tag: "section", slug: "pricing" },
  ];
  const stub = makeStubPuppeteer({
    pageBytes: [200 * 1024],
    domFixtures: [domStat, domStat, domStat, domStat], // 4 viewports, dom-stat each
    sectionFixtures: [
      sections,    // detectSections call (1st evaluate after viewports)
      undefined,   // scrollTo for section 1
      undefined,   // scrollTo for section 2
      undefined,   // scrollTo for section 3
    ],
  });

  const manifest = await runCapture({
    url: "https://stub.example.com",
    inputsDir,
    logger: SILENT_LOGGER,
    puppeteer: stub,
    sectioned: true,
  });

  assert.equal(manifest.viewports.length, DEFAULT_VIEWPORTS.length);
  assert.equal(manifest.sections.length, 3);
  assert.equal(manifest.summary.sections.ok, 3);
  assert.equal(manifest.summary.sections.errors, 0);
  for (const sec of manifest.sections) {
    assert.equal(sec.format, "webp");
    assert.ok(fs.existsSync(path.join(inputsDir, sec.file)), `section file should exist: ${sec.file}`);
    assert.ok(sec.id.startsWith("s"));
  }
  assert.equal(manifest.sections[0].heading, "Hero");
  assert.equal(manifest.sections[2].heading, "Pricing");

  fs.rmSync(tmp, { recursive: true, force: true });
});
