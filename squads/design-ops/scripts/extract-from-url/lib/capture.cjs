"use strict";

/**
 * Visual capture module — Phase 1.5 of extract-from-url.
 *
 * Drives a headless Chromium (via puppeteer) to capture screenshots of the
 * target URL at multiple viewports. Default tier is WebP @ 1x deviceScaleFactor
 * q85 (≈85% smaller than PNG @ 2x with no visible loss for design analysis).
 *
 * Each capture passes a quality gate (file_size + DOM text length + heading
 * count). Failures retry with PNG @ 2x and longer wait — page may not have
 * fully rendered (slow JS, animations, lazy-loaded content).
 *
 * Outputs:
 *   <inputsDir>/captures/{NN-name}.{webp|png}
 *   <inputsDir>/captures-manifest.json
 *
 * The manifest is consumed downstream by:
 *   - inputs-manifest.json (sha256 + reuse tracking)
 *   - LLM prompt (visual evidence summary in text form)
 *   - vision LLM (when configured) for richer aesthetic descriptions
 */

const fs = require("fs");
const path = require("path");

// Tier definitions ─────────────────────────────────────────────────────
// TIER_WEBP: default, fast, small. Adequate for ≥90% of marketing pages.
// TIER_PNG : fallback when quality gate fails. Lossless, slower, more faithful.
const TIER_WEBP = { type: "webp", quality: 85, scale: 1, ext: "webp", waitUntil: "networkidle2", settleMs: 800,  timeoutMs: 30000 };
const TIER_PNG  = { type: "png",                scale: 2, ext: "png",  waitUntil: "networkidle0", settleMs: 2000, timeoutMs: 60000 };

// Default capture set — covers above-fold + full-scroll across 3 viewports.
// Future sectioned-capture work will append section-by-section variants.
const DEFAULT_VIEWPORTS = [
  { id: "01-hero-desktop",     w: 1440, h: 900,  fullPage: false, label: "Desktop hero (above-fold)",    minSizeKb: 20 },
  { id: "02-fullpage-desktop", w: 1440, h: 900,  fullPage: true,  label: "Desktop full-page",            minSizeKb: 80 },
  { id: "03-fullpage-tablet",  w: 768,  h: 1024, fullPage: true,  label: "Tablet full-page",             minSizeKb: 60 },
  // Mobile gets 60s timeout (vs 30s default for other viewports) — JS-heavy
  // SaaS shells (Linear, Vercel, etc) often need extra settle time on small
  // viewports because of responsive component re-mounting + lazy assets.
  { id: "04-fullpage-mobile",  w: 390,  h: 844,  fullPage: true,  label: "Mobile full-page (iPhone 14)", minSizeKb: 50, timeoutMsOverride: 60000 },
];

function evaluateQualityGate({ bytes, dom, vp }) {
  const sizeKb = bytes / 1024;
  const failures = [];
  if (sizeKb < vp.minSizeKb) failures.push(`size_too_small (${sizeKb.toFixed(1)}KB < ${vp.minSizeKb}KB threshold)`);
  if ((dom.text_length || 0) < 300) failures.push(`text_length_too_short (${dom.text_length || 0} chars)`);
  if ((dom.headings || 0) < 1) failures.push(`no_headings_detected`);
  return {
    passed: failures.length === 0,
    failures,
    signals: {
      size_kb: +sizeKb.toFixed(1),
      text_length: dom.text_length,
      headings: dom.headings,
      images: dom.images,
    },
  };
}

async function captureOnce(page, vp, tier, url, filePath) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: tier.scale });
  // Per-viewport timeout override (e.g. mobile gets 60s vs 30s default) for
  // JS-heavy SaaS shells that need extra settle time on small viewports.
  const effectiveTimeout = vp.timeoutMsOverride || tier.timeoutMs;
  await page.goto(url, { waitUntil: tier.waitUntil, timeout: effectiveTimeout });
  await new Promise((r) => setTimeout(r, tier.settleMs));

  const opts = { path: filePath, fullPage: vp.fullPage, type: tier.type };
  if (tier.quality != null) opts.quality = tier.quality;
  await page.screenshot(opts);

  const dom = await page.evaluate(() => ({
    text_length: document.body ? document.body.innerText.length : 0,
    headings: document.querySelectorAll("h1, h2, h3").length,
    images: document.images.length,
    title: document.title || "",
  }));

  return { dom, bytes: fs.statSync(filePath).size };
}

