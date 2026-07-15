# Epic 12 — Identidade Visual & Interação no Canvas

Fecha a lacuna entre o Cockpit atual e a experiência visual que o fundador
já usa em outra ferramenta de referência (briefing direto com 7 capturas
de tela, 2026-07-14): vínculos desenhados a mão no canvas, uma barra
lateral única com projetos+arquivos, preview de Markdown, identidade
visual por agente/projeto e um minimapa.

> **Formalização 2026-07-14 (@pm, spec pipeline):** briefing direto do
> fundador com 7 capturas de tela de referência, durante a validação em
> modo dev dos Épicos 8-11. FR34-40 adicionados a `requirements.md`.
> Complexidade: STANDARD (a maior parte reusa entidades já existentes —
> vínculo terminal-a-terminal do E9, projeto do E8, adapter do E2 — só
> muda COMO o humano interage com elas). Ordem de execução confirmada
> pelo fundador: 12.1 → 12.2 → 12.3 → 12.4 → 12.5.
>
> **Decisão de design deliberada:** nenhuma entidade nova de domínio é
> criada neste épico — `TerminalLink` (E9), `Project` (E8) e o contrato de
> `Adapter` (E2) já existem; este épico é inteiramente sobre SUPERFÍCIE
> (arrastar em vez de dropdown, uma barra em vez de duas telas, cor em vez
> de texto). Os 2 adapters novos (Gemini CLI, Antigravity) seguem o MESMO
> contrato normalizado do E2 — nenhuma exceção arquitetural.

### Story 12.1 — Barra lateral unificada (projetos + arquivos + preview Markdown)

As a desenvolvedor multi-projeto,
I want ver meus projetos e os arquivos do projeto ativo na MESMA barra lateral, sempre visível,
so that eu não precise trocar de tela pra navegar entre "qual projeto" e "o que tem nele".

#### Acceptance Criteria

1. `ProjectSidebar` (8.2) e `FileExplorer` (8.4) passam a viver na MESMA barra lateral persistente (projetos no topo, árvore de arquivos do projeto ativo abaixo) — a view dedicada `'files'` (8.4) é removida do nav, substituída por esta barra sempre visível.
2. Trocar de projeto atualiza a árvore de arquivos exibida automaticamente (reusa `FileExplorer` já existente, só muda ONDE ele é renderizado).
3. Selecionar um arquivo `.md` exibe preview RENDERIZADO (título, listas, código, links) além do modo texto puro já existente (FR35) — outros tipos de arquivo continuam em texto puro.
4. Barra lateral é colapsável (mesmo padrão já usado pela `Sidebar` de sessões, 1.3) para quem quer mais espaço de canvas.

### Story 12.2 — Vínculo terminal-a-terminal por arraste no canvas

As a desenvolvedor multi-agente,
I want arrastar de um terminal a outro no canvas pra criar um vínculo,
so that eu monte a topologia de comando visualmente, sem abrir a sessão master.

#### Acceptance Criteria

1. Arrastar a partir de uma alça dedicada no cabeçalho do `TerminalTile` até outro tile cria um `TerminalLink` (reusa `terminalLink.create` já existente, 9.1) — mesmo resultado do dropdown da sessão master (9.3), caminho alternativo.
2. Durante o arraste, uma linha de "preview" acompanha o cursor (feedback visual imediato); soltar sobre um tile válido (mesmo projeto, FR25 AC4) cria o vínculo; soltar fora cancela.
3. Modo do vínculo criado por arraste é `manual` por padrão (consistente com a criação via dropdown); trocar para `auto` continua disponível na sessão master (9.3) — não duplica essa escolha na gesture de arrastar.
4. Gesture de vínculo é claramente distinta da gesture de mover/redimensionar tile já existente (TerminalTile) — usa uma alça própria, nunca conflita com o `onPointerDown` do cabeçalho que já move o tile.

### Story 12.3 — Fundo colorido por projeto nos terminais

As a desenvolvedor multi-projeto,
I want que os terminais do projeto ativo tenham uma cor de fundo/borda reconhecível,
so that eu identifique de relance a qual projeto cada terminal pertence, sem ler o nome.

#### Acceptance Criteria

1. `TerminalTile` (e `BrowserPreviewTile`) recebem uma indicação visual (borda ou fundo sutil) na cor do PROJETO ao qual o terminal pertence (FR21) — reusa a cor já cadastrada no projeto, nenhuma paleta nova.
2. Terminais sem projeto (dado pré-Épico-8, raro após o backfill) não mostram cor — visual neutro atual, sem regressão.
3. A cor de projeto é sutil o bastante pra não brigar com os indicadores de status já existentes (pulso de waiting-input, borda de foco) — camadas visuais coexistem sem confusão.
4. Funciona igual em qualquer workspace (3.6) dentro do projeto — a cor é por PROJETO, não por workspace.

### Story 12.4 — Identidade visual por adapter + adapters Gemini CLI e Antigravity

As a desenvolvedor multi-agente,
I want reconhecer visualmente qual agente (Claude, Codex, Grok, Gemini, Antigravity) está em cada terminal,
so that eu não precise ler o nome do adapter pra saber quem é quem.

#### Acceptance Criteria

1. Cada adapter tem uma cor de identidade própria, exibida no cabeçalho do `TerminalTile` e na sessão master (mesmo princípio de token de cor já usado pra status, `STATUS_COLORS`) — tabela fixa por `adapterId`, nenhuma configuração de usuário nesta story.
2. NOVO adapter `gemini-cli` — spawna o comando `gemini`, segue o mesmo contrato normalizado (FR3): ciclo de vida do processo, entrada/saída, detecção de status (idle/working/waiting-input/done/error).
3. NOVO adapter `antigravity` — spawna o comando `agy`, mesmo contrato normalizado; instalado via `curl -fsSL https://antigravity.google/cli/install.cmd`, binário local do usuário — o adapter só invoca o comando já instalado no PATH, não faz a instalação.
4. Seletor de adapter (App.tsx, já existente desde o Épico 2) passa a listar os 6 adapters (shell, claude-code, codex, grok, gemini-cli, antigravity).

### Story 12.5 — Minimapa do canvas

As a desenvolvedor multi-agente,
I want um minimapa no canto do canvas mostrando todos os tiles,
so that eu navegue rápido quando tenho muitos terminais abertos ao mesmo tempo.

#### Acceptance Criteria

1. Minimapa fixo num canto do canvas mostra um retângulo por tile (posição/tamanho proporcional ao `layout.tiles` real, cor por projeto quando aplicável — reusa a 12.3).
2. Clicar num retângulo do minimapa foca o tile correspondente (mesmo `focus`/`bringToFront` já existente) e rola o canvas até ele.
3. Minimapa só aparece quando há tiles fora da área visível do canvas (evita ruído em telas com poucos terminais) — ou é colapsável, qualquer uma das duas soluções satisfaz o AC.
4. Minimapa é OMITIDO da view `'canvas'` quando o canvas está oculto (master ativo) — mesmo princípio de "só monta o que está em uso" já aplicado no resto do app.
