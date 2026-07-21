"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const claudeCode = require("./claude-code.cjs");

function withEnv(overrides, fn) {
  const saved = {};
  for (const k of Object.keys(overrides)) saved[k] = process.env[k];
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

function mkTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-code-test-"));
  return dir;
}

test("pickMode returns inline when CLAUDECODE env is set", () => {
  withEnv({ CLAUDECODE: "1", DESIGN_MD_ALLOW_NESTED_CLAUDE: undefined, DESIGN_MD_CLAUDE_CODE_MODE: undefined }, () => {
    assert.equal(claudeCode.pickMode({}, process.env), "inline");
  });
});

test("pickMode returns inline when CLAUDE_CODE_SESSION_ID is set", () => {
  withEnv({ CLAUDECODE: undefined, CLAUDE_CODE_SESSION_ID: "abc-123", DESIGN_MD_CLAUDE_CODE_MODE: undefined }, () => {
    assert.equal(claudeCode.pickMode({}, process.env), "inline");
  });
});

test("pickMode honors DESIGN_MD_CLAUDE_CODE_MODE override (spawn)", () => {
  withEnv({ CLAUDECODE: "1", DESIGN_MD_CLAUDE_CODE_MODE: "spawn" }, () => {
    // forced to spawn even though we're nested
    assert.equal(claudeCode.pickMode({}, process.env), "spawn");
  });
});

test("pickMode honors DESIGN_MD_CLAUDE_CODE_MODE override (inline)", () => {
  withEnv({ CLAUDECODE: undefined, CLAUDE_CODE_SESSION_ID: undefined, DESIGN_MD_CLAUDE_CODE_MODE: "inline" }, () => {
    // forced to inline even though we're not nested
    assert.equal(claudeCode.pickMode({}, process.env), "inline");
  });
});

test("pickMode honors options.forceMode", () => {
  withEnv({ CLAUDECODE: "1" }, () => {
    assert.equal(claudeCode.pickMode({ forceMode: "spawn" }, process.env), "spawn");
    assert.equal(claudeCode.pickMode({ forceMode: "inline" }, {}), "inline");
  });
});

test("writeSentinel creates request file with correct shape", () => {
  const tmp = mkTmpDir();
  try {
    const designMdPath = path.join(tmp, "DESIGN.md");
    const { sentinelPath, promptFile, runDir } = claudeCode.writeSentinel("prompt text", {
      designMdPath,
      source: "local",
      project: "apps/test",
    });
    assert.equal(runDir, tmp);
    assert.equal(path.basename(sentinelPath), ".inline-llm-request.json");
    assert.ok(fs.existsSync(sentinelPath));
    assert.ok(fs.existsSync(promptFile));
    assert.equal(fs.readFileSync(promptFile, "utf8"), "prompt text");
    const sentinel = JSON.parse(fs.readFileSync(sentinelPath, "utf8"));
    assert.equal(sentinel.version, claudeCode.SENTINEL_VERSION);
    assert.equal(sentinel.source, "local");
    assert.equal(sentinel.project, "apps/test");
    assert.equal(sentinel.design_md_path, "DESIGN.md");
    assert.equal(sentinel.prompt_file, "inputs/prompt.txt");
    assert.ok(Array.isArray(sentinel.instructions));
    assert.ok(sentinel.instructions.length > 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("writeSentinel throws when designMdPath is missing", () => {
  assert.throws(
    () => claudeCode.writeSentinel("prompt", {}),
    /designMdPath is required/
  );
});

test("readSentinel round-trips a written sentinel", () => {
  const tmp = mkTmpDir();
  try {
    claudeCode.writeSentinel("p", {
      designMdPath: path.join(tmp, "DESIGN.md"),
      source: "local",
      project: "apps/x",
      model: "claude-opus-4-7",
    });
    const sent = claudeCode.readSentinel(tmp);
    assert.ok(sent);
    assert.equal(sent.source, "local");
    assert.equal(sent.project, "apps/x");
    assert.equal(sent.model, "claude-opus-4-7");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("readSentinel returns null when missing", () => {
  const tmp = mkTmpDir();
  try {
    assert.equal(claudeCode.readSentinel(tmp), null);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("invoke in inline mode writes sentinel and returns _inline flag", () => {
  const tmp = mkTmpDir();
  try {
    withEnv({ CLAUDECODE: "1", DESIGN_MD_CLAUDE_CODE_MODE: undefined }, () => {
      const result = claudeCode.invoke("test prompt", {
        designMdPath: path.join(tmp, "DESIGN.md"),
        source: "local",
        project: "test",
      });
      assert.equal(result.status, 0);
      assert.equal(result._inline, true);
      assert.ok(result._sentinel);
      assert.ok(fs.existsSync(result._sentinel));
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("invoke returns status 6 with actionable error when no execution path", () => {
  // Force mode=none by scrubbing ALL CLAUDE* env vars + breaking PATH so the
  // binary check fails too. The inline detector keys on any CLAUDE_CODE_*
  // variable (it's intentionally promiscuous), so a partial scrub is
  // insufficient — we have to wipe the whole namespace.
  const savedClaudeKeys = {};
  for (const k of Object.keys(process.env)) {
    if (k === "CLAUDECODE" || k.startsWith("CLAUDE_CODE_")) {
      savedClaudeKeys[k] = process.env[k];
      delete process.env[k];
    }
  }
  withEnv({ DESIGN_MD_CLAUDE_CODE_MODE: undefined, DESIGN_MD_ALLOW_NESTED_CLAUDE: undefined }, () => {
    const savedPath = process.env.PATH;
    process.env.PATH = "/nonexistent/path";
    try {
      const result = claudeCode.invoke("prompt", { designMdPath: "/tmp/x/DESIGN.md" });
      assert.equal(result.status, 6);
      assert.match(result.stderr, /No execution path/);
    } finally {
      process.env.PATH = savedPath;
    }
  });
  for (const [k, v] of Object.entries(savedClaudeKeys)) process.env[k] = v;
});

test("SENTINEL_FILE and SENTINEL_VERSION are exported", () => {
  assert.equal(claudeCode.SENTINEL_FILE, ".inline-llm-request.json");
  assert.equal(typeof claudeCode.SENTINEL_VERSION, "number");
});
