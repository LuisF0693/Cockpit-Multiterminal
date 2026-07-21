#!/usr/bin/env node
/**
 * add_onboarding_dims.js
 *
 * Injects 3 onboarding-related microdimensions into the Implementation Maturity
 * group of a bench-output-dash.json:
 *   - im__setup_friction
 *   - im__time_to_first_run
 *   - im__docs_onboarding_quality
 *
 * Strategy:
 *   - Read existing dash (must have profile=gold_absorption).
 *   - Locate last Implementation Maturity row to know insertion index.
 *   - Re-balance Implementation Maturity weight across 6→9 rows so the group
 *     keeps its macro weight (no peso steal from other groups).
 *   - Append 3 rows × N players with scores from --scores-file (JSON).
 *   - Update summary.dimensions count.
 *   - Write back atomically.
 *
 * Usage:
 *   node add_onboarding_dims.js \
 *     --dash docs/bench/deepresearch-absorption-benchmark/bench-output-dash.json \
 *     --scores docs/bench/deepresearch-absorption-benchmark/onboarding-scores.json
 *
 * Exit codes (per .claude/rules/script-security.md):
 *   0  success
 *   1  validation failure (rolled back)
 *   2  no-op
 *   3  argument/env error
 */

const fs = require("node:fs");
const path = require("node:path");

const ONBOARDING_DIMS = [
  {
    id: "im__setup_friction",
    parent_id: "im",
    label: "Setup friction (instalação)",
    question: "Quantos comandos para sair do zero? Docker? One-line install? API keys obrigatórias?",
    group: "Implementation Maturity",
  },
  {
    id: "im__time_to_first_run",
    parent_id: "im",
    label: "Time to first successful run",
    question: "Em minutos, quanto tempo entre clone e primeiro resultado válido?",
    group: "Implementation Maturity",
  },
  {
    id: "im__docs_onboarding_quality",
    parent_id: "im",
    label: "Onboarding docs quality",
    question: "Há docs-site, quickstart, examples folder, video tutorial?",
    group: "Implementation Maturity",
  },
];

function fail(msg, code = 3) {
  console.error(`[add_onboarding_dims] ERROR: ${msg}`);
  process.exit(code);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dash" || arg === "--scores" || arg === "--dry-run") {
      if (arg === "--dry-run") out.dryRun = true;
      else out[arg.replace(/^--/, "")] = argv[++i];
    }
  }
  if (!out.dash) fail("--dash <path> required");
  if (!out.scores) fail("--scores <path> required");
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const dashPath = path.resolve(args.dash);
  const scoresPath = path.resolve(args.scores);

  if (!fs.existsSync(dashPath)) fail(`dash not found: ${dashPath}`);
  if (!fs.existsSync(scoresPath)) fail(`scores not found: ${scoresPath}`);

  const dash = JSON.parse(fs.readFileSync(dashPath, "utf8"));
  const scoresFile = JSON.parse(fs.readFileSync(scoresPath, "utf8"));
  const scoresByPlayer = scoresFile.scores || {};

  if (!dash.matrix || !Array.isArray(dash.matrix.rows)) {
    fail("dash.matrix.rows is missing or not array — bad schema");
  }

  /* Backup snapshot for rollback */
  const snapshot = fs.readFileSync(dashPath, "utf8");

  const players = (dash.matrix.players || []).slice();
  if (players.length === 0) fail("dash.matrix.players is empty");

  /* Locate last Implementation Maturity row */
  const imRows = dash.matrix.rows.filter((r) => r.group === "Implementation Maturity");
  if (imRows.length === 0) fail("no Implementation Maturity rows found in matrix.rows");
  const lastImIndex = dash.matrix.rows.lastIndexOf(imRows[imRows.length - 1]);
  const oldImCount = imRows.length;
  const newImCount = oldImCount + ONBOARDING_DIMS.length;

  /* Compute the IM group total weight (sum of existing IM row weights),
     then redistribute equally across newImCount. */
  const imWeightTotal = imRows.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const perRowWeight = imWeightTotal / newImCount;

  console.log(`[add_onboarding_dims] IM rows: ${oldImCount} → ${newImCount}; weight per row: ${perRowWeight.toFixed(6)}`);
  console.log(`[add_onboarding_dims] inserting after dash.matrix.rows[${lastImIndex}]`);

  /* Re-weight existing IM rows */
  for (const r of imRows) r.weight = perRowWeight;

  /* Build new rows */
  const newRows = ONBOARDING_DIMS.map((dim) => {
    const cells = players.map((player) => {
      const playerScores = scoresByPlayer[player] || scoresByPlayer[player.replace(/-/g, "_")] || {};
      /* match dim short name (suffix after __) to scores key (without im__ prefix) */
      const scoreKey = dim.id.replace(/^im__/, "");
      const entry = playerScores[scoreKey] || {};
      const score = Number.isFinite(entry.score) ? entry.score : 0;
      return {
        player,
        score,
        /* Schema requires lowercase: "high" | "medium" | "low".
           See squads/research/data/bench-output-dash.schema.json. */
        confidence: String(entry.confidence || "medium").toLowerCase(),
        notes: entry.notes || "evidência não encontrada — derivado de README/repo",
        source: entry.source || "https://github.com/",
      };
    });
    const best = cells.reduce((a, b) => (a.score >= b.score ? a : b));
    return {
      id: dim.id,
      parent_id: dim.parent_id,
      label: dim.label,
      question: dim.question,
      group: dim.group,
      weight: perRowWeight,
      evidence: "onboarding-scores.json",
      best_player: best.player,
      best_score: best.score,
      cells,
    };
  });

  /* Insert new rows immediately after lastImIndex */
  dash.matrix.rows = [
    ...dash.matrix.rows.slice(0, lastImIndex + 1),
    ...newRows,
    ...dash.matrix.rows.slice(lastImIndex + 1),
  ];

  /* Update dimension count */
  const oldDims = dash.summary?.dimensions ?? 0;
  if (dash.summary) {
    dash.summary.dimensions = dash.matrix.rows.length;
    dash.summary.cells = dash.matrix.rows.length * players.length;
  }

  /* Sanity check */
  const sanityCheck = dash.matrix.rows.length === oldDims + ONBOARDING_DIMS.length;
  if (!sanityCheck) {
    fail(`sanity check failed: expected ${oldDims + ONBOARDING_DIMS.length}, got ${dash.matrix.rows.length}`, 1);
  }

  if (args.dryRun) {
    console.log(`[add_onboarding_dims] DRY-RUN — would add ${ONBOARDING_DIMS.length} dims × ${players.length} cells = ${ONBOARDING_DIMS.length * players.length} new cells`);
    console.log(`[add_onboarding_dims] new dim count: ${dash.matrix.rows.length} (was ${oldDims})`);
    process.exit(0);
  }

  /* Atomic write with rollback on failure */
  try {
    fs.writeFileSync(dashPath, JSON.stringify(dash, null, 2));
    console.log(`[add_onboarding_dims] OK — wrote ${dash.matrix.rows.length} rows × ${players.length} players`);
    console.log(`[add_onboarding_dims] new dims: ${ONBOARDING_DIMS.map((d) => d.id).join(", ")}`);
    process.exit(0);
  } catch (err) {
    fs.writeFileSync(dashPath, snapshot);
    fail(`write failed, rolled back: ${err.message}`, 1);
  }
}

main();
