---
task: check-compliance
responsavel: "@n8n-compliance"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - workflow_id: ID do workflow n8n (required)
  - ou "all" para relatório geral
Saida: |
  - Relatório de conformidade com score, violações e correções sugeridas
Checklist:
  - "[ ] Buscar workflow via API"
  - "[ ] Verificar nome do workflow contra padrão [TIPO][SISTEMA]"
  - "[ ] Verificar nomes dos nodes (sem defaults)"
  - "[ ] Verificar tags obrigatórias (owner, criticidade)"
  - "[ ] Verificar presença de sticky notes"
  - "[ ] Verificar boas práticas (error workflow, nodes disabled)"
  - "[ ] Calcular compliance score"
  - "[ ] Gerar relatório com violações e sugestões de correção"
---

# Check Compliance

**Task for:** @n8n-compliance (n8n-ops squad)

## Overview

Verifica conformidade de um workflow com os padrões definidos de nomenclatura, tags e documentação. Gera score de 0-100%.

## Usage

```
@n8n-ops/n8n-compliance
*check J2pjLqBiMEU6Nq54
*check-all
*report
```

## Regras (ver agent n8n-compliance para detalhes)

| Categoria | Peso | Verifica |
|-----------|------|----------|
| Nome Workflow | 20% | Padrão [TIPO][SISTEMA][DESTINO] |
| Nomes Nodes | 25% | Sem defaults (Set, IF, HTTP Request) |
| Tags | 25% | Owner + Criticidade |
| Documentação | 20% | Sticky notes presentes |
| Boas Práticas | 10% | Error workflow, sem nodes disabled |

## Related

- **Agent:** @n8n-compliance
- **Config:** config/coding-standards.md (padrões detalhados)
- **Complementar:** document-workflow (para corrigir falta de documentação)
