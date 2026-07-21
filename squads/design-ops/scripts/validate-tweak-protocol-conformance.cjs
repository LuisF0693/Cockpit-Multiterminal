#!/usr/bin/env node
/**
 * validate-tweak-protocol-conformance.cjs
 *
 * Validates that an HTML artifact conforms to tweak-protocol-spec.yaml v1.0.0.
 * Invoked by Phase 07 VERIFY (`artifact-verify-postbuild.md`) when the artifact
 * has `tweak_protocol.instrumented: true` in its asset-manifest.
 *
 * Exit codes:
 *   0 — PASS (no violations)
 *   1 — FAIL (violations found, details on stdout/stderr)
 *   2 — N/A (file has no TWEAK_DEFAULS block; caller should skip this dimension)
 *   3 — argument/environment error
 *
 * Usage:
 *   node validate-tweak-protocol-conformance.cjs --target path/to/index.html
 *   node validate-tweak-protocol-conformance.cjs --target path/to/index.html --format json
 */

const fs = require('fs');
const path = require('path');

const PROTOCOL_VERSION = '1.0.0';
const CANONICAL_EVENT_TYPES = new Set([
  '__edit_mode_available',
  '__edit_mode_set_keys',
  '__activate_edit_mode',
  '__deactivate_edit_mode',
]);
const EDITMODE_BEGIN = '/*EDITMODE-BEGIN*/';
const EDITMODE_END = '/*EDITMODE-END*/';

function parseArgs(argv) {
  const args = { target: null, format: 'text' };
  for (const raw of argv) {
    if (raw.startsWith('--target=')) args.target = raw.slice('--target='.length).trim();
    else if (raw === '--target') args.__next = 'target';
    else if (raw.startsWith('--format=')) args.format = raw.slice('--format='.length).trim();
    else if (args.__next === 'target') { args.target = raw.trim(); delete args.__next; }
  }
  return args;
}

function fail(code, message) {
  process.stderr.write(`[validate-tweak-protocol-conformance] ${message}\n`);
  process.exit(code);
}

function readTarget(targetPath) {
  if (!targetPath) fail(3, 'missing required flag: --target <path-to-html>');
  const abs = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
  if (!fs.existsSync(abs)) fail(3, `target not found: ${abs}`);
  const stat = fs.statSync(abs);
  if (!stat.isFile()) fail(3, `target is not a file: ${abs}`);
  return { abs, content: fs.readFileSync(abs, 'utf8') };
}

function findEditmodeBlocks(content) {
  const blocks = [];
  let cursor = 0;
  while (cursor < content.length) {
    const begin = content.indexOf(EDITMODE_BEGIN, cursor);
    if (begin === -1) break;
    const end = content.indexOf(EDITMODE_END, begin + EDITMODE_BEGIN.length);
    if (end === -1) {
      blocks.push({ start: begin, end: -1, jsonText: null });
      break;
    }
    const jsonText = content.slice(begin + EDITMODE_BEGIN.length, end);
    blocks.push({ start: begin, end: end + EDITMODE_END.length, jsonText });
    cursor = end + EDITMODE_END.length;
  }
  return blocks;
}

function lineOf(content, offset) {
  if (offset < 0) return null;
  return content.slice(0, offset).split(/\r?\n/).length;
}

