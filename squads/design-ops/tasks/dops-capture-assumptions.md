# Capture and Classify Assumptions (Phase 03 — VOCALIZE)

> Task ID: dops-capture-assumptions
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[dops-materialize-brief, dops-resolve-ds-context]` · enables: `[dops-generate-variants]` · workflow: `design-artifact-cycle`

## Description

Walk the brief + DS context + prior art; surface every decision the brief did not explicitly make; classify each as user-confirmed, inferred-from-brand, inferred-from-system, or guess. Ask the user to resolve every guess before proceeding. Silent assumptions become silent defects — this task is the firewall.

## Output Schema

- **produces:** `outputs/design-ops/{business}/artifacts/{artifact_slug}/assumptions.yaml`
- **format:** YAML with classified assumption entries
- **consumed_by:** dops-generate-variants, dops-iterate-artifact, dops-handoff-artifact

## Prerequisites

- Brief materialized (`brief.yaml`)
- DS context resolved (`ds-context.yaml`)
- Prior art surveyed (`prior-art.yaml`)

## Workflow

### Steps

1. **Enumerate Decision Surface**
   - For the declared `kind` and `surface_name`, enumerate every design decision the brief did NOT explicitly make:
     - Color choices not bound to tokens
     - Spacing choices not bound to scale
     - Typography choices (font stack, size, weight) not specified
     - Motion choices (durations, easings) not specified
     - Interactive states (hover, focus, active, disabled) not specified
     - Density choices (tight vs spacious)
     - Layout choices (grid vs flex vs stack)
     - A11y beyond the stated floor
     - Responsive breakpoints beyond declared viewports
     - Copywriting tone for any text strings

2. **Classify Each Assumption**
   For every enumerated decision, classify per source:
   - **user-confirmed** — brief explicitly answered it
   - **inferred-from-brand** — can be derived deterministically from `workspace/businesses/{business}/L2-tactical/brand/` or tokens
   - **inferred-from-system** — derivable from `@sinkra/ds-core` patterns or `ds-core-catalog`
   - **guess** — no deterministic source; agent is speculating

3. **Surface Guesses to User**
   - For each `guess`-classified assumption, present to user:
     ```
     Assumption: {decision_name}
     My guess: {proposed_value}
     Why: {rationale_for_guess}
     
     [Confirm] [Revise] [Defer to brief]
     ```
   - Collect response. If "Revise" → user provides correct value; reclassify as user-confirmed.
   - If "Defer to brief" → halt and amend the brief (return to P01 for this field).

4. **Reclassify After User Response**
   - Each guess resolves to user-confirmed (with the user's value) OR brief-amendment (user chose to formalize it).
   - Zero guesses should remain at end of phase.

5. **Record Classification**
   - Persist `assumptions.yaml` with each entry:
     ```yaml
     - id: ASSUM-{N}
       decision: "{what was being decided}"
       value: "{the value chosen}"
       classification: user-confirmed | inferred-from-brand | inferred-from-system
       source: "{where the value came from — brief section, token path, catalog entry}"
       recorded_at: "{timestamp}"
     ```

6. **Summary Report**
   - Emit counts: `{G}` guesses identified, `{G}` resolved (or halted)
   - If any halt: record `halt_reason: "user deferred N assumptions to brief"`

## Failure Handling

- **User refuses to confirm any guess:** halt the phase. Cannot proceed with unresolved speculation.
- **New guess arises during resolution** (meta-assumption): recurse — classify and resolve.
- **Brief amendment needed:** exit to P01 with the specific field; re-enter P03 when brief is re-validated.

## Success Criteria

- [ ] `assumptions.yaml` exists
- [ ] Every enumerated decision has a classification
- [ ] Zero `guess`-classified entries remain at phase completion
- [ ] User responses logged for every surfaced guess

## Anti-Patterns

- **"It's obvious, no need to ask."** — Obvious to whom? Classify and ask.
- **Batch-confirming guesses** — each guess is its own decision. Mass confirmation invites missed specifics.
- **Silent default back to DS token** — if you default to a token, the classification is `inferred-from-system`, not `guess`. Be honest about which bucket it's in.

## SINKRA Contract

Domain: Tactical
atomic_layer: Molecule (P03 of design-artifact-cycle)
executor: design-chief
Input:
- design_brief_artifact
- ds_context_artifact
- prior_art_artifact
Output:
- assumptions_artifact
pre_condition:
- brief and context resolved
post_condition:
- zero guess-classified assumptions remain
- every decision has a classification and source
performance:
- minimize number of user round-trips by asking in priority order

## Related

- Rule: `squads/design-ops/rules/design-exploration-cycle.md#3-vocalize`
- Rule: `squads/design-ops/rules/design-system-fidelity.md#r4`
- Protocol: `squads/design-ops/data/questions-intake-protocol-spec.yaml`
- Skill: `.claude/skills/design-artifact-cycle/SKILL.md#phase-03`
