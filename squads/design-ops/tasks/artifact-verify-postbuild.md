# Verify Artifact Post-Build (Phase 07 — VERIFY runtime)

> Task ID: artifact-verify-postbuild
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[artifact-create-html, dops-iterate-artifact]` · enables: `[dops-handoff-artifact]` · workflow: `wf-artifact-creation-loop`

## Description

Runs the verification battery defined in `dops-post-build-verification.yaml` against the iterated artifact. This is the Wave C.1 concrete runtime for Phase 07 VERIFY — wires the 12-dimension checklist into executable checks, computes a compliance score, emits the verification report and score card, and returns a PASS / CONCERNS / FAIL verdict with loopback routing.

**Render policy:** verifier renders; agent does NOT. Reconciles `HEUR-CLAW-066` (agent should not proactively screenshot) vs Phase 07 (must validate at every declared viewport). See `dops-post-build-verification.yaml#render_policy`.

## Output Schema

- **produces:**
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/verification-report.md`
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/score-card.yaml`
- **consumed_by:** `dops-handoff-artifact` (handoff is blocked until PASS or CONCERNS+waiver)

## Prerequisites

- `{output_dir}/artifact/` exists with an iterated artifact
- `{output_dir}/brief.yaml` has `verification.responsive_targets` declared
- `ds-context.yaml` resolved (for DS fidelity checks R1-R8)

## Workflow

### Steps

1. **Load Verifier Checklist + Artifact Metadata**
   - Read `squads/design-ops/checklists/dops-post-build-verification.yaml` — 12 quality dimensions
   - Read `{output_dir}/asset-manifest.yaml` (or derive from variant manifests if merged)
   - Filter dimensions by `applies_to` / `conditional_check` (e.g., speaker-notes only for decks; tweak only when instrumented)

2. **Run BLOCKER-Severity Dimensions (fail-fast gates)**
   - `console_health` — render artifact at every declared viewport; assert zero errors/exceptions/404/CSP/CORS
   - `responsive_render` — render at 360/768/1280 + all brief-declared viewports; assert no horizontal scroll, no overflow, text legible at smallest
   - `accessibility_floor` — WCAG AA; contrast ratios; keyboard reachability; focus visible; landmarks; heading hierarchy
   - `workspace_contracts` — `node squads/design-ops/scripts/validate-workspace-contracts.cjs` (if present) + path-check for legacy dialect (`workspace-dialect.md`)
   - `build_integrity` — `npm run lint`, `npm run typecheck`, `npm run validate:yaml:changed`
   - `security_baseline` (for html_prototype/deck/pdf) — SRI on all CDN scripts, no `eval`/`document.write`, namespaced globals, CSP-compatible
   - Any BLOCKER violation → proceed with scoring but mark verdict path as FAIL

3. **Run HIGH-Severity Dimensions**
   - `ds_fidelity` (R1-R8 from `design-system-fidelity.md`) — no memorized tokens, exact hex values, prior art consulted, brief materialized first, visual vocabulary matches, consistency model correct, no oklch invention outside gates, inlined values match ds-context at creation
   - `ai_trope_compliance` — run `dops-ai-trope-guardrails.yaml` checklist against rendered artifact
   - `exports_validation` (for pdf/pptx) — truncation, searchable text, font rendering, dimensions

4. **Run MEDIUM-Severity Dimensions**
   - `file_governance` — size limits per kind, filename convention, asset registration fields, no prohibited patterns
   - `speaker_notes_compliance` (for decks only, when speaker notes explicitly requested)

5. **Conditional Dimension — Tweak Protocol Conformance**
   - Only when `asset-manifest.yaml#tweak_protocol.instrumented == true`:
     - Run `node squads/design-ops/scripts/validate-tweak-protocol-conformance.cjs --target {output_dir}/artifact/index.html`
     - Assert: listener-before-announce ordering, single TWEAK_DEFAULS block, strict JSON between markers, canonical event types only
     - BLOCKER severity on any violation

6. **Compute Score**
   - Apply weighting from `dops-post-build-verification.yaml#scoring`:
     - BLOCKER dimensions × 3.0
     - HIGH dimensions × 2.0
     - MEDIUM dimensions × 1.0
   - Per-dimension pass = 1.0, partial = ratio of passed checks, fail = 0.0
   - Total score normalized to 0-100 scale
   - Record per-dimension scores + checks passed/failed

7. **Emit Score Card**
   - Write `{output_dir}/score-card.yaml`:
     ```yaml
     artifact_id: {slug}
     business: {business}
     verified_at: {ISO-8601}
     checklist_version: "1.0.0"
     score: {0-100}
     verdict: PASS|CONCERNS|FAIL
     blocker_violations: {count}
     high_violations: {count}
     medium_violations: {count}
     dimensions:
       console_health: {passed: N, failed: M, score: ratio}
       responsive_render: {...}
       # ... all 12 dimensions
     loopback_target: p04-build|p06-iterate|handoff|advisory
     ```

