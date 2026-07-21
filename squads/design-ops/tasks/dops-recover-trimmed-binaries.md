# Recover Trimmed Node Binaries (bun monorepo)

**Type:** Operational runbook
**Owner:** design-ops
**Invocation:** Manual on-demand (when IDE or shell reports `no such file or directory` for a `node_modules/.bin/*` binary mid-session)

## Symptom

Mid-session, a command that worked 30 minutes ago suddenly fails:

```bash
$ node_modules/.bin/vite build
(eval):1: no such file or directory: node_modules/.bin/vite
```

Other binaries in the same workspace may also be missing. No warning was emitted. The workspace's own `node_modules/` directory exists but has been partially trimmed.

## Root Cause

In a **bun-based monorepo** (Sinkra Hub pattern), `bun install` operating in a sibling workspace can hoist/re-link shared deps across the monorepo. Side effect: binaries that were materialised in workspace A's `node_modules/.bin/` get unlinked when bun re-resolves the global dep graph.

This is not a bug — it's bun's content-addressed deduplication reconciling. The trimmed binary's underlying package is still in the bun global cache; only the per-workspace symlink is gone.

## Recovery (60 seconds)

```bash
cd apps/<workspace>      # the one reporting missing binary
bun install              # re-materialises symlinks without re-downloading packages
```

Verify recovery:

```bash
ls node_modules/.bin/ | grep -E '<missing-bin>'
```

Then re-run the original command.

## When This Happens Most Often

- Switching between workspaces via `cd` and running `bun install` or `bun add` in the new one
- Running `bun install` at the monorepo root after editing a workspace-specific `package.json`
- Long sessions with multiple `bun add` calls across workspaces

## Prevention (not strictly possible, but reduces frequency)

1. Use absolute paths to the binary instead of the relative `.bin/` lookup:
   ```bash
   ${PROJECT_ROOT}/apps/anthropic-ds/node_modules/.bin/vite build
   ```
   This still breaks if the symlink is gone, but is explicit.

2. Or invoke via `bun run <script>` from within the workspace — bun re-verifies the bin graph as part of the run, and will re-materialise on-the-fly:
   ```bash
   cd apps/<workspace> && bun run dev
   ```

3. If you switch workspaces frequently, run `bun install` each time you arrive — cheap (cache-hit), self-healing.

## Non-Remediations (don't do these)

- **Don't** `rm -rf node_modules && bun install` — that re-downloads everything, takes minutes, and doesn't address the hoisting mechanism.
- **Don't** pin to npm/pnpm "to avoid bun weirdness" — bun's speed and workspace handling are net wins; this failure mode is one-liner to fix.
- **Don't** commit `node_modules/.bin/` symlinks — they're content-addressed and not portable.

## Triangulation

Observed in:

- [SOURCE: claude-perfected DS port 2026-04-19/20] `node_modules/.bin/vite` disappeared mid-session while working on DS tokens in `apps/claude-perfected/`. Parallel `bun add` in sibling workspace had happened ~20 minutes earlier. `bun install` restored in 12s.

## Related

- `AN_KE_057` Multi-Window Isolation (different domain but related hygiene principle)