// ── Section detection (in-page) ──────────────────────────────────────
// Run inside Puppeteer page context. Walks the DOM, picks reasonable section
// candidates, dedupes nested matches, sorts top→bottom, returns descriptors.
//
// Detection priority (first match wins per element):
//   1. <section> tags
//   2. [role="region"]
//   3. main > * direct children that span >= 60% viewport height
//   4. <header> and <footer> as bookend sections
//
// Filters:
//   - height >= 200px and <= 4000px (one full screen of content max)
//   - width >= 60% of viewport
//   - innerText >= 40 chars (skip empty decorative bands)
//   - dedupe: if candidate is contained in another candidate, keep parent
//
// Returns: [{ y, height, label, slug, headingText }]
async function detectSections(page, { maxSections = 10, minSectionsForSemantic = 3, viewportHeight = 900 } = {}) {
  return page.evaluate((maxSections, minSemantic, vh) => {
    const seen = new Set();
    const candidates = [];
    const minWidthRatio = 0.6;
    const vw = window.innerWidth;

    function addCandidate(el, source) {
      if (seen.has(el)) return;
      const rect = el.getBoundingClientRect();
      const absY = rect.top + window.scrollY;
      const h = rect.height;
      const w = rect.width;
      if (h < 200 || h > 4000) return;
      if (w < vw * minWidthRatio) return;
      const text = (el.innerText || "").trim();
      if (text.length < 40 && el.tagName !== "HEADER" && el.tagName !== "FOOTER") return;
      const heading = el.querySelector("h1, h2, h3");
      const headingText = heading ? (heading.innerText || "").trim().slice(0, 80) : "";
      candidates.push({
        el,
        y: Math.max(0, Math.round(absY)),
        height: Math.round(h),
        headingText,
        tag: el.tagName.toLowerCase(),
        source,
      });
      seen.add(el);
    }

    // Tier 1: semantic markers (best signal)
    document.querySelectorAll("header").forEach((el) => addCandidate(el, "semantic"));
    document.querySelectorAll("section").forEach((el) => addCandidate(el, "semantic"));
    document.querySelectorAll('[role="region"]').forEach((el) => addCandidate(el, "semantic"));
    const mainEl = document.querySelector("main");
    if (mainEl) {
      Array.from(mainEl.children).forEach((child) => {
        const r = child.getBoundingClientRect();
        if (r.height >= 400) addCandidate(child, "main-child");
      });
    }
    document.querySelectorAll("footer").forEach((el) => addCandidate(el, "semantic"));

    // Tier 2: heuristic fallback for SPAs that wrap everything in <div>s
    // (Next.js, styled-components, etc). Walk down from <body> looking for
    // a wrapping container, then take its direct children that span enough.
    if (candidates.length < minSemantic) {
      // Find the outermost layout container (usually body > div or body > div > div)
      const tryRoots = [
        document.body,
        document.body.firstElementChild,
        document.body.firstElementChild ? document.body.firstElementChild.firstElementChild : null,
      ].filter(Boolean);
      for (const root of tryRoots) {
        Array.from(root.children).forEach((child) => {
          const r = child.getBoundingClientRect();
          if (r.height >= 300 && r.height <= 4000) addCandidate(child, "div-child");
        });
        // Stop once we have enough
        if (candidates.length >= minSemantic) break;
      }
    }

    // Dedupe: drop candidates fully contained within a larger candidate.
    const kept = [];
    for (const c of candidates) {
      let containedBy = null;
      for (const other of candidates) {
        if (other === c) continue;
        const oTop = other.y;
        const oBottom = other.y + other.height;
        const cTop = c.y;
        const cBottom = c.y + c.height;
        if (oTop <= cTop && oBottom >= cBottom && other.height > c.height) {
          containedBy = other;
          break;
        }
      }
      if (!containedBy) kept.push(c);
    }

    kept.sort((a, b) => a.y - b.y);

    // Tier 3: last-resort viewport-band split. If still too few, divide the
    // total page height into bands of ~viewportHeight each. Useful when the
    // DOM is one flat scroll with no nesting (rare but happens).
    if (kept.length < minSemantic) {
      const docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const bandHeight = vh;
      const bands = Math.min(maxSections, Math.ceil(docHeight / bandHeight));
      kept.length = 0;
      for (let i = 0; i < bands; i++) {
        const y = i * bandHeight;
        const remaining = docHeight - y;
        const h = Math.min(bandHeight, remaining);
        if (h < 200) break;
        kept.push({ y, height: h, headingText: "", tag: "band", source: "viewport-band" });
      }
    }

    const final = kept.slice(0, maxSections);
    return final.map((c, idx) => {
      const slugBase = c.headingText || c.tag || `region-${idx + 1}`;
      const slug = String(slugBase)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 32) || `region-${idx + 1}`;
      return { y: c.y, height: c.height, headingText: c.headingText || "", tag: c.tag, source: c.source, slug };
    });
  }, maxSections, minSectionsForSemantic, viewportHeight);
}

