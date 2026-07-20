# Epic 18 — Observabilidade do Despacho & Atenção do Operador

Iteração pós-validação do Épico 17 (2026-07-20): sessão de brainstorming com
três frentes (produto/roadmap, UX, arquitetura) trazida pelo fundador
("temos ideia pra fazer e melhorar? chama as pessoas certas"). Escopo
selecionado pelo fundador via `AskUserQuestion` entre as ideias levantadas:
os 3 itens rápidos de baixo risco + o log de despachos (que destrava o
contador histórico no `--recommend`).

> **Formalização 2026-07-20 (@pm):** FR59-63. Cinco stories, sem dependência
> externa nova. FR61 é uma correção de CONSISTÊNCIA (a regra "mesmo projeto"
> já existe desde o FR25 — aqui só faz o vínculo automático do Épico 17
> respeitá-la do mesmo jeito que o manual), não uma capacidade nova — ainda
> assim rastreada como FR porque muda comportamento observável. FR62/FR63
> têm dependência sequencial (63 lê o que 62 grava) — ordem de execução
> sugerida: 18.3 → 18.1 → 18.2 → 18.4 → 18.5.

### Story 18.1 — Checagem de sessão ociosa antes do despacho (FR59)

1. `agent-dispatch` consulta as sessões vivas do daemon (`listSessions`, já usado na Story 17.2 pra detecção do chefe) e verifica se alguma está OCIOSA (status `waiting-input` ou `done`) no MESMO adapter — e mesmo `--model`, se informado.
2. Se achar candidata, avisa no stdout ANTES de despachar (não bloqueia — decisão final é do chefe): sugestão de reusar `sessão=<id>` em vez de abrir um novo worker.
3. Sem candidata ociosa, segue o despacho normalmente sem nenhuma mudança de comportamento.

### Story 18.2 — Atalho "próxima atenção" no canvas (FR60)

1. Novo atalho de teclado (registrar no módulo de shortcuts existente) que percorre, em ordem de criação, os tiles com `agentStatus` em `waiting-input`/`error`.
2. Ao disparar, centraliza o canvas no tile alvo (reusa o mesmo mecanismo de `centerOn`/`focused` já usado pelo minimapa da Story 12.5) e foca o terminal.
3. Sem nenhum tile em atenção, o atalho não faz nada (sem erro, sem som).

### Story 18.3 — Vínculo automático respeita "mesmo projeto" como o manual (FR61)

1. Extrair a checagem "mesmo projeto" (hoje duplicada entre o handler manual de `terminalLinkCreate` e o fluxo de adoção automática) para uma função pura única em `@cockpit/core`.
2. O fluxo automático (Story 17.2) passa a ter o MESMO comportamento de recusa do manual — apenas não pode lançar `Error` (é um `setInterval` sem chamador esperando resposta), então o efeito observável é: nunca criar o vínculo quando os projetos divergem (já é o comportamento atual — o que muda é centralizar a regra, eliminando a divergência de manutenção, não o comportamento em si, que já está correto após o fix de ontem).

### Story 18.4 — Histórico de despachos (FR62)

1. Nova entidade `DispatchRecord` (mesmo padrão dos managers existentes — `TaskManager`/`LearningManager`: estado vivo em memória + persistência via `WriteQueue`), gravada no MOMENTO do despacho (quando `dispatchedBy` é detectado/forçado na adoção externa, Story 17.2).
2. Campos: quem despachou (`dispatchedBy`), agente (`label`), adapter, modelo (se houver), projeto, timestamp de criação, e desfecho quando o worker chega a um estado terminal (`done`/`error`/fechado) — sem exigir vínculo a uma tarefa formal do three-brain.
3. Consulta simples (lista, sem UI dedicada nesta story — API/IPC suficiente; painel de visualização fica de fora do escopo, é ideia separada da leva de brainstorming — "árvore de delegação").

### Story 18.5 — Contador histórico no `--recommend` (FR63, depende da 18.4)

1. `--recommend` passa a incluir, por candidato, uma contagem agregada do histórico do FR62 (ex.: desfechos `done` vs `error` por adapter+categoria).
2. Puramente informativo — a ordem dos candidatos continua vindo da matriz de capacidades (Épico 17.2); o contador é só mais um dado na `reason` de `explainCandidates`.
3. Sem histórico ainda (app novo/zerado), o campo aparece vazio/zerado — nunca quebra o `--recommend`.
