# Redpine Playbook Integration — 2026-04-19

Integration of 9 gaps identified during Redpine session (apps/redpine-ds) retrospective into squad design-ops artifacts. Each gap tracks to a concrete file change below.

## Scope clarification (2026-04-19 update)

All additions below are **framework-agnostic** within the archetype's locked stack:
- **LOCKED (invariant):** Tailwind v4 + shadcn/ui + React + Radix (via `radix-ui` namespace) + TypeScript + cva/clsx/tailwind-merge + Lucide
- **PARAMETERIZED:** framework (next | vite | astro | remix | sveltekit)

This means 95% of the discipline (drift check, focus WCAG, status labels, a11y metadata, DTCG, manifest, semantic token naming, palette shadcn-slot override, concurrent-writer audit, grep-before-invent, absorb-contracts) works **identically regardless of framework chosen**. Only a handful of concerns are framework-specific (RSC serialization → Next only; image primitive → per-framework; build cache path → per-framework); these are explicitly marked `applies_to: [framework]` in the checklists.

See `rules/stack-invariant-vs-framework-parameterized.md` for the complete invariant/parameter matrix.

## Gap → Fix map

| Gap | Concern | File(s) modified |
|---|---|---|
| **GAP-DS-007a** Token-component drift not enforced | Quality governance | `data/ds-archetype.yaml` (+11 quality_gates clauses, +mandatory_outputs section), `checklists/visual-gate-lean.yaml` (+section `stack-discipline` w/ 10 checks), `templates/check-token-drift.mjs.tmpl` (new) |
| **GAP-DS-007b** Archetype doesn't emit DTCG + LSP | Interop | `data/ds-archetype.yaml#mandatory_outputs.files` + `package_json_requirements` — DTCG file + `designTokensLanguageServer` config now required |
| **GAP-DS-007c** No components.manifest generator | Agentic/MCP | `templates/build-manifest.mjs.tmpl` (new), archetype mandatory output, workflow G6 gate |
| **GAP-DS-007d** Visual-gate lacks React/Next checks | Stack discipline | `checklists/visual-gate-lean.yaml#stack-discipline` — 10 new checks covering: no `ref` prop, no `transition-all`, no opacity hover, radii drift, global focus, palette-shadcn override, semantic vs base distinct, drift-check-passes, manifest-in-sync, dtcg-valid |
| **GAP-DS-007e** Status labels not mandatory | Maturity signaling | `data/ds-archetype.yaml#baseline_primitives.contract.per_primitive` — mandatory `status` + `a11y` in components.map.json |
| **GAP-DS-007f** "Absorb contracts not runtime" not codified | Strategic direction | `rules/extension-vocabulary-match.md` — new section covering ✅/❌ absorption policy + rationale from Redpine RHDS case |
| **GAP-DS-007g** Anti-trope missing technical dimensions | Silent runtime bugs | `checklists/dops-ai-trope-guardrails.yaml` — 2 new quality dimensions (token_naming_discipline, react_prop_contracts) bringing total to 56 checks across 10 dimensions |
| **GAP-DS-007h** No concurrent-writer guardrail | Process/operational | `rules/concurrent-writer-audit.md` (new) — 5-step CWA protocol before structural rename |
| **GAP-DS-007i** No E2E fixture pipeline contract | CI confidence | `fixtures/ds-test-minimal/expected-outputs.yaml` (new) — declares every expected artifact + validation rule per gate |
| **GAP-DS-007j** "Scaffold but no continuous enforcement" shadow-weakness | Lifecycle | `workflows/ds-static-to-dynamic-migration.yaml#G7` — new Continuous Drift Audit gate running weekly post-delivery |

## Templates added (dropped by scaffold-ds.sh into new DSs)

| Template | Target path in scaffolded DS | Role |
|---|---|---|
| `templates/check-token-drift.mjs.tmpl` | `apps/{target}/scripts/check-token-drift.mjs` | 6-rule grep drift audit |
| `templates/build-manifest.mjs.tmpl` | `apps/{target}/scripts/build-manifest.mjs` | Agentic manifest generator |
| `templates/focus-indicators-global.css.tmpl` | Injected into `apps/{target}/src/app/globals.css` | WCAG 2.2 AAA focus rule |

## Required scaffold-ds.sh modifications (follow-up)

The scaffold script MUST be updated to:

1. Copy `check-token-drift.mjs.tmpl` → `apps/{target}/scripts/check-token-drift.mjs`
2. Copy `build-manifest.mjs.tmpl` → `apps/{target}/scripts/build-manifest.mjs`
3. Append `focus-indicators-global.css.tmpl` content into `apps/{target}/src/app/globals.css`
4. Register scripts in `apps/{target}/package.json`:
   ```json
   "check:drift": "node scripts/check-token-drift.mjs",
   "build:manifest": "node scripts/build-manifest.mjs"
   ```
5. Register `designTokensLanguageServer` block in `apps/{target}/package.json`:
   ```json
   "designTokensLanguageServer": {
     "prefix": "{brand-prefix}",
     "tokensFiles": ["./src/design-system/exports/tokens.dtcg.json"]
   }
   ```
