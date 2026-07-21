---
task: batch-document
responsavel: "@n8n-documenter"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - workflow_ids: Lista de IDs (optional, default: todos ativos)
  - filter: Filtro por tag, owner ou status (optional)
Saida: |
  - Um JSON clipboard-ready por workflow, organizados em lista
Checklist:
  - "[ ] Listar workflows alvo (por filtro ou todos ativos)"
  - "[ ] Para cada workflow: executar task document-workflow"
  - "[ ] Consolidar resultados"
  - "[ ] Gerar output organizado por workflow"
---

# Batch Document - Documentação em Lote

**Task for:** @n8n-documenter (n8n-ops squad)

## Overview

Gera sticky notes para múltiplos workflows em lote. Output é um JSON por workflow para copy-paste individual.

## Usage

```
@n8n-ops/n8n-documenter
*batch                           # todos os ativos sem sticky notes
*batch --owner Sid               # só os do Sid
*batch --tag Critico             # só os críticos
*batch id1 id2 id3               # IDs específicos
```

## Processo

1. Listar workflows via API (`GET /workflows?limit=250`)
2. Filtrar por critério (se especificado)
3. Filtrar workflows que já têm sticky notes (optional)
4. Para cada workflow: executar `document-workflow`
5. Output: lista de JSONs separados por workflow

## Output Format

```markdown
# Batch Documentation Report
**Total:** {N} workflows documentados
**Data:** {timestamp}

---

## 1. {workflow_name} ({workflow_id})
Nodes documentados: {N}

\`\`\`json
{ ...clipboard JSON... }
\`\`\`

---

## 2. {next_workflow}
...
```

## Related

- **Depends on:** document-workflow (task unitária)
- **Agent:** @n8n-documenter
