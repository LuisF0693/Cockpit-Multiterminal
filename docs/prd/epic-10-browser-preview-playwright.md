# Epic 10 — Browser Preview & Playwright

Painel de preview de browser embutido no Cockpit, navegável por URL e
automatizável via Playwright — para que os agentes possam testar/interagir
com aplicações web (ex.: o próprio projeto que estão desenvolvendo) sem sair
do ambiente orquestrado.

> **Formalização 2026-07-14 (@pm, spec pipeline):** extensão da visão do
> fundador (briefing com capturas de tela). FR28-29 e NFR9 adicionados a
> `requirements.md`. Depende do Épico 8 (preview é escopado ao projeto ativo).
> Complexidade: STANDARD — única epic desta rodada com dependência externa
> nova (Playwright, confirmada explicitamente com o fundador antes da
> formalização, per NFR9).
>
> **Decisão de design deliberada:** Playwright roda CONFINADO ao processo de
> preview (Main, novo módulo isolado) — nunca importado por `core`/`shared`,
> mesmo isolamento de provider já garantido pelo NFR7/`check-provider-isolation.mjs`
> para adapters. O preview é uma VIEW do canvas (como um tile), não uma
> feature de automação headless separada — os agentes automatizam ATRAVÉS do
> mesmo browser que o humano está vendo (WYSIWYG: o que os agentes fazem
> fica visível), nunca uma segunda instância invisível.

### Story 10.1 — Painel de preview de browser (navegação manual)

As a desenvolvedor multi-agente,
I want um painel de browser embutido navegável por URL,
so that eu possa ver a aplicação que estou desenvolvendo sem sair do Cockpit.

#### Acceptance Criteria

1. Novo tipo de tile no canvas: "browser preview" — barra de URL + botão voltar/avançar/recarregar + área de renderização.
2. Preview roda sobre uma instância Playwright (Chromium) gerenciada pelo Main — nunca `<webview>`/`<iframe>` do próprio Electron (precisa ser controlável externamente pelo Playwright para a automação da 10.2).
3. Preview persiste a última URL visitada por tile (mesma garantia de persistência de layout do FR10), mas NÃO precisa persistir estado de navegação profundo (histórico completo) — só a URL atual, reabrir carrega essa URL.
4. Preview é escopado ao projeto ativo (Épico 8) como qualquer outro tile do canvas.

### Story 10.2 — Automação via Playwright para agentes

As a desenvolvedor multi-agente,
I want que agentes possam automatizar o browser preview (navegar, clicar, ler o DOM),
so that eles testem a aplicação web que estão construindo sem eu precisar descrever o que ver.

#### Acceptance Criteria

1. Contrato IPC expõe operações básicas de automação (navegar, clicar por seletor, ler texto/screenshot) sobre a MESMA instância Playwright do tile visível (10.1) — não uma sessão headless paralela.
2. Operações de automação são acionáveis por instrução ao agente (o agente decide chamar, via o mecanismo de tooling que ele já tem — MCP ou equivalente already exposto pelos adapters) OU manualmente pelo humano a partir do painel — qualquer um dos dois caminhos satisfaz o AC.
3. Toda ação de automação é registrada na timeline (origem `system` quando disparada por agente, `human` quando manual) — mesmo padrão de auditoria já usado em todo o app.
4. Falha de automação (seletor não encontrado, timeout) não derruba o preview nem o app — erro reportado de volta ao chamador, painel continua navegável manualmente.
