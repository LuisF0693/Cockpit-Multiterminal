# Task: Deep Research — Transcription

## Contrato SINKRA

Domain: `Operational`

task: deepResearchTranscribe()
responsavel: research-head
responsavel_type: Agent
atomic_layer: Atom
Entrada:
- corpus selecionado
Saida:
- transcrições anotadas em `outputs/research/transcripts/`
Inputs: ver bloco `Entrada`
Outputs: ver bloco `Saida`
Pre-conditions: ver `pre_condition`
Post-conditions: ver `post_condition`
Performance: ver `performance`
Error Handling: ver `error_handling`

Checklist:
- extrair transcript ou fallback viável
- marcar hooks, intro, conteúdo e CTA
pre_condition: evidências mínimas carregadas e subject validado
post_condition: artefato persistido com achados e próximos passos rastreáveis
performance: falhar alto, registrar fontes e manter consistência entre evidências e relatório
error_handling: "on_fail: HALT atom, emit recovery handoff to parent molecule"

## Metadata

```yaml
id: deep-research-transcribe
parent_task: deep-research
category: research-atom
agent: research-head
elicit: false
autonomous: true
description: "Extrai e anota transcrições do corpus selecionado."
```

## Steps

1. Extrair transcript de cada peça selecionada.
2. Corrigir erros óbvios e marcar timestamps principais.
3. Salvar arquivo anotado por peça em `outputs/research/transcripts/{platform}/`.
4. Sinalizar peças sem transcript utilizável.

## Acceptance Criteria

- 10 transcrições úteis no modo padrão
- timestamps e seções principais marcados
- falhas de transcript explicitamente registradas

---

Completion Criteria: artefato concluído, validado contra checklist e pronto para handoff ou publish

---

accountability:
  accountable: "Human (Process Owner)"
  responsible: "research-head"
  consulted: [research-chief]
  informed: [research-operator]
