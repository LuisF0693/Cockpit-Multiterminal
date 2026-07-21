# Task: Deep Research — Publish

## Contrato SINKRA

Domain: `Operational`

task: deepResearchPublish()
responsavel: research-head
responsavel_type: Agent
atomic_layer: Atom
Entrada:
- memo de síntese
- analysis report
Saida:
- deep dive final + updates de KB/framework
Inputs: ver bloco `Entrada`
Outputs: ver bloco `Saida`
Pre-conditions: ver `pre_condition`
Post-conditions: ver `post_condition`
Performance: ver `performance`
Error Handling: ver `error_handling`

Checklist:
- publicar relatório final
- atualizar framework/KB quando houver novo padrão
pre_condition: evidências mínimas carregadas e subject validado
post_condition: artefato persistido com achados e próximos passos rastreáveis
performance: falhar alto, registrar fontes e manter consistência entre evidências e relatório
error_handling: "on_fail: HALT atom, emit recovery handoff to parent molecule"

## Metadata

```yaml
id: deep-research-publish
parent_task: deep-research
category: research-atom
agent: research-head
elicit: false
autonomous: true
description: "Publica o deep dive final e registra aprendizados duráveis."
```

## Steps

1. Gerar relatório final em `docs/research/{YYYY-MM-DD}-{slug}/` (publicação canônica).
2. Garantir links para raw data, transcripts e analysis.
3. Atualizar `knowledge-base.md` e/ou `viral-content-framework.md` se houver padrão novo.
4. Registrar próximos usos do material.

## Acceptance Criteria

- deep dive final salvo
- trilha de evidências preservada
- KB/framework atualizados quando aplicável

---

Completion Criteria: artefato concluído, validado contra checklist e pronto para handoff ou publish

---

accountability:
  accountable: "Human (Process Owner)"
  responsible: "research-head"
  consulted: [research-chief]
  informed: [research-operator]