6. Ensure `build:tokens` script emits `tokens.dtcg.json` alongside CSS/TS (pattern from `apps/redpine-ds/scripts/build-tokens.mjs`)

## Test (one-command validation)

Running the scaffold against `fixtures/ds-test-minimal/` should produce all artifacts declared in `fixtures/ds-test-minimal/expected-outputs.yaml`:

```bash
cd squads/design-ops
./scripts/design-system/scaffold-ds.sh \
  --source fixtures/ds-test-minimal \
  --target apps/ds-test-cobalt \
  --profile lean

# Post-scaffold validation
cd ../../apps/ds-test-cobalt
npm run check:drift       # must exit 0
npm run build:tokens      # emits CSS + TS + DTCG
npm run build:manifest    # emits manifest JSON
npm run typecheck         # clean
```

## Ownership + scoring

- All changes in this integration are **owner: design-ops**
- Scoring updates:
  - `dops-ai-trope-guardrails.yaml`: 45 → **56 checks** across **10 dimensions**
  - `visual-gate-lean.yaml`: +10 stack-discipline checks (section 11)
  - `ds-archetype.yaml`: +11 quality_gates, +1 section (mandatory_outputs), +5 forbids, +4 contract items
  - `workflows/ds-static-to-dynamic-migration.yaml`: +8 G6 criteria, +1 new gate (G7)

## Heuristics extracted (for kaizen-chief consumption)

1. **"Tokens excelentes não importam se componentes não os consomem"** — drift detection must be automated in CI, not manual
2. **"Reserved React prop names break runtime"** — `ref`/`key` audit in Client Components
3. **"Semantic vs base tokens must use distinct naming prefixes"** — or CSS var self-references silently break
4. **"Palette systems must override framework slots, not just custom vars"** — else shadcn components don't adapt
5. **"Focus indicators are GLOBAL policy, never per-component"** — WCAG 2.2 AAA needs one source of truth
6. **"Absorb contracts, not runtime"** — cross-DS learning without stack migration
7. **"Grep 5+ mature DSs before inventing conventions"** — especially for terms like "docs", "app", "shell"
8. **"Route groups (name) aren't cosmetic — they're the only App Router mechanism for layout subset"**
9. **"Dev server caches lie after structural renames"** — `.next/server`, `.next/types` need explicit clean
10. **"Concurrent writers are real"** — IDE buffers + watchers + agents can fight your moves

## References

- Session apps: `apps/redpine-ds`
- Session heuristics source: Redpine session transcript 2026-04-19 (see apps/redpine-ds/CHANGELOG.md)
- Related rules loaded: `rules/extension-vocabulary-match.md`, `rules/concurrent-writer-audit.md`, `rules/stack-invariant-vs-framework-parameterized.md`
- Related squad: design-system (sibling squad — may have parallel uplift needs)

## Framework-agnostic validation matrix

| File | Applies to `next` | Applies to `vite` | Applies to `astro`/`remix`/`sveltekit` |
|---|---|---|---|
| `check-token-drift.mjs.tmpl` | ✅ | ✅ | ✅ (Tailwind patterns, framework-invariant) |
| `build-manifest.mjs.tmpl` | ✅ | ✅ | ✅ (React+cva+components.map.json scraping, framework-invariant) |
| `focus-indicators-global.css.tmpl` | ✅ | ✅ | ✅ (pure CSS, framework-invariant) |
| `visual-gate-lean.yaml#stack-discipline` | all 12 checks apply | 11 (skip rsc-serialization) | 11 (skip rsc-serialization) |
| `dops-ai-trope-guardrails.yaml#token_naming_discipline` | ✅ | ✅ | ✅ |
| `dops-ai-trope-guardrails.yaml#react_prop_contracts` | ✅ (RSC variant) | ✅ (forwardRef variant) | ✅ (forwardRef variant) |
| `concurrent-writer-audit.md` | ✅ (.next/ caches) | ✅ (.vite/ caches) | ✅ (per-framework cache table) |
| `extension-vocabulary-match.md` | ✅ | ✅ | ✅ (framework-agnostic process rule) |
| Workflow G7 gate | ✅ | ✅ | ✅ (cross-framework continuous audit) |
| `fixtures/ds-test-minimal/expected-outputs.yaml` | ✅ | ⚠️ needs per-framework expected-outputs-vite.yaml (follow-up) | ⚠️ per-framework fixtures deferred |

## Follow-ups (framework extension path)

To fully enable Vite/Astro/Remix/SvelteKit variants of the archetype:

1. Add `parameterized.framework.shape.{vite,astro,remix,sveltekit}` blocks to archetype (next.shape already exists)
2. Update `scaffold-ds.sh` to branch on `--framework` flag, picking the right config files + entry + cache paths
3. Clone `fixtures/ds-test-minimal/` → `fixtures/ds-test-vite/` with Vite-specific expected outputs
4. Add `apps/{reference-vite-ds}/` as executed-reference alongside `apps/anthropic-ds` (executed-next-reference)
5. Validate workflow G0→G7 against Vite fixture before marking framework as `MVP`
