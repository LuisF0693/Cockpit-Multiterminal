# Epic 6 — Daemon de Terminais (túnel de transcript)

Materializar o ponto 3 da visão do fundador (decisão crítica 5, spike PASS):
os terminais reais rodam FORA do app, num daemon standalone servido por named
pipe com túnel de transcript. Fechar o Cockpit NÃO mata os agentes; reabrir
reconecta com histórico. O renderer não percebe a migração (NFR7 + MessagePort
preservados).

> **Criação 2026-07-14 (@pm):** épico formalizado a partir de
> `docs/architecture/decisao-critica-5-daemon-de-terminais.md` (spike
> `apps/desktop/spike/daemon-spike.ts`, 4 critérios PASS). Ordem do roadmap:
> E3 ✓ → **E6 (este)** → E4 pleno → E5. SDC/three-brain e learnings globais
> renumeram para E7/E8 (backlog).

### Story 6.1 — Daemon standalone com protocolo por named pipe

As a desenvolvedor multi-agente,
I want o PTY Host rodando como daemon próprio (fora da árvore do Electron) servido por named pipe,
so that as sessões de terminal existam independentes do processo da GUI.

#### Acceptance Criteria

1. Binário/entry `cockpit-daemon` hospeda SessionManager + AdapterRegistry atuais (contrato de adapter intacto — NFR7) escutando em named pipe com framing de mensagens (controle) + frames binários (dados).
2. Protocolo cobre o contrato atual do host: configure, create (com adapter/restore), close, resize, list-adapters, session-exit, session-status, shutdown.
3. Daemon sobrevive ao exit do cliente: PTYs continuam vivos e produzindo transcript (critério (a) do spike).
4. Testes unit/integration do protocolo de framing; suíte completa PASS.

### Story 6.2 — Túnel de transcript com replay no attach

As a desenvolvedor multi-agente,
I want cada sessão do daemon com buffer de transcript e replay no attach,
so that qualquer cliente reconecte e veja o histórico + stream vivo sem perda.

#### Acceptance Criteria

1. Attach a uma sessão existente entrega replay do transcript (tail configurável) seguido do stream vivo, sem gap nem duplicação (critério (b) do spike).
2. Transcript reusa a infraestrutura de scrollback em arquivo (1.4) — uma fonte de verdade só.
3. Latência de echo através do pipe ≤ 500ms em operação normal (spike: 63ms).
4. list-sessions expõe sessões vivas no daemon (id, adapter, status) para adoção pelo cliente.

### Story 6.3 — App como cliente: attach/adoção na inicialização

As a desenvolvedor multi-agente,
I want o Cockpit conectando ao daemon existente no boot (ou subindo um) e adotando as sessões vivas,
so that fechar/reabrir o app não interrompa nenhum agente em execução.

#### Acceptance Criteria

1. Main descobre daemon vivo no boot (pipe conhecido); se ausente, sobe o daemon (spawn detached) e conecta.
2. Sessões vivas do daemon são adotadas: aparecem no registry/UI com scrollback replayado — o restore do SQLite reconcilia (sessão viva no daemon = adotar; morta = relançar como hoje).
3. MessagePort do renderer preservada: o Main vira proxy pipe↔MessagePort; renderer e adapters não mudam (NFR7).
4. Fechar o app NÃO derruba as sessões (validável: reabrir e continuar digitando no mesmo shell).

### Story 6.4 — Ciclo de vida e segurança do daemon

As a desenvolvedor multi-agente,
I want governança do daemon (heartbeat, stop explícito, upgrade sem queda, ACL),
so that a camada extra não vire fonte de órfãos nem superfície de ataque.

#### Acceptance Criteria

1. `cockpit-daemon --stop` encerra graciosamente: dispose de todos os PTYs, 0 órfãos (critério (d) do spike).
2. Heartbeat/handshake com versão de protocolo: cliente incompatível recebe erro claro (sem travar sessões).
3. Pipe com ACL restrita ao usuário atual (DACL default de named pipe validada por teste/diagnóstico documentado).
4. Indicador de status do daemon na UI (conectado/reconectando/subindo) + reconexão automática do Main com backoff.
