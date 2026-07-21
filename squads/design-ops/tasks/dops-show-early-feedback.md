# Show Early Skeleton for Feedback (Phase 05 — SHOW EARLY)

> Task ID: dops-show-early-feedback
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[dops-generate-variants]` · enables: `[dops-iterate-artifact]` · workflow: `design-artifact-cycle`

## Description

Render the converged variant as a working skeleton — structural, interactive, unpolished — and request feedback before investing iteration budget in polish. Feedback here is DIRECTIONAL (approve | revise | restart | abandon), not detailed.

## Output Schema

- **produces:**
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/skeleton/`
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/show-early-feedback.yaml`
- **consumed_by:** dops-iterate-artifact (or loops back to dops-generate-variants on RESTART)

## Prerequisites

- Convergence decision recorded (`convergence.yaml`)
- Variants generated (`variants/variant-N/`)

## Workflow

### Steps

1. **Select the converged variant** from `convergence.yaml#converged_variant_id`.

2. **Render as skeleton** — NOT as polished artifact:
   - Structure: all primary regions present
   - Interaction: primary flows work (click, input, state change)
   - Styling: baseline tokens applied; no pixel-polish yet
   - Content: real content from brief, not lorem ipsum
   - Variants/states: primary state only (one hover, one focus — not exhaustive)
   - Skip for now: subtle motion, edge-case empty states, error states (those belong to P06)

3. **Write skeleton** to `{output_dir}/skeleton/`.

4. **Present to user/requester** with explicit expectation framing:
   ```
   ## Show Early — {artifact_slug}

   **Converged direction:** {variant_id}
   **Rationale:** {from convergence.yaml#rationale}
   **Tiebreaker:** {success_criteria[N] referenced}

   **This is the STRUCTURE, not the POLISH.**

   Please respond with ONE of:
     - APPROVE_DIRECTION — proceed to ITERATE (polish + tweaks)
     - REVISE_DIRECTION  — proceed to ITERATE with your specific feedback
     - RESTART_BUILD     — the direction is wrong; regenerate variants
     - ABANDON           — stop; this brief is not producing value
   ```

5. **Collect response** and record in `show-early-feedback.yaml`:
   ```yaml
   decision: APPROVE_DIRECTION | REVISE_DIRECTION | RESTART_BUILD | ABANDON
   feedback_text: "..."
   collected_at: "{timestamp}"
   restart_count: {int}  # 0 on first entry; incremented on RESTART loopback
   ```

6. **Route based on decision:**
   - APPROVE → TaskUpdate(P05, completed); proceed to P06
   - REVISE → TaskUpdate(P05, completed with revision notes); proceed to P06
   - RESTART (< 3 attempts) → TaskUpdate(P05, pending restart); loop back to P04
   - RESTART (>= 3 attempts) → escalate to user: "Direction-finding is failing; re-check brief alignment"
   - ABANDON → TaskUpdate(P05, cancelled); emit cancelled outcome

## Failure Handling

- **User does not respond in reasonable time:** pause state; artifact stays at P05 until user engages
- **User responds with polish-level feedback instead of direction-level:** re-frame the question — "That's polish-level feedback, which belongs to ITERATE. For SHOW EARLY, which DIRECTION: approve, revise, restart, or abandon?"
- **3 consecutive RESTARTs:** escalate — something is wrong with the brief or the exploration axes

## Success Criteria

- [ ] Skeleton rendered and persisted
- [ ] Feedback collected as one of {APPROVE, REVISE, RESTART, ABANDON}
- [ ] `show-early-feedback.yaml` written
- [ ] Next phase routed correctly

## Anti-Patterns

- **Polished skeleton** — defeats the purpose. Show structure; hold polish for ITERATE.
- **Lorem ipsum content** — use real content from brief; fake content produces fake feedback.
- **Multiple "almost ready" variants at SHOW EARLY** — convergence already happened at P04; one variant moves forward.
- **Skipping SHOW EARLY "to save time"** — then you save time running the wrong direction to completion. SHOW EARLY is the cheapest course correction in the cycle.
- **Accepting vague approval** — "looks good" is not an APPROVE_DIRECTION; pin it to the specific framing.

## SINKRA Contract

Domain: Tactical
atomic_layer: Molecule (P05 of design-artifact-cycle)
executor: design-chief
Input:
- converged_variant
- convergence_decision
Output:
- skeleton_artifact
- show_early_feedback_artifact
pre_condition:
- P04 completed with convergence decision
post_condition:
- direction decision recorded
- next phase routed
performance:
- skeleton render fast (< 5 min typical)
- feedback collection non-blocking for other work

## Related

- Rule: `squads/design-ops/rules/design-exploration-cycle.md#5-show-early-feedback-before-polish`
- Heuristic: HEUR-CLAW-004 in `design-heuristics-from-external-prompts.yaml`
- Skill: `.claude/skills/design-artifact-cycle/SKILL.md#phase-05`
