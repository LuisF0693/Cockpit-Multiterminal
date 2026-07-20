# AGENTS.md - Synkra AIOX (Codex CLI)

Este arquivo define as instrucoes do projeto para o Codex CLI.

<!-- AIOX-MANAGED-START: core -->
## Core Rules

1. Siga a Constitution em `.aiox-core/constitution.md`
2. Priorize `CLI First -> Observability Second -> UI Third`
3. Trabalhe por stories em `docs/stories/`
4. Nao invente requisitos fora dos artefatos existentes
<!-- AIOX-MANAGED-END: core -->

<!-- AIOX-MANAGED-START: quality -->
## Quality Gates

- Rode `npm run lint`
- Rode `npm run typecheck`
- Rode `npm test`
- Atualize checklist e file list da story antes de concluir
<!-- AIOX-MANAGED-END: quality -->

<!-- AIOX-MANAGED-START: codebase -->
## Project Map

- Core framework: `.aiox-core/`
- CLI entrypoints: `bin/`
- Shared packages: `packages/`
- Tests: `tests/`
- Docs: `docs/`
<!-- AIOX-MANAGED-END: codebase -->

<!-- AIOX-MANAGED-START: commands -->
## Common Commands

- `npm run sync:ide`
- `npm run sync:ide:check`
- `npm run sync:skills:codex`
- `npm run sync:skills:codex:global` (opcional; neste repo o padrao e local-first)
- `npm run validate:structure`
- `npm run validate:agents`
<!-- AIOX-MANAGED-END: commands -->

## Despacho de Workers (Story 17.1)

Qualquer chefe de departamento ou agente pode despachar um worker para o
Cockpit — outro terminal abre no projeto com a IA adequada e ja recebe a
tarefa, sem troca manual de IA:

```bash
node "apps/desktop/out/main/agent-dispatch.js" --agent "@dev" --task "implementar a story 17.2" --cwd "F:\Projetos\Meu App"
```

- `--agent` (obrigatorio): identidade do worker — vira o NOME do tile no Cockpit.
- `--task` (obrigatorio): tarefa em linguagem natural — entregue como instrucao inicial ao CLI da IA.
- `--cwd` (opcional): diretorio do projeto; default e o cwd atual. O Cockpit infere o projeto por ele.
- `--adapter` (opcional): escolha explicita da IA (`claude-code`, `codex`, `gemini-cli`, `grok`, `antigravity`).
- `--recommend` (opcional): NAO despacha — imprime JSON com a recomendacao da politica e os adapters disponiveis, como insumo da sua decisao.
- `--pipe` (opcional): named pipe do daemon; default `\\.\pipe\cockpit-daemon`.

### Protocolo de escolha de modelo (decisao do fundador, 2026-07-17)

O CHEFE que despacha decide o modelo CASO A CASO — nao existe regra fixa
tipo "codigo = sempre codex". Antes de despachar:

1. Avalie a demanda concreta (complexidade, contexto necessario, custo,
   forca de cada CLI instalada). Use `--recommend` se quiser consultar a
   sugestao da politica e a lista de adapters vivos no daemon.
2. Escolha e JUSTIFIQUE ao usuario: "para esta demanda vou usar X porque
   a, b, c". So entao rode o comando com `--adapter` explicito.
3. Se a escolha for ambigua ou de alto impacto, PERGUNTE ao usuario antes,
   apresentando as opcoes com pros e contras.
4. Sem `--adapter`, a politica deterministica decide sozinha (fallback:
   desenvolvimento → claude-code; revisao/planejamento → codex; pesquisa →
   gemini-cli; marketing/conteudo → grok) — reserve esse modo para despachos
   em lote ou quando o usuario ja delegou a escolha.

Requisitos: o build do desktop feito (`npm run build` em `apps/desktop`) e o
cockpit-daemon no ar (o proprio Cockpit o sobe). A sessao nasce no daemon e o
Cockpit a adota em ate ~4s, preservando o nome do agente. Exit codes: 0
despachado, 1 sem candidato viavel, 2 daemon inacessivel.

<!-- AIOX-MANAGED-START: shortcuts -->
## Agent Shortcuts

Preferencia de ativacao no Codex CLI:
1. Use `/skills` e selecione `aiox-<agent-id>` vindo de `.codex/skills` (ex.: `aiox-architect`)
2. Se preferir, use os atalhos abaixo (`@architect`, `/architect`, etc.)

Interprete os atalhos abaixo carregando o arquivo correspondente em `.aiox-core/development/agents/` (fallback: `.codex/agents/`), renderize o greeting via `generate-greeting.js` e assuma a persona ate `*exit`:

- `@architect`, `/architect`, `/architect.md` -> `.aiox-core/development/agents/architect.md`
- `@dev`, `/dev`, `/dev.md` -> `.aiox-core/development/agents/dev.md`
- `@qa`, `/qa`, `/qa.md` -> `.aiox-core/development/agents/qa.md`
- `@pm`, `/pm`, `/pm.md` -> `.aiox-core/development/agents/pm.md`
- `@po`, `/po`, `/po.md` -> `.aiox-core/development/agents/po.md`
- `@sm`, `/sm`, `/sm.md` -> `.aiox-core/development/agents/sm.md`
- `@analyst`, `/analyst`, `/analyst.md` -> `.aiox-core/development/agents/analyst.md`
- `@devops`, `/devops`, `/devops.md` -> `.aiox-core/development/agents/devops.md`
- `@data-engineer`, `/data-engineer`, `/data-engineer.md` -> `.aiox-core/development/agents/data-engineer.md`
- `@ux-design-expert`, `/ux-design-expert`, `/ux-design-expert.md` -> `.aiox-core/development/agents/ux-design-expert.md`
- `@squad-creator`, `/squad-creator`, `/squad-creator.md` -> `.aiox-core/development/agents/squad-creator.md`
- `@aiox-master`, `/aiox-master`, `/aiox-master.md` -> `.aiox-core/development/agents/aiox-master.md`
<!-- AIOX-MANAGED-END: shortcuts -->