// Capture a single section as a clipped screenshot. Scrolls to it first to
// trigger lazy-load + animations, then clips the region.
async function captureSection(page, section, tier, viewportWidth, filePath) {
  await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y - 40), behavior: "instant" }), section.y);
  await new Promise((r) => setTimeout(r, 250));
  const clipHeight = Math.min(section.height, 1500);
  const opts = {
    path: filePath,
    type: tier.type,
    clip: { x: 0, y: section.y, width: viewportWidth, height: clipHeight },
  };
  if (tier.quality != null) opts.quality = tier.quality;
  await page.screenshot(opts);
  return { bytes: fs.statSync(filePath).size, clipHeight };
}

/**
 * Run capture pipeline against `url`, writing PNG/WebP files into
 * `<inputsDir>/captures/` and a `captures-manifest.json` summary.
 *
 * @param {object} options
 * @param {string} options.url            Target URL.
 * @param {string} options.inputsDir      Run inputs/ dir (captures land in inputs/captures/).
 * @param {object} [options.logger]       Optional logger with .log/.warn/.error. Defaults to console.
 * @param {Array}  [options.viewports]    Override default viewports list.
 * @param {object} [options.puppeteer]    Inject a puppeteer module (for tests).
 * @returns {Promise<object>}             Manifest written to disk.
 */
