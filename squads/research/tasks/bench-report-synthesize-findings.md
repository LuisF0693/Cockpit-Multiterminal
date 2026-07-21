# Task: Bench Report — Synthesize Findings

## Contrato SINKRA

Domain: `Tactical`

task: benchReportSynthesizeFindings()
responsavel: bench-analyst
responsavel_type: Agent
atomic_layer: Atom
Entrada:
- evidence bundle
Saida:
- executive draft
Inputs: ver bloco `Entrada`
Outputs: ver bloco `Saida`
Pre-conditions: ver `pre_condition`
Post-conditions: ver `post_condition`
Performance: ver `performance`
Error Handling: ver `error_handling`

Checklist:
- resumir winner/loser por dimensão
- transformar evidência em recomendação executiva
pre_condition: evidências mínimas carregadas e subject validado
post_condition: artefato persistido com achados e próximos passos rastreáveis
performance: falhar alto, registrar fontes e manter consistência entre evidências e relatório
error_handling: "on_fail: HALT report phase, preserve upstream evidence"

## Metadata

```yaml
id: bench-report-synthesize-findings
parent_task: bench-report
category: benchmark-report-atom
agent: bench-analyst
elicit: false
autonomous: true
description: "Transforma o evidence bundle em narrativa executiva e recomendações."
```

## Steps

1. Resumir resultado por dimensão.
2. Consolidar principais gaps e diferenciais.
3. Gerar recomendações executivas priorizadas.
4. Produzir draft narrativo do report.

## Acceptance Criteria

- narrativa executiva clara
- recomendações priorizadas
- cada claim aponta para evidência específica

---

Completion Criteria: artefato concluído, validado contra checklist e pronto para handoff ou publish

---

accountability:
  accountable: "Human (Process Owner)"
  responsible: "bench-analyst"
  consulted: [research-chief]
  informed: [research-operator]
