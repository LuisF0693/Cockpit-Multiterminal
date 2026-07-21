# Generate Divergent Variants (Phase 04 — BUILD)

> Task ID: dops-generate-variants
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[dops-materialize-brief, dops-resolve-ds-context, dops-capture-assumptions]` · enables: `[dops-show-early-feedback]` · workflow: `design-artifact-cycle`

## Description

Generate N divergent variants along orthogonal axes (match_existing_system, novel_direction, constraint_first). Apply the correct consistency model (reference-first vs copy-first) per `ds-consistency-policy.md`. Each variant must pass the AI-trope gate. Converge based on success_criteria — never on aesthetic preference.

## Output Schema

- **produces:**
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/variants/variant-{1..N}/`
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/convergence.yaml`
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/wave-c-deferrals.yaml` (if applicable)
- **consumed_by:** dops-show-early-feedback, dops-iterate-artifact, dops-verify-artifact

## Prerequisites

- Brief materialized with `exploration.variants_required` set
- DS context resolved
- Assumptions classified (zero remaining guesses)
- **Component Variants Taxonomy loaded:** `data/component-variants-taxonomy.yaml`
  - When generating component variants (Button/Input/Card/Dialog), use canonical Sinkra variants
  - Decision trees in taxonomy guide which variant fits which use case
  - "Divergent variants along orthogonal axes" applies to **artifact exploration**, not to base component variants — those are pre-determined

## Workflow

### Steps

1. **Resolve N and Consistency Model**
   - N = `brief.exploration.variants_required` (or kind-default from `ds-consistency-policy.md#divergent-exploration-kind-aware-policy`)
   - Apply matrix:
     - `kind ∈ {component, page, email, dashboard}` → consistency_model = **reference-first** (import from `@sinkra/ds-core`)
     - `kind ∈ {html_prototype, deck, pdf}` → consistency_model = **copy-first** (precompiled Tailwind inlined OR manual exact values)
     - `kind = pptx` → consistency_model = **runtime-export** (source from a deck, export at P08)

2. **Wave C Deferral Check**
   - If `kind ∈ {html_prototype, deck, pdf, pptx}` AND Wave C runtime unavailable:
     - Produce CONTRACT-COMPLIANT design (tokens + structure + spec)
     - Note deferrals in `wave-c-deferrals.yaml`:
       - `starter_component_needed: {id}` (from `starter-components-catalog.yaml`)
       - `tweak_protocol_needed: {yes/no}`
       - `export_pipeline_needed: {yes/no}`
     - Artifact is still producible — runtime just won't execute until Wave C

3. **Divergent Exploration — N Variants Along Orthogonal Axes**
   - Axis 1 — `match_existing_system`: stays strictly inside current DS grammar (tokens, foundations, ds-core patterns)
   - Axis 2 — `novel_direction`: deliberately breaks ONE convention with explicit justification tied to success_criteria
   - Axis 3 — `constraint_first`: optimizes for one hard constraint from the brief (density, a11y, cold-user UX, perf)
   - For N > 3: add more axes (density-first, motion-first, accessibility-first, etc.) or produce variants-of-variants
   - Each variant lives in its own subdirectory with:
     - `README.md` — approach + rationale + tradeoffs + ai_trope_risks
     - Source files (TSX / CSS / HTML / etc. per kind and consistency model)

4. **Apply Consistency Model Per Variant**
   - **reference-first kinds:**
     - Import from `@sinkra/ds-core`
     - Use Tailwind utility classes backed by `@theme inline` tokens
     - CSS variables override via business workspace tokens
   - **copy-first kinds:**
     - Inline exact token values from resolved `ds-context.yaml`
     - Use precompiled Tailwind (Path 1) by default; manual exact CSS (Path 3) as fallback
     - Never Tailwind Play CDN (Path 2 — REJECTED per ds-consistency-policy)
     - Pinned dependencies with SRI hashes per `self-contained-artifact-security.md`

5. **AI-Trope Gate Per Variant**
   - Run `squads/design-ops/checklists/dops-ai-trope-guardrails.yaml` against each variant
   - Compute per-variant compliance score
   - Reject variants with compliance < 90% — request regeneration of that variant

