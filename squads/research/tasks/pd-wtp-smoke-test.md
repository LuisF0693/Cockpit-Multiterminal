# Task: Product Discovery — Willingness-to-Pay Smoke Test

## Contrato SINKRA

Domain: `Operational`

task: pdWtpSmokeTest()
responsavel: gilad
responsavel_type: Agent
atomic_layer: Atom
Entrada:
- `idea_statement`
- `validated_jtbd`: from `pd-jtbd-validate`
- `villain_root_cause`: from `pd-villain-mapping`
- `tentative_price`: candidate price point (single value or range)
- `target_audience`
- `available_traffic`: how many people you can reach (WhatsApp/LinkedIn DM count, ad budget, organic reach)
- `format?`: one of `landing-page` | `typeform-card` | `early-bird` | `crowdfunding` | `concierge-paid` (default: `landing-page`)
Saida:
- `outputs/research/product-discovery/{run-slug}/04-wtp-smoke-test.md` with copy framework, landing/form spec, tracking metrics setup, traffic scripts, results analysis, follow-up sequence
Inputs: ver bloco `Entrada`
Outputs: ver bloco `Saida`
Pre-conditions: ver `pre_condition`
Post-conditions: ver `post_condition`
Performance: ver `performance`
Error Handling: ver `error_handling`

Checklist:
- `checklists/product-discovery-gates.yaml#wtp_smoke_test`
- Copy framework filled (HEADLINE / SUBHEADLINE / SOCIAL PROOF / CTA / URGENCY)
- Funnel metrics defined (visitors / time-on-page / CTA clicks / payment initiated / data completed)
- ≥3 traffic scripts (WhatsApp / LinkedIn / direct email)
- Tracking setup specified (GA4 + Hotjar/Clarity)
- Results captured and analyzed against signal thresholds
pre_condition: GO from `pd-villain-mapping` + tentative price + target audience + reachable traffic
post_condition: 04-wtp-smoke-test.md persisted with funnel results + conversion analysis + verdict
performance: ≥10% CTA-to-payment-attempt OR ≥5 confirmed pre-sales = GO threshold
error_handling: "on_fail: HALT atom, preserve copy/landing/traffic-scripts produced; emit handoff suggesting which format to retry"

## Metadata

```yaml
id: pd-wtp-smoke-test
parent_task: validate-product-idea
category: product-discovery-atom
agent: gilad
elicit: true
autonomous: false
description: "Validates real payment intent (not interest) via landing+tracking with ≥10% click-to-payment-attempt or ≥5 pre-sales."
```

## Why gilad

Tier 1 strategic competitive intelligence + early warning. WTP smoke test is positioning + pricing + early demand signal detection — gilad's wheelhouse. Reused for both atom 4 and Wave 1's `pd-puv-scorecard`.

## Steps

1. **Read source framework:** `squads/research/data/product-discovery-framework.md` § Protocol 4 — WTP Smoke Test
2. **Select smoke test format:** based on `format` input or recommendation matrix (landing-page = default and cheapest; concierge-paid for high-touch services; crowdfunding for community-led; etc.)
3. **Generate Copy Framework:**
   - HEADLINE: `[Desired outcome] in [timeframe] without [main pain]`
   - SUBHEADLINE: `[N] professionals already [related action]`
   - SOCIAL PROOF: specific testimonial template with numbers placeholder
   - PRIMARY CTA: `Reserve your spot for R$[X] (limited)`
   - URGENCY: `Only [10] early-adopter slots; price rises to R$[X] on [date]`
4. **Generate landing-page spec:** Carrd/Framer wireframe — headline tested via CoSchedule Headline Analyzer recommended, 3 quantified benefits, time-limited discount, FAQ, satisfaction guarantee.
5. **Specify tracking setup:** GA4 + Hotjar/Clarity event map (page-view / scroll-depth / cta-click / payment-form-open / payment-attempt / data-completed).
6. **Generate traffic scripts:** WhatsApp, LinkedIn DM, and direct email templates — each personalized using `validated_jtbd` and `villain_root_cause` from upstream atoms.
7. **Define funnel thresholds (signal table):**
   - Strong: ≥10% payment-attempt, ≥20% CTA clicks, ≥3 "when does it ship?" questions, ≥2min avg time
   - Weak: <5% any-CTA click, >80% bounce, 0 payment attempts in 50 visits
8. **Capture results:** user runs the test (24-72h) and pastes funnel metrics. Agent computes conversion rates and applies signal table.
9. **Generate follow-up sequence:** for interested users — confirmation email + demo offer + early-adopter guarantee.
10. **Compute composite GO/NO-GO:** primary metric (payment-attempt rate) + secondary (pre-sales count) + qualitative (urgent demand questions).
11. **Persist:** write `04-wtp-smoke-test.md` with all artifacts, results, verdict.

## Acceptance Criteria

- Copy framework filled completely
- Landing/form spec produced
- Tracking setup specified with event names
- ≥3 traffic scripts generated
- Funnel results captured and analyzed
- Follow-up sequence drafted
- `04-wtp-smoke-test.md` persisted with verdict

## GO/NO-GO Threshold

| Result | Verdict |
|---|---|
| <5% any-CTA click + 0 payment attempts | NO-GO — copy or audience wrong |
| 5-10% CTA + 0 payment attempts | NEEDS-REWORK — interest without intent; iterate copy + retest |
| ≥10% payment-attempt OR ≥5 confirmed pre-sales | GO — STRONG validation, proceed to molecule synthesis |
| ≥10% + ≥1 paying customer | STRONG GO — proceed AND elevate dossier priority for Wave 1 |

## References

- `squads/research/data/product-discovery-framework.md` § Protocol 4
- Source: Sean Ellis PMF Engine + Dropbox MVT + Buffer/Zappos Concierge MVP
- Adjacent atoms: `pd-villain-mapping` (upstream), `validate-product-idea` molecule (synthesizes after this)

---

Completion Criteria: artifact concluded, validated against checklist, ready for molecule synthesis

---

accountability:
  accountable: "Human (Process Owner)"
  responsible: "gilad"
  consulted: [research-chief]
  informed: [research-operator]
