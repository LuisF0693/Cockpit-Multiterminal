# Task: Validate Product Idea (Composed Molecule)

```yaml
id: validate-product-idea
name: "Validate Product Idea"
category: product-discovery
agent: research-chief
elicit: true
autonomous: false
type: molecule
description: "Composed product-validation pipeline with 4 atoms (JTBD → Mom Test → Villain → WTP Smoke Test) and a composite GO/NO-GO decision gate."
```

## Contrato SINKRA

Domain: `Operational`

task: validateProductIdea()
responsavel: spy
responsavel_type: Agent
atomic_layer: Molecule
Entrada:
- `idea_statement`: 1-3 sentence description
- `target_audience`: who suffers
- `tentative_price`: candidate price
- `available_traffic`: reachable people for smoke test
- `competitor_solutions?`: list of 3-5 (optional, agent surfaces via OSINT if absent)
Saida:
- `outputs/research/product-discovery/{run-slug}/` directory with:
  - `metadata.yaml` — observatory contract (slug, date, status, coverage, sources)
  - `decision.yaml` — composite verdict + per-atom scores
  - `00-input.md` — original idea statement + context
  - `01-jtbd.md` — from `pd-jtbd-validate`
  - `02-mom-test.md` — from `pd-mom-test-interview`
  - `03-villain.md` — from `pd-villain-mapping`
  - `04-wtp-smoke-test.md` — from `pd-wtp-smoke-test`
  - `synthesis.md` — composite narrative + GO/NO-GO + next-wave handoff
Inputs: ver bloco `Entrada`
Outputs: ver bloco `Saida`
Pre-conditions: ver `pre_condition`
Post-conditions: ver `post_condition`
Performance: ver `performance`
Error Handling: ver `error_handling`

Checklist:
- `checklists/product-discovery-gates.yaml`
- All 4 atoms reach a verdict (GO | NEEDS-REWORK | NO-GO | STRONG GO)
- Composite decision computed per matrix
- Synthesis cross-references corroborate (e.g., mom-test pains ↔ villain evidences)
- Observatory `metadata.yaml` emitted with required fields
pre_condition: idea statement + target audience + tentative price + reachable traffic all provided
post_condition: complete dossier persisted + handoff manifest emitted (downstream consumer = Wave 1 STORY-SPY-PD.2 if STRONG GO/GO)
performance: composite STRONG GO requires all 4 atoms GO + WTP showing ≥1 paying customer
error_handling: "on_fail: HALT molecule, preserve atoms completed, emit partial-dossier handoff with reason; never overwrite prior runs"

## Task Anatomy

| Field | Value |
|-------|-------|
| **Task ID** | `validate-product-idea` |
| **Version** | `1.0.0` |
| **Status** | `active` |
| **Responsible Executor** | `spy` (orchestrator) |
| **Execution Type** | `Composed` |

## Atoms

| # | Atom | Agent | GO threshold |
|---|---|---|---|
| 1 | `pd-jtbd-validate` | `sackett` | ≥80% understanding + ≥3 same problem |
| 2 | `pd-mom-test-interview` | `klein` | ≥10 interviews + ≥5 insights + ≥3 corroborated pains |
| 3 | `pd-villain-mapping` | `bench-analyst` | ≥20 evidences + cross-tier pattern + Mom Test alignment |
| 4 | `pd-wtp-smoke-test` | `gilad` | ≥10% payment-attempt OR ≥5 pre-sales |

## Composite GO/NO-GO Matrix

| Atom verdicts | Composite | Action |
|---|---|---|
| All 4 GO + WTP ≥1 paying | **STRONG GO** | Proceed to MVP / Wave 1 with high confidence |
| All 4 GO without paying customer | **GO** | Proceed; treat fundraise as risk |
| 3/4 GO + clear remediation on failing atom | **CONDITIONAL GO** | Re-run failing atom; do NOT proceed downstream until resolved |
| ≤2 GO | **NO-GO** | Pivot or kill; document learnings; do not proceed |

## Workflow Reference

Sequence and DAG are declared in `squads/research/workflows/wf-product-discovery.yaml`.

Execution order (strict, no parallelism — downstream atoms consume upstream verdicts):

```
pd-jtbd-validate
    └─[GO]─> pd-mom-test-interview
                  └─[GO]─> pd-villain-mapping
                                └─[GO]─> pd-wtp-smoke-test
                                              └─> COMPOSITE DECISION
```

Any atom returning NEEDS-REWORK loops back without advancing. NO-GO halts pipeline.

## Persistence Contract

All outputs persist under `outputs/research/product-discovery/{run-slug}/`. The `metadata.yaml` follows the observatory contract:

```yaml
slug: "{kebab-case-of-idea}"
title: "Product Discovery — {idea_short_title}"
displayTitle: "{idea_full_title}"
date: "{YYYY-MM-DD}"
category: "product-discovery"
schema: "product-discovery-v1"
status: "completed | in-progress | halted | needs-rework"
coverage: "{composite_score}"
files: {count}
waves: 1
sources: {evidence_count_sum}
active: true
wave: 0
verdict: "STRONG_GO | GO | CONDITIONAL_GO | NO_GO | IN_PROGRESS"
```

This shape feeds `apps/aiox-brandbook/src/components/observatory/adapters/product-discovery.ts` for the `/observatory/product-discovery/` route.

## References

- `squads/research/data/product-discovery-framework.md` — canonical reference for all 8 protocols
- `squads/research/workflows/wf-product-discovery.yaml` — DAG declaration
- `squads/research/templates/product-discovery-report-tmpl.md` — dossier template
- `squads/research/checklists/product-discovery-gates.yaml` — quantitative gates
- Adjacent skill: `/tech-research --product-discovery` — research helper that feeds the molecule with villain OSINT, blue ocean, competitive landscape

---

Completion Criteria: dossier persisted + metadata.yaml emitted + decision.yaml emitted + downstream handoff (if STRONG GO/GO) written to `outputs/research/product-discovery/{run-slug}/handoff-wave1.yaml`

---

accountability:
  accountable: "Human (Process Owner)"
  responsible: "research-chief"
  consulted: [research-chief]
  informed: [research-operator]
