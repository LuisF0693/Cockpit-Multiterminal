# Epic 7 — SDC Embutido & Three-Brain Self-Heal

Orquestrar o ciclo canônico de desenvolvimento (escrever → revisar → corrigir)
diretamente sobre os terminais/agentes já governados pela sessão master:
código nunca é validado só pelo modelo que o escreveu — pelo menos dois
outros agentes revisam antes de qualquer decisão humana final.

> **Formalização 2026-07-14 (@pm, spec pipeline):** Épicos 1-6 completos
> (FR1-FR15). E7 era "(backlog)" em `epic-list.md` sem requisitos formais —
> este documento fecha o gap, ancorado na visão do fundador (pontos 5 e 6,
> `docs/prd/visao-do-fundador-cockpit-aiox.md`) e nos FR16-20 recém-adicionados
> a `requirements.md`. Escopo deliberadamente MÍNIMO: reusa o lifecycle de
> tarefa (E5) e os pontos de decisão humana (E5.3) já construídos e testados
> — nenhuma máquina de estados nova, só orquestração automática por cima.
> Complexidade: STANDARD (spec pipeline completo, sem fase de pesquisa —
> padrão já resolvido pela arquitetura existente de tasks/sessions).
>
> **Decisão de design deliberada:** o veredito de revisão continua sendo uma
> decisão HUMANA (reusa aprovar/rejeitar/redirecionar da 5.3) — os agentes
> revisores produzem texto livre no terminal deles, não um veredito
> estruturado parseável. Tentar interpretar semanticamente a saída de um CLI
> de IA como "aprovado"/"rejeitado" seria frágil e uma forma de invenção sem
> lastro técnico; o humano lê as duas revisões lado a lado e decide — a
> automação está em ROTEAR o trabalho, não em substituir o julgamento humano.

### Story 7.1 — Papéis de agente na tarefa (escritor/revisor)

As a desenvolvedor multi-agente,
I want atribuir um papel (escritor ou revisor) a cada terminal vinculado a uma tarefa,
so that o sistema saiba quem escreve e quem revisa antes de orquestrar o ciclo.

#### Acceptance Criteria

1. Vínculo tarefa↔terminal (5.2) ganha um papel opcional: `writer` ou `reviewer`; ausência de papel = vínculo "neutro" (comportamento atual, sem three-brain).
2. Uma tarefa é considerada "modo three-brain" quando tem exatamente 1 terminal com papel `writer` e 2+ com papel `reviewer`.
3. Papel é definido no mesmo dropdown de vínculo do master (3.1/5.2) e visível no card da tarefa (TasksPanel/LifecycleBoard).
4. Papel persiste e sobrevive a restart/adoção (mesma garantia do vínculo em si, 5.2).

### Story 7.2 — Roteamento automático escritor → revisores

As a desenvolvedor multi-agente,
I want que a conclusão do escritor dispare revisão automática nos revisores vinculados,
so that eu não precise lembrar de acionar cada revisor manualmente.

#### Acceptance Criteria

1. Quando o agente `writer` de uma tarefa em modo three-brain transiciona para `done` ou `waiting-input`, o sistema envia automaticamente uma instrução de revisão a cada agente `reviewer` vinculado (sem ação humana).
2. Instrução de revisão referencia a tarefa (título/descrição) e pede explicitamente uma avaliação do trabalho do escritor.
3. Envio automático é registrado na timeline com origem `system` (distinto de instrução manual via master, que é `human`).
4. Roteamento só dispara UMA VEZ por transição do escritor (não repete em toda checagem de status) — idempotente.

### Story 7.3 — Painel de revisão (saídas lado a lado)

As a desenvolvedor multi-agente,
I want ver a saída mais recente de cada revisor lado a lado com o resultado do escritor,
so that eu tenha contexto completo para decidir sem alternar entre terminais.

#### Acceptance Criteria

1. Card da tarefa em modo three-brain expõe um painel de revisão com o escritor + cada revisor, mostrando adapter, status e um trecho recente do scrollback/transcript de cada um.
2. Painel acessível a partir do master, do TasksPanel e do LifecycleBoard (mesma tarefa, mesma vista).
3. Painel atualiza em tempo real conforme os terminais produzem output (mesmo padrão de push já usado em sessões/tarefas).
4. Painel some (ou informa "não é modo three-brain") para tarefas fora do modo three-brain (AC2 da 7.1).

### Story 7.4 — Ciclo de correção com feedback agregado

As a desenvolvedor multi-agente,
I want que uma rejeição na revisão volte ao escritor com o feedback de todos os revisores,
so that o ciclo de correção seja informado, não um reset em branco.

#### Acceptance Criteria

1. Rejeitar (fluxo humano existente, 5.3/FR15) numa tarefa em modo three-brain agrega o texto mais recente de cada revisor numa única instrução de correção enviada automaticamente ao escritor (reusa FR19).
2. Ciclo (escrever → revisar → corrigir) pode repetir; cada rodada fica auditável na timeline (reusa a trilha de decisão da 5.3 + o roteamento automático da 7.2).
3. Redirecionar (5.3) numa tarefa three-brain troca o PAPEL do agente redirecionado para `writer`, preservando os revisores — não quebra o modo three-brain.
4. Nenhuma máquina de estados nova: o ciclo inteiro é composição de mecanismos já existentes (task-lifecycle da 5.1, decisão humana da 5.3, roteamento da 7.2) — verificável por teste de integração ponta a ponta.
