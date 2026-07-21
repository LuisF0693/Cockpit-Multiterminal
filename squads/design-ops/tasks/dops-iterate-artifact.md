# Iterate Within Chosen Direction (Phase 06 — ITERATE)

> Task ID: dops-iterate-artifact
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[dops-show-early-feedback]` · enables: `[dops-verify-artifact]` · workflow: `design-artifact-cycle`

## Description

Apply feedback from SHOW EARLY within the already-chosen direction. Iteration converges; it does not diverge. If re-exploration is needed, return to P04 — do not smuggle divergence into ITERATE.

## Output Schema

- **produces:**
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/artifact/` (current polished state)
  - Updated `{output_dir}/brief.yaml` with `change_log` entries
- **consumed_by:** dops-verify-artifact

## Prerequisites

- SHOW EARLY decision is APPROVE_DIRECTION or REVISE_DIRECTION (not RESTART or ABANDON)
- Skeleton exists

## Workflow

### Steps

1. **Load feedback** from `show-early-feedback.yaml`.
2. **Interpret feedback items** as tweak requests:
   - Polish (spacing, color, typography refinements)
   - State variants (add hover, focus, disabled, loading, error if kind requires)
   - Edge cases (empty state, long content, overflow handling)
   - Motion (transitions, animations per motion primitives)
   - Content refinements (copywriting, labels)
3. **For each tweak:**
   - Apply within the chosen direction — do NOT introduce new directions
   - Append to `brief.change_log`:
     ```yaml
     - round: {round_N}
       timestamp: "{ISO-8601}"
       applied_change: "..."
       rationale: "..."
       source: "show_early_feedback | user_ad_hoc | fidelity_violation"
     ```
4. **Iteration rounds:**
   - Soft limit: **5 rounds**
   - At round 6: surface to user — "5 rounds completed. Ship as-is, restart with new direction, or continue (opt-in)?"
5. **POPULATED-readiness check** (internal gate before exit):
   - All primary states rendered
   - Responsive behavior validated across declared breakpoints
   - Copy finalized (no placeholders left)
   - Motion primitives applied (where brief calls for them)
   - Accessibility floor met (contrast, keyboard, focus-visible)

## Routing Logic

| Condition | Next Phase |
|-----------|-----------|
| POPULATED-readiness met | P07 VERIFY |
| Round < 5 AND readiness not met | stay in P06, continue iterating |
| Round >= 5 AND readiness not met | surface decision to user (ship | restart | continue) |
| New direction needed (divergent feedback) | halt P06; route back to P04 |

## Failure Handling

- **User sends divergent feedback in P06** (e.g., "let's try a totally different layout"): reject politely — "That feedback is divergent, which belongs to BUILD. Would you like to RESTART_BUILD?"
- **Feedback contradicts brief.success_criteria:** surface contradiction — user either amends brief (loop back to P01) or retracts feedback
- **Iteration loop with no measurable progress:** after 3 rounds with no readiness improvement, surface to user — may indicate unstated success criterion

## Success Criteria

- [ ] All SHOW EARLY feedback addressed (or explicitly deferred with note)
- [ ] Artifact reaches POPULATED-readiness
- [ ] `brief.change_log` has an entry for every material change
- [ ] Iteration round count within limit OR user opted-in to continue

## Anti-Patterns

- **Divergence smuggled as iteration** — "while we're at it, let's also try..." NO. That's P04 territory.
- **Unlogged tweaks** — `change_log` exists so the next maintainer can see the direction of travel. Skipping entries creates amnesia.
- **"One more round" forever** — 5 rounds is the soft limit for a reason. Past that, ship or restart.
- **Polishing past the success criteria** — if criteria are met, ship. Chasing perfection after criteria-met is a waste.

## SINKRA Contract

Domain: Tactical
atomic_layer: Molecule (P06 of design-artifact-cycle)
executor: design-chief
Input:
- skeleton_artifact
- show_early_feedback_artifact
Output:
- iterated_artifact
- updated_brief_with_changelog
pre_condition:
- SHOW EARLY decision is APPROVE or REVISE
post_condition:
- artifact reaches POPULATED-readiness
- change_log has all material changes
performance:
- track rounds per iteration to surface soft-limit breaches
- zero divergent changes (they belong in P04)

## Related

- Rule: `squads/design-ops/rules/design-exploration-cycle.md#6-iterate`
- Rule: `squads/design-ops/rules/ai-trope-guardrails.md`
- Skill: `.claude/skills/design-artifact-cycle/SKILL.md#phase-06`
