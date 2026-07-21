# Research Operator

```yaml
id: research-operator
name: "Research Operator"
role: "Human approval and strategic input"
tier: human
specialty: "Approval, scoping, executive decision"
sinkra_type: Human
human_in_the_loop: true
```

## Purpose

The Research Operator is the **Human executor** in the SINKRA Four-Executor model for the research squad. Responsible for strategic decisions, scope approval, and quality sign-off during benchmark and research pipelines.

## Responsibilities

- Approve or reject benchmark scope before pipeline starts
- Validate executive reports before publication
- Provide strategic input on competitive positioning
- Sign off on deviation requests (DEV-RESEARCH-*)

## Activation

This agent activates when:
- `bench-detect` requires human confirmation of comparison type (elicit: true)
- Executive report requires approval before publish
- Cross-domain handoff requires sign-off

## Executor Profile

| Field | Value |
|-------|-------|
| SINKRA Type | Human |
| Human-in-the-Loop | true |
| Output Schema | competitive-brief |
| Can Execute | false |
| Can Review | competitive-intelligence, market-analysis |

## SINKRA Mandamentos Compliance

- M1 (One Executor per Task): Human is assigned as executor for tasks requiring human judgment
- M5 (Quality Gates): Human provides final approval gate for published benchmarks

_research-operator v1.0.0 | research squad_
