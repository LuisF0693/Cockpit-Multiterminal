---
task: build-workflow
responsavel: "@n8n-builder"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - description: Descrição em linguagem natural do workflow desejado (required)
  - output_mode: "preview" | "json" | "clipboard" (default: preview → confirmação → json)
  - workflow_id: ID de workflow existente para edição (optional)
Saida: |
  - Preview visual da estrutura do workflow
  - JSON válido para PUT /workflows/{id} ou clipboard (Ctrl+V)
Checklist:
  - "[ ] Entender o pedido (trigger, ações, lógica, error handling)"
  - "[ ] Consultar config/instance.yaml (nome, tags, sistemas)"
  - "[ ] Consultar Context7 para nodes desconhecidos"
  - "[ ] Se editando: GET workflow existente via API"
  - "[ ] Montar nodes com tipos, parâmetros e posições corretos"
  - "[ ] Montar connections (incluindo branches e merges)"
  - "[ ] Configurar settings (errorWorkflow, executionOrder, callerPolicy)"
  - "[ ] Aplicar naming convention em todos os nodes (snake_case, sem defaults)"
  - "[ ] Gerar preview visual e confirmar com o usuário"
  - "[ ] Gerar JSON final no modo solicitado"
  - "[ ] Instruir usuário sobre próximos passos (criar blank na UI, PUT, tags)"
---

# Build Workflow

**Task for:** @n8n-builder (n8n-white-ops squad)

## Overview

Cria ou modifica workflows n8n a partir de descrição em linguagem natural. Gera JSON válido que respeita todos os gotchas da API e segue os padrões de nomenclatura e compliance do squad.

## Usage

```
@n8n-builder
*build webhook que recebe pagamento do Hotmart, salva no Supabase e notifica no Slack

*edit J2pjLqBiMEU6Nq54 adicionar notificação no Slack após o salvamento

*clone J2pjLqBiMEU6Nq54 trocar Hotmart por PagTrust

*preview schedule que roda todo dia às 8h, puxa relatório do BigQuery e posta no Slack
```

## Fluxo

### Novo Workflow
```
1. *build <descrição>
2. Builder gera preview visual
3. Usuário confirma ou ajusta
4. Builder gera JSON
5. Usuário cria workflow vazio na UI do n8n
6. Builder faz PUT /workflows/{id} com o JSON
7. Sugerir: @n8n-documenter *document {id} e @n8n-compliance *check {id}
```

### Editar Workflow
```
1. *edit <id> <mudança>
2. Builder faz GET /workflows/{id}
3. Builder identifica nodes a adicionar/modificar/remover
4. Builder gera preview do diff
5. Usuário confirma
6. Builder faz PUT /workflows/{id} com payload completo
```

## Validações Obrigatórias

Antes de gerar o JSON final, verificar:

| Check | Critério |
|-------|----------|
| Nome | Segue padrão `[TIPO][SISTEMA_ORIGEM][SISTEMA_DESTINO] - Ação` |
| Nodes names | Todos em snake_case, nenhum nome default |
| Connections | Todos os nodes estão conectados (sem órfãos) |
| Settings | Só campos da whitelist. Nenhum campo blacklisted |
| Error handling | `errorWorkflow` configurado se o usuário tem error workflow |
| Trigger | Exatamente 1 trigger no workflow |
| Loops | Todo loop tem exit condition |
| Sub-workflows | `callerPolicy` configurado, sem `inputSource: passthrough` |
| Positions | Nodes não se sobrepõem (mín 240px horizontal) |

## Related

- **Agent:** @n8n-builder
- **Pós-build:** @n8n-documenter (documentar), @n8n-auditor (auditar), @n8n-compliance (compliance)
- **Config:** config/instance.yaml (nomes, tags), config/coding-standards.md (padrões)
- **API Ref:** config/tech-stack.md (endpoints, gotchas, schemas)