function checkListenerBeforeAnnouncement(content) {
  const listenerIdx = content.search(/window\.addEventListener\s*\(\s*['"]message['"]/);
  const announceIdx = content.search(
    /window\.parent\.postMessage\s*\(\s*\{\s*type\s*:\s*['"]__edit_mode_available['"]/,
  );
  return { listenerIdx, announceIdx };
}

function findInventedEventTypes(content) {
  const invented = new Set();
  const re = /['"`](__edit_mode_[A-Za-z0-9_]+|__activate_edit_mode|__deactivate_edit_mode)['"`]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const type = m[1];
    if (!CANONICAL_EVENT_TYPES.has(type)) invented.add(type);
  }
  return Array.from(invented);
}

function validate(targetPath) {
  const { abs, content } = readTarget(targetPath);
  const violations = [];

  const blocks = findEditmodeBlocks(content);
  if (blocks.length === 0) {
    return { abs, skipped: true, reason: 'no TWEAK_DEFAULS block present' };
  }

  if (blocks.length > 1) {
    violations.push({
      severity: 'BLOCKER',
      rule: 'exactly-one-tweak-defauls-block',
      message: `Found ${blocks.length} EDITMODE blocks; exactly one is required per tweak-protocol-spec#tweak_defauls_block.`,
      offsets: blocks.map((b) => lineOf(content, b.start)),
    });
  }

  const firstBlock = blocks[0];
  if (firstBlock.end === -1) {
    violations.push({
      severity: 'BLOCKER',
      rule: 'unterminated-editmode-block',
      message: 'EDITMODE-BEGIN without matching EDITMODE-END.',
      line: lineOf(content, firstBlock.start),
    });
  } else {
    try {
      const parsed = JSON.parse(firstBlock.jsonText);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        violations.push({
          severity: 'BLOCKER',
          rule: 'tweak-defauls-must-be-object',
          message: 'TWEAK_DEFAULS must be a JSON object, not a primitive or array.',
          line: lineOf(content, firstBlock.start),
        });
      }
    } catch (err) {
      violations.push({
        severity: 'BLOCKER',
        rule: 'strict-json-between-markers',
        message: `JSON.parse failed: ${err.message}`,
        line: lineOf(content, firstBlock.start),
      });
    }
  }

  const { listenerIdx, announceIdx } = checkListenerBeforeAnnouncement(content);
  if (announceIdx !== -1 && listenerIdx === -1) {
    violations.push({
      severity: 'BLOCKER',
      rule: 'missing-message-listener',
      message:
        '__edit_mode_available is posted but no window.addEventListener("message", ...) was found.',
      line: lineOf(content, announceIdx),
    });
  } else if (announceIdx !== -1 && listenerIdx > announceIdx) {
    violations.push({
      severity: 'BLOCKER',
      rule: 'listener-before-announcement',
      message:
        'Message listener is registered AFTER __edit_mode_available is posted. Ordering is canonical; see tweak-protocol-spec#event_sequence#ordering_rule.',
      listener_line: lineOf(content, listenerIdx),
      announce_line: lineOf(content, announceIdx),
    });
  }

  const invented = findInventedEventTypes(content);
  if (invented.length > 0) {
    violations.push({
      severity: 'BLOCKER',
      rule: 'canonical-event-types-only',
      message: `Found non-canonical event type(s): ${invented.join(', ')}. Allowed set: ${Array.from(
        CANONICAL_EVENT_TYPES,
      ).join(', ')}.`,
    });
  }

  return { abs, skipped: false, protocolVersion: PROTOCOL_VERSION, violations };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = validate(args.target);

  if (result.skipped) {
    if (args.format === 'json') {
      process.stdout.write(`${JSON.stringify({ status: 'N/A', target: result.abs, reason: result.reason })}\n`);
    } else {
      process.stdout.write(`N/A — ${result.reason} (${result.abs})\n`);
    }
    process.exit(2);
  }

  const verdict = result.violations.length === 0 ? 'PASS' : 'FAIL';

  if (args.format === 'json') {
    process.stdout.write(
      `${JSON.stringify(
        {
          status: verdict,
          target: result.abs,
          protocol_version: result.protocolVersion,
          violation_count: result.violations.length,
          violations: result.violations,
        },
        null,
        2,
      )}\n`,
    );
  } else {
    process.stdout.write(`Tweak Protocol Conformance — ${verdict}\n`);
    process.stdout.write(`Target: ${result.abs}\n`);
    process.stdout.write(`Protocol: v${result.protocolVersion}\n`);
    if (result.violations.length === 0) {
      process.stdout.write('No violations.\n');
    } else {
      process.stdout.write(`${result.violations.length} violation(s):\n`);
      for (const v of result.violations) {
        process.stdout.write(`  [${v.severity}] ${v.rule}: ${v.message}\n`);
      }
    }
  }

  process.exit(verdict === 'PASS' ? 0 : 1);
}

if (require.main === module) main();

module.exports = { validate, findEditmodeBlocks, checkListenerBeforeAnnouncement, findInventedEventTypes };
