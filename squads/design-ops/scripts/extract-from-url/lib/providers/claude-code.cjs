"use strict";

/**
 * claude-code — auto-detecting Claude Code provider.
 *
 * Two execution modes, chosen automatically:
 *
 *  1. INLINE (nested session detected): emit a sentinel file with the prompt
 *     and the path where DESIGN.md is expected. The host Claude Code session
 *     (the human-driven one this pipeline was launched from) reads the
 *     sentinel and writes DESIGN.md directly. No spawn, no extra cost,
 *     shared context.
 *
 *  2. SPAWN (no active session, claude binary present): delegate to the
 *     legacy claude-cli provider that headless-invokes `claude -p`.
 *
 * If neither path is viable (no session AND no binary), return status 6 with
 * an actionable error and let llm.cjs surface it the same way it does for
 * missing API keys.
 *
 * The sentinel contract is intentionally small and stable:
 *
 *   inputs/.inline-llm-request.json   ← written by THIS provider
 *     { prompt_file, design_md_path, run_dir, source, project, version }
 *
 *   {design_md_path}                  ← written by the HOST Claude session
 *     (a normal DESIGN.md file with frontmatter + sections)
 *
 *   inputs/.inline-llm-response.json  ← optional, written by the host to
 *     close the loop with telemetry (model, tokens, duration, notes)
 *
 * The pipeline treats INLINE as a graceful pause: it writes the sentinel,
 * prints clear instructions to stdout, and exits with status 0 so the
 * caller can resume after DESIGN.md is materialised.
 */

const fs = require("fs");
const path = require("path");
const claudeCli = require("./claude-cli.cjs");

const SENTINEL_FILE = ".inline-llm-request.json";
const SENTINEL_VERSION = 1;

function isNestedClaudeCodeSession(env = process.env) {
  return claudeCli.isNestedClaudeCodeSession(env);
}

function claudeBinaryAvailable() {
  try {
    const { spawnSync } = require("child_process");
    const probe = spawnSync("claude", ["--version"], { encoding: "utf8", timeout: 3000 });
    return probe.status === 0;
  } catch {
    return false;
  }
}

function pickMode(options = {}, env = process.env) {
  if (options.forceMode === "inline") return "inline";
  if (options.forceMode === "spawn") return "spawn";
  if (env.DESIGN_MD_CLAUDE_CODE_MODE === "inline") return "inline";
  if (env.DESIGN_MD_CLAUDE_CODE_MODE === "spawn") return "spawn";
  if (isNestedClaudeCodeSession(env)) return "inline";
  if (claudeBinaryAvailable()) return "spawn";
  return "none";
}

function writeSentinel(promptText, options) {
  const { designMdPath } = options;
  if (!designMdPath) {
    throw new Error("claude-code/inline: designMdPath is required to write sentinel.");
  }
  // The runDir is always the directory containing DESIGN.md (the per-run
  // scratch folder), not the caller's cwd. The cwd in llmOptions is repoRoot,
  // which is wrong for sentinel placement.
  const runDir = path.dirname(designMdPath);
  const inputsDir = path.join(runDir, "inputs");
  if (!fs.existsSync(inputsDir)) {
    fs.mkdirSync(inputsDir, { recursive: true });
  }
  const promptFile = path.join(inputsDir, "prompt.txt");
  fs.writeFileSync(promptFile, promptText, "utf8");
  const sentinel = {
    version: SENTINEL_VERSION,
    created_at: new Date().toISOString(),
    prompt_file: path.relative(runDir, promptFile),
    design_md_path: path.relative(runDir, designMdPath),
    run_dir: runDir,
    source: options.source || null,
    project: options.project || null,
    model: options.model || "claude-opus-4-7",
    sidecar_dir: "inputs",
    instructions: [
      "Inline Claude Code provider — host session must materialise DESIGN.md.",
      `Read prompt: ${path.relative(runDir, promptFile)}`,
      `Read sidecars: ${path.relative(runDir, inputsDir)}/`,
      `Write output:  ${path.relative(runDir, designMdPath)}`,
      "When done, the pipeline can be resumed by re-running with --resume.",
    ],
  };
  const sentinelPath = path.join(inputsDir, SENTINEL_FILE);
  fs.writeFileSync(sentinelPath, JSON.stringify(sentinel, null, 2), "utf8");
  return { sentinelPath, promptFile, runDir };
}

function readSentinel(runDir) {
  const sentinelPath = path.join(runDir, "inputs", SENTINEL_FILE);
  if (!fs.existsSync(sentinelPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(sentinelPath, "utf8"));
  } catch {
    return null;
  }
}

function invoke(promptText, options = {}) {
  const mode = pickMode(options, process.env);

  if (mode === "inline") {
    const { sentinelPath, promptFile, runDir } = writeSentinel(promptText, options);
    const designMdAbs = path.resolve(runDir, path.relative(runDir, options.designMdPath || ""));
    const lines = [
      "",
      "═══════════════════════════════════════════════════════════════════════",
      "  /design-md — INLINE Claude Code mode",
      "═══════════════════════════════════════════════════════════════════════",
      "",
      "  Pipeline paused before LLM synthesis. The host Claude Code session",
      "  must materialise DESIGN.md from the collected evidence.",
      "",
      `  Run dir : ${runDir}`,
      `  Prompt  : ${path.relative(runDir, promptFile)}`,
      `  Sidecars: inputs/  (38+ JSON files with extracted signal)`,
      `  Output  : ${path.relative(runDir, designMdAbs)}`,
      "",
      `  Sentinel: ${path.relative(runDir, sentinelPath)}`,
      "",
      "  Next action (host session):",
      "    1. Read inputs/prompt.txt  + selected inputs/*.json",
      "    2. Write DESIGN.md at the path above",
      "    3. Re-run the pipeline with --resume to continue hygiene + bundling",
      "",
      "  To force spawn mode instead (headless `claude -p`):",
      "    DESIGN_MD_CLAUDE_CODE_MODE=spawn DESIGN_MD_ALLOW_NESTED_CLAUDE=1 \\",
      "      <previous command>",
      "",
      "═══════════════════════════════════════════════════════════════════════",
      "",
    ];
    console.log(lines.join("\n"));
    return {
      status: 0,
      stdout: "",
      stderr: "",
      _inline: true,
      _sentinel: sentinelPath,
    };
  }

  if (mode === "spawn") {
    return claudeCli.invoke(promptText, {
      ...options,
      // Force-allow nested if explicitly requested via env (operator override).
      // Otherwise claude-cli will guard itself.
    });
  }

  return {
    status: 6,
    stdout: "",
    stderr: [
      "[claude-code] No execution path available.",
      "Not inside a Claude Code session and `claude` binary not on PATH.",
      "Either run from within Claude Code, install the Claude Code CLI,",
      "or use --provider with an API-based option.",
    ].join(" "),
  };
}

module.exports = {
  invoke,
  pickMode,
  writeSentinel,
  readSentinel,
  isNestedClaudeCodeSession,
  SENTINEL_FILE,
  SENTINEL_VERSION,
};
