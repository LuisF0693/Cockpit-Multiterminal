# Handoff Final Artifact + Emit Downstream Contract (Phase 08 — HANDOFF)

> Task ID: dops-handoff-artifact
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[dops-verify-artifact]` · enables: `[]` · workflow: `design-artifact-cycle`

## Description

Emit the final artifact, register it in the business manifest, generate the downstream handoff contract, and update any affected registries. The pipeline is not complete until the artifact is discoverable and the handoff is pending.

## Output Schema

- **produces:**
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/final/` — the artifact
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/manifest.yaml` — artifact metadata
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/handoff-downstream.yaml` — structured handoff
  - Updated `outputs/design-ops/{business}/manifest.yaml` — business-level manifest
- **consumed_by:** downstream squad (design-pages, design-app, slides-creator, or external consumer)

## Prerequisites

- P07 verdict = PASS (or CONCERNS with user waiver)
- Verification score card present
- All preceding phase outputs intact

## Workflow

### Steps

1. **Move artifact to final location**
   - Copy the iterated artifact to `{output_dir}/final/`
   - Artifact is now frozen — further changes require a new cycle

2. **Generate artifact manifest**
   - Write `{output_dir}/manifest.yaml`:
     ```yaml
     artifact_id: "{artifact_slug}"
     kind: "{kind}"
     business_slug: "{business}"
     created_at: "{ISO-8601}"
     created_by: "design-chief via design-artifact-cycle"

     source_brief_ref: "brief.yaml"
     variants_explored_count: {N}
     convergence_rationale: "{from convergence.yaml}"

     verification_status:
       verdict: PASS | CONCERNS_WAIVED
       compliance_score: {0-100}
       verified_at: "{ISO-8601}"

     consistency_model: "{reference-first | copy-first | runtime-export}"
     wave_c_deferrals: [...]   # if applicable

     success_criteria_satisfied: ["criterion_1", "criterion_2", ...]
     change_log_entries: {int}
     iteration_rounds: {int}

     file_governance:
       total_files: {int}
       largest_file_lines: {int}
       within_size_limits: {bool}

     a11y:
       wcag_aa: PASS
       contrast_min: {float}
     ```

3. **Update business-level manifest**
   - Read `outputs/design-ops/{business}/manifest.yaml` (create if missing per `artifact-file-governance.yaml#asset_registration`)
   - Append or update entry for this `artifact_id`
   - Honor asset registration fields: `artifact_id`, `kind`, `business_slug`, `created_at`, `source_brief_ref`, `variants_explored_count`, `convergence_rationale`, `verification_status`
   - Apply asset-registration group (Type | Colors | Spacing | Components | Brand) if the DS review pane exists — see `artifact-file-governance.yaml#asset_registration`
   - Do NOT break existing entries; additive only

4. **Emit downstream handoff**
   - Determine downstream consumer from kind:
     - `component` → design-pages (for composition) OR app directly
     - `page` → deploy pipeline via design-pages
     - `dashboard` → design-app
     - `email` → marketing or design-pages
     - `deck` → slides-creator OR external client
     - `html_prototype / pdf / pptx` → external client or handed back to requester
   - Write `{output_dir}/handoff-downstream.yaml`:
     ```yaml
     handoff_id: "DOPS-{artifact_slug}-{YYYYMMDD}-{HHmmss}"
     status: pending
     emitted_by: "design-ops"
     emitted_at: "{ISO-8601}"
     downstream_squad: "{design-pages | design-app | slides-creator | external}"
     artifact_manifest_ref: "manifest.yaml"
     artifact_path: "final/"
     notes: "..."
     required_actions_for_consumer:
       - "..."
     ```

5. **Registry governance update** (per `.claude/rules/registry-governance.md`)
   - If the artifact introduces new tokens, components, or motion primitives → update affected registry files
   - Log all registry mutations for pre-push registry check

6. **Update pipeline state**
   - Write `{output_dir}/.pipeline-state.yaml` with `status: complete`, `completed_at`, `total_duration_minutes`

7. **Emit learning log**
   - Write to `.aiox/learning/logs/design-artifact-cycle/{artifact_slug}-{YYYYMMDD}-{HHmmss}.yaml`
   - Capture: durations per phase, violations caught per checklist, iteration rounds, user-interaction count, guesses resolved, wave_c_deferrals, outcome
   - This feeds calibration of rules — rules that never catch violations signal miscalibration

8. **Surface completion to user**
   - Display pipeline summary (from skill P09)
   - Offer trigger to downstream: "Trigger downstream consumer via `@{next_consumer}` now?"

## Failure Handling

- **Manifest schema violation:** halt — fix schema before proceeding. The manifest is the canonical contract; invalid = not shipped.
- **Registry update fails:** halt — consult `registry-governance.md` advisory mode. Do not ship until registries are consistent.
- **Downstream squad unknown:** default to `external` consumer; flag in handoff notes for manual routing.
- **Business manifest conflict** (entry exists with different content hash): ask user — overwrite, append with new version, or halt.

## Success Criteria

- [ ] Final artifact exists at `{output_dir}/final/`
- [ ] `manifest.yaml` is schema-valid
- [ ] Business `manifest.yaml` updated correctly
- [ ] `handoff-downstream.yaml` written with `status: pending` and `handoff_id`
- [ ] Affected registries updated (or no registry changes needed — explicit either way)
- [ ] Learning log emitted
- [ ] Pipeline state = complete

## Anti-Patterns

- **Skip business manifest update** — artifact becomes undiscoverable
- **Hardcoded handoff_id** — must be unique per artifact per run
- **Silent registry update** — registry governance rule requires visible update per push
- **Defer learning log** — "I'll write it later" = never. Write it now while context is warm.

## SINKRA Contract

Domain: Tactical
atomic_layer: Molecule (P08 of design-artifact-cycle)
executor: design-chief
Input:
- verified_artifact
- score_card
- brief_artifact
- convergence_decision
Output:
- final_artifact
- artifact_manifest
- business_manifest_entry
- downstream_handoff
- learning_log
pre_condition:
- P07 verdict PASS or CONCERNS_WAIVED
post_condition:
- artifact discoverable via business manifest
- handoff pending for downstream consumer
- learning log written
- registries consistent
performance:
- full handoff in < 30 seconds (no heavy compute)
- manifest schema validation blocking if fails

## Related

- File governance: `squads/design-ops/data/artifact-file-governance.yaml#asset_registration`
- Deliverable registry: `squads/design-ops/data/deliverable-kinds-registry.yaml`
- Skill: `.claude/skills/design-artifact-cycle/SKILL.md#phase-08`
