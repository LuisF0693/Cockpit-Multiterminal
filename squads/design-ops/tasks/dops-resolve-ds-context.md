# Resolve Design-System Context (Phase 02 — COLLECT)

> Task ID: dops-resolve-ds-context
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[dops-materialize-brief]` · enables: `[dops-capture-assumptions, dops-generate-variants]` · workflow: `design-artifact-cycle`

## Description

Resolve the full design-system context for the business and survey prior art. The brief declares what to build; this task discovers what already exists to build with and from. A build without resolved context is a silent-hallucination risk.

## Output Schema

- **produces:**
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/ds-context.yaml`
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/prior-art.yaml`
- **format:** YAML
- **consumed_by:** dops-capture-assumptions, dops-generate-variants, dops-verify-artifact

## Prerequisites

- Brief exists at `{output_dir}/brief.yaml` (from `dops-materialize-brief`)
- `ds-discovery-paths.yaml` protocol reachable
- `ds-core-catalog.yaml` available

## Workflow

### Steps

1. **Apply Resolution Protocol (from ds-discovery-paths.yaml#resolution_protocol)**
   - Step 1: Resolve canonical workspace paths for `{business}`:
     - `workspace/businesses/{business}/L2-tactical/design/tokens.yaml`
     - `.../foundations.yaml`
     - `.../component-contracts.yaml`
     - `.../motion-primitives.yaml`
   - Step 2 (on miss): check framework defaults (`@sinkra/tokens-base`, `ds-core-catalog.yaml`)
   - Step 3 (on miss): scan brownfield fallback patterns under `apps/{any}/src/...`
   - Step 4 (on miss): HALT — emit `DS_CONTEXT_MISSING` error

2. **Read and Cache Tokens**
   - Parse `tokens.yaml` as source of truth
   - Extract: colors, spacing, typography, radii, shadows, motion durations, easings
   - Persist to `{output_dir}/ds-context.yaml` under `tokens` section

3. **Read Foundations**
   - Parse `foundations.yaml`
   - Extract: surfaces, elevation grammar, z-index scale, interactive states
   - Persist under `foundations` section

4. **Component Catalog Scan (IDS Gate: REUSE > ADAPT > CREATE)**
   - Read `squads/design-ops/data/ds-core-catalog.yaml`
   - For the requested `surface_name` and `surface_type`, search for:
     - Exact name match (e.g. "Button" → catalog.atoms.Button)
     - Fuzzy semantic match (e.g. "PrimaryCTA" → catalog.atoms.Button with rationale)
     - Near-variant match (e.g. "GhostButton" → catalog.atoms.Button variant="ghost")
   - Record matches in `prior-art.yaml` with `match_confidence: HIGH|MEDIUM|LOW`

5. **Prior-Art Survey**
   - Scan `outputs/design-ops/{business}/components/` for components produced previously
   - Scan `apps/aiox-design-starter/src/` for reference implementations
   - Record findings with `source_path`, `relevance`, `notes`

6. **Brownfield Check (if canonical paths empty)**
   - Apply `ds-discovery-paths.yaml#brownfield_fallbacks` patterns
   - If matches found: emit as PROPOSAL (not consumption source) — route to `wf-brandbook-workspace-extraction`
   - Set flag `brownfield_proposal_needed: true`

7. **Workspace Dialect Enforcement**
   - Validate no legacy dialect paths snuck into results
   - If any found: block and emit violation report

8. **Emit Context Artifacts**
   - Write `ds-context.yaml` with: tokens, foundations, components, motion, surfaces, source_paths
   - Write `prior-art.yaml` with: catalog matches, prior component implementations, relevance scores

## Failure Handling

- **DS_CONTEXT_MISSING:** HALT. Do not proceed to P03. Route user to brandbook extraction workflow.
- **Partial contracts** (e.g., tokens exist, foundations missing): emit advisory; allow proceed with flag `partial_context_risk: true`.
- **Brownfield proposal needed:** surface the proposal to user; allow user to either (a) skip and proceed with framework defaults, or (b) halt and materialize workspace contracts first.
- **Workspace dialect violation:** HALT. Direct user to migration story in EPIC-120.

## Success Criteria

- [ ] `ds-context.yaml` exists with tokens + foundations populated
- [ ] `prior-art.yaml` exists with catalog matches (may be empty — empty is valid, missing is not)
- [ ] No unresolved workspace dialect violations
- [ ] Resolution protocol did NOT reach step 4 (missing context)
- [ ] IDS gate executed (REUSE > ADAPT > CREATE evaluation recorded)

## Anti-Patterns

- **"The catalog has nothing, so I'll create."** — Always check brownfield fallbacks. The component may exist in another app's source.
- **Accepting framework defaults silently when workspace missing.** — Flag the partial state explicitly; do not pretend the business has contracts it does not.
- **Skipping prior-art survey for speed.** — Prior art often reveals the exact pattern the user is asking for.

## SINKRA Contract

Domain: Tactical
atomic_layer: Molecule (P02 of design-artifact-cycle)
executor: design-chief
Input:
- design_brief_artifact
- ds_discovery_paths_spec
- ds_core_catalog
Output:
- ds_context_artifact
- prior_art_artifact
pre_condition:
- brief materialized
post_condition:
- ds context resolved OR halt with explicit reason
- prior art surveyed
- IDS gate recorded
performance:
- full resolution in under 30 seconds for canonical paths
- brownfield fallback scan completes without blocking user

## Related

- Discovery paths: `squads/design-ops/data/ds-discovery-paths.yaml`
- Fidelity rule: `squads/design-ops/rules/design-system-fidelity.md`
- Context rule: `squads/design-ops/rules/context-gathering-protocol.md`
- DS catalog: `squads/design-ops/data/ds-core-catalog.yaml`
- Skill: `.claude/skills/design-artifact-cycle/SKILL.md#phase-02`
