---
task: generateRoadmap()
responsavel: "@shield"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: prioritized_findings
    tipo: array
    origem: triageFindings output
    obrigatorio: true

Saida:
  - campo: roadmap
    tipo: markdown
    destino: Console / File
    persistido: true

Checklist:
  - "[ ] Group findings by phase (0-3)"
  - "[ ] Estimate effort per item"
  - "[ ] Assign responsible team/person"
  - "[ ] Generate timeline"
  - "[ ] Output roadmap document"
---

# Generate Remediation Roadmap

## Purpose

Transform prioritized findings into an actionable remediation roadmap with phases, effort estimates, and assignments.

## Phases

| Phase | Name | SLA | Criteria |
|-------|------|-----|----------|
| 0 | Emergency | 24-48h | CVSS >= 9.0 OR active PII breach |
| 1 | Urgent | 1-2 weeks | CVSS 7.0-8.9 OR auth/access control |
| 2 | Planned | 2-4 weeks | CVSS 4.0-6.9 OR configuration issues |
| 3 | Hardening | 3+ months | CVSS < 4.0 OR architectural improvements |

## Output Format

```markdown
# Remediation Roadmap — {app_name}
Generated: {date}

## Phase 0 — Emergency (24-48h)
Total effort: ~Xh

| # | Action | Effort | Finding | Owner |
|---|--------|--------|---------|-------|
| 1 | {action} | {time} | {id} | {who} |

## Phase 1 — Urgent (1-2 weeks)
...

## Phase 2 — Planned (2-4 weeks)
...

## Phase 3 — Hardening (3+ months)
...
```
