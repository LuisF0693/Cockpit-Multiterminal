"use strict";

// design-md-hygiene.cjs — strip log/audit/provenance noise from a DESIGN.md
// before writing it to disk.
//
// Canonical rule: squads/design-ops/rules/design-md-convention.md
//                 § "Comment & Provenance Hygiene (NON-NEGOTIABLE)"
//
// DESIGN.md is a consumer contract for LLM code generation. It is NOT a
// changelog and NOT an extraction audit log. Comments that change what the
// AI does (semantic role, usage rule, disambiguation, anti-pattern guard)
// stay. Comments that narrate provenance, frequency, or version history
// move to dedicated sidecars (extraction-log.yaml, telemetry.json,
// selector-provenance.json, review-report.md, git commit message).
//
// Design principle: conservative. When ambiguous, KEEP. The cost of one
// noise line slipping through is a few wasted tokens. The cost of stripping
// a semantic prompt is silently degrading downstream code generation.
//
// Every strip is reported in `sanitizeDesignMd()` return value so the
// caller can emit a hygiene-report.json sidecar and the user can audit.

// ── Frontmatter root keys that MUST NOT appear ─────────────────────────
// Each key has a canonical home outside DESIGN.md.
const FORBIDDEN_FRONTMATTER_KEYS = [
  // log/audit metadata
  "fidelity_audit",
  "changelog",
  "history",
  "revisions",
  "extracted_at",
  "extraction_run",
  "removed_fallbacks",
  "added_extracted",
  "extraction_gaps",
  "provenance",
  "source_files",
  // CI/pipeline metadata
  "sanitizer_report",
  "hygiene_report",
];

