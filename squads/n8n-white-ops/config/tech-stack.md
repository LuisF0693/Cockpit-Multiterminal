# n8n-white-ops Squad - Tech Stack

## n8n API

| Item | Valor |
|------|-------|
| API Version | v1 (OpenAPI 3.0, spec em `data/n8n-api.yaml`) |
| Auth | API Key via `X-N8N-API-KEY` header (ou Bearer token) |
| Transport | HTTPS REST |
| Base URL | `$N8N_API_URL/api/v1` |
| Paginação | Cursor-based (`cursor` + `limit`) |

> A instância (cloud ou self-hosted) é definida pela env var `N8N_API_URL`. O squad opera da mesma forma independente do tipo.

---

## API Endpoints — Referência Completa

### Workflows

| Method | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /workflows | Listar. Query: `active`, `tags`, `name`, `projectId`, `excludePinnedData`, `limit`, `cursor` |
| POST | /workflows | Criar workflow. Tags e meta são read-only — setar depois via PUT /tags |
| GET | /workflows/{id} | Detalhe com nodes e connections. Query: `excludePinnedData` |
| PUT | /workflows/{id} | Atualizar. Payload: `name`, `nodes`, `connections`, `settings`. Re-publica automaticamente se ativo |
| DELETE | /workflows/{id} | Deletar permanentemente |
| POST | /workflows/{id}/activate | Publicar/ativar. Aceita `versionId`, `name`, `description` |
| POST | /workflows/{id}/deactivate | Desativar |
| POST | /workflows/{id}/archive | Arquivar (soft-delete). Idempotente. Requer scope `workflow:delete` |
| POST | /workflows/{id}/unarchive | Restaurar workflow arquivado. Requer scope `workflow:delete` |
| PUT | /workflows/{id}/transfer | Transferir entre projects |
| GET | /workflows/{id}/{versionId} | Versão específica do histórico |
| PUT | /workflows/{id}/tags | Atualizar tags (array de `{id}`) |

### Executions

| Method | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /executions | Listar. Query: `status`, `workflowId`, `projectId`, `includeData`, `limit`, `cursor` |
| GET | /executions/{id} | Detalhe. Query: `includeData`, `redactExecutionData` |
| DELETE | /executions/{id} | Deletar execução |
| POST | /executions/{id}/retry | Retry. Body: `loadWorkflow` (usar versão atual vs versão da execução) |
| POST | /executions/{id}/stop | Parar execução em andamento |
| POST | /executions/stop | Parar múltiplas. Body: `status[]` (queued/running/waiting), `workflowId`, `startedAfter`, `startedBefore` |
| PUT | /executions/{id}/tags | Atualizar tags de execução |

### Credentials

| Method | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /credentials | Listar (sem secrets). Só owner/admin |
| POST | /credentials | Criar credencial |
| GET | /credentials/{id} | Detalhe |
| PUT | /credentials/{id} | Atualizar. `isPartialData: true` faz merge; `false` substitui tudo |
| DELETE | /credentials/{id} | Deletar |
| POST | /credentials/{id}/test | Testar credencial |
| GET | /credentials/schema/{typeName} | Schema do tipo de credencial |
| PUT | /credentials/{id}/transfer | Transferir entre projects |

### Tags

| Method | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /tags | Listar todas |
| POST | /tags | Criar tag |
| GET | /tags/{id} | Detalhe |
| PUT | /tags/{id} | Atualizar |
| DELETE | /tags/{id} | Deletar |

### Variables

| Method | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /variables | Listar. Query: `projectId`, `state` (empty) |
| POST | /variables | Criar variável |
| PUT | /variables/{id} | Atualizar |
| DELETE | /variables/{id} | Deletar |

### Auditoria, Discovery, Insights

| Method | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /audit | Auditoria nativa. Categories: `credentials`, `database`, `nodes`, `filesystem`, `instance`. Param: `daysAbandonedWorkflow` |
| GET | /discover | Mapa de capabilities da API key (scopes, resources, endpoints). Query: `include=schemas`, `resource`, `operation` |
| GET | /insights/summary | Métricas de execução. Query: `startDate`, `endDate`, `projectId` |

### Projects, Folders, Users

| Method | Endpoint | Descrição |
|--------|----------|-----------|
| GET/POST | /projects | Listar/criar projects |
| GET/PUT/DELETE | /projects/{id} | CRUD project |
| GET/POST/PUT/DELETE | /projects/{id}/users | Gerenciar membros |
| GET/POST | /projects/{id}/folders | Listar/criar folders |
| GET/PUT/DELETE | /projects/{id}/folders/{folderId} | CRUD folder |
| GET | /users | Listar usuários |

