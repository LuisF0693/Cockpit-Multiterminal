# Epic 14 — Visual Multerminal (mockup como fonte de verdade)

O fundador entregou um MOCKUP FUNCIONAL completo do visual desejado
(`docs/prd/referencia-visual-multerminal.dc.html`, pasta
`C:\Users\Pichau\Downloads\Multerminal`, 2026-07-16: "Faça do jeito que
está aqui!!!!"). Diferente dos épicos 12/13 (screenshots como inspiração),
aqui existe uma especificação CONCRETA: cada cor, espaçamento, animação e
microinteração está escrita em HTML/CSS no mockup. Este épico reconstrói a
casca visual do Cockpit para bater com ele.

> **Formalização 2026-07-16 (@pm):** FR47-51. Triagem via `AskUserQuestion`
> (3 decisões do fundador): (1) **só dados reais** — seções do mockup sem
> funcionalidade por trás (custos em $, "PARALELOS git-native", modelo por
> terminal, badges MASTER/COMPANION fictícios) são omitidas ou adaptadas ao
> dado real equivalente; (2) **pan+zoom infinito** no canvas (substitui
> scroll); (3) **zonas de todos os projetos** visíveis no mesmo canvas
> (substitui o filtro por projeto ativo — ativo vira destaque/escopo de
> criação).
>
> **Ordem:** 14.1 (tokens — re-skin instantâneo de tudo que a 13.1
> tokenizou) → 14.2 (shell de layout) → 14.3 (canvas infinito + zonas) →
> 14.4 (tiles + links bezier) → 14.5 (painel de preview). A 13.1 é o que
> torna este épico barato: trocar valores de token re-veste o app inteiro.

### Story 14.1 — Paleta e tipografia Multerminal (re-tune dos tokens)

As a fundador com o mockup aprovado,
I want a paleta quase-preta neutra e fonte mono do mockup aplicadas via tokens,
so that o app inteiro ganhe a cara nova de uma vez, sem tocar componente por componente.

#### Acceptance Criteria

1. `theme.ts` re-tunado com os valores EXATOS do mockup: superfícies `#0a0a0c/#0c0c0e/#0e0e10/#0f0f11/#151517/#111113/#19191c`, bordas `#232326/#1c1c1f/#2a2a2e`, texto `#e4e4e7/#a1a1aa/#71717a/#52525b` (+ `#f4f4f5` bright), acentos ciano `#22d3ee`+`#67e8f9` (bright novo), ok `#4ade80`, warn `#fbbf24`, danger `#f87171` (FR47).
2. `font.ui` vira monoespaçada (`JetBrains Mono` com fallbacks) — TODA a interface em mono como o mockup; tamanhos ajustados à escala do mock (10/11/11.5/12/13).
3. Grade do canvas com os valores do mock (`#1c1c1f` 1.5px, célula 22px, chão `#0c0c0e`); `PROJECT_PALETTE` vira a paleta do mock (`#22d3ee #4ade80 #a78bfa #f472b6 #fbbf24 #fb923c`); raio de tile 9px, zonas 16px.
4. Testes do tema atualizados/verdes; `pnpm verify` + `smoke:daemon` PASS — nenhuma mudança de comportamento.

### Story 14.2 — Shell de layout (header, toolbar, sidebar, telemetria, rodapé de sessões)

As a fundador,
I want a estrutura de tela do mockup (header compacto, sidebar em seções, painel direito, rodapé de cards),
so that o app tenha a MESMA anatomia da referência, só que com meus dados reais.

#### Acceptance Criteria

1. Header 42px: marca "MEU COCKPIT", abas de view, `v{versão} · N sessões · ● daemon`, controle de zoom (movido da toolbar 13.2) e "+ novo terminal" (FR48).
2. Sidebar esquerda 240px em seções com títulos maiúsculos (10px, letter-spacing): PROJETO (pasta ativa), NOVO AGENTE (adapters reais do catálogo 13.4 com nome+descrição — clicar cria terminal), PROJETOS (dot colorido + nome, ativo destacado), ARQUIVOS (árvore real 12.1), APP & SISTEMA (entradas REAIS: Configurações 13.5, Agentes 13.4, Learnings, Timeline) e rodapé de build (versão real; SEM custos — sem rastreio ainda) (FR48).
3. Painel direito 230px: "TELEMETRIA + STATUS" com card de decisões pendentes (contagem real da 5.3, âmbar) + "EVENTOS" (timeline real resumida, cores por tipo) (FR48).
4. Rodapé 88px: cards das sessões ATIVAS reais (dot de status, nome, cwd, tempo no status — SEM custo) — clicar foca o terminal (FR48).
5. A view master/tasks/board/learnings/etc continuam acessíveis pelas abas — nenhuma funcionalidade removida, só re-hospedada na nova casca.

### Story 14.3 — Canvas infinito (pan+zoom) + zonas de projeto

As a fundador,
I want navegar o canvas arrastando o fundo, com todos os projetos visíveis em zonas coloridas,
so that eu enxergue e organize a topologia inteira dos meus projetos de uma vez, como no mockup.

#### Acceptance Criteria

1. Mundo transformado (`translate(pan) scale(zoom)`, origin 0 0): arrastar o FUNDO faz pan; Ctrl+scroll (e wheel simples, como o mock) dá zoom [0.35, 1.6]; tiles/links/zonas vivem no mundo (FR49).
2. Terminais de TODOS os projetos visíveis; cada projeto com terminais ganha uma ZONA (retângulo arredondado 16px na cor do projeto, `border {cor}44`, fundo `{cor}12`, etiqueta pill com dot+nome+contagem) calculada do bounding box dos tiles + padding (FR49).
3. Projeto ativo = destaque (zona/etiqueta mais fortes) e escopo de criação (novo terminal nasce nele) — trocar de projeto NÃO esconde os demais; workspace (3.6) continua filtrando dentro do projeto como hoje.
4. Drag de tile/resize/vínculo compensam pan E zoom (o divisor por zoom da 12.6 ganha o termo de pan); minimapa "MAPA" (150×96, canto inferior direito) reflete o mundo com viewport e continua clicável.
5. Tiles NUNCA desmontam (gotcha xterm 1.3) — zonas/pan/zoom são só transformação visual.

### Story 14.4 — Tiles e vínculos estilo Multerminal

As a fundador,
I want tiles e links visualmente idênticos ao mockup (barra compacta, pontos de conexão, bezier animado com etiqueta),
so that a interação de vincular terminais seja tão legível quanto na referência.

#### Acceptance Criteria

1. Tile: raio 9, borda `#26262a` (ciano quando vinculando), sombra por foco; barra de título 30px com `>_`, dot de status PULSANTE, nome, badge do papel REAL (MASTER quando master da three-brain/escritor, revisor, ou adapter), chip do adapter, botões maximizar (⤢, alterna tamanho) e fechar; rodapé 24px com cwd real + id do adapter (FR50).
2. Pontos de conexão nas 4 bordas do tile (10px, borda ciano): arrastar de um ponto até outro tile cria o vínculo (substitui o Alt+drag como gesto primário; Alt+drag continua funcionando); durante o arraste, linha tracejada ciano + toast "Clique em outro terminal para conectar · esc cancela" (FR50).
3. Vínculos: curva bezier horizontal tracejada ANIMADA (dashflow) na cor do vínculo (paleta cíclica), com bolinha percorrendo o caminho (flowmove), etiqueta central (`manual`/`auto`) e botão × vermelho no meio que REMOVE o vínculo direto no canvas (FR50).
4. 8 alças de resize (9px, borda ciano) visíveis só no tile focado — substitui as 3 alças invisíveis atuais.

### Story 14.5 — Painel de preview de arquivo

As a fundador,
I want que abrir um arquivo da árvore abra um painel dedicado de ~520px com toggle Preview/Markdown,
so that eu leia docs confortavelmente sem apertar a sidebar, como no mockup.

#### Acceptance Criteria

1. Selecionar arquivo na árvore abre painel de 520px entre canvas e telemetria: header com ícone+nome+fechar, sub-barra com toggle Preview/Markdown (só pra .md; demais arquivos direto em raw) (FR51).
2. Preview renderizado reusa `markdown-lite` (FR35) com a tipografia do mockup (h1 24/h2 17/h3 14, código em card `#151517`).
3. O preview embutido na sidebar (12.1) é REMOVIDO — a árvore só navega/abre; a sidebar fica mais leve.
4. Painel fecha no ×; estado não persiste (efêmero por design, como o mock).
