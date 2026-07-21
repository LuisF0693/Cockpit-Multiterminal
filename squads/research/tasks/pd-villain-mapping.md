# Task: Product Discovery — Villain Mapping (Root Cause OSINT)

## Contrato SINKRA

Domain: `Operational`

task: pdVillainMapping()
responsavel: bench-analyst
responsavel_type: Agent
atomic_layer: Atom
Entrada:
- `idea_statement`
- `validated_jtbd`: from `pd-jtbd-validate`
- `mom_test_pains`: corroborated pains list from `pd-mom-test-interview`
- `competitor_solutions`: list of 3-5 known competing solutions
- `villain_hypothesis?`: optional initial suspicion of root cause
Saida:
- `outputs/research/product-discovery/{run-slug}/03-villain.md` with evidence map (≥20 evidences across 3 tiers), pattern categorization, villain confirmation matrix, root cause statement
Inputs: ver bloco `Entrada`
Outputs: ver bloco `Saida`
Pre-conditions: ver `pre_condition`
Post-conditions: ver `post_condition`
Performance: ver `performance`
Error Handling: ver `error_handling`

Checklist:
- `checklists/product-discovery-gates.yaml#villain`
- ≥20 evidences collected with full provenance (URL + date + quote)
- Sources span Tier 1 + Tier 2 (Tier 3 optional)
- Pattern categorization into 5 standard buckets (technical / functional / UX / hidden cost / structural)
- Root cause confirmed by ≥3 corroborating evidences
- Each evidence has severity score (1-10) and frequency signal
pre_condition: GO from `pd-mom-test-interview` + competitor list provided
post_condition: 03-villain.md persisted with quantified evidence map
performance: ≥20 evidences + clear cross-tier pattern = GO threshold
error_handling: "on_fail: HALT atom, preserve evidence collected so far + structured handoff with gap report"

## Metadata

```yaml
id: pd-villain-mapping
parent_task: validate-product-idea
category: product-discovery-atom
agent: bench-analyst
elicit: false
autonomous: true
description: "Maps root cause via ≥20 OSINT evidences across Reddit/G2/Trustpilot/X with sentiment + severity + frequency scoring."
```

## Why bench-analyst

Tier 1 OSINT and open-source intelligence specialist. Villain Mapping IS competitive OSINT — verifying claims, geolocating signal, doing digital forensics across community + review + social sources. bench-analyst owns the underlying primitive in spy v4.0.

## Steps

1. **Read source framework:** `squads/research/data/product-discovery-framework.md` § Protocol 3 — Villain Mapping
2. **Build source plan across 3 tiers:**
   - Tier 1 (high confidence): Reddit niche subs, G2/Capterra/Trustpilot (1-3 stars), Twitter/X complaints, LinkedIn posts
   - Tier 2 (confirmation): Quora/StackOverflow, YouTube tutorial comments, FB groups, Discord/Slack
   - Tier 3 (additional): ProductHunt, HackerNews, specialized forums
3. **Generate advanced search queries:** Google site-restricted queries, Reddit sort-by-top, X queries with verified flag, etc. Reuse spy's existing `investigate-osint` task as upstream pattern.
4. **Collect ≥20 evidences:** each evidence row contains URL, date, exact quote, agreement signal (count), severity (1-10), pattern category, screenshot link.
5. **Categorize patterns:** technical failures / functional gaps / UX friction / hidden costs / structural limitations.
6. **Build villain confirmation matrix:** suspected_cause × evidence_count × impact × frequency × solvability.
7. **Cross-validate with Mom Test pains:** every corroborated pain from atom 2 MUST appear in ≥1 villain evidence (or be flagged as a Mom Test outlier).
8. **State the villain:** single sentence root-cause statement + why it persists despite competing solutions + opportunity sizing (people affected + urgency + your viability advantage).
9. **Persist:** write `03-villain.md` with all evidence, matrix, statement.

## Acceptance Criteria

- ≥20 evidences with full provenance
- Cross-tier coverage (Tier 1 + Tier 2 minimum)
- Pattern categorization complete
- Villain matrix populated with quantitative scores
- Mom Test pain ↔ villain evidence cross-reference present
- Root cause statement + why-persists + opportunity sizing emitted
- `03-villain.md` persisted

## GO/NO-GO Threshold

| Result | Verdict |
|---|---|
| <20 evidences | NEEDS-REWORK — extend search; reject early stops |
| ≥20 + no cross-tier pattern | NEEDS-REWORK — single-source bias risk |
| ≥20 + pattern visible + Mom Test misaligned | NEEDS-REWORK — villain hypothesis wrong, revise |
| ≥20 + pattern + Mom Test aligned + root cause stateable | GO — proceed to WTP Smoke Test atom |

## References

- `squads/research/data/product-discovery-framework.md` § Protocol 3
- Source: OSINT methodology + competitive analysis canon
- Reuses spy's `investigate-osint` task and `bench-analyst` agent
- Adjacent atoms: `pd-mom-test-interview` (upstream), `pd-wtp-smoke-test` (next)

---

Completion Criteria: artifact concluded, validated against checklist, ready for molecule synthesis

---

accountability:
  accountable: "Human (Process Owner)"
  responsible: "bench-analyst"
  consulted: [research-chief]
  informed: [research-operator]
