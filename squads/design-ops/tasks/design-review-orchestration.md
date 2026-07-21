# Design Review Orchestration - DS-Only

> Task ID: design-review-orchestration
> Owner: `design-chief`
> Version: 2.0.0

## Purpose

Coordinate structured reviews for design-system deliverables only.

## Supported Deliverables

- token schema updates
- component additions/changes
- accessibility audit outputs
- registry/metadata changes
- migration strategy documents

## Review Matrix

```yaml
token_change:
  lead: "@design-chief"
  secondary: []
  focus:
    - semantic consistency
    - migration impact

component_change:
  lead: "@design-chief"
  secondary: []
  focus:
    - atomic fit
    - a11y compliance
    - adoption cost

designops_change:
  lead: "@design-chief"
  secondary: []
  focus:
    - operating model impact
    - tooling/rollout viability

adoption_pitch:
  lead: "@design-chief"
  secondary: []
  focus:
    - stakeholder clarity
    - execution feasibility
```

## Workflow

1. Validate deliverable type is DS-only.
2. Build review brief with:
   - objective
   - constraints
   - changed artifacts
   - acceptance criteria
3. Trigger lead + secondary review.
4. Synthesize findings into one decision.
5. Emit remediation plan if not approved.

## Decision States

- `APPROVED`
- `APPROVED_WITH_NOTES`
- `NEEDS_REVISION`
- `REJECTED`

## Output Contract

```yaml
review_result:
  deliverable_type: "token_change|component_change|designops_change|adoption_pitch"
  decision: "APPROVED|APPROVED_WITH_NOTES|NEEDS_REVISION|REJECTED"
  findings:
    - severity: "high|medium|low"
      summary: "..."
      owner: "@agent"
  next_actions:
    - "..."
```


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

Domain: Strategic
atomic_layer: Atom
executor: design-chief
Input:
- project_context
- design_system_context
Output:
- design_review_orchestration_artifact
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
