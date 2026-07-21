# Materialize Design Brief (Phase 01 — ASK)

> Task ID: dops-materialize-brief
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[]` · enables: `[dops-resolve-ds-context]` · workflow: `design-artifact-cycle`

## Description

Materialize a structured design brief from the intake template, invoking the questions_v2-equivalent protocol for any unanswered field. The brief is the contract that every downstream phase depends on — an under-specified brief poisons the entire pipeline.

## Output Schema

- **produces:** `outputs/design-ops/{business}/artifacts/{artifact_slug}/brief.yaml`
- **format:** YAML matching `squads/design-ops/templates/design-brief-intake-tmpl.yaml`
- **consumed_by:** dops-resolve-ds-context, dops-capture-assumptions, dops-generate-variants, all downstream phases

## Prerequisites

- **Template available:** `squads/design-ops/templates/design-brief-intake-tmpl.yaml`
- **Protocol available:** `squads/design-ops/data/questions-intake-protocol-spec.yaml`
- **Output dir** exists at `outputs/design-ops/{business}/artifacts/{artifact_slug}/`
- **Workspace contracts resolvable** for the target business (at least `tokens.yaml`)

## Workflow

### Interactive Elicitation

1. **Load template** — read `templates/design-brief-intake-tmpl.yaml` as schema.
2. **Pre-fill known values** from skill arguments (business, kind, description).
3. **Detect unanswered fields** — anything left blank or placeholder.
4. **For each unanswered field, invoke the questions protocol** (`data/questions-intake-protocol-spec.yaml`):
   - Pick the correct `question_kind` (text_options, svg_options, slider, file, freeform).
   - For `text_options`/`svg_options`: ALWAYS include the mandatory escape-hatch options ("Explore a few options", "Decide for me", "Other").
   - Order questions most-important-first (see protocol#ordering).
   - Err toward verbose — "too many > too few".
5. **Collect answers** and populate the brief.
6. **Write** to `{output_dir}/brief.yaml`.

### Steps

1. **Validate Prerequisites**
   - Template exists and is parseable
   - Output dir exists and is writable
   - Tokens source resolves via `ds-discovery-paths.yaml`
   - Check: all three conditions pass

2. **Pre-fill Known Values**
   - `context.business_slug` ← skill arg `--business`
   - `context.surface_type` ← skill arg `--kind`
   - `context.surface_name` ← skill positional arg `description`
   - `contracts.tokens_source` ← resolved path
   - `exploration.ai_trope_guardrails_ref` ← canonical checklist path

3. **Detect Gaps**
   - Every `""` field → candidate for question
   - Every `[]` field → candidate for question
   - Validation rules from template's `meta.validation_rules` — ensure each is satisfiable before release

4. **Invoke Questions Protocol**
   - Apply priority heuristic (kind > palette > posture > audience > decorative)
   - For each question: construct payload per `question_kinds` spec
   - Display to user; collect response
   - Persist answer into brief

5. **Divergence Posture Gate (for component kind)**
   - If `kind=component` AND `exploration.variants_required` unset:
     - Ask: "DS-first only, novel variants, or a mix?"
     - Map answer → `variants_required` (1, 3, or 3 with `exclude_patterns` populated)
   - For non-component kinds: apply kind-aware default from `ds-consistency-policy.md#divergent-exploration-kind-aware-policy`

6. **Validate Brief**
   - `brief.problem_statement` non-empty
   - `brief.success_criteria` length ≥ 3
   - `audience.device_mix` non-empty
   - `contracts.tokens_source` resolves
   - `exploration.variants_required` numeric and ≥ 1

7. **Write Brief**
   - `saveFile(brief_path, brief_yaml)`
   - Emit completion event with counts (criteria_count, questions_asked)

## Failure Handling

- **Tokens missing:** Halt. Direct user to `wf-brandbook-workspace-extraction`.
- **Less than 3 success_criteria after 3 asks:** Halt. Do not silent-fill. Emit `cancelled_incomplete_brief`.
- **User answers "Decide for me" on divergence posture for component:** record default `variants_required: 1` (DS-first).
- **User answers "Other" with non-parseable input:** re-ask with freeform, then validate.

## Success Criteria

- [ ] Brief file exists at correct path
- [ ] Brief passes template validation rules
- [ ] ≥ 3 success_criteria present
- [ ] Tokens source resolves
- [ ] Device mix non-empty
- [ ] Divergence posture recorded (for component kind)

## Anti-Patterns

- **Silent defaults** — filling a field because the user did not answer. ALWAYS ask.
- **Single question then assume** — users answer the first question; that does not authorize assumptions about the rest.
- **Dropping escape hatches** — every text-options question MUST include "Explore", "Decide for me", "Other".
- **Priority inversion** — decorative questions before kind/palette/audience. Wrong order wastes the user's first few answers.

## SINKRA Contract

Domain: Tactical
atomic_layer: Molecule (P01 of design-artifact-cycle)
executor: design-chief
Input:
- skill_arguments
- design_brief_intake_template
- questions_intake_protocol_spec
Output:
- design_brief_artifact
pre_condition:
- output dir exists
- tokens source resolves
post_condition:
- brief materialized and validated
- ≥ 3 success_criteria
- divergence posture set
performance:
- number of questions asked proportional to brief gaps
- zero silent defaults

## Related

- Template: `squads/design-ops/templates/design-brief-intake-tmpl.yaml`
- Protocol: `squads/design-ops/data/questions-intake-protocol-spec.yaml`
- Rule: `squads/design-ops/rules/design-exploration-cycle.md#1-ask`
- Policy: `squads/design-ops/rules/ds-consistency-policy.md#divergent-exploration-kind-aware-policy`
- Skill: `.claude/skills/design-artifact-cycle/SKILL.md#phase-01`
