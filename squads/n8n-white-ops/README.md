# n8n-white-ops

Squad de AI agents para operar, documentar, auditar e proteger seus workflows n8n. Funciona em qualquer instância (cloud ou self-hosted) — o que define o ambiente é a API key e um arquivo de configuracao.

## O que esse squad faz

Sao 7 agents especializados que trabalham juntos:

```
n8n-chief (orquestrador)
  |
  |-- n8n-builder      Cria e edita workflows a partir de linguagem natural
  |-- n8n-documenter   Gera sticky notes automaticas pro editor do n8n
  |-- n8n-auditor      Audita saude e da nota de 0-100 pra cada workflow
  |-- n8n-security     Encontra credenciais expostas, webhooks abertos, SQL injection
  |-- n8n-ideator      Sugere otimizacoes e consolidacoes entre workflows
  |-- n8n-compliance   Verifica se nomenclatura, tags e documentacao seguem o padrao
```

Cada agent sabe analisar a estrutura de um workflow via API, incluindo logica de fluxo: loops, branches (IF/Switch), merges, sub-workflows, filtros e error handling.

## Requisitos

- Claude Code com AIOS Core instalado (v2.1+)
- Acesso a API do n8n (key com scope de leitura no minimo)
- Context7 MCP habilitado (pra consulta de docs ao vivo — opcional mas recomendado)

## Setup em 3 passos

### 1. Env vars

Defina as variaveis de ambiente com a URL e key da sua instancia:

```
N8N_API_URL=https://sua-instancia.app.n8n.cloud
N8N_API_KEY=sua-api-key-aqui
```

### 2. Configurar seu ambiente

Edite `config/instance.yaml` com os dados do seu time:

```yaml
owners:
  - tag: Maria        # tag usada nos workflows do n8n
    name: Maria Silva  # nome completo

systems:
  - abbr: CRM
    name: HubSpot

integrations:
  - service: Slack
    usage: Notificacoes de erro
```

O `instance.yaml` e a unica fonte de verdade. Nenhum agent tem nomes, sistemas ou metricas hardcoded — tudo vem desse arquivo.

### 3. Usar

```
@n8n-chief
```

O chief roteia automaticamente pro agent certo. Ou acesse direto:

```
@n8n-builder *build <descreva o workflow>
@n8n-documenter *document <workflow-id>
@n8n-auditor *audit <workflow-id>
@n8n-security *scan <workflow-id>
@n8n-ideator *improve <workflow-id>
@n8n-compliance *check <workflow-id>
```

## Guia de uso por cenario

### "Quero criar um workflow"

O builder recebe uma descricao em linguagem natural e gera o workflow completo.

```
@n8n-builder *build webhook que recebe pagamento do Hotmart, salva no Supabase e notifica no Slack
```

Ele faz tudo:
- Monta nodes com tipos, parametros e posicoes corretos
- Gera connections entre os nodes (incluindo branches e merges)
- Aplica nomenclatura automatica (`[WH][HOTMART][SUPA] - Processar Vendas`)
- Configura error handling e settings
- Nomeia cada node em snake_case descritivo (nunca "Set1" ou "IF")

O fluxo e sempre: preview primeiro, voce confirma, depois ele gera o JSON.

**3 modos de output:**
1. **Preview** — mostra a estrutura visual pra voce validar antes
2. **JSON** — payload pronto pra PUT /workflows/{id} via API
3. **Clipboard** — JSON no formato do n8n pra colar com Ctrl+V no editor

Tambem edita e clona workflows existentes:
```
@n8n-builder *edit J2pjLqBiMEU6Nq54 adicionar notificacao no Slack
@n8n-builder *clone J2pjLqBiMEU6Nq54 trocar Hotmart por PagTrust
```

Depois de criar, o ideal e rodar o pipeline completo:
```
@n8n-documenter *document {id}    # documenta com sticky notes
@n8n-auditor *audit {id}          # valida saude
@n8n-security *scan {id}          # scan de seguranca
@n8n-compliance *check {id}       # verifica padrao
```

### "Quero documentar meus workflows"

O documenter gera sticky notes em JSON que voce cola direto no editor do n8n (Ctrl+V).

```
@n8n-documenter *document J2pjLqBiMEU6Nq54
```

Ele analisa cada node, identifica tipo/operacao/parametros e gera uma nota posicionada acima do node com cor por categoria (verde=trigger, azul=action, amarelo=logic, roxo=transform, cinza=utility, laranja=AI).

Para documentar em lote:
```
@n8n-documenter *batch                    # todos os ativos
@n8n-documenter *batch --owner Maria      # so os da Maria
@n8n-documenter *batch --tag Critico      # so os criticos
```

Em workflows grandes (10+ nodes), ele tambem gera uma sticky note de visao geral com resumo do fluxo, branches, loops e sub-workflows.

### "Quero saber a saude dos meus workflows"

O auditor avalia 6 categorias e da um score de 0-100:

