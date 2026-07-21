# Task: Bench Gap — Company

## Contrato SINKRA

Domain: `Tactical`

task: benchGapCompany()
responsavel: bench-analyst
responsavel_type: Agent
atomic_layer: Atom
Entrada:
- matrix/score company
Saida:
- gap analysis company JSON/MD
Inputs: ver bloco `Entrada`
Outputs: ver bloco `Saida`
Pre-conditions: ver `pre_condition`
Post-conditions: ver `post_condition`
Performance: ver `performance`
Error Handling: ver `error_handling`

Checklist:
- classificar gaps estratégicos e operacionais
- priorizar por ameaça competitiva
pre_condition: evidências mínimas carregadas e subject validado
post_condition: artefato persistido com achados e próximos passos rastreáveis
performance: falhar alto, registrar fontes e manter consistência entre evidências e relatório
error_handling: "on_fail: HALT gap derivation, preserve partial analysis"

## Metadata

```yaml
id: bench-gap-company
parent_task: bench-gap
category: benchmark-gap-atom
agent: bench-analyst
elicit: false
autonomous: true
description: "Deriva gaps bidirecionais para comparações entre empresas."
```

## Steps

1. Ler matriz e score company.
2. Identificar gaps estratégicos, operacionais e de distribuição.
3. Priorizar riscos e oportunidades por ameaça competitiva.
4. Persistir `gap-analysis.json` e `gap-analysis.md`.

## Acceptance Criteria

- riscos competitivos explícitos
- oportunidades priorizadas
- recomendações ancoradas em evidência

---

Completion Criteria: artefato concluído, validado contra checklist e pronto para handoff ou publish

---

accountability:
  accountable: "Human (Process Owner)"
  responsible: "bench-analyst"
  consulted: [research-chief]
  informed: [research-operator]
