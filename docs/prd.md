# Meu Cockpit — Product Requirements Document (PRD)

> **Autor:** Morgan (@pm) — AIOX Fase 2 (greenfield-fullstack)
> **Insumos:** `docs/project-brief.md`, `docs/research/competitor-analysis.md`

## Goals and Background Context

### Goals

- Eliminar a carga cognitiva de gerenciar manualmente múltiplos CLIs de IA em terminais desconectados.
- Entregar uma central de controle multiagente desktop com sessão master que mantém coerência entre agentes.
- Garantir sobrevivência total de sessão: fechar/reiniciar o app nunca perde estado, contexto ou histórico.
- Ser agnóstico de provider via adapter design — adicionar um novo CLI = escrever 1 adapter.
- Integrar decisões humanas (aprovar/revisar/redirecionar) ao fluxo como governança de primeira classe.
- Validar o MVP conduzindo um ciclo AIOX real com 3 agentes de providers diferentes, com restart no meio, sem perda de estado.

### Background Context

Desenvolvedores multi-agente operam hoje como "barramento humano de integração": N terminais, N contextos, N convenções de hooks — e todo o estado evapora a cada restart. A análise competitiva (Nyx, Maestri, Orca) mostrou que o mercado resolveu a *visualização* de múltiplos agentes (canvas de tiles PTY), mas ninguém resolveu a *orquestração governada*: sessão master com memória, lifecycle ponta a ponta e persistência como contrato. O Meu Cockpit ocupa esse quadrante vazio, transformando desenvolvimento multi-LLM em **entrega agêntica**: o humano governa, o sistema executa a mecânica.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-10 | 0.1 | Draft inicial a partir do project brief | Morgan (@pm) |

## Requirements

### Functional

- **FR1:** O sistema deve criar, nomear, redimensionar, reorganizar e fechar múltiplos terminais em um grid, cada um hospedando um PTY real (shell comum ou agente CLI).
- **FR2:** O sistema deve suportar no mínimo 6 terminais PTY simultâneos ativos e interativos.
- **FR3:** O sistema deve implementar um contrato de adapter que normalize, por provider: spawn do CLI, ciclo de vida do processo, entrada/saída e sinais de status.
- **FR4:** O sistema deve incluir adapters funcionais para Claude Code, Codex e Grok CLI, além de um adapter genérico de shell.
- **FR5:** Cada adapter deve detectar e reportar o status do agente (idle / working / waiting-input / done / error) em tempo real.
- **FR6:** A sessão master deve exibir visão agregada de todos os terminais ativos com status, agente, tarefa vinculada e tempo decorrido.
- **FR7:** A sessão master deve permitir enviar instruções (texto) a qualquer terminal sem sair do painel master.
- **FR8:** A sessão master deve manter um registro cronológico (timeline) de eventos: spawns, mudanças de status, decisões humanas, conclusões.
- **FR9:** O sistema deve notificar visualmente quando qualquer agente entra em estado waiting-input (aguardando decisão/entrada humana).
- **FR10:** O sistema deve persistir continuamente todo o estado: layout do grid, sessões, scrollback dos terminais, timeline, entidades de lifecycle e vínculos.
- **FR11:** Ao reabrir o app (fechamento normal ou crash), o sistema deve restaurar integralmente o estado anterior, incluindo reconexão/relançamento dos terminais com seu contexto.
- **FR12:** Após recuperação de crash, o sistema deve apresentar um resumo do que estava em andamento (agentes ativos, tarefas, últimas decisões).
- **FR13:** O sistema deve gerenciar entidades de trabalho (tarefas) com estados de lifecycle: planejada → em execução → aguardando decisão → revisada → concluída.
- **FR14:** Cada tarefa deve poder ser vinculada a um ou mais terminais/agentes, e o vínculo deve ser visível na sessão master e na tarefa.
- **FR15:** Pontos de decisão humana (aprovar / rejeitar / redirecionar) devem ser registrados na timeline com autor, timestamp e justificativa opcional.

### Non Functional

