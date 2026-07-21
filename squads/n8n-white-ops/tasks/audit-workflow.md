---
task: audit-workflow
responsavel: "@n8n-auditor"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - workflow_id: ID do workflow n8n (required)
Saida: |
  - Relatório de auditoria com health score, findings e recomendações
Checklist:
  - "[ ] Rodar POST /audit como baseline"
  - "[ ] Buscar workflow via API"
  - "[ ] Verificar estrutura básica (trigger, connections)"
  - "[ ] Verificar error handling"
  - "[ ] Avaliar performance (loops, timeouts, batch sizes, retryOnFail)"
  - "[ ] Calcular complexidade (nodes, branches)"
  - "[ ] Verificar manutenibilidade (nomes, docs, tags)"
  - "[ ] Verificar flow logic (branches, loops, merges, sub-workflows)"
  - "[ ] Calcular health score"
  - "[ ] Gerar relatório com findings e severidades"
---

# Audit Workflow

**Task for:** @n8n-auditor (n8n-ops squad)

## Overview

Audita a saúde de um workflow n8n verificando estrutura, error handling, performance e manutenibilidade. Gera um health score de 0-100 com findings categorizados.

## Usage

```
@n8n-ops/n8n-auditor
*audit J2pjLqBiMEU6Nq54
```

## Checks

### Passo 0: Baseline
Rodar auditoria nativa: `POST /api/v1/audit` com categories `["credentials", "database", "nodes", "instance"]`.
Usar findings nativos como base antes dos checks manuais.

### Estrutura (25 pontos)
- Tem trigger? (-25 se não)
- Nodes desconectados? (-15 cada)
- Connections válidas? (-10 se apontam para node inexistente)

### Error Handling (20 pontos)
- Error workflow configurado? (-20 se não)
- HTTP requests com catch? (-10 cada sem tratamento)
- `retryOnFail` + `maxTries` configurados em HTTP/DB nodes? (INFO se não)

### Performance (15 pontos)
- Loops com condição de saída? (-15 se infinito)
- Loop manual sem limite de iterações? (-10)
- Wait com timeout razoável? (-5 cada > 1h)
- Batch size adequado? (-5 se muito grande ou =1 em listas grandes)
- `executeOnce` habilitado apenas quando intencional? (INFO)

### Manutenibilidade (25 pontos)
- Nomes descritivos? (-2 por nome genérico)
- Sticky notes? (-10 se nenhuma)
- Tags de owner? (-10 se ausente)
- Complexidade < 20 nodes? (-5 se > 20, -15 se > 30)

### Flow Logic (15 pontos)
- Branch morta (output de IF/Switch sem connection)? (-5 cada)
- Sub-workflow aponta para ID inexistente? (-10)
- Sub-workflow circular (A→B→A)? (-15)
- Merge sem ambos inputs conectados? (-5)
- splitInBatches com batchSize=1 em workflow ativo? (-3)
- `callerPolicy` configurado em sub-workflows? (INFO se ausente)

## Related

- **Agent:** @n8n-auditor
- **Complementar:** check-compliance (para regras de naming específicas)