6. **Divergence Posture Check (for component kind)**
   - If `kind=component` AND user answered "DS-first only" in P01:
     - N = 1; only axis = match_existing_system
     - Convergence is trivial (single variant)
   - If user answered "novel" or "mix":
     - N = 3 (or user-specified)
     - Full axis matrix

7. **Convergence Decision**
   - Evaluate each variant against `brief.success_criteria[]`
   - Select the variant (or merge of two) that maximizes success_criteria satisfaction
   - Document in `convergence.yaml`:
     ```yaml
     converged_variant_id: "variant-N"
     tiebreaker_criterion: "success_criteria[N]: {text}"
     rationale: "..."
     rejected_variants:
       - id: variant-M
         reason: "does not satisfy success_criteria[K]"
     confidence: HIGH|MEDIUM|LOW
     ```
   - Convergence MUST reference a specific `success_criteria` id — aesthetic preference is not a tiebreaker

8. **Record Wave C Deferrals (if applicable)**
   - For copy-first kinds: list which Wave C contracts were consulted (forward-declared) but runtime is unavailable
   - `wave-c-deferrals.yaml`:
     ```yaml
     deferred_runtimes:
       - contract: starter-components-catalog.yaml#deck_stage
         status: forward_declared
         usage: "scaffolded per contract; runtime execution deferred to Wave C"
       - contract: tweak-protocol-spec.yaml
         status: forward_declared
     wave_c_gate: docs/adrs/ADR-018
     ```

## Failure Handling

- **No variant passes AI-trope gate after 2 regeneration attempts:**
  - Surface violations to user
  - Options: (a) narrow exploration axes, (b) relax one constraint in brief, (c) halt and redesign brief
- **User answered "Decide for me" on convergence tiebreaker:** use `success_criteria[0]` as deterministic tiebreaker
- **Convergence uses aesthetic preference as tiebreaker:** REFUSE convergence; loop back to re-evaluate against criteria
- **Wave C kind requested, contracts forward-declared, runtime absent:** proceed in CONTRACT-ONLY mode with explicit deferral log

## Success Criteria

- [ ] N variants exist, each in its own subdirectory
- [ ] Each variant passes AI-trope gate (compliance ≥ 90%)
- [ ] Correct consistency model applied (reference vs copy per kind matrix)
- [ ] `convergence.yaml` exists with tiebreaker_criterion referencing a specific success_criteria id
- [ ] For Wave C kinds: `wave-c-deferrals.yaml` exists and lists forward-declared contracts

## Anti-Patterns

- **"All three variants look similar."** — Axes were not orthogonal. Re-generate with stronger divergence.
- **"The first variant feels right."** — Aesthetic tiebreaker. Reject.
- **"No time for divergent exploration."** — Then the kind was wrong, or the brief is not worth building. No shortcut here.
- **"The novel variant is cool but breaks the DS."** — Document the break as justified novelty OR reject per `design-system-fidelity.md`.
- **Mixing consistency models within one variant** — pick reference OR copy; mixing produces untraceable drift.

## SINKRA Contract

Domain: Tactical
atomic_layer: Molecule (P04 of design-artifact-cycle)
executor: design-chief
Input:
- design_brief_artifact
- ds_context_artifact
- assumptions_artifact
Output:
- variants_artifact (N items)
- convergence_decision
- wave_c_deferrals (if applicable)
pre_condition:
- assumptions fully classified
- consistency_model resolved
post_condition:
- N variants exist
- each passes ai-trope gate
- convergence ties to success_criteria
performance:
- per-variant generation time tracked
- per-variant ai-trope pass rate tracked

## Related

- Policy: `squads/design-ops/rules/ds-consistency-policy.md`
- Rule: `squads/design-ops/rules/design-exploration-cycle.md#4-build`
- Rule: `squads/design-ops/rules/ai-trope-guardrails.md`
- Rule: `squads/design-ops/rules/design-system-fidelity.md`
- Checklist: `squads/design-ops/checklists/dops-ai-trope-guardrails.yaml`
- Registry: `squads/design-ops/data/deliverable-kinds-registry.yaml`
- Wave C contracts: `starter-components-catalog.yaml`, `tweak-protocol-spec.yaml`, `animation-primitives-contract.yaml`, `export-contracts-spec.yaml`
- Skill: `.claude/skills/design-artifact-cycle/SKILL.md#phase-04`
