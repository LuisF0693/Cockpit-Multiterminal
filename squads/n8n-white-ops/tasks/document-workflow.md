---
task: document-workflow
responsavel: "@n8n-documenter"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - workflow_id: ID do workflow n8n (required)
  - ou workflow_name: Nome do workflow (alternative)
Saida: |
  - JSON clipboard-ready com sticky notes para colar no n8n (Ctrl+V)
Checklist:
  - "[ ] Buscar workflow via API"
  - "[ ] Identificar todos os nodes (exceto sticky notes existentes)"
  - "[ ] Para cada node: identificar tipo, operação, parâmetros-chave"
  - "[ ] Gerar descrição funcional para cada node"
  - "[ ] Calcular position (offset do node original)"
  - "[ ] Atribuir cor por categoria"
  - "[ ] Calcular height/width pelo tamanho do conteúdo"
  - "[ ] Gerar UUID para cada sticky note"
  - "[ ] Montar JSON no formato clipboard do n8n"
  - "[ ] Validar JSON é válido"
---

# Document Workflow - Gerar Sticky Notes

**Task for:** @n8n-documenter (n8n-ops squad)

## Overview

Analisa um workflow n8n e gera um JSON com sticky notes documentando cada node. O output é clipboard-ready: o usuário copia e cola diretamente no editor do n8n.

## Usage

```
@n8n-ops/n8n-documenter
*document J2pjLqBiMEU6Nq54
```

Ou por nome:
```
*document "[SCH][N8N][NOTION] Versionamento Notion"
```

## Processo

### 1. Buscar Workflow
```
GET {N8N_API_URL}/api/v1/workflows/{workflow_id}
Header: X-N8N-API-KEY: {token}
```

### 2. Filtrar Nodes
- Remover nodes do tipo `n8n-nodes-base.stickyNote` (não documentar notas existentes)
- Processar todos os demais nodes

### 3. Para Cada Node
1. **Tipo**: Extrair de `node.type` (ex: `n8n-nodes-base.httpRequest`)
2. **Operação**: Extrair de `node.parameters.operation` ou `node.parameters.method`
3. **Recursos-chave**: URL, tabela, canal, database, etc.
4. **Credenciais**: Nome da credencial usada
5. **Gerar conteúdo** da sticky note:
```
## {node.name}
Tipo: {TIPO} {OPERAÇÃO}
- {descrição funcional baseada nos parâmetros}
```

### 4. Gerar JSON
```json
{
  "parameters": {
    "content": "{conteúdo markdown}",
    "height": {altura calculada},
    "width": {largura calculada},
    "color": {cor por categoria}
  },
  "type": "n8n-nodes-base.stickyNote",
  "typeVersion": 1,
  "position": [{nodeX - 80}, {nodeY - 300}],
  "id": "{uuid-v4}",
  "name": "Sticky Note{N}"
}
```

### 5. Montar Clipboard JSON
```json
{
  "nodes": [ ...todas as sticky notes ],
  "connections": {},
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true
  }
}
```

## Cores por Categoria

| Categoria | Color | Tipos |
|-----------|-------|-------|
| Trigger | 2 | webhook, scheduleTrigger, errorTrigger, manualTrigger, executeWorkflowTrigger, formTrigger, mcpTrigger, *Trigger |
| Action | 4 | httpRequest, googleBigQuery, postgres, supabase, slack, notion, googleSheets, whatsApp, gmail, hubspot, clickUp, github, redis |
| Logic | 6 | if, switch, splitInBatches, merge, filter, limit, removeDuplicates, compareDatasets |
| Transform | 3 | set, code, splitOut, aggregate, extractFromFile, convertToFile, summarize |
| Utility | 1 | executeWorkflow, wait, noOp, stopAndError, respondToWebhook, timeSaved |
| AI | 5 | lmChatAzureOpenAi, lmChatOpenAi, agent, informationExtractor, outputParserStructured |

## Dimensões

| Linhas de conteúdo | Width | Height |
|-------------------|-------|--------|
| 1-2 | 208 | 160 |
| 3-4 | 208 | 240 |
| 5-6 | 264 | 336 |
| 7+ | 320 | 400 |

## Related

- **Agent:** @n8n-documenter
- **Squad:** n8n-ops
- **Config:** config/coding-standards.md (padrão de sticky notes)
- **Data:** data/n8n-node-types-reference.json (referência de tipos)
