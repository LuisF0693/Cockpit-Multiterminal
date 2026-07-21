# Governance-Execution Boundary Protocol

## Purpose

Define the strict boundary between governance (rule-making) and execution (rule-using) within the Design Squad.

## Principle

> "Governance creates, execution uses."

No execution agent may create new governance artifacts (rules, tokens specs, protocols, checklists). No governance agent should implement components or run audits directly.

## Ownership Matrix

### Active Provider Agent

| Agent | Owns | Creates / Orchestrates |
|-------|------|------------------------|
| @design-chief | Orchestration, routing, provider triage | Quality gate definitions, routing rules, sequencing of provider capabilities |

### Brownfield Capability Sources

The following names remain relevant only as historical capability sources during
the Phase 1 cleanup and should not be treated as active provider agents:

- `@brad-frost`
- `@dave-malouf`
- `@dan-mall`
- `@nano-banana-generator`

## Artifact Ownership

| Artifact Type | Owner (Governance) | Consumer (Execution) |
|---------------|-------------------|---------------------|
| Token specifications | @design-chief | Provider tasks, templates e docs |
| Component matrix | @design-chief | Provider tasks e docs |
| WCAG checklists | @design-chief | Provider tasks e checklists |
| Prompt injection templates | @design-chief | Provider capabilities |
| Registry schema | @design-chief | Provider tasks e docs |
| Handoff protocols | @design-chief | Provider and cross-squad flows |
| Visual specs | Outside active provider shape | Routed fora do provider quando aplicável |

## Decision Escalation

1. **Execution agent needs new rule** → Request to @design-chief
2. **Governance conflict** → @design-chief mediates
3. **Cross-squad governance** → Follow handoff protocol
4. **Emergency override** → @design-chief with documented justification

## Enforcement

- Agents MUST check their role before creating artifacts
- Governance agents MUST NOT implement code directly
- Execution agents MUST cite governance source for every decision
- Violations are logged and reviewed in squad retrospectives

## Related

- [AI-First Governance](ai-first-governance.md)
- [Handoff Protocol](handoff.md)
