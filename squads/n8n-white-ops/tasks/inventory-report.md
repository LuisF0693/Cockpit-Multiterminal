---
task: inventory-report
responsavel: "@n8n-compliance"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - format: markdown (default) ou json
  - include_inactive: boolean (default: true)
Saida: |
  - Relatório completo de inventário da instância n8n
Checklist:
  - "[ ] Listar todos os workflows (limit=250)"
  - "[ ] Para cada: extrair ID, nome, status, tags, owner, criticidade"
  - "[ ] Calcular estatísticas (ativos, inativos, por owner, por criticidade)"
  - "[ ] Identificar órfãos (sem tag de owner)"
  - "[ ] Identificar workflows de teste (My workflow N)"
  - "[ ] Gerar relatório consolidado"
---

# Inventory Report

**Task for:** @n8n-compliance (n8n-ops squad)

## Overview

Gera relatório completo de inventário de todos os workflows da instância n8n. Atende ao requisito do PDI de "Inventário completo de automações N8N".

## Usage

```
@n8n-ops/n8n-compliance
*inventory
*inventory --format json
```

## Output

```markdown
# Inventário de Automações N8N
**Instância:** {N8N_API_URL}
**Data:** {timestamp}
**Total:** {N} workflows

## Resumo

| Métrica | Valor |
|---------|-------|
| Total | {N} |
| Ativos | {N} |
| Inativos | {N} |
| Com Owner | {N} |
| Órfãos | {N} |
| Críticos | {N} |
| Importantes | {N} |
| Experimentais | {N} |

## Por Owner

> Gerar uma linha por owner listado em `config/instance.yaml` → `owners`, mais uma linha "Órfão" para workflows sem tag de owner.

| Owner | Ativos | Inativos | Total | % |
|-------|--------|----------|-------|---|
| {owner.name} | {N} | {N} | {N} | {%} |
| ... | ... | ... | ... | ... |
| **Órfão** | {N} | {N} | {N} | {%} |

## Workflows Órfãos (sem owner)

| ID | Nome | Status | Tags |
|----|------|--------|------|
| ... | ... | ... | ... |

## Workflows de Teste (candidatos a remoção)

| ID | Nome | Status |
|----|------|--------|
| ... | My workflow N | Inativo |

## Lista Completa

| # | ID | Nome | Status | Owner | Criticidade | Tags |
|---|-----|------|--------|-------|-------------|------|
| 1 | ... | ... | ... | ... | ... | ... |
```

## Related

- **Agent:** @n8n-compliance
- **Integrações:** Pode complementar sistemas listados em `config/instance.yaml` → `integrations`