- **NFR1:** Aplicação desktop local-first; nenhum dado de sessão, código ou credencial sai da máquina do usuário.
- **NFR2:** Windows 10/11 é a plataforma primária de suporte; arquitetura não deve impedir portabilidade futura para macOS/Linux.
- **NFR3:** Render de terminal fluido (sem lag perceptível de digitação) com ≥ 6 PTYs ativos em hardware modesto (referência: máquina de desenvolvimento Windows 10 do fundador).
- **NFR4:** Time-to-resume < 10 segundos: da abertura do app à retomada completa do trabalho.
- **NFR5:** Session survival rate de 100%: nenhum cenário de fechamento (normal ou crash) pode resultar em perda de estado persistido.
- **NFR6:** Adapters não devem interceptar, armazenar ou logar credenciais dos CLIs; autenticação permanece nos próprios CLIs ("bring your own subscription").
- **NFR7:** O core (session manager, state store, lifecycle engine) não pode ter dependência de provider específico; toda especificidade vive nos adapters.
- **NFR8:** Persistência incremental sem degradar performance dos terminais (gravação assíncrona/batched, nunca bloqueante do input do usuário).

## User Interface Design Goals

### Overall UX Vision

Um cockpit, não um caos de janelas: o usuário vive na **sessão master** (visão de comando) e mergulha em terminais individuais apenas quando decide intervir. Sensação de controle de missão — status de tudo visível em um relance, decisões pendentes destacadas, zero medo de fechar o app. Tema escuro por padrão, densidade de informação alta porém hierarquizada.

### Key Interaction Paradigms

- **Master-first:** painel de comando como home; terminais como drill-down.
- **Grid manipulável:** criar/arrastar/redimensionar terminais como tiles.
- **Fila de decisões:** agentes em waiting-input formam uma fila visível de pendências humanas.
- **Timeline auditável:** todo evento relevante é navegável cronologicamente.
- **Atalhos de teclado** para alternância rápida master ↔ terminal N.

### Core Screens and Views

- **Master Session Dashboard** — visão agregada: cards/linhas de agentes com status, tarefa, tempo; fila de decisões pendentes; timeline.
- **Terminal Grid** — grid de terminais PTY interativos com cabeçalho por tile (nome, adapter, status).
- **Terminal Focus View** — terminal expandido com contexto (tarefa vinculada, histórico de eventos do agente).
- **Lifecycle Board** — tarefas por estado (colunas), com vínculos a agentes/terminais.
- **Session Recovery Screen** — resumo pós-restart/crash: o que estava rodando, o que aguarda decisão, ação de retomar.
- **Settings / Adapters** — configuração de adapters disponíveis e preferências.

### Accessibility: None

Sem meta formal WCAG no MVP (produto local de nicho dev); boas práticas básicas de contraste e navegação por teclado aplicadas por padrão.

### Branding

A definir. Direção inicial: estética "mission control" — tema escuro, acentos de cor por status (working/waiting/done/error), tipografia monoespaçada nos terminais. Sem style guide existente.

### Target Device and Platforms: Desktop Only

Windows 10/11 primário; macOS/Linux desejáveis pós-MVP. Sem responsividade web/mobile no MVP.

## Technical Assumptions

### Repository Structure: Monorepo

Monorepo com `packages/` (ex.: `core`, `adapters`, `ui`, `app`), alinhado à camada L4 do AIOX. Rationale: MVP de time único, share de tipos entre core/UI, refactors atômicos.

### Service Architecture

Monolito desktop modular: shell desktop (Electron ou Tauri — **decisão do @architect com spike**) com separação rígida de processos — UI (render) ↔ núcleo de terminais/PTY (processo de sistema) via IPC tipado. Núcleo agnóstico (session manager, state store, lifecycle engine) + camada de adapters plugáveis por provider. **Sem backend remoto no MVP** (local-first).

### Testing Requirements

Unit + Integration. Unit para core (state store, lifecycle engine, contrato de adapter com mocks); integração para spawn real de PTY e ciclo persistência→restauração (o contrato central do produto exige teste de integração automatizado de restart). E2E manual assistido no MVP; testes E2E automatizados pós-MVP.

### Additional Technical Assumptions and Requests

