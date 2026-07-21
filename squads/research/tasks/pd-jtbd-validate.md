# Task: Product Discovery — JTBD Validation

## Contrato SINKRA

Domain: `Operational`

task: pdJtbdValidate()
responsavel: sackett
responsavel_type: Agent
atomic_layer: Atom
Entrada:
- `idea_statement`: 1-3 sentence description of the product idea
- `target_audience`: who suffers the problem
- `proposed_jtbd?`: optional pre-existing JTBD to validate (else: generate)
Saida:
- `outputs/research/product-discovery/{run-slug}/01-jtbd.md` with JTBD statement, 3 variations, quality scorecard, validation script, validation results
Inputs: ver bloco `Entrada`
Outputs: ver bloco `Saida`
Pre-conditions: ver `pre_condition`
Post-conditions: ver `post_condition`
Performance: ver `performance`
Error Handling: ver `error_handling`

Checklist:
- `checklists/product-discovery-gates.yaml#jtbd`
- JTBD statement matches canonical format
- 3 variations generated (short/medium/detailed)
- 10 target users contacted (real WhatsApp/LinkedIn or AI proxy)
- Cross-validation by 2nd LLM completed
pre_condition: idea statement provided + target audience defined
post_condition: 01-jtbd.md persisted with quantitative scorecard + understanding %
performance: ≥80% understanding rate of validated JTBD across 10 contacts is the GO threshold
error_handling: "on_fail: HALT atom, emit recovery handoff to parent molecule with JTBD variations generated so far"

## Metadata

```yaml
id: pd-jtbd-validate
parent_task: validate-product-idea
category: product-discovery-atom
agent: sackett
elicit: true
autonomous: false
description: "Formulates and validates a Jobs-To-Be-Done statement targeting ≥80% understanding among 10 users."
```

## Why sackett

Tier 0 question formulation. PICO structure (Population, Intervention, Comparison, Outcome) maps cleanly to JTBD structure (Situation, Motivation, Outcome). Sackett owns evidence-based question framing inside spy v4.0 — JTBD is the product-discovery flavor of the same primitive.

## Steps

1. **Read source framework:** `squads/research/data/product-discovery-framework.md` § Protocol 1 — JTBD Validation
2. **Generate or refine JTBD:** if `proposed_jtbd` provided, score it against quality checklist; else generate 3 variations using canonical format.
   - Format: `"When [situation with real data], I want [quantified motivation], so that I can [measurable outcome]."`
3. **Apply Quality Scorecard:** score each variation on 5 criteria (specific situation / concrete numbers / clear motivation / measurable outcome / accessible language). Each 0-10.
4. **Generate WhatsApp/LinkedIn validation script:** standard 1-tap question with 3 options (understood perfectly / understood somewhat / not clear) + open follow-up for option 2/3.
5. **Generate AI cross-validation prompt:** structured prompt for a 2nd LLM (Claude/Gemini) to score the 4 dimensions (situation clarity / motivation specificity / outcome measurability / language accessibility) on 0-10 + 2 improvement suggestions.
6. **Run validation:** present the validation script + AI prompt to the user for execution against 10 target contacts. Accept user-pasted results or AI-simulated proxy (only if `--simulated` flag is set; default is real-user mode).
7. **Compute GO/NO-GO:** apply the threshold rule (≥80% understanding + ≥3 contacts have exactly that problem). Output verdict.
8. **Persist:** write `01-jtbd.md` to `outputs/research/product-discovery/{run-slug}/` with all evidence, scores, and verdict.

## Acceptance Criteria

- 3 JTBD variations generated and scored
- WhatsApp script and AI cross-validation prompt emitted
- Validation results captured (real or proxy with proxy flag declared)
- Quantitative verdict: GO (≥80% understanding + ≥3 corroborated pain) | NO-GO | NEEDS-REWORK
- `01-jtbd.md` persisted with all sections

## GO/NO-GO Threshold

| Result | Verdict |
|---|---|
| <60% understanding | NO-GO — redo statement from scratch |
| 60-79% | NEEDS-REWORK — adjust language and re-test |
| ≥80% + ≥3 reported same problem | GO — proceed to Mom Test atom |
| ≥80% + <3 reported same problem | NEEDS-REWORK — audience mismatch, refine target_audience |

## References

- `squads/research/data/product-discovery-framework.md` § Protocol 1
- Source: Christensen, *Competing Against Luck* (2016)
- Adjacent atom: `pd-mom-test-interview` (next in pipeline after GO)

---

Completion Criteria: artifact concluded, validated against checklist, ready for molecule synthesis

---

accountability:
  accountable: "Human (Process Owner)"
  responsible: "sackett"
  consulted: [research-chief]
  informed: [research-operator]