### Data Tables

| Method | Endpoint | Descrição |
|--------|----------|-----------|
| GET/POST | /data-tables | Listar/criar data tables |
| GET/PUT/DELETE | /data-tables/{id} | CRUD data table |
| GET/POST | /data-tables/{id}/rows | Listar/inserir linhas |
| POST | /data-tables/{id}/rows/update | Atualizar linhas |
| POST | /data-tables/{id}/rows/upsert | Upsert linhas |
| POST | /data-tables/{id}/rows/delete | Deletar linhas |
| GET/POST | /data-tables/{id}/columns | Listar/criar colunas |

### Source Control

| Method | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /source-control/pull | Pull do repositório remoto |

---

## Execution Statuses

`canceled` | `crashed` | `error` | `new` | `running` | `success` | `unknown` | `waiting`

## Execution Modes

`cli` | `error` | `integrated` | `internal` | `manual` | `retry` | `trigger` | `webhook` | `evaluation` | `chat`

---

## Node Schema (campos relevantes pra auditoria)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `executeOnce` | boolean | Processa só o primeiro item do input |
| `retryOnFail` | boolean | Retry automático em falha |
| `maxTries` | number | Número máximo de retries |
| `waitBetweenTries` | number | Delay entre retries (ms) |
| `onError` | string | Comportamento em erro (`stopWorkflow`, etc.). Substitui `continueOnFail` (deprecated) |
| `disabled` | boolean | Node desabilitado |
| `alwaysOutputData` | boolean | Sempre produz output mesmo sem dados |

---

## Workflow Settings (schema completo)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `errorWorkflow` | string | ID do workflow de erro |
| `executionOrder` | string | Ordem de execução (`v1`) |
| `executionTimeout` | number | Timeout em segundos (max 3600) |
| `timezone` | string | Timezone (`America/Sao_Paulo`) |
| `saveExecutionProgress` | boolean | Salvar progresso |
| `saveManualExecutions` | boolean | Salvar execuções manuais |
| `saveDataErrorExecution` | string | `all` ou `none` |
| `saveDataSuccessExecution` | string | `all` ou `none` |
| `callerPolicy` | string | Controle de acesso pra sub-workflows |
| `callerIds` | string | IDs permitidos (só com `workflowsFromAList`) |
| `timeSavedPerExecution` | number | Minutos economizados por execução |
| `availableInMCP` | boolean | Expor workflow via Model Context Protocol |

### callerPolicy — Valores

| Valor | Significado |
|-------|-------------|
| `any` | Qualquer workflow pode chamar |
| `none` | Ninguém pode chamar |
| `workflowsFromSameOwner` | Só workflows do mesmo project/owner (default) |
| `workflowsFromAList` | Só IDs listados em `callerIds` |

### availableInMCP

Quando `true`, o workflow é exposto via MCP pra AI assistants. Requer workflow ativo + webhook node. Implicação de segurança: qualquer MCP client com API key pode executar.

---

## API Gotchas

| Limitação | Detalhe |
|-----------|---------|
| PUT payload | Só aceita `name`, `nodes`, `connections`, `settings`. Outros campos ignorados ou dão erro |
| PATCH | Não suportado. Sempre usar PUT com payload completo |
| POST /workflows → tags | `tags` e `meta` são read-only no POST. Criar workflow, depois `PUT /workflows/{id}/tags` |
| Settings UI-only | `timeSavedMode`, `binaryMode` podem dar HTTP 400. Strippar antes do PUT |
| inputSource: passthrough | Quebra a UI do workflow. Nunca setar via API |
| create_workflow | Workflow criado via API não abre na UI automaticamente |
| versionId | Usado pra optimistic locking. PUT pode falhar se versionId mudou |
| active (read-only) | Não setar `active` no PUT. Usar `/activate` e `/deactivate` |
| isArchived (read-only) | Não setar no PUT. Usar `/archive` e `/unarchive` |

---

## Integrações

> **Fonte canônica:** `config/instance.yaml` → `integrations`

## Node Types Reference

- Referência estática em `data/n8n-node-types-reference.json`
- Spec OpenAPI completo em `data/n8n-api.yaml`
- Para nodes não cobertos, consultar Context7 MCP