- **Spike obrigatório pré-Épico 1:** ConPTY no Windows 10 com node-pty/portable-pty — 6+ sessões simultâneas estáveis (maior risco técnico identificado no brief).
- Render de terminal: xterm.js (com addon WebGL) é o candidato de referência — validar no spike junto com o shell escolhido.
- Persistência local: avaliar event-log append-only vs snapshot (SQLite) vs híbrido — decisão do @architect; requisito é atender NFR5/NFR8.
- Detecção de status por adapter: preferir mecanismos nativos dos CLIs (ex.: hooks do Claude Code) sobre parsing de output; parsing é fallback documentado por adapter.
- Node.js 18+ como runtime de referência do tooling (padrão do ambiente AIOX).
- TypeScript em todo o código de produto.

## Epic List

- **Epic 1 — Fundação & Multi-Terminal:** app desktop funcional com grid de terminais PTY reais e persistência de layout desde o primeiro dia.
- **Epic 2 — Adapter Design & Agentes:** contrato de adapter + adapters Claude Code, Codex e Grok CLI com detecção de status em tempo real.
- **Epic 3 — Sessão Master:** painel de comando com visão agregada, envio de instruções, timeline de eventos e fila de decisões.
- **Epic 4 — Persistência & Recuperação Total:** sobrevivência completa de sessão — restauração integral pós-fechamento e pós-crash.
- **Epic 5 — Lifecycle & Governança:** entidades de tarefa com estados, vínculo tarefa↔agente e pontos de decisão humana auditáveis.

> Rationale de sequência: Épico 1 estabelece infraestrutura + valor imediato (multi-terminal utilizável). Épicos 2–3 constroem o diferencial (agentes governados pela master). Épico 4 eleva a persistência incremental (iniciada na story 1.4) ao contrato total. Épico 5 fecha a visão de entrega agêntica. Persistência e status fluem por todos os épicos como cross-cutting — não são etapas finais.

## Epic 1 — Fundação & Multi-Terminal

Estabelecer o projeto (monorepo, app desktop, CI local) e entregar valor imediato: um multi-terminal utilizável com PTYs reais e layout que sobrevive a restart. Inclui o spike ConPTY que desriscara todo o produto.

### Story 1.1 — Scaffold do projeto e janela desktop

As a desenvolvedor multi-agente,
I want abrir uma aplicação desktop "Meu Cockpit" instalável na minha máquina Windows,
so that eu tenha a fundação sobre a qual todo o cockpit será construído.

#### Acceptance Criteria

1. Monorepo criado com `packages/` (core, ui, app no mínimo), TypeScript, lint e typecheck configurados e passando.
2. App desktop abre uma janela com tela inicial (canary page) exibindo nome e versão.
3. Resultado do spike ConPTY documentado em `docs/architecture/` com a decisão de shell (Electron/Tauri) e biblioteca PTY registrada pelo @architect.
4. `npm run dev`, `npm run build`, `npm test`, `npm run lint` funcionais na raiz.
5. CI local mínimo (script de verificação) executa lint + typecheck + testes.

### Story 1.2 — Primeiro terminal PTY real

As a desenvolvedor multi-agente,
I want abrir um terminal totalmente interativo dentro do app,
so that eu possa executar qualquer CLI (shell, git, node) sem sair do cockpit.

#### Acceptance Criteria

1. Terminal renderizado (xterm.js ou equivalente decidido no spike) conectado a um PTY real do sistema.
2. Programas interativos TUI (ex.: `vim`, um CLI agêntico) funcionam corretamente, incluindo cores, cursor e resize.
3. Digitação sem lag perceptível; resize da janela redimensiona o PTY corretamente.
4. Fechar o terminal encerra o processo PTY sem processos órfãos.

### Story 1.3 — Grid de múltiplos terminais

As a desenvolvedor multi-agente,
I want criar, nomear, redimensionar e fechar vários terminais em um grid,
so that eu opere múltiplos CLIs lado a lado em um único app.

#### Acceptance Criteria

1. Usuário cria novos terminais (botão e atalho), cada um com PTY independente.
2. Terminais podem ser nomeados/renomeados e exibem cabeçalho com nome.
3. Grid permite reorganizar e redimensionar tiles; ≥ 6 terminais simultâneos estáveis e interativos (NFR3).
4. Fechar tile individual não afeta os demais.
5. Atalhos de teclado para alternar foco entre terminais.

### Story 1.4 — Persistência de layout e sessões (fundação)

As a desenvolvedor multi-agente,
I want que o app reabra com o mesmo layout e terminais da última sessão,
so that eu não reconstrua meu ambiente a cada restart.

