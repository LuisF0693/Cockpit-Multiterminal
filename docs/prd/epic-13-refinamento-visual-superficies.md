# Epic 13 — Refinamento Visual & Superfícies de Referência

Eleva o acabamento visual do Cockpit ao nível da ferramenta de referência
(AIOX Cockpit) e entrega a leva grande de superfícies de UI pedida pelo
fundador na validação do Épico 12: tema coeso ("tô achando um pouco feio"
— feedback direto, 2026-07-15), toolbar do canvas, status bar com branch
git, catálogo de agentes e tela de Configurações.

> **Formalização 2026-07-15 (@pm, spec pipeline):** escopo confirmado pelo
> fundador via `AskUserQuestion` durante a triagem da Story 12.6
> (2026-07-15) — a leva MAIOR de UI de referência vira este épico,
> separada dos ajustes rápidos da 12.6. FR41-46 adicionados a
> `requirements.md`. Complexidade: STANDARD — nenhuma entidade nova de
> domínio; é superfície + 1 leitura nova no Main (branch git) + 1 chave
> de preferências (reusa `app_meta`).
>
> **Decisão de design deliberada:** o épico começa pelo TEMA (13.1) porque
> todas as outras superfícies novas (toolbar, status bar, catálogo,
> configurações) devem nascer JÁ usando os tokens — na ordem inversa,
> cada story criaria estilo ad-hoc pra retrabalhar depois. Diagnóstico
> técnico que motiva a 13.1: estilos inline espalhados (32 declarações só
> no App.tsx) sem fonte única além de `STATUS_COLORS`/`adapter-colors`.
>
> **Fora de escopo, aguardando definição com o fundador (Artigo IV —
> No Invention):** painel "MCP Agents" (o Cockpit não tem conceito de MCP
> hoje — precisa de elicitação real do que o fundador espera que ele
> faça AQUI), "Mapa do código"/comparar/limpar grafo (idem — escopo não
> confirmado), adapter "Hermes" (comando de CLI real nunca confirmado —
> mesmo critério usado com Antigravity antes do `agy`).

### Story 13.1 — Tema visual global (design tokens + refresh do canvas)

As a fundador que olha pro Cockpit o dia inteiro,
I want um visual coeso e bonito (fundo, tipografia, bordas, sombras, espaçamentos consistentes) no canvas e em todas as telas,
so that a ferramenta pareça um produto de referência, não um protótipo.

#### Acceptance Criteria

1. Módulo `theme.ts` novo no pacote `@cockpit/ui` com tokens nomeados (superfícies em camadas bg/painel/tile, texto primário/secundário/muted, borda, acento, raios, sombras, tipografia, escala de espaçamento) — `STATUS_COLORS` e `adapter-colors` continuam existindo e passam a ser referenciados pelo tema, não substituídos (FR41).
2. Canvas refeito visualmente sobre os tokens: fundo com profundidade (não chapado), tiles com raio/sombra/borda consistentes, cabeçalho de tile mais limpo (nome+adapter+status sem poluição), tinta de projeto (12.6) integrada à nova paleta.
3. Todas as superfícies existentes (sidebar unificada, master, TasksPanel, LifecycleBoard, LearningsView, TimelineView, SessionReport, ReviewPanel, modais, Recovery Screen) migradas para os tokens — critério objetivo: nenhuma cor hex de superfície/texto/borda hardcoded fora de `theme.ts`/`status-colors`/`adapter-colors` no pacote UI e no App.tsx.
4. Zero regressão funcional: nenhuma mudança de comportamento, só de apresentação — todos os testes existentes continuam passando sem alteração de lógica.

### Story 13.2 — Toolbar do canvas

As a desenvolvedor multi-agente,
I want uma toolbar compacta no canvas com as ações principais (novo terminal, novo preview, zoom, minimapa, overlay de vínculos),
so that eu não precise caçar controles espalhados pelo header e cantos da tela.

#### Acceptance Criteria

1. Toolbar fixa no canvas (posição consistente com a referência visual) com ícones + tooltips para: novo terminal (adapter ativo), novo preview de browser, zoom in / out / reset (reusa o estado da 12.6), alternar minimapa (12.5), alternar overlay de vínculos (9.3) (FR42).
2. Os controles de zoom hoje soltos no canvas são MOVIDOS para a toolbar (sem duplicação de UI).
3. Alternar o overlay de vínculos esconde/mostra as linhas SVG sem destruir os vínculos (só visual, entidade intocada).
4. Toolbar usa os tokens da 13.1 e não sobrepõe tiles (z-index/posicionamento corretos em qualquer zoom).

### Story 13.3 — Status bar global + branch git do projeto

As a fundador operando vários projetos,
I want um rodapé persistente com projeto ativo, branch git, status do daemon, sessões ativas e decisões pendentes,
so that o estado vital do sistema esteja sempre visível de relance, como num IDE.

#### Acceptance Criteria

1. Status bar persistente no rodapé do app, visível em TODAS as views (canvas e master), com: nome+cor do projeto ativo, branch git, badge do daemon (reusa 6.4), contagem de sessões ativas e contagem de decisões pendentes (reusa a fila da 5.3) (FR43).
2. Branch git lida no MAIN (novo handler IPC, `node:child_process`/leitura de `.git/HEAD` — nunca no renderer), do `rootPath` do projeto ativo; projeto sem repositório git mostra estado neutro (sem erro) (FR44).
3. Branch atualiza ao trocar de projeto e em intervalo periódico modesto (>= 5s, mesmo padrão de poll já usado pelo transcript do ReviewPanel) — sem processo git por render.
4. Clicar na contagem de decisões pendentes navega para a fila de decisões (master) — mesmo atalho que o badge do header já dá.

### Story 13.4 — Catálogo de agentes

As a fundador escolhendo qual agente rodar,
I want um painel-catálogo listando todos os adapters com descrição, cor, comando e se estão instalados,
so that eu saiba de relance o que posso spawnar nesta máquina sem tentar e ver falhar.

#### Acceptance Criteria

1. Painel "Agentes" (nova entrada de navegação) lista TODOS os adapters registrados com: nome de exibição, descrição curta, cor de identidade (12.4), comando de spawn e argumento default quando houver (Ollama) (FR45).
2. Disponibilidade real no PATH verificada no MAIN (`where` / lookup de executável — nunca no renderer): badge instalado / não encontrado por adapter.
3. Ação "novo terminal com este adapter" direto do catálogo (reusa o fluxo de criação existente, incluindo campo de modelo pro Ollama).
4. A tabela de metadados (descrição/comando por adapter) vive junto de `adapter-colors.ts` no pacote UI ou em `@cockpit/shared` — fonte única, sem strings duplicadas no App.tsx.

### Story 13.5 — Tela de Configurações

As a fundador,
I want uma tela de Configurações com as preferências do app,
so that eu ajuste comportamentos padrão sem depender de valores chumbados no código.

#### Acceptance Criteria

1. Tela/painel de Configurações (nova entrada de navegação, ícone de engrenagem) com no mínimo: modelo default do Ollama, intervalo de refresh do preview de browser (10.1) e zoom padrão do canvas (12.6) (FR46).
2. Preferências persistem via `app_meta` (mesma infraestrutura `getMeta`/`setMeta` do FR10/8.1) — chave única `settings`, JSON versionado; sem tabela nova.
3. Valores aplicados de verdade nos consumidores (novo terminal Ollama usa o default configurado; poll do preview usa o intervalo; canvas abre no zoom configurado) — não é uma tela cosmética.
4. Defaults atuais preservados quando nada foi configurado (zero regressão pra quem nunca abrir a tela).
