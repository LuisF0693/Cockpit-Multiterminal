# Product Discovery Dossier — {idea_short_title}

> Run slug: `{run_slug}` | Date: `{YYYY-MM-DD}` | Wave: `0`
> Source pipeline: `validate-product-idea` molecule (spy v4.1+)
> Composite verdict: `{STRONG_GO | GO | CONDITIONAL_GO | NO_GO | IN_PROGRESS}`

---

## TL;DR (Executive Summary)

- **Idea statement:** {idea_statement}
- **Target audience:** {target_audience}
- **Tentative price:** {tentative_price}
- **Composite verdict:** {verdict}
- **Headline evidence:** {top_3_evidence_bullets}
- **Next wave:** {wave1_handoff_status}

---

## 01 — JTBD Validation

**Verdict:** `{jtbd_verdict}` ({jtbd_score})

### Validated JTBD statement

> {jtbd_statement}

### Quality scorecard

| Criterion | Score (0-10) | Notes |
|---|---|---|
| Specific situation | {jtbd_specific} | |
| Concrete numbers | {jtbd_numbers} | |
| Clear motivation | {jtbd_motivation} | |
| Measurable outcome | {jtbd_outcome} | |
| Accessible language | {jtbd_language} | |

### Validation results (10 contacts)

- **Understanding rate:** {jtbd_understanding_pct}%
- **Same-problem rate:** {jtbd_same_problem_count}/10
- **AI cross-validation score:** {jtbd_ai_score}/40

Full atom output: `01-jtbd.md`

---

## 02 — Mom Test Interviews

**Verdict:** `{mom_test_verdict}` ({mom_test_score})

### Interview map

- **Interviews conducted:** {mom_test_count}
- **Insights extracted:** {mom_test_insights}
- **Corroborated pains:** {mom_test_pains_count}

### Top quantified pains

| # | Pain | Cost (time/$$) | Frequency | Corroborated by |
|---|------|----------------|-----------|-----------------|
| 1 | {pain_1} | {cost_1} | {freq_1} | {sources_1} |
| 2 | {pain_2} | {cost_2} | {freq_2} | {sources_2} |
| 3 | {pain_3} | {cost_3} | {freq_3} | {sources_3} |

### Current hacks

{current_hacks_summary}

### Red flags

{red_flags_summary}

Full atom output: `02-mom-test.md`

---

## 03 — Villain Root Cause Mapping

**Verdict:** `{villain_verdict}` ({villain_score})

### Root cause statement

> {villain_root_cause_statement}

### Why it persists

{villain_why_persists}

### Evidence map (≥20)

| Tier | Count | Top sources |
|---|---|---|
| Tier 1 (high confidence) | {villain_t1_count} | {villain_t1_sources} |
| Tier 2 (confirmation) | {villain_t2_count} | {villain_t2_sources} |
| Tier 3 (additional) | {villain_t3_count} | {villain_t3_sources} |

### Pattern categorization

| Category | Evidence count | Severity (avg) |
|---|---|---|
| Technical failures | {villain_tech} | {villain_tech_severity} |
| Functional gaps | {villain_func} | {villain_func_severity} |
| UX friction | {villain_ux} | {villain_ux_severity} |
| Hidden costs | {villain_cost} | {villain_cost_severity} |
| Structural limitations | {villain_struct} | {villain_struct_severity} |

### Mom Test ↔ Villain cross-reference

{villain_mom_test_alignment}

Full atom output: `03-villain.md`

---

## 04 — Willingness-to-Pay Smoke Test

**Verdict:** `{wtp_verdict}` ({wtp_score})

### Test format

- **Format:** {wtp_format}
- **Tentative price:** {tentative_price}
- **Test duration:** {wtp_duration}
- **Traffic source:** {wtp_traffic_source}

### Copy framework deployed

```
HEADLINE: {wtp_headline}
SUBHEADLINE: {wtp_subheadline}
SOCIAL PROOF: {wtp_social_proof}
PRIMARY CTA: {wtp_cta}
URGENCY: {wtp_urgency}
```

### Funnel results

| Stage | Count | Rate |
|---|---|---|
| Unique visitors | {wtp_visitors} | - |
| Time on page >45s | {wtp_engaged} | {wtp_engaged_pct}% |
| CTA clicks | {wtp_cta_clicks} | {wtp_cta_pct}% |
| Payment initiated | {wtp_payment_init} | {wtp_payment_pct}% |
| Data completed | {wtp_completed} | {wtp_completed_pct}% |

### Qualitative signals

- "When does it ship?" questions: {wtp_urgency_questions}
- Confirmed pre-sales: {wtp_presales}
- Strong demand quotes: {wtp_demand_quotes}

Full atom output: `04-wtp-smoke-test.md`

---

## Composite Decision

### Atom verdict matrix

| Atom | Verdict | Score |
|---|---|---|
| 01 JTBD | {jtbd_verdict} | {jtbd_score} |
| 02 Mom Test | {mom_test_verdict} | {mom_test_score} |
| 03 Villain | {villain_verdict} | {villain_score} |
| 04 WTP Smoke Test | {wtp_verdict} | {wtp_score} |

### Composite verdict: `{composite_verdict}`

| Verdict | Criterion match | Action |
|---|---|---|
| STRONG GO | All 4 GO + WTP ≥1 paying | Proceed to Wave 1 (STORY-SPY-PD.2) with high confidence |
| GO | All 4 GO no paying | Proceed; treat fundraise as risk |
| CONDITIONAL GO | 3/4 GO + remediation possible | Re-run failing atom; do not proceed downstream |
| NO-GO | ≤2 GO | Pivot or kill; document learnings |

### Rationale

{composite_rationale}

### Next steps

{next_steps}

---

## Provenance

| Field | Value |
|---|---|
| Pipeline | `validate-product-idea` v1.0.0 |
| Workflow | `wf-product-discovery` v1.0.0 |
| Framework reference | `squads/research/data/product-discovery-framework.md` |
| Composite gate | `squads/research/checklists/product-discovery-gates.yaml` |
| Observatory route | `/observatory/product-discovery/?slug={run_slug}` |
| Generated at | {generated_at} |
| Operator | {operator_handle} |

---

## Cross-References

- Upstream skill helper: `/tech-research --product-discovery` (research dossier feeds atoms 3 + 4)
- Downstream (if GO): `STORY-SPY-PD.2` (Wave 1 — Concept, Market & Positioning)
- Framework background: `squads/research/data/product-discovery-framework.md`