// ── Inline-comment patterns to strip ─────────────────────────────────────
// Each entry is { test, category, exampleStripped }.
// `test` is a RegExp applied to the comment text AFTER the leading `#` and
// whitespace are removed. Match → the entire `# comment` segment is dropped
// from the line (the YAML value before it is preserved).
const INLINE_COMMENT_DENY = [
  {
    id: "count-equals",
    test: /^count\s*[=:]\s*\d+/i,
    category: "provenance-count",
  },
  {
    id: "count-prefix",
    test: /^count\s*=\s*\d+\s*[·•|,;]/i,
    category: "provenance-count",
  },
  {
    id: "matches-ref",
    test: /^matches\s+\S+/i,
    category: "cross-artifact-ref",
  },
  {
    id: "was-token-ref",
    test: /^was\s+--[a-z]/i,
    category: "changelog",
  },
  {
    id: "was-renamed",
    test: /^(was renamed|renamed from)\b/i,
    category: "changelog",
  },
  {
    id: "removed-prefix",
    test: /^removed\s*\(/i,
    category: "audit-log",
  },
  {
    id: "see-review",
    test: /^see\s+(\.\.\/)?review[-_]report/i,
    category: "cross-doc-ref",
  },
  {
    id: "see-audit",
    test: /^see\s+(\.\.\/)?review-report\.md\s+[A-Z]-/i,
    category: "cross-doc-ref",
  },
  {
    id: "source-inputs",
    test: /^source\s*:\s*inputs\//i,
    category: "provenance",
  },
  {
    id: "source-backed",
    test: /^source[-_]backed\b/i,
    category: "provenance",
  },
  {
    id: "extracted-verbatim",
    test: /^extracted\s+verbatim\b/i,
    category: "pipeline-meta",
  },
  {
    id: "brand-derived",
    test: /^brand[-\s]derived\s*\(/i,
    category: "pipeline-meta",
  },
];

// ── Whole-line patterns (lines that are JUST a `#` comment) ──────────────
// Stripped if matched (entire line removed, including its newline).
const WHOLE_LINE_DENY = [
  // em-dash bracketed section dividers used by hygiene-violating editors
  {
    id: "em-dash-divider",
    test: /^\s*#\s*[─━]+\s+(extracted|source|brand[-\s]derived|removed)\b/i,
    category: "section-divider-log",
  },
  // "# Removed (no source evidence — were Tailwind…)"
  {
    id: "removed-block-header",
    test: /^\s*#\s*removed\s*\([^)]*(no\s+source\s+evidence|fallback|tailwind|material)/i,
    category: "audit-log-block",
  },
  // continuation lines under "# Removed" — typically "#   token1, token2, ..."
  {
    id: "removed-continuation",
    test: /^\s*#\s+(2xs|xs|sm|md|lg|xl|2xl|inner|duration-(?:ultra-fast|faster|fast|normal|gentle|slow|slower|ultra-slow)|ease-(?:linear|in|out|in-out|accelerate-mid|decelerate-mid|easy-ease))\b/i,
    category: "audit-log-continuation",
    // only stripped when preceded by a removed-block-header within 5 lines
    requires_recent_removed_header: true,
  },
  // "# See review-report.md F-FIDELITY for full audit."
  {
    id: "see-review-line",
    test: /^\s*#\s+see\s+(\.\.\/)?review[-_]report/i,
    category: "cross-doc-ref",
  },
  // "# Extracted verbatim from anthropic.com CSS — source: inputs/shadows.json"
  {
    id: "verbatim-banner",
    test: /^\s*#\s*extracted\s+verbatim\s+from\b/i,
    category: "pipeline-meta-banner",
  },
];

// ── Allow-list overrides ─────────────────────────────────────────────────
// Patterns that look superficially like deny matches but are CANONICAL
// markers per other rules (e.g. extraction-no-fallbacks). NEVER strip.
const ALLOW_OVERRIDES = [
  // `null  # extraction_gap(...)` is the canonical absence marker
  /extraction_gap\s*\(/i,
];

function isAllowed(commentText) {
  return ALLOW_OVERRIDES.some((re) => re.test(commentText));
}

// Returns `{ commentText, leadHash }` if the line carries an inline comment
// after a YAML value; else null.
function splitInlineComment(line) {
  // Strip simple inline comment AFTER a `"..."` value or token.
  // We only consider comments preceded by at least one whitespace and not
  // inside quoted strings. YAML values in DESIGN.md are predictable: either
  // bare scalars or "..." quoted strings.
  const re = /^(.*?)(\s+#\s?)(.*)$/;
  let inQuote = false;
  let quoteChar = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === quoteChar && line[i - 1] !== "\\") inQuote = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      continue;
    }
    if (ch === "#" && i > 0 && /\s/.test(line[i - 1])) {
      // found inline comment start
      return {
        before: line.slice(0, i).replace(/\s+$/, ""),
        commentText: line.slice(i + 1).replace(/^\s+/, ""),
      };
    }
  }
  return null;
}

function sanitizeFrontmatter(fmText, report) {
  const lines = fmText.split("\n");
  const out = [];
  let skipBlockKey = null; // top-level key whose nested block we're skipping
  let blockIndent = -1;
  let recentRemovedHeaderAt = -10;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 0. Continue skipping forbidden block
    if (skipBlockKey != null) {
      const indent = line.match(/^(\s*)/)[1].length;
      const isEmpty = line.trim() === "";
      if (indent > blockIndent || (isEmpty && i + 1 < lines.length && lines[i + 1].match(/^(\s*)/)[1].length > blockIndent)) {
        report.frontmatterLinesRemoved.push({ key: skipBlockKey, line });
        continue;
      }
      skipBlockKey = null;
      blockIndent = -1;
    }

    // 1. Forbidden top-level key
    const rootKeyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/);
    if (rootKeyMatch && line.match(/^(\s*)/)[1].length === 0) {
      const key = rootKeyMatch[1];
      if (FORBIDDEN_FRONTMATTER_KEYS.includes(key)) {
        skipBlockKey = key;
        blockIndent = 0;
        report.forbiddenKeysStripped.push(key);
        report.frontmatterLinesRemoved.push({ key, line });
        continue;
      }
    }

    // 2. Whole-line deny (audit-log blocks, em-dash banners) in frontmatter
    let wholeLineStripped = false;
    for (const rule of WHOLE_LINE_DENY) {
      if (rule.requires_recent_removed_header && i - recentRemovedHeaderAt > 5) {
        continue;
      }
      if (rule.test.test(line)) {
        const commentText = line.replace(/^\s*#\s?/, "");
        if (isAllowed(commentText)) continue;
        report.wholeLinesRemoved.push({ rule: rule.id, category: rule.category, line });
        if (rule.id === "removed-block-header") recentRemovedHeaderAt = i;
        wholeLineStripped = true;
        break;
      }
    }
    if (wholeLineStripped) continue;

    // 3. Inline comment deny in frontmatter
    const split = splitInlineComment(line);
    if (split && !isAllowed(split.commentText)) {
      for (const rule of INLINE_COMMENT_DENY) {
        if (rule.test.test(split.commentText)) {
          report.inlineCommentsStripped.push({
            rule: rule.id,
            category: rule.category,
            before: split.before,
            commentText: split.commentText,
            location: "frontmatter",
          });
          out.push(split.before);
          wholeLineStripped = true;
          break;
        }
      }
      if (wholeLineStripped) continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

function sanitizeBody(text, report) {
  const lines = text.split("\n");
  const out = [];
  let recentRemovedHeaderAt = -10;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Whole-line deny patterns
    let wholeLineStripped = false;
    for (const rule of WHOLE_LINE_DENY) {
      if (rule.requires_recent_removed_header && i - recentRemovedHeaderAt > 5) {
        continue;
      }
      if (rule.test.test(line)) {
        // Verify not in allow-list
        const commentText = line.replace(/^\s*#\s?/, "");
        if (isAllowed(commentText)) continue;
        report.wholeLinesRemoved.push({ rule: rule.id, category: rule.category, line });
        if (rule.id === "removed-block-header") {
          recentRemovedHeaderAt = i;
        }
        wholeLineStripped = true;
        break;
      }
    }
    if (wholeLineStripped) continue;

    // 2. Inline comment deny patterns
    const split = splitInlineComment(line);
    if (split && !isAllowed(split.commentText)) {
      for (const rule of INLINE_COMMENT_DENY) {
        if (rule.test.test(split.commentText)) {
          report.inlineCommentsStripped.push({
            rule: rule.id,
            category: rule.category,
            before: split.before,
            commentText: split.commentText,
          });
          out.push(split.before);
          wholeLineStripped = true; // reuse flag to mean "handled"
          break;
        }
      }
      if (wholeLineStripped) continue;
    }

    out.push(line);
  }

  // Collapse runs of 3+ blank lines (created by stripping) into 2
  let collapsed = out.join("\n").replace(/\n{3,}/g, "\n\n");
  return collapsed;
}

/**
 * Sanitize a DESIGN.md string. Returns the cleaned markdown + a report
 * describing every modification (for hygiene-report.json).
 *
 * Conservative-by-design: when in doubt, leave content alone. Reports
 * everything stripped so the caller can audit.
 */
function sanitizeDesignMd(md) {
  const report = {
    schema_version: "1.0",
    sanitized_at: new Date().toISOString(),
    forbiddenKeysStripped: [],
    frontmatterLinesRemoved: [],
    wholeLinesRemoved: [],
    inlineCommentsStripped: [],
    bytesIn: Buffer.byteLength(md, "utf8"),
    bytesOut: 0,
    linesIn: md.split("\n").length,
    linesOut: 0,
  };

  // Split frontmatter / body
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    report.warning = "no-frontmatter-detected";
    const cleaned = sanitizeBody(md, report);
    report.bytesOut = Buffer.byteLength(cleaned, "utf8");
    report.linesOut = cleaned.split("\n").length;
    report.bytesDelta = report.bytesIn - report.bytesOut;
    report.linesDelta = report.linesIn - report.linesOut;
    report.totalStrips =
      report.forbiddenKeysStripped.length +
      report.wholeLinesRemoved.length +
      report.inlineCommentsStripped.length;
    return { markdown: cleaned, report };
  }

  const fmText = fmMatch[1];
  const body = fmMatch[2];

  const cleanedFm = sanitizeFrontmatter(fmText, report);
  const cleanedBody = sanitizeBody(body, report);

  // Reassemble. Always emit exactly one blank line after closing `---`.
  const out = `---\n${cleanedFm}\n---\n${cleanedBody.replace(/^\n+/, "")}`;

  report.bytesOut = Buffer.byteLength(out, "utf8");
  report.linesOut = out.split("\n").length;
  report.bytesDelta = report.bytesIn - report.bytesOut;
  report.linesDelta = report.linesIn - report.linesOut;
  report.totalStrips =
    report.forbiddenKeysStripped.length +
    report.wholeLinesRemoved.length +
    report.inlineCommentsStripped.length;

  return { markdown: out, report };
}

module.exports = {
  sanitizeDesignMd,
  splitInlineComment,
  FORBIDDEN_FRONTMATTER_KEYS,
  INLINE_COMMENT_DENY,
  WHOLE_LINE_DENY,
  ALLOW_OVERRIDES,
};
