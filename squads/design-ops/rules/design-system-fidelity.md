# Design System Fidelity — Provider Rule

Applies when generating, modifying, or reviewing any visual artifact under `design-ops` or consuming squads.

Absorbed from `agenmod/claw-design` (2026-04-18), reshaped to the SINKRA workspace-first contract and our layered stack.

## The Fidelity Mandate

> *"The point is pixel fidelity to what's actually in the repo, not your recollection."*
> — claude-design-sys-prompt.txt

Pixel fidelity is the operating principle. A design system is not an aesthetic preference — it is a **contract**. Violating the contract with approximations, recollections, or "close enough" values breaks the compound-interest property of a design system.

## Rules (Non-Negotiable)

### R1 — Read, Don't Recall

- **NEVER** generate token values from memory. Read them from the canonical source every time.
- Canonical sources (in priority order):
  1. `workspace/businesses/{business}/L2-tactical/design/tokens.yaml`
  2. `workspace/businesses/{business}/L2-tactical/design/foundations.yaml`
  3. `@sinkra/tokens-base` (framework defaults)
  4. `packages/tokens-base/tokens/` (source of truth for `@sinkra/tokens-base`)
- **If the token does not exist in any source, STOP.** Do not invent. File a token request via `wf-brandbook-workspace-extraction` or ask the owner.

### R2 — Exact Values, Not Approximations

- Use the **exact** hex, HSL, or oklch value from the token source. Never `#3B82F6`-ish. Never `blue-500-like`.
- Use the **exact** spacing scale: `gap-4` means `var(--spacing-4)` means the token's literal value. `p-[17px]` is a violation.
- Use the **exact** font stack. Not "a clean sans-serif." The one named in `foundations.yaml`.
- Use the **exact** border radius. Not "roughly rounded."

### R3 — Last-Resort Framing for From-Scratch

- *"Mocking a full product from scratch is a LAST RESORT and will lead to poor design."* (claw-design)
- Before creating, search:
  1. `@sinkra/ds-core` component registry (see `squads/design-ops/rules/design-system-generation.md`)
  2. `squads/design-ops/data/ds-core-catalog.yaml`
  3. `outputs/design-ops/{business}/components/`
  4. `apps/aiox-design-starter/src/`
  5. Existing similar artifacts in the current business's workspace
- If a near-match exists: **REUSE > ADAPT > CREATE** (IDS gate). Creating a new component with a new name, while a near-match exists elsewhere, is a contract violation, not a creative decision.

### R4 — Context-First Mandate

- *"Starting a design without context always leads to bad design."* (claw-design)
- An artifact without a materialized brief (`templates/design-brief-intake-tmpl.yaml`) is not started — it is assumed. Stop, materialize the brief, then start.
- If the brief is materialized but `contracts.tokens_source` does not resolve to an existing file, STOP. Do not default to `@sinkra/tokens-base` silently — surface the missing business contract.

### R5 — Visual Vocabulary Matching

- Tokens are necessary but insufficient. A design system also carries:
  - **Copywriting tone** — terse vs expansive, formal vs casual
  - **Density** — how much negative space surrounds content
  - **Interactive rhythm** — hover timing, click affordance, focus ring width
  - **Shadow + elevation grammar** — flat vs layered, soft vs hard
  - **Motion personality** — snappy vs flowing
- When adding to an existing UI, **match the visual vocabulary first**, then the tokens. A technically tokenized artifact with alien density is still inconsistent.

### R6 — Copy When Self-Contained, Reference When Bundled

- For `component / page / email / dashboard`: reference `@sinkra/ds-core` via import.
- For `html_prototype / deck / pdf`: copy exact values and compiled styles into the artifact.
- See `ds-consistency-policy.md` for the full matrix.

### R7 — No Harmonic Invention

- *"If [palette] is too restrictive, use oklch to define harmonious colors."* — claw-design permits this.
- **We refuse as default.** See `ds-consistency-policy.md` "Oklch Harmonic Fallback — Gate Policy". Harmonic generation bypasses the DS and erodes brand integrity over time.

### R8 — Freeze on Handoff

- When an artifact enters `POPULATED` state, its referenced token values are effectively frozen for that artifact's lifetime.
- Subsequent token updates in the workspace do NOT retroactively rewrite the artifact's inlined values (for self-contained kinds). Reconciliation is a deliberate act, not a silent drift.
- For bundler-backed kinds, CSS variable cascade handles updates automatically — no freeze.

## Anti-Patterns

- **"Close enough."** — No. Exact values. Every time.
- **"I remember the primary is blue-ish."** — Recollection is not a source. Read the file.
- **"The token doesn't quite fit, I'll make a variant."** — That's a token request, not a creative decision. File it upstream.
- **"I'll use oklch to make it harmonious."** — Gate it first. See `ds-consistency-policy.md`.
- **"I'll just create a new component — it's only slightly different."** — IDS gate. REUSE > ADAPT > CREATE.
- **"Starting without a brief to save time."** — The time you save is paid back by the rework when the assumptions turn out wrong.

## Enforcement

### Current (Wave B.2.1, advisory)

- Manual review by `@design-chief` at routing and at handoff.
- `validate-workspace-contracts.cjs` ensures contracts resolve.
- `validate-brandbook-contrast.cjs` ensures contrast ratios from actual token values.
- `validate-token-pipeline.cjs` prevents token drift between source and build output.

### Planned (Wave C)

- `validate-artifact-consistency.cjs` inspects self-contained artifacts for:
  - Hardcoded colors not in `tokens.yaml`
  - Spacing outside the token scale
  - Font families not in `foundations.yaml`
  - Radii outside `@sinkra/tokens-base`
- Fidelity score emitted to `outputs/design-ops/{business}/manifest.yaml`.

## Related

- `squads/design-ops/rules/ds-consistency-policy.md` (policy split by deliverable_kind)
- `squads/design-ops/rules/design-exploration-cycle.md` (process that enforces this rule at every phase boundary)
- `squads/design-ops/rules/context-gathering-protocol.md` (how to find existing before creating)
- `squads/design-ops/rules/ai-trope-guardrails.md` (visual anti-patterns)
- `squads/design-ops/data/ds-discovery-paths.yaml` (where to look for DS tokens/components)
- `squads/design-ops/data/design-heuristics-from-external-prompts.yaml` (provenance)
- `squads/design-ops/rules/design-system-generation.md` (component registry)
- External source: `agenmod/claw-design` — claude-design-sys-prompt.txt (2026-04-18)
