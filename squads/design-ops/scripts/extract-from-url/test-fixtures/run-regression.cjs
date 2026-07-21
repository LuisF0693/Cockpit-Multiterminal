#!/usr/bin/env node
/**
 * Regression runner for ai-fingerprint-detector + dial-inference + copy-anti-slop bans.
 *
 * Origin: RT-FIX-7 (@architect C5, 2026-05-19) — commit smoke test fixtures as
 * regression suite so future drift is caught automatically.
 *
 * Usage:
 *   node test-fixtures/run-regression.cjs           # run all fixtures, print verdict
 *   node test-fixtures/run-regression.cjs --strict  # exit non-zero on any failure
 */

'use strict';

const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const FIXTURES_DIR = __dirname;

const { buildReport: fpReport } = require(path.join(REPO_ROOT, 'squads/design-ops/scripts/extract-from-url/lib/ai-fingerprint-detector.cjs'));
const yaml = require(path.join(REPO_ROOT, 'node_modules/js-yaml'));

const strict = process.argv.includes('--strict');
let failures = 0;

function runFingerprintFixture(filepath) {
  const fixture = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  const report = fpReport(fixture.inputs);
  const expected = fixture.expected_outcome;
  const result = {
    fixture_id: fixture.fixture_id,
    actual_score: report.ai_slop_score,
    actual_recommendation: report.recommendation,
    score_in_range: report.ai_slop_score >= expected.ai_slop_score_min && report.ai_slop_score <= expected.ai_slop_score_max,
    recommendation_match: report.recommendation === expected.recommendation,
    must_detect_satisfied: (expected.must_detect || []).every(ban =>
      report.detected_fingerprints.some(f => f.ban_id === ban || f.detector === ban)
    ),
    must_not_detect_satisfied: (expected.must_not_detect || []).every(ban =>
      !report.detected_fingerprints.some(f => f.ban_id === ban || f.detector === ban)
    ),
  };
  result.pass = result.score_in_range && result.recommendation_match &&
                result.must_detect_satisfied && result.must_not_detect_satisfied;
  return result;
}

function runCopyFixture(filepath) {
  const text = fs.readFileSync(filepath, 'utf-8');
  const bansFile = path.join(REPO_ROOT, 'squads/copy/data/copy-anti-slop-bans.yaml');
  const bans = yaml.load(fs.readFileSync(bansFile, 'utf-8'));

  const SEVERITY_WEIGHT = { P0: 15, P1: 8, P2: 3 };
  let score = 0;
  const hits = {};

  const groups = ['filler_words_ban', 'generic_names_ban', 'startup_slop_names_ban', 'em_dash_ban', 'lorem_ipsum_ban'];
  for (const group of groups) {
    const def = bans[group];
    if (!def || !def.detection_regex) continue;
    let sev = def.severity;
    if (typeof sev === 'object' && sev.default) sev = sev.default;
    if (def.severity_by_language && def.severity_by_language.default) sev = def.severity_by_language.default;
    try {
      const re = new RegExp(def.detection_regex, 'gi');
      const matches = [...text.matchAll(re)].map(m => m[0]);
      if (matches.length > 0) {
        hits[group] = matches;
        for (const m of matches) {
          score += SEVERITY_WEIGHT[sev] || 8;
        }
      }
    } catch {}
  }

  const fn = bans.fake_numbers_ban;
  if (fn) {
    for (const key of ['detection_regex_percentages', 'detection_regex_phone', 'detection_regex_money']) {
      if (!fn[key]) continue;
      try {
        const re = new RegExp(fn[key], 'gi');
        const matches = [...text.matchAll(re)].map(m => m[0]);
        if (matches.length > 0) {
          hits[`fake_numbers_${key}`] = matches;
          for (const m of matches) {
            score += SEVERITY_WEIGHT[fn.severity] || 15;
          }
        }
      } catch {}
    }
  }

  score = Math.min(100, score);
  const status = score >= 81 ? 'hard-block' : score >= 61 ? 'block' : score >= 41 ? 'review' : score >= 21 ? 'warn' : 'pass';

  return {
    fixture_id: 'synthetic-copy-ai-deliverable',
    actual_score: score,
    actual_status: status,
    total_hits: Object.values(hits).reduce((a, h) => a + h.length, 0),
    hit_categories: Object.keys(hits),
    pass: score >= 80 && status === 'hard-block',
  };
}

console.log('═══ AI Fingerprint Detector Regression ═══');
console.log('');

for (const file of ['synthetic-ai-slop-site.json', 'synthetic-clean-brand-site.json']) {
  const fp = path.join(FIXTURES_DIR, file);
  if (!fs.existsSync(fp)) continue;
  const r = runFingerprintFixture(fp);
  const verdict = r.pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${verdict}  ${r.fixture_id}`);
  console.log(`        score=${r.actual_score} | recommendation=${r.actual_recommendation}`);
  console.log(`        score_in_range=${r.score_in_range} | recommendation_match=${r.recommendation_match}`);
  console.log(`        must_detect=${r.must_detect_satisfied} | must_not_detect=${r.must_not_detect_satisfied}`);
  console.log('');
  if (!r.pass) failures++;
}

console.log('═══ Copy Anti-Slop Regression ═══');
console.log('');
const copyFp = path.join(FIXTURES_DIR, 'synthetic-copy-ai-deliverable.md');
if (fs.existsSync(copyFp)) {
  const r = runCopyFixture(copyFp);
  const verdict = r.pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${verdict}  ${r.fixture_id}`);
  console.log(`        score=${r.actual_score} | status=${r.actual_status} | hits=${r.total_hits}`);
  console.log(`        categories=[${r.hit_categories.join(', ')}]`);
  console.log('');
  if (!r.pass) failures++;
}

console.log(`═══ Summary: ${failures === 0 ? '✓ ALL PASS' : '✗ ' + failures + ' FAILURE(S)'} ═══`);

if (strict && failures > 0) process.exit(1);
process.exit(0);
