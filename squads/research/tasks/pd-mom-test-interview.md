# Task: Product Discovery — Mom Test Interview

## Contrato SINKRA

Domain: `Operational`

task: pdMomTestInterview()
responsavel: klein
responsavel_type: Agent
atomic_layer: Atom
Entrada:
- `idea_statement`: 1-3 sentence description (carries forward from JTBD atom)
- `target_audience`: who suffers the problem
- `validated_jtbd`: result from `pd-jtbd-validate` (required)
- `interview_count?`: default 10, minimum 10
Saida:
- `outputs/research/product-discovery/{run-slug}/02-mom-test.md` with interview guide, anti-bias techniques, per-interview notes template, behavioral pattern synthesis, quantified pain map
Inputs: ver bloco `Entrada`
Outputs: ver bloco `Saida`
Pre-conditions: ver `pre_condition`
Post-conditions: ver `post_condition`
Performance: ver `performance`
Error Handling: ver `error_handling`

Checklist:
- `checklists/product-discovery-gates.yaml#mom_test`
- 15-min interview guide produced
- ≥10 interviews conducted (real or surrogate-flagged)
- ≥5 actionable behavioral insights extracted
- ≥3 specific quantified pains corroborated across interviews
- Zero forbidden questions ("would you" / "do you think" / "would it be useful")
pre_condition: validated JTBD from atom 1 + target audience defined
post_condition: 02-mom-test.md persisted with behavioral evidence map
performance: pattern recognition surfaces 3+ corroborated pains is the GO threshold
error_handling: "on_fail: HALT atom, preserve partial interviews and synthesis-so-far"

## Metadata

```yaml
id: pd-mom-test-interview
parent_task: validate-product-idea
category: product-discovery-atom
agent: klein
elicit: true
autonomous: false
description: "Conducts ≥10 Mom Test behavioral interviews extracting past behavior (not future intent) and synthesizes behavioral patterns."
```

## Why klein

Tier 1 NDM (Naturalistic Decision Making) specialist. Mom Test methodology *is* behavioral pattern extraction under uncertainty — klein's specialty. Pre-mortem / sensemaking framing maps directly to interview-derived insight synthesis.

## Steps

1. **Read source framework:** `squads/research/data/product-discovery-framework.md` § Protocol 2 — Mom Test Interviews
2. **Generate interview guide (15min):**
   - Opening (2min): neutral context-setting, NO mention of the idea
   - Behavioral core (10min): 8-10 questions in past-tense format ("Tell me about the last time…", "Show me how you solved…", "How much did you spend on…")
   - Depth probes (3min): "And then what?" / "Why that specific way?" / "How much time/money?"
3. **Apply anti-bias filters:** validate that ALL questions follow Mom Test laws (talk about their life, past-specific, listen more). Reject any "would you" / "do you think" / "is it useful?" formulation.
4. **Provide handling scripts:** how to redirect when interviewees suggest features, when they offer empty praise, when they speak in hypotheticals.
5. **Generate per-interview notes template:** Observed behaviors / Quantified pains / Current hacks / Unexpected insights / Open follow-up questions.
6. **Conduct or accept interview transcripts:** user pastes interview notes; agent supports synchronous coaching during real interviews if `--coaching` flag set.
7. **Synthesize behavioral patterns:** identify recurring behaviors, quantified pains, current hacks. Use klein's NDM pattern-matching.
8. **Generate red-flag report:** vague answers, hypothetical focus, excessive politeness, lack of concrete examples → flagged interviews are excluded from pattern synthesis.
9. **Compute GO/NO-GO:** apply threshold rule (≥10 interviews + ≥5 insights + ≥3 corroborated specific pains).
10. **Persist:** write `02-mom-test.md` with all evidence, synthesis, and verdict.

## Acceptance Criteria

- Interview guide passes Mom Test law audit (zero forbidden questions)
- ≥10 interviews conducted (real users or explicitly flagged simulated)
- Behavioral pattern synthesis produces ≥5 insights
- ≥3 quantified specific pains corroborated across ≥3 interviews
- Red-flag report distinguishes signal from noise
- `02-mom-test.md` persisted with verdict

## GO/NO-GO Threshold

| Result | Verdict |
|---|---|
| <10 interviews completed | NEEDS-REWORK — insufficient sample |
| ≥10 + <5 insights | NEEDS-REWORK — interview quality issue, redo with stricter Mom Test discipline |
| ≥10 + ≥5 insights + <3 corroborated pains | NO-GO — problem not validated as widespread/sharp |
| ≥10 + ≥5 insights + ≥3 corroborated pains | GO — proceed to Villain Mapping atom |

## References

- `squads/research/data/product-discovery-framework.md` § Protocol 2
- Source: Fitzpatrick, *The Mom Test* (2013)
- Source: Klein, *Sources of Power* (NDM pattern recognition)
- Adjacent atoms: `pd-jtbd-validate` (upstream, blocks this), `pd-villain-mapping` (next)

---

Completion Criteria: artifact concluded, validated against checklist, ready for molecule synthesis

---

accountability:
  accountable: "Human (Process Owner)"
  responsible: "klein"
  consulted: [research-chief]
  informed: [research-operator]