| Categoria | Peso | O que verifica |
|-----------|------|----------------|
| Estrutura | 25 | Tem trigger? Nodes desconectados? |
| Error Handling | 20 | Error workflow configurado? Nodes criticos com catch? |
| Performance | 15 | Loops infinitos? Timeouts? Batch size? |
| Manutenibilidade | 25 | Nomes descritivos? Sticky notes? Tags? |
| Flow Logic | 15 | Dead branches? Sub-workflow circular? Merge desbalanceado? |

```
@n8n-auditor *audit <workflow-id>       # um workflow
@n8n-auditor *audit-all                 # todos os ativos
```

Antes da analise manual, ele roda o `POST /audit` nativo do n8n como baseline.

Classificacao:
- 90-100: Excelente
- 70-89: Bom
- 50-69: Regular
- 30-49: Ruim
- 0-29: Critico

### "Quero encontrar vulnerabilidades"

O security faz scan em 6 categorias:

1. **Secrets hardcoded** — API keys, JWT tokens, senhas em Code nodes
2. **Webhooks abertos** — sem autenticacao, paths previsiveis
3. **SQL injection** — queries dinamicas com `$json` sem sanitizacao
4. **Dados sensiveis** — PII em logs, cartao/CPF sem masking
5. **Permissoes** — credenciais com escopo excessivo
6. **Flow logic** — sub-workflow sem `callerPolicy`, loop DoS, auth bypass por branching, MCP exposure

```
@n8n-security *scan <workflow-id>       # um workflow
@n8n-security *scan-all                 # todos os ativos
@n8n-security *check-webhooks           # so webhooks abertos
```

Ele tambem roda o audit nativo do n8n (`POST /audit`) como primeiro passo — que ja detecta credentials nao usadas, community nodes e filesystem access.

### "Quero otimizar meus workflows"

O ideator analisa e sugere melhorias categorizadas por impacto vs esforco:

```
@n8n-ideator *improve <workflow-id>     # um workflow
@n8n-ideator *patterns                  # detecta padroes entre workflows
@n8n-ideator *consolidate               # sugere consolidacoes
```

Ele sabe sugerir:
- Extrair sub-workflows de sequencias repetidas (5+ nodes em 3+ workflows)
- Otimizar loops (batchSize 1 → 10-50, substituir loop manual por Loop Over Items)
- Simplificar branches (3+ IF aninhados → Switch)
- Corrigir modo de Merge (Append vs by Key vs by Index)
- Adicionar rate limiting em loops com HTTP
- Usar `retryOnFail` em vez de error handling manual

### "Quero verificar padrao de nomenclatura"

O compliance verifica 5 categorias com score ponderado:

```
@n8n-compliance *check <workflow-id>    # um workflow
@n8n-compliance *check-all              # todos
@n8n-compliance *inventory              # inventario completo da instancia
```

A convencao de nomenclatura e: `[TIPO][SISTEMA_ORIGEM][SISTEMA_DESTINO] - Acao Especifica`

Os prefixos de tipo, abreviacoes de sistema e tags obrigatorias sao definidos no seu `config/instance.yaml`.

## Estrutura de arquivos

```
n8n-white-ops/
  squad.yaml                # Manifest
  README.md                 # Este arquivo
  config/
    instance.yaml            # SEU AMBIENTE: owners, sistemas, prefixos
    coding-standards.md      # Padroes de nomenclatura
    tech-stack.md            # API completa (40+ endpoints) e gotchas
    source-tree.md           # Arvore de arquivos
  agents/                    # 7 agents (chief + 6 especialistas)
  tasks/                     # 8 tasks
  data/
    n8n-api.yaml             # OpenAPI spec v1.1.1 completo
    n8n-node-types-reference.json
```

## API — o que o squad conhece

O squad tem a referencia completa da API n8n v1.1.1 (40+ endpoints), incluindo:

- Workflows: CRUD + activate/deactivate + archive/unarchive + versioning + transfer
- Executions: list + detail + retry + stop + stop many
- Credentials: CRUD + test + schema
- Tags, Variables, Projects, Folders, Data Tables
- Audit nativo (`POST /audit`)
- Insights (`GET /insights/summary`)
- Discovery (`GET /discover`)

Gotchas importantes estao documentados em `config/tech-stack.md` — como o fato de PATCH nao existir, tags serem read-only no POST, e quais campos de settings dao HTTP 400.

## Whitelabel — como adaptar pra outra instancia

1. Copie a pasta `n8n-white-ops/`
2. Edite `config/instance.yaml` com os dados do novo ambiente
3. Defina as env vars `N8N_API_URL` e `N8N_API_KEY`
4. Pronto — os agents funcionam igual

Voce nao precisa editar nenhum arquivo de agent ou task. Tudo que varia entre instancias esta centralizado no `instance.yaml`.

## Context7 — docs ao vivo

Os agents usam o Context7 MCP pra consultar documentacao atualizada do n8n em tempo real. Isso e util quando encontram nodes desconhecidos ou precisam validar best practices.

Libraries disponiveis:
- `/n8n-io/n8n-docs` — docs oficiais (melhor qualidade)
- `/llmstxt/n8n_io_llms-full_txt` — cobertura maxima de nodes

Limite: maximo 3 consultas por tarefa pra controlar custo de contexto.

---

*n8n-white-ops v2.1.0*