8. **Emit Verification Report**
   - Write `{output_dir}/verification-report.md` — human-readable:
     - Summary (verdict + score + top 3 concerns if any)
     - Per-dimension table (pass/fail counts + severity)
     - Violation details (file path, line, severity, remediation hint)
     - Render evidence references (viewport + screenshot paths if captured)
     - Loopback recommendation for non-PASS verdicts

9. **Apply Verdict Resolution**
   - `PASS`: score ≥ 80 AND zero BLOCKER → proceed to `dops-handoff-artifact`
   - `CONCERNS`: score 70-79 OR BLOCKER=0 with addressable HIGH → user may waive + proceed; else loopback to p06-iterate
   - `FAIL`: score < 70 OR any BLOCKER → halt; loopback per `dops-post-build-verification.yaml#loopback` (BLOCKER → p04-build; HIGH-only → p06-iterate)

## Failure Handling

- **Verifier script missing / not yet implemented:** mark that dimension as `unvalidated` with severity=advisory; log warning; continue with remaining dimensions. Wave C.2 will fill gaps.
- **Rendered viewports fail to capture:** note capability gap; dimension marked `inconclusive`; verdict routing falls back to conservative (CONCERNS when ambiguous)
- **User waives CONCERNS verdict:** log waiver rationale in score-card; proceed to handoff; waiver surfaces in manifest
- **Multiple BLOCKER violations:** all reported; loopback target is the most upstream phase any single violation demands (BLOCKER trumps HIGH)

## Success Criteria

- [ ] `score-card.yaml` exists with all 12 dimensions scored
- [ ] `verification-report.md` exists, human-readable, every violation traced to file+line
- [ ] Verdict explicitly PASS / CONCERNS / FAIL (never ambiguous)
- [ ] Loopback target set for non-PASS verdicts (p04-build, p06-iterate, or advisory)
- [ ] Conditional dimensions correctly skipped when `applies_to` doesn't match the artifact kind
- [ ] Tweak-protocol conformance script invoked iff `tweak_protocol.instrumented == true`
- [ ] Zero silent failures — unavailable checks logged as `unvalidated`, not hidden

## Anti-Patterns

- **"Score 79.5 rounds to 80 — PASS it."** — Verdict thresholds are strict. 79.5 is CONCERNS.
- **"Skip `security_baseline` — it's only a local prototype."** — Artifacts leak to clients via shareable links. Security baseline runs regardless of intended audience.
- **"Don't render — inspect the HTML source."** — Misses runtime failures (console errors, CSP violations, overflow on narrow viewports). Render policy is non-negotiable.
- **"Combine all violations into a single summary."** — Remediation needs specific file+line+severity. A vague summary turns fixing into guessing.
- **"If lint fails, run with `--fix` and re-score."** — Autofixes may introduce regressions. Surface the violation; let Phase 06 decide.
- **"Waive BLOCKER to ship."** — BLOCKER is BLOCKER. Loop back to p04 or p06 — there is no waiver path.

## SINKRA Contract

Domain: Tactical
atomic_layer: Molecule (Phase 07 of wf-artifact-creation-loop)
executor: design-chief
Input:
- iterated_artifact (from Phase 06)
- asset_manifest
- brief_verification_targets
Output:
- score_card
- verification_report
- verdict (PASS|CONCERNS|FAIL)
- loopback_target (for non-PASS)
pre_condition:
- artifact reached POPULATED-readiness
- brief declares responsive_targets
post_condition:
- all applicable checklist dimensions executed
- weighted score computed
- verdict assigned per dops-post-build-verification#verdict_resolution
performance:
- per-dimension execution time tracked
- total verify time tracked
- violation-to-fix cycle time tracked (via ITERATE loopback feedback)

## Related

- Checklist: `squads/design-ops/checklists/dops-post-build-verification.yaml` (authoritative)
- Rule: `squads/design-ops/rules/design-system-fidelity.md` (R1-R8 for ds_fidelity dimension)
- Rule: `squads/design-ops/rules/self-contained-artifact-security.md` (security_baseline dimension)
- Script: `squads/design-ops/scripts/validate-tweak-protocol-conformance.cjs` (conditional dimension)
- Checklist: `squads/design-ops/checklists/dops-ai-trope-guardrails.yaml` (ai_trope_compliance)
- Checklist: `squads/design-ops/checklists/dops-component-quality.yaml` (component kind)
- Task (upstream): `squads/design-ops/tasks/dops-iterate-artifact.md`
- Task (downstream): `squads/design-ops/tasks/dops-handoff-artifact.md`
- Workflow: `squads/design-ops/workflows/wf-artifact-creation-loop.yaml#p07-verify`
- Skill: `.claude/skills/design-artifact-cycle/SKILL.md#phase-07`
- ADR: `docs/adrs/ADR-018-design-ops-artifact-creation-capability.md#D2` (verifier is checklist-based, not sub-agent)
