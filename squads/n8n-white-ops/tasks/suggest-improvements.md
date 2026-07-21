---
task: suggest-improvements
responsavel: "@n8n-ideator"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - workflow_id: ID do workflow n8n (required)
  - ou "all" para análise cross-workflow
Saida: |
  - Lista de sugestões categorizadas por impacto x esforço
Checklist:
  - "[ ] Buscar workflow(s) via API"
  - "[ ] Analisar nodes para otimizações"
  - "[ ] Detectar padrões repetidos"
  - "[ ] Identificar candidatos a sub-workflow"
  - "[ ] Analisar flow logic (loops, branches, merges, sub-workflows)"
  - "[ ] Sugerir otimizações de loop (batchSize, executeOnce)"
  - "[ ] Sugerir simplificações de branching"
  - "[ ] Sugerir extrações de sub-workflow"
  - "[ ] Avaliar impacto x esforço de cada sugestão"
  - "[ ] Gerar relatório com sugestões priorizadas"
---

# Suggest Improvements

**Task for:** @n8n-ideator (n8n-ops squad)

## Overview

Analisa um workflow (ou todos) e sugere melhorias de performance, consolidação e novas automações.

## Usage

```
@n8n-ops/n8n-ideator
*improve J2pjLqBiMEU6Nq54

*patterns    # detecta padrões entre workflows
*consolidate # sugere consolidações
```

## Tipos de Sugestão

1. **Quick Wins**: Esforço baixo, impacto alto (fazer agora)
2. **Melhorias**: Esforço médio, impacto médio-alto (planejar)
3. **Consolidações**: Múltiplos workflows → 1 sub-workflow
4. **Novos Workflows**: Gaps identificados

## Otimizações de Flow Logic

### Loops
- splitInBatches com batchSize=1 → aumentar para 10-50
- Loop manual (output→input) → substituir por Loop Over Items quando possível
- `executeOnce` não habilitado em nodes que deveriam rodar 1x → habilitar

### Branches
- 3+ IF aninhados → refatorar para Switch
- Branches que convergem no mesmo node → avaliar se branch é necessária
- Dead branches → remover ou converter em sub-workflow separado

### Merges
- Merge com modo incorreto (Append quando deveria ser by Key) → corrigir modo
- Merge com input desbalanceado → adicionar Wait ou sincronizar branches

### Sub-workflows
- Sequência repetida em 3+ workflows → extrair sub-workflow [WKL]
- Workflow com >25 nodes → dividir em orquestrador + sub-workflows
- Sub-workflow sem `callerPolicy` → configurar acesso restrito
- Sub-workflows NÃO contam no limite mensal

### Wait/Throttling
- HTTP em loop sem delay → adicionar Wait para rate limiting
- Polling (Schedule trigger a cada 1min) → avaliar webhook trigger

### Retry
- HTTP/DB nodes sem tratamento de erro manual → considerar `retryOnFail` + `maxTries` + `waitBetweenTries`

## Related

- **Agent:** @n8n-ideator
- **Complementar:** audit-workflow (identifica problemas que precisam de melhoria)
