# Verify Artifact via Checklist Battery (Phase 07 — VERIFY)

> Task ID: dops-verify-artifact
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[dops-iterate-artifact]` · enables: `[dops-handoff-artifact]` · workflow: `design-artifact-cycle`

## Description

Run every applicable validator and checklist against the iterated artifact. Compute a compliance score, count BLOCKER/CRITICAL violations, and halt handoff if thresholds are not met. Verification is additive to iteration, not a replacement — P06 got us here; P07 confirms or rejects.

## Output Schema

- **produces:**
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/verification-report.md`
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/score-card.yaml`
- **consumed_by:** dops-handoff-artifact (on pass) OR dops-iterate-artifact (on fail loopback)

## Prerequisites

- Artifact at POPULATED-readiness (from P06)
- All canonical rules/checklists/scripts available in `squads/design-ops/`

## Workflow

### Run Validator Battery (in parallel where possible)

| # | Validator | Source | Applies To Kind | Blocking |
|---|-----------|--------|-----------------|----------|
| 1 | AI-trope | `checklists/dops-ai-trope-guardrails.yaml` | all | YES |
| 2 | Component quality | `checklists/dops-component-quality.yaml` | component | YES |
| 3 | A11y WCAG AA | `checklists/dops-accessibility-wcag-aa.yaml` | all | YES |
| 4 | A11y release gate | `checklists/dops-a11y-release-gate.yaml` | all | YES |
| 5 | Generative pipeline | `checklists/dops-generative-pipeline-gate.yaml` | component, html_prototype | YES |
| 6 | Workspace contracts | `scripts/validate-workspace-contracts.cjs` | all | YES |
| 7 | Token pipeline | `scripts/validate-token-pipeline.cjs` | all | YES |
| 8 | Brandbook contrast | `scripts/validate-brandbook-contrast.cjs` | all | YES |
| 9 | Motion coverage | `scripts/validate-motion-coverage.cjs` | deck, animation, page | YES |
| 10 | Components metadata | `scripts/validate-components-metadata.cjs` | component | YES |
| 11 | Design manifest drift | `scripts/validate-design-manifest-drift.cjs` | all | YES |
| 12 | A11y integration | `scripts/validate-a11y-integration.cjs` | all | YES |
| 13 | Lint | `npm run lint` | component, page, dashboard, email | YES |
| 14 | Typecheck | `npm run typecheck` | component, page, dashboard, email | YES |
| 15 | YAML changed | `npm run validate:yaml:changed` | all | YES |
| 16 | Responsive render per viewport | brief.verification.responsive_targets | all | YES |
| 17 | Console errors (for Wave C kinds) | forked verifier or manual | html_prototype, deck | ADVISORY (Wave C) |

### DS Fidelity Audit (from design-system-fidelity.md R1-R8)

Separately run an audit against the R1-R8 rules — check for:
- R1 — Read-not-recall: scan for hardcoded token-looking values not backed by `ds-context.yaml`
- R2 — Exact values: scan for approximate hex codes, arbitrary spacing (`[17px]`), non-token font stacks
- R3 — From-scratch avoided: convergence decision cites prior art consulted
- R4 — Context-first: brief exists, contracts resolved
- R5 — Visual vocabulary: manual review flag (automated detection future work)
- R6 — Consistency model applied: reference-first vs copy-first correct per kind
- R7 — No harmonic invention: no oklch values without gate documentation
- R8 — Freeze-on-handoff: inlined values match `ds-context.yaml` at artifact creation time

### Compute Score Card

```yaml
# score-card.yaml
artifact_slug: "{slug}"
verification_timestamp: "{ISO-8601}"

ai_trope:
  total_checks: 38
  passed: {int}
  failed: {int}
  compliance_percent: {float}

component_quality:  # only if kind=component
  total_checks: 48
  passed: {int}
  failed: {int}
  compliance_percent: {float}

a11y:
  wcag_aa_pass: {bool}
  contrast_min_ratio: {float}
  keyboard_reachable: {bool}
  focus_visible: {bool}

ds_fidelity:
  r1_read_not_recall: {PASS|FAIL|ADVISORY}
  r2_exact_values: {PASS|FAIL|ADVISORY}
  # ... all 8

responsive:
  viewports_tested: [360, 768, 1280]
  horizontal_scroll: {none|mobile-only|desktop-only|all}
  overflow_issues_count: {int}

violations:
  blocker: {int}
  critical: {int}
  high: {int}
  medium: {int}
  low: {int}

overall_compliance_score: {0-100}
verdict: PASS | CONCERNS | FAIL
```

### Gate Evaluation

| Verdict | Criteria |
|---------|----------|
| PASS | compliance ≥ 80 AND blocker = 0 AND critical = 0 AND all responsive render clean AND all a11y pass |
| CONCERNS | compliance ≥ 70 AND blocker = 0 AND critical ≤ 2 AND user reviews and waives |
| FAIL | any blocker > 0, OR critical > 2, OR compliance < 70 |

## Routing Logic

| Verdict | Next Phase |
|---------|-----------|
| PASS | P08 HANDOFF |
| CONCERNS | surface to user; if waived → P08 with waiver_note; else → P06 ITERATE |
| FAIL | route back to P06 ITERATE with specific violations; if already 3 P06 rounds → escalate, may route to P04 for fundamental re-architecture |

## Failure Handling

- **Compliance < 80 after 3 P06 rounds:** escalate. May indicate contract-level issue (token extension needed, or brief was infeasible).
- **BLOCKER violation (e.g. hardcoded color):** hard block handoff; return to P06 with violation detail.
- **Responsive fails on one viewport:** return to P06 with viewport-specific feedback; do not halt entire pipeline.
- **A11y fail:** never waivable. Return to P06 until a11y passes.

## Success Criteria

- [ ] All applicable validators ran (no skipped checks without explicit rationale in report)
- [ ] `score-card.yaml` complete with all sections
- [ ] `verification-report.md` enumerates every failure with fix hint
- [ ] Verdict = PASS | CONCERNS | FAIL determined deterministically
- [ ] Routing decision recorded

## Anti-Patterns

- **Skipping a11y check to ship faster** — never acceptable. WCAG AA is the floor.
- **Accepting "CONCERNS" by default** — CONCERNS requires explicit user waiver with reason.
- **Re-running P07 without fixing P06 violations** — validation is deterministic; same input = same output. Fix the input.
- **Computing compliance by averaging — without weighting blockers** — a BLOCKER at 1% weight is still a blocker. Weighted averages hide severity.

## SINKRA Contract

Domain: Tactical
atomic_layer: Molecule (P07 of design-artifact-cycle)
executor: design-chief
Input:
- iterated_artifact
- brief_artifact
- ds_context_artifact
Output:
- verification_report
- score_card
- verdict (PASS | CONCERNS | FAIL)
pre_condition:
- artifact at POPULATED-readiness
post_condition:
- all applicable validators have run
- verdict determined
- routing decided
performance:
- parallelize independent validators
- typical total wall-clock < 3 minutes for component kind

## Related

- Checklists: all under `squads/design-ops/checklists/`
- Scripts: all `validate-*.cjs` under `squads/design-ops/scripts/`
- Rule: `squads/design-ops/rules/design-system-fidelity.md`
- Heuristic: HEUR-CLAW-050 (Verify after done, not instead of done)
- Skill: `.claude/skills/design-artifact-cycle/SKILL.md#phase-07`