#### Acceptance Criteria

1. Layout do grid (quantidade, nomes, posições, tamanhos dos terminais) persiste localmente de forma contínua e assíncrona (NFR8).
2. Ao reabrir o app, o layout é restaurado e os terminais são relançados nos mesmos diretórios de trabalho.
3. Scrollback de cada terminal é persistido e restaurado (limite configurável).
4. Teste de integração automatizado cobre o ciclo persistir → fechar → restaurar.

## Epic 2 — Adapter Design & Agentes

Introduzir o contrato de adapter agnóstico de provider e entregar os três adapters do MVP com detecção de status em tempo real — a fundação do agnosticismo que protege o produto do churn de providers.

### Story 2.1 — Contrato de adapter e adapter genérico de shell

As a desenvolvedor multi-agente,
I want que cada terminal seja hospedado por um adapter com contrato único,
so that qualquer CLI presente ou futuro possa ser integrado sem tocar no core.

#### Acceptance Criteria

1. Contrato de adapter definido e documentado: spawn, ciclo de vida, entrada/saída, sinais de status, encerramento.
2. Adapter genérico de shell implementa o contrato (status básico: running/exited).
3. Core não referencia nenhum provider específico (NFR7) — verificado por teste/lint de dependência.
4. Criar terminal permite escolher o adapter; documentação de como escrever um novo adapter em `docs/guides/`.

### Story 2.2 — Adapter Claude Code com detecção de status

As a desenvolvedor multi-agente,
I want rodar o Claude Code em um terminal com status detectado automaticamente,
so that o cockpit saiba quando ele está trabalhando, aguardando minha decisão ou concluído.

#### Acceptance Criteria

1. Adapter spawna Claude Code via PTY com sessão interativa plena.
2. Status idle/working/waiting-input/done/error detectado — preferencialmente via hooks nativos do Claude Code; fallback de parsing documentado.
3. Mudanças de status emitidas como eventos consumíveis pela UI (cabeçalho do tile reflete status em tempo real).
4. Autenticação permanece no CLI; adapter não intercepta credenciais (NFR6).

### Story 2.3 — Adapter Codex

As a desenvolvedor multi-agente,
I want rodar o Codex CLI como agente gerenciado,
so that eu use meu segundo provider no cockpit com a mesma experiência.

#### Acceptance Criteria

1. Adapter Codex implementa o contrato completo com detecção de status.
2. Sessão interativa plena via PTY; particularidades do CLI documentadas no adapter.
3. Dois agentes (Claude + Codex) rodando simultaneamente com status independentes corretos.

### Story 2.4 — Adapter Grok CLI

As a desenvolvedor multi-agente,
I want rodar o Grok CLI como agente gerenciado,
so that os três providers do MVP estejam operacionais em paralelo.

#### Acceptance Criteria

1. Adapter Grok CLI implementa o contrato completo com detecção de status.
2. Três agentes de providers distintos rodando simultaneamente, cada um com status correto.
3. Limitações/riscos do CLI no Windows documentados (pergunta aberta do brief respondida).

### Story 2.5 — Painel de status dos agentes no grid

As a desenvolvedor multi-agente,
I want ver em um relance o status de todos os agentes no grid,
so that eu identifique imediatamente quem precisa de mim.

#### Acceptance Criteria

1. Cada tile exibe status com código de cor consistente (working/waiting/done/error/idle).
2. Agentes em waiting-input recebem destaque visual proeminente (pré-requisito do FR9).
3. Transições de status aparecem em < 2s após o evento do adapter.

## Epic 3 — Sessão Master

Entregar o painel de comando que diferencia o produto: visão agregada de todos os agentes, envio de instruções sem trocar de contexto, timeline auditável e fila de decisões pendentes.

### Story 3.1 — Dashboard master com visão agregada

As a desenvolvedor multi-agente,
I want um painel master com todos os terminais/agentes, status e tempos,
so that eu governe a operação inteira de um único lugar.

#### Acceptance Criteria

1. Dashboard lista todos os terminais ativos: nome, adapter, status, tempo no status atual, tarefa vinculada (quando houver).
2. Atualização em tempo real a partir dos eventos dos adapters.
3. Clicar em um agente navega para o terminal correspondente (e atalho de volta ao master).
4. Dashboard é a tela inicial padrão do app.

