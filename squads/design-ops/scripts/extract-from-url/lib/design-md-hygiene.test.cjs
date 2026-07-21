"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeDesignMd } = require("./design-md-hygiene.cjs");

const MIN_VALID_HEADER = `---
version: "2.2"
name: "Test"
description: "Test."
`;

function wrap(fmBody, prose = "## 1. Visual Theme\n") {
  return `${MIN_VALID_HEADER}${fmBody}---\n\n${prose}`;
}

// ── KEEP tests: useful semantic comments MUST survive ────────────────────

test("keeps section-header style comments", () => {
  const input = wrap(`colors:
  # Semantic UI color slots
  primary: "#141413"
  # M3 surface ladder
  surface-bright: "#d97757"
  # Extended brand swatches
  clay: "#d97757"
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(markdown.includes("# Semantic UI color slots"));
  assert.ok(markdown.includes("# M3 surface ladder"));
  assert.ok(markdown.includes("# Extended brand swatches"));
  assert.equal(report.totalStrips, 0);
});

test("keeps trailing semantic role comments", () => {
  const input = wrap(`colors:
  primary: "#141413"              # light-mode primary CTA: slate-dark
  border: "#1414131a"            # slate at 10% opacity
  card: "#ffffff"                 # standard cards are white
  accent: "#d97757"              # clay — brand accent (not the CTA)
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(markdown.includes("# light-mode primary CTA: slate-dark"));
  assert.ok(markdown.includes("# slate at 10% opacity"));
  assert.ok(markdown.includes("# standard cards are white"));
  assert.ok(markdown.includes("# clay — brand accent (not the CTA)"));
  assert.equal(report.totalStrips, 0);
});

test("keeps anti-pattern guards", () => {
  const input = wrap(`colors:
  destructive: "#b43232"         # red; do not reuse clay for errors
  success: "#2f7613"             # green (not olive)
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(markdown.includes("# red; do not reuse clay for errors"));
  assert.ok(markdown.includes("# green (not olive)"));
  assert.equal(report.totalStrips, 0);
});

test("keeps token-name disambiguation comments", () => {
  const input = wrap(`colors:
  primary-foreground: "#faf9f5"  # ivory-light
  neutral: "#5e5d59"             # slate-light
  tertiary: "#788c5d"            # olive — third accent
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(markdown.includes("# ivory-light"));
  assert.ok(markdown.includes("# slate-light"));
  assert.ok(markdown.includes("# olive — third accent"));
  assert.equal(report.totalStrips, 0);
});

test("keeps css-var reference comments", () => {
  const input = wrap(`colors:
  primary-deep: "#c6613f"        # --swatch--accent (clay emphasized — hover)
  tracking-btn: "-0.005em"       # --letter-spacing--0-005em
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(markdown.includes("# --swatch--accent (clay emphasized — hover)"));
  assert.ok(markdown.includes("# --letter-spacing--0-005em"));
  assert.equal(report.totalStrips, 0);
});

test("keeps multi-clause design guidance comments", () => {
  const input = wrap(`typography:
  # Display uses Serif at large sizes; headings and compact UI use Sans.
  display: { fontSize: "72px" }
  # Body uses Serif; compact UI uses Sans.
  body: { fontSize: "18px" }
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(markdown.includes("# Display uses Serif at large sizes"));
  assert.ok(markdown.includes("# Body uses Serif; compact UI uses Sans."));
  assert.equal(report.totalStrips, 0);
});

test("keeps extraction_gap markers (canonical absence per no-fallbacks rule)", () => {
  const input = wrap(`elevation:
  overlay: null  # extraction_gap(shadow_tier_overlay — no intermediate cascade in source)
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(markdown.includes("extraction_gap(shadow_tier_overlay"));
  assert.equal(report.totalStrips, 0);
});

// ── STRIP tests: forbidden frontmatter keys MUST be removed ──────────────

test("strips fidelity_audit frontmatter block", () => {
  const input = wrap(`version: "2.2"
fidelity_audit:
  status: applied
  applied_at: "2026-05-11"
  sections_corrected: [shadows, motion]
colors:
  primary: "#141413"
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(!markdown.includes("fidelity_audit"));
  assert.ok(!markdown.includes("status: applied"));
  assert.ok(!markdown.includes("sections_corrected"));
  assert.ok(markdown.includes("colors:"));
  assert.ok(markdown.includes("primary"));
  assert.ok(report.forbiddenKeysStripped.includes("fidelity_audit"));
});

test("strips changelog/history/revisions frontmatter blocks", () => {
  const input = wrap(`colors:
  primary: "#141413"
changelog:
  - "2026-05-11: motion fixed"
history:
  - "first version"
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(!markdown.includes("changelog:"));
  assert.ok(!markdown.includes("history:"));
  assert.ok(markdown.includes("primary"));
  assert.ok(report.forbiddenKeysStripped.includes("changelog"));
  assert.ok(report.forbiddenKeysStripped.includes("history"));
});

test("strips extracted_at/extraction_run/source_files frontmatter", () => {
  const input = wrap(`extracted_at: "2026-05-11T14:30:00Z"
extraction_run:
  provider: claude-cli
  cost_usd: 5.08
source_files:
  - inputs/shadows.json
  - inputs/motion.json
colors:
  primary: "#141413"
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(!markdown.includes("extracted_at"));
  assert.ok(!markdown.includes("extraction_run"));
  assert.ok(!markdown.includes("source_files"));
  assert.ok(markdown.includes("primary"));
});

// ── STRIP tests: inline log comments ──────────────────────────────────────

test("strips inline # count=N comments", () => {
  const input = wrap(`shadows:
  raised: "0 1px 6px #0000001a"  # count=1
  floating: "0 2px 2px #00000003"  # count=8 · card-hover cascade
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(!markdown.includes("# count=1"));
  assert.ok(!markdown.includes("# count=8"));
  // value preserved
  assert.ok(markdown.includes("0 1px 6px #0000001a"));
  assert.ok(report.inlineCommentsStripped.some((s) => s.rule === "count-equals" || s.rule === "count-prefix"));
});

test("strips inline # matches X comments", () => {
  const input = wrap(`elevation:
  raised: "0 1px 6px rgba(0,0,0,0.10)"  # matches shadows.raised (#0000001a ≈ 0.10 alpha)
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(!markdown.includes("# matches shadows.raised"));
  assert.ok(markdown.includes("0 1px 6px rgba(0,0,0,0.10)"));
});

test("strips inline # was X / # renamed from Y changelog comments", () => {
  const input = wrap(`aliases:
  "--shadow-4": "--elevation-modal"      # was --elevation-overlay; overlay now extraction_gap
  "--duration-base": "--duration-fast"   # was --duration-normal (200ms, fallback)
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(!markdown.includes("# was --elevation-overlay"));
  assert.ok(!markdown.includes("# was --duration-normal"));
  assert.ok(markdown.includes('"--shadow-4": "--elevation-modal"'));
  assert.ok(markdown.includes('"--duration-base": "--duration-fast"'));
});

test("strips # Source: inputs/ provenance comments", () => {
  const input = wrap(`shadows:
  raised: "0 1px 6px #0000001a"  # Source: inputs/shadows.json
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(!markdown.includes("# Source: inputs/shadows.json"));
  assert.ok(markdown.includes("raised"));
});

// ── STRIP tests: whole-line audit blocks ─────────────────────────────────

test("strips audit log block headers and continuations", () => {
  const input = wrap(`shadows:
  raised: "0 1px 6px #0000001a"
  # Removed (no source evidence — were Tailwind-baseline fallbacks per .claude/rules/extraction-no-fallbacks.md):
  #   2xs, xs, sm, md, lg, xl, 2xl, inner
  #   See review-report.md F-FIDELITY for full audit.
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(!markdown.includes("Removed (no source evidence"));
  assert.ok(!markdown.includes("2xs, xs, sm"));
  assert.ok(!markdown.includes("See review-report.md"));
  assert.ok(markdown.includes("raised"));
  assert.ok(report.wholeLinesRemoved.length >= 1);
});

test("strips em-dash section-divider log banners", () => {
  const input = wrap(`shadows:
  # ── Extracted verbatim from anthropic.com CSS — source: inputs/shadows.json ──
  raised: "0 1px 6px #0000001a"
  # ── Brand-derived (aliased from extracted swatches) ──
  paper: "0 1px 0 rgba(20, 20, 19, 0.12)"
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(!markdown.includes("── Extracted verbatim"));
  assert.ok(!markdown.includes("── Brand-derived"));
  assert.ok(markdown.includes("raised"));
  assert.ok(markdown.includes("paper"));
});

// ── EDGE cases ────────────────────────────────────────────────────────────

test("preserves quoted hash characters inside string values", () => {
  const input = wrap(`colors:
  primary: "#141413"
  chart-pattern: "linear-gradient(#aaa, #bbb)"
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(markdown.includes('"#141413"'));
  assert.ok(markdown.includes("linear-gradient(#aaa, #bbb)"));
  assert.equal(report.totalStrips, 0);
});

test("never strips when match is in allow-override", () => {
  // even though "extracted verbatim" appears, `extraction_gap` override wins
  const input = wrap(`elevation:
  overlay: null  # extraction_gap(no_4stop_cascade_in_source)
`);
  const { markdown, report } = sanitizeDesignMd(input);
  assert.ok(markdown.includes("extraction_gap"));
  assert.equal(report.totalStrips, 0);
});

test("reports all strips with rule id and category", () => {
  const input = wrap(`fidelity_audit:
  status: applied
shadows:
  raised: "0 1px 6px #0000001a"  # count=1
`);
  const { report } = sanitizeDesignMd(input);
  assert.ok(report.forbiddenKeysStripped.includes("fidelity_audit"));
  assert.ok(report.inlineCommentsStripped.some((s) => s.category === "provenance-count"));
  assert.equal(typeof report.bytesIn, "number");
  assert.equal(typeof report.bytesOut, "number");
  assert.ok(report.bytesIn > report.bytesOut);
});

test("handles markdown with no frontmatter gracefully", () => {
  const input = "## Section\n\nNo frontmatter here.\n";
  const { markdown, report } = sanitizeDesignMd(input);
  assert.equal(report.warning, "no-frontmatter-detected");
  assert.ok(markdown.includes("## Section"));
});

test("idempotent: sanitizing twice yields same result", () => {
  const input = wrap(`fidelity_audit:
  status: applied
colors:
  primary: "#141413"  # slate-dark
shadows:
  raised: "0 1px 6px #0000001a"  # count=1
  # Removed (no source evidence):
  #   2xs
`);
  const pass1 = sanitizeDesignMd(input);
  const pass2 = sanitizeDesignMd(pass1.markdown);
  assert.equal(pass1.markdown, pass2.markdown);
  assert.equal(pass2.report.totalStrips, 0); // nothing left to strip
});