async function runCapture({ url, inputsDir, logger = console, viewports = DEFAULT_VIEWPORTS, sectioned = true, puppeteer: puppeteerOverride } = {}) {
  if (!url) throw new Error("runCapture: url is required");
  if (!inputsDir) throw new Error("runCapture: inputsDir is required");

  const puppeteer = puppeteerOverride || require("puppeteer");
  const capturesDir = path.join(inputsDir, "captures");
  fs.mkdirSync(capturesDir, { recursive: true });

  const t0 = Date.now();
  logger.log(`     captures: launching headless chromium…`);
  const browser = await puppeteer.launch({ headless: true });

  const manifest = {
    schema_version: "1.1",
    url,
    captured_at: new Date().toISOString(),
    tiers: { default: "webp@1x_q85", fallback: "png@2x" },
    viewports: [],
    sections: [],
  };

  try {
    for (const vp of viewports) {
      const page = await browser.newPage();
      let final = null;

      try {
        const webpPath = path.join(capturesDir, `${vp.id}.${TIER_WEBP.ext}`);
        const r = await captureOnce(page, vp, TIER_WEBP, url, webpPath);
        const gate = evaluateQualityGate({ bytes: r.bytes, dom: r.dom, vp });
        logger.log(`     captures: ${vp.id} webp ${(r.bytes / 1024).toFixed(1)}KB · text=${r.dom.text_length} · h=${r.dom.headings} · gate=${gate.passed ? "PASS" : "FAIL"}`);

        if (gate.passed) {
          final = { format: "webp", file: path.relative(inputsDir, webpPath), bytes: r.bytes, dom: r.dom, retried: false, gate };
        } else {
          logger.warn(`     captures: ${vp.id} quality-gate failed (${gate.failures.join(", ")}) — retrying PNG@2x`);
          const pngPath = path.join(capturesDir, `${vp.id}.${TIER_PNG.ext}`);
          const r2 = await captureOnce(page, vp, TIER_PNG, url, pngPath);
          const gate2 = evaluateQualityGate({ bytes: r2.bytes, dom: r2.dom, vp });
          logger.log(`     captures: ${vp.id} png  ${(r2.bytes / 1024).toFixed(1)}KB · text=${r2.dom.text_length} · h=${r2.dom.headings} · gate=${gate2.passed ? "PASS" : "FAIL"}`);
          // Drop the failed webp to avoid confusion downstream
          try { fs.unlinkSync(webpPath); } catch {}
          final = { format: "png", file: path.relative(inputsDir, pngPath), bytes: r2.bytes, dom: r2.dom, retried: true, retry_reason: gate.failures, gate: gate2 };
        }
      } catch (err) {
        logger.error(`     captures: ${vp.id} failed — ${err.message}`);
        final = { error: err.message };
      } finally {
        await page.close();
      }

      manifest.viewports.push({
        id: vp.id,
        label: vp.label,
        viewport: `${vp.w}×${vp.h}`,
        fullPage: vp.fullPage,
        ...final,
      });
    }

    // ── Sectioned capture (desktop only) ─────────────────────────────
    // Split the page into bounded section screenshots so vision LLMs can
    // reason about one region at a time instead of parsing 30k-tall fullpage
    // images. Mitigates codex hang on heavy brands and unlocks more accurate
    // per-section aesthetic analysis.
    if (sectioned) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 600));
        const sections = await detectSections(page);
        logger.log(`     captures: detected ${sections.length} sections for sectioned capture`);
        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          const idStr = String(i + 1).padStart(2, "0");
          const captureId = `s${idStr}-${sec.slug}`;
          const filePath = path.join(capturesDir, `${captureId}.${TIER_WEBP.ext}`);
          try {
            const { bytes, clipHeight } = await captureSection(page, sec, TIER_WEBP, 1440, filePath);
            logger.log(`     captures: ${captureId} webp ${(bytes / 1024).toFixed(1)}KB · clip=${clipHeight}px · "${sec.headingText || sec.tag}"`);
            manifest.sections.push({
              id: captureId,
              file: path.relative(inputsDir, filePath),
              bytes,
              y: sec.y,
              height: sec.height,
              clip_height: clipHeight,
              heading: sec.headingText,
              tag: sec.tag,
              format: "webp",
            });
          } catch (err) {
            logger.error(`     captures: ${captureId} failed — ${err.message}`);
            manifest.sections.push({ id: captureId, heading: sec.headingText, error: err.message });
          }
        }
      } catch (err) {
        logger.warn(`     captures: sectioned phase skipped — ${err.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  manifest.total_wall_ms = Date.now() - t0;
  const vpOk = manifest.viewports.filter((v) => v.format && !v.error).length;
  const vpRetries = manifest.viewports.filter((v) => v.retried).length;
  const secOk = manifest.sections.filter((s) => s.format && !s.error).length;
  const vpBytes = manifest.viewports.reduce((s, v) => s + (v.bytes || 0), 0);
  const secBytes = manifest.sections.reduce((s, v) => s + (v.bytes || 0), 0);
  const totalBytes = vpBytes + secBytes;
  manifest.summary = {
    viewports: { count: manifest.viewports.length, ok: vpOk, retries: vpRetries, errors: manifest.viewports.length - vpOk, total_bytes: vpBytes },
    sections: { count: manifest.sections.length, ok: secOk, errors: manifest.sections.length - secOk, total_bytes: secBytes },
    total_bytes: totalBytes,
  };

  fs.writeFileSync(path.join(inputsDir, "captures-manifest.json"), JSON.stringify(manifest, null, 2));
  logger.log(`     captures: ${vpOk}/${manifest.viewports.length} viewports · ${secOk}/${manifest.sections.length} sections · ${vpRetries} png-fallback · ${(totalBytes / 1024 / 1024).toFixed(2)}MB · ${(manifest.total_wall_ms / 1000).toFixed(1)}s`);

  return manifest;
}

module.exports = {
  runCapture,
  evaluateQualityGate,
  captureOnce,
  detectSections,
  captureSection,
  DEFAULT_VIEWPORTS,
  TIER_WEBP,
  TIER_PNG,
};