### Story 3.2 — Envio de instruções a partir do master

As a desenvolvedor multi-agente,
I want enviar instruções de texto a qualquer agente diretamente do painel master,
so that eu direcione o trabalho sem alternar entre terminais.

#### Acceptance Criteria

1. Campo de instrução por agente no dashboard envia texto ao PTY correspondente (com confirmação visual de envio).
2. Instrução enviada aparece no terminal do agente como se digitada localmente.
3. Envio registrado na timeline (autor: humano via master).
4. Guarda de segurança: envio para agente em estado error/done exibe aviso antes de transmitir.

### Story 3.3 — Timeline de eventos e decisões

As a desenvolvedor multi-agente,
I want uma linha do tempo cronológica de tudo que aconteceu na sessão,
so that eu audite o fluxo e reconstrua o raciocínio da operação.

#### Acceptance Criteria

1. Timeline registra: spawn/fechamento de terminais, mudanças de status, instruções enviadas, decisões humanas, recuperações de sessão.
2. Cada evento tem timestamp, origem (agente/humano/sistema) e payload resumido.
3. Timeline é filtrável por agente e por tipo de evento.
4. Eventos persistem (integração com state store) e sobrevivem a restart.

### Story 3.4 — Fila de decisões pendentes

As a desenvolvedor multi-agente,
I want uma fila visível de agentes aguardando minha entrada,
so that nenhuma pendência humana fique esquecida e o fluxo nunca trave silenciosamente.

#### Acceptance Criteria

1. Agentes em waiting-input entram automaticamente na fila de decisões do dashboard (FR9).
2. Item da fila mostra agente, tarefa vinculada e há quanto tempo aguarda.
3. Ação direta do item: ir ao terminal ou responder via campo de instrução.
4. Notificação visual (badge/contador) visível de qualquer tela do app.

## Epic 4 — Persistência & Recuperação Total

Elevar a persistência fundacional (story 1.4) ao contrato central do produto: nenhum cenário de fechamento perde estado; reabrir = retomar. É a vantagem defensiva número 1 identificada na análise competitiva.

### Story 4.1 — State store unificado de sessão

As a desenvolvedor multi-agente,
I want que todo o estado da orquestração seja gravado continuamente em um store único,
so that o cockpit tenha uma fonte de verdade recuperável a qualquer momento.

#### Acceptance Criteria

1. State store consolida: layout, terminais, adapters, status, scrollback, timeline, tarefas e vínculos.
2. Gravação contínua, assíncrona e não-bloqueante (NFR8), com estratégia definida pelo @architect (event-log/snapshot/híbrido).
3. Corrupção de gravação parcial não inutiliza o store (gravação atômica ou recuperação de último estado válido).
4. Testes de integração cobrem gravação sob carga (6 terminais ativos gerando output).

### Story 4.2 — Restauração integral no restart

As a desenvolvedor multi-agente,
I want fechar o app e reabri-lo exatamente onde parei,
so that restart nunca custe contexto nem retrabalho.

#### Acceptance Criteria

1. Reabertura restaura: layout, terminais (relançados com working dir e adapter), scrollback, timeline, tarefas e fila de decisões.
2. Time-to-resume < 10s (NFR4), medido e reportado em log de diagnóstico.
3. Agentes que estavam ativos são relançados pelo adapter com aviso claro de "sessão do agente reiniciada" na timeline.
4. Critério de sucesso do MVP verificado: ciclo com restart no meio sem perda de estado persistido (NFR5).

### Story 4.3 — Recuperação pós-crash com resumo

As a desenvolvedor multi-agente,
I want que após um crash o cockpit me mostre o que estava em andamento,
so that eu retome com confiança em vez de reconstruir a situação de memória.

#### Acceptance Criteria

1. Crash detectado na reabertura (flag de sessão não encerrada corretamente).
2. Tela de recuperação exibe: agentes ativos no momento do crash, tarefas em andamento, decisões pendentes e últimos eventos da timeline.
3. Usuário escolhe: restaurar tudo, restaurar seletivamente ou iniciar sessão limpa (estado anterior arquivado, não destruído).
4. Evento de recuperação registrado na timeline.

## Epic 5 — Lifecycle & Governança

