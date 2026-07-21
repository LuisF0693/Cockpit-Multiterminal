# Design Triage - Design System Scope Gate

> Task ID: design-triage
> Owner: `design-chief`
> Version: 2.1.0
> ADR ref: ADR-052 (DS Taxonomy Layers — ACCEPTED-WITH-CONDITIONS)

## Purpose

Classify incoming requests on TWO axes and route them correctly:

1. **Scope axis** — in-scope vs out-of-scope (existing behavior)
2. **Atomic-layer axis** — Foundations | Atom | Molecule | Organism | Layout | Page | Pattern (NEW, per ADR-052)

Output:
- in-scope -> execute inside `squads/design-ops` with declared atomic layer
- out-of-scope -> handoff to `squads/brand` or `squads/content-visual`

## Inputs

- `request`: user request text
- `context` (optional): constraints, deadline, stack, existing artifacts

## Classification

```yaml
in_scope:
  - design system
  - component architecture
  - tokens
  - atomic refactor
  - accessibility/wcag/aria
  - registry/metadata/mcp
  - designops for design system

out_of_scope_brand:
  - brand strategy
  - logo
  - pricing/proposal positioning

out_of_scope_content_visual:
  - thumbnail/youtube
  - photography/lighting
  - photo/video editing
```

## Workflow

1. Parse objective and deliverable.
2. Match against scope classification map.
3. **Phase 0 — Atomic-layer classification (NEW, per ADR-052)** — apply the falsifiable rule below.
4. If in-scope, route by domain:
   - DS architecture/tokens/components -> `@design-chief`
   - DesignOps/process/adoption model -> `@design-chief`
   - Stakeholder buy-in and DS narrative -> `@design-chief`
5. If out-of-scope:
   - brand/logo/pricing -> `/Brand`
   - thumbnail/photo/video -> `/ContentVisual`
6. Return routing decision with rationale, atomic layer, and next step.

## Phase 0 — Atomic-Layer Classification

Apply the 5-question falsifiable rule (research doc 06). First question that returns YES defines the layer.

```
1. STRUCTURE INDIVISIBLE?
   → Splitting it would lose function?
     YES → ATOM (button, input, icon, label, avatar, tag, text style)
     NO → continue ↓

2. ONE ACTION, FEW PIECES?
   → Clear single intent, 2-4 atoms, reusable as a unit?
     YES → MOLECULE (search field, account trigger, label+icon chip,
                     button group, breadcrumb, form row)
     NO → continue ↓

3. REUSABLE SECTION OF UI?
   → Section responsibility (topbar, inbox list, message reader,
     compose dialog, product grid), can appear in more than one screen,
     not the entire screen yet?
     YES → ORGANISM (top bar, inbox cluster, message surface,
                     compose dialog, quick settings panel,
                     mobile bottom nav)
     NO → continue ↓

4. LAYOUT CONTRACT WITH SLOTS?
   → Defines WHERE other things go (named slots: header, rail, main,
     aside, actions), declares responsiveness and structure, but content
     inside is placeholder or structural variation?
     YES → LAYOUT (workspace layout, article layout, PDP layout,
                   list-detail canonical layout)
                   ↳ this is what Brad Frost called "Template"
     NO → continue ↓

5. CONCRETE INSTANCE WITH REPRESENTATIVE CONTENT?
   → Final screen with realistic content, composes multiple organisms
     within a layout, a user would recognize it as "a real screen of
     the product"?
     YES → PAGE (full Gmail workspace, Medium home,
                 Amazon PDP, full mobile compose screen)
     NO → review. Probably mis-classified organism.

6. CROSS-CUTTING GUIDANCE? (separate axis, NOT a level)
   → Empty state, error state, loading, onboarding flow, date picking?
     YES → PATTERN (recipes, not concrete pieces; doc on its own)
```

**Anti-pattern detection:** if the deliverable is a "full app shell" (e.g. complete workspace with realistic data), it MUST be classified as `PAGE` or `LAYOUT` — never `ORGANISM`. This is the regression we're guarding against.

**Foundations** are not a level in the rule — they live in tokens (color, typography, spacing, motion, grid, breakpoints, icons). If the request is "extract tokens" or "audit foundations", emit `atomic_layer: foundations`.

## Output Contract

```yaml
triage_result:
  scope: "in_scope|out_of_scope"
  domain: "design-system|designops|adoption|brand|content-visual"
  atomic_layer: "foundations|atom|molecule|organism|layout|page|pattern|null"
  atomic_layer_reasoning: "which question of the 5-rule returned YES; or why null"
  route_to: "@agent-or-/Squad"
  confidence: "high|medium|low"
  rationale:
    - "matched keyword/domain"
  anti_patterns_checked:
    - "shell-as-organism: PASS|FAIL|N/A"
  next_step:
    - "exact task/workflow to start"
```

## Quality Gates

- Must declare scope explicitly.
- Must declare atomic_layer (or null with explicit reason — NO FALLBACK to "organism" when uncertain).
- Must include one clear route target.
- Must not keep out-of-scope work in this squad.
- If deliverable is a full app shell, MUST classify as PAGE or LAYOUT, not ORGANISM (anti-pattern guard).


## Related Checklists

- `squads/design/checklists/design-handoff-checklist.md`
- `squads/design/checklists/design-team-health-checklist.md`

## Process Guards
- **Execution Type:** `Hybrid`
- **Dependencies:** depends_on: `[]` · enables: `[]` · workflow: `design-system`
- **On Fail:** Stop execution, capture evidence, and return remediation steps before proceeding.

## Success Criteria
- [ ] Output artifact(s) generated and referenced.
- [ ] Validation checks executed with evidence.
- [ ] Next-step dependencies documented.

## SINKRA Contract

Domain: Tactical
atomic_layer: Atom
executor: design-chief
Input:
- project_context
- design_system_context
Output:
- design_triage_artifact
pre_condition:
- escopo do artefato e caminho alvo definidos
post_condition:
- artefato pronto para handoff e revisão
performance:
- produzir saída auditável com critérios explícitos
Completion Criteria:
- artefato principal gerado
- recomendações ou estrutura documentadas
- pronto para próximo gate
