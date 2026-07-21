# Concurrent Writer Audit — Design-Ops Rule

Applies before any structural filesystem operation that moves/renames/deletes directories referenced by multiple processes (dev servers, IDEs, other agents, file watchers, auto-save buffers).

## The failure mode this prevents

Session 2026-04-19 (Redpine): `git mv src/app/(brandbook) src/app/(app)` was executed. Immediately after, the `(brandbook)` directory **re-appeared** with fresh file content. Multiple attempts to remove it failed — an independent agent/IDE had buffers open and was writing back to the old path. Symptoms cascaded:

- Next.js `parallel pages` error (both `(app)/essencia` and `(brandbook)/essencia` resolved to `/essencia`)
- Typecheck failures from stale `.next/types/app/(brandbook)/` type imports
- 500 errors from dev server in inconsistent state
- Multiple retry loops wasting ~15 minutes

Root cause: the agent did not audit concurrent writers before structural rename.

## Rule (MANDATORY before `git mv`, `mv`, `rm -rf` of any directory)

Before executing any of these operations on a directory path:
- `mv <src> <dst>` (rename)
- `git mv <src> <dst>`
- `rm -rf <dir>`
- Delete a route group `(name)` folder
- Restructure an app/component/route tree

The agent MUST perform the **Concurrent Writer Audit (CWA)**:

### CWA Step 1 — Running processes

```bash
# List processes touching the target path or its parents
ps aux | grep -E "(next dev|node.*<project>|watchman|chokidar)" | grep -v grep

# Check file descriptors (lsof) on the target
lsof +D <target-path> 2>/dev/null | head
```

If any dev server / watcher / test-runner is running on the project:
- Mark the path as **HOT** (active writer detected)
- Request user action: stop dev server before proceeding

### CWA Step 2 — IDE buffers

Buffers open in the user's editor are invisible to `ps`. Warn the user explicitly:

> "Você está executando rename de `<path>`. Se seu IDE (VS Code, Cursor, Neovim, etc.) tem buffers abertos em arquivos desse path, feche todos ANTES de prosseguir. Auto-save vai recriar o diretório antigo."

### CWA Step 3 — Other agents / sync services

- Check for running agent processes (Claude Code sessions, Cursor background jobs)
- Check for cloud-sync daemons (Dropbox, iCloud, OneDrive) touching the path
- Check for git hooks (pre-commit, post-checkout) that regenerate dirs

### CWA Step 4 — Build caches (framework-specific)

Structural renames almost always leave stale entries in the framework's build cache. The archetype locks Tailwind + shadcn + React + TypeScript but parameterizes the **framework**, so the cache path varies. Clean per framework:

| Framework | Cache paths to clean after rename |
|---|---|
| **Next.js** | `.next/server/app/<old-name>/`, `.next/types/app/<old-name>/`, `.next/cache/` |
| **Vite + React** | `.vite/` (incl. `.vite/deps/`), `node_modules/.vite/`, `dist/` (if built) |
| **Astro** | `.astro/`, `dist/` |
| **Remix** | `.cache/`, `build/`, `public/build/` |
| **SvelteKit** | `.svelte-kit/`, `build/` |
| **All frameworks** | `node_modules/.cache/`, `.turbo/` (if monorepo), `tsconfig.tsbuildinfo` |

**Post-rename, MUST clean the relevant caches before validating.** Otherwise dev server shows 500/404 on routes that exist on disk. The `scaffold-ds.sh` script SHOULD drop a `scripts/clean-framework-cache.sh` that detects the framework from `package.json` and cleans the right paths.

### CWA Step 5 — File system confirmation (post-op)

After the operation:
```bash
# 1. Verify source is gone
ls <source-path> && echo "WARNING: source still exists" || echo "OK"

# 2. Verify target is populated
ls <target-path>

# 3. Wait 5s + re-verify source. If re-created → concurrent writer detected.
sleep 5 && ls <source-path>
```

If source re-appears, the audit FAILED. Stop, report to user, do not retry.

## Priority of resolution

When concurrent writer detected AFTER rename:

1. **DO NOT loop**: retrying `rm` / `mv` against an active writer wastes time and can corrupt state
2. **Merge newest content** from re-created dir into canonical target (newer mtime wins, unless user overrides)
3. **Identify the writer** (user's IDE most likely — ask them)
4. **User resolves** (closes buffers / stops process)
5. **Resume**: remove old dir, clean caches, validate

## When to revert

If concurrent-writer conflict persists > 2 resolution attempts:
- **Revert the rename** (restore original name)
- Document why in a comment on the decision
- The cosmetic benefit of the new name is not worth fighting the environment
- Option to retry later after user has a clean session

## Mitigation for unavoidable renames

If the rename MUST happen and concurrent writers can't be stopped:

- Schedule rename for a session where user commits to closing all IDE/agent buffers
- Perform rename as an atomic batch (rename + cache clean + validation in one script)
- Communicate via commit message: "STRUCTURAL — requires fresh dev server + IDE reload"

## References

- Session precedent: Redpine session 2026-04-19 — `(brandbook)` → `(app)` rename cycle
- Related rule: `canonical-artifact-names.md` (CANP — CLI-enforced rename for workspace docs)
- Related rule: `artifact-rename.md` (`npm run sinkra:rename-artifact` for multi-file artifact refs)
- Heuristic: "If something keeps coming back, there's a writer you haven't accounted for."