Fechar a visão de entrega agêntica: trabalho como entidades com ciclo de vida, vínculo explícito tarefa↔agente↔terminal e decisões humanas auditáveis integradas ao fluxo.

### Story 5.1 — Entidades de tarefa com estados de lifecycle

As a desenvolvedor multi-agente,
I want criar tarefas com estados (planejada → em execução → aguardando decisão → revisada → concluída),
so that o trabalho seja mapeado de ponta a ponta, não disperso em terminais.

#### Acceptance Criteria

1. CRUD de tarefas com título, descrição e estado; transições de estado válidas impostas pelo core.
2. Transições registradas na timeline com autor e timestamp.
3. Tarefas persistem no state store (sobrevivem a restart).

### Story 5.2 — Vínculo tarefa ↔ agente ↔ terminal

As a desenvolvedor multi-agente,
I want vincular tarefas aos agentes/terminais que as executam,
so that eu sempre saiba quem está fazendo o quê e por quê.

#### Acceptance Criteria

1. Tarefa pode ser vinculada/desvinculada a um ou mais terminais/agentes.
2. Vínculo visível nos dois sentidos: no tile/foco do terminal e no card da tarefa; dashboard master exibe a tarefa de cada agente (completa FR6).
3. Enviar instrução a partir de uma tarefa direciona ao(s) agente(s) vinculado(s).

### Story 5.3 — Pontos de decisão humana auditáveis

As a desenvolvedor multi-agente,
I want aprovar, rejeitar ou redirecionar o trabalho em pontos de decisão explícitos,
so that a governança faça parte do fluxo com trilha auditável completa.

#### Acceptance Criteria

1. Tarefa em "aguardando decisão" expõe ações: aprovar (→ revisada/concluída), rejeitar (→ em execução com feedback) e redirecionar (→ outro agente).
2. Cada decisão registra autor, timestamp e justificativa opcional na timeline (FR15).
3. Decisões pendentes de tarefas integram a fila de decisões do master (unificada com waiting-input dos agentes).
4. Redirecionamento transfere o vínculo e notifica o novo agente via instrução inicial.

### Story 5.4 — Lifecycle Board

As a desenvolvedor multi-agente,
I want um board com as tarefas organizadas por estado,
so that eu visualize o pipeline de entrega inteiro em um relance.

#### Acceptance Criteria

1. Board em colunas por estado do lifecycle, com cards mostrando tarefa, agente(s) vinculado(s) e status do agente.
2. Mover card entre colunas executa a transição de estado (com validação das transições permitidas).
3. Board reflete mudanças em tempo real e persiste (restaurado após restart).

## Checklist Results Report

> Auto-avaliação inicial (pm-checklist resumido) — validação formal completa será executada pelo @po na Fase 5:

- ✅ Todos os FRs rastreiam ao brief/visão do fundador (Artigo IV — No Invention: nenhuma feature inventada; worktrees/diff/browser explicitamente fora do MVP).
- ✅ Épicos sequenciais, cada um entregável e testável; Épico 1 estabelece fundação + valor.
- ✅ Persistência e status são cross-cutting desde a story 1.4 — não são etapas finais.
- ✅ Stories dimensionadas para execução por agente único em sessão focada (2–4h).
- ⚠️ Pendências para o @architect: decisão Electron vs Tauri, estratégia de persistência, mecanismo de detecção de status por CLI.
- ⚠️ Pendência de produto: monetização/licença fora de escopo deste PRD (pós-MVP).

## Next Steps

### UX Expert Prompt

@ux-design-expert: criar o front-end spec (`docs/front-end-spec.md`) a partir deste PRD. Foco: Master Session Dashboard (home), Terminal Grid, fila de decisões, timeline e Lifecycle Board. Paradigma "mission control" dark-theme, master-first com drill-down para terminais, atalhos de teclado como cidadãos de primeira classe.

### Architect Prompt

@architect: criar a arquitetura fullstack (`docs/architecture.md`) a partir deste PRD + front-end spec. Decisões críticas: shell desktop (Electron vs Tauri) com spike ConPTY/node-pty no Windows 10, estratégia de persistência (event-log vs snapshot vs híbrido — NFR5/NFR8), contrato de adapter (NFR7) e IPC UI↔core de terminais. Monorepo TypeScript conforme Technical Assumptions.
