# Decisão Crítica 2: Persistência — Híbrido SQLite WAL + arquivos de scrollback ✅

**Decisão:** SQLite (better-sqlite3, WAL mode) como fonte de verdade única para estado estrutural + event-log; **scrollback fora do DB**, em arquivos append por terminal.

**Como atende NFR5 (100% survival):**
- WAL + transações atômicas: gravação parcial jamais corrompe o estado consolidado; no pior caso perde-se apenas o último batch não commitado (janela ≤ 250ms).
- `clean_shutdown` flag em `app_meta`: setada no exit gracioso, checada no boot → distingue restart de crash (FR12) e dispara a Recovery Screen.
- Estado "sessão limpa" nunca destrói dados: sessões anteriores são arquivadas (`archived_at`), atendendo o flow 3 da Uma.

**Como atende NFR8 (não-bloqueante):**
- Todos os writes passam por uma **write queue** no Main process: eventos são enfileirados e commitados em batch (flush a cada 250ms ou 100 eventos, o que vier primeiro) numa transação única — o input do usuário nunca espera I/O.
- Scrollback: ring buffer em memória por terminal (limite configurável, default 10k linhas) com flush batched para `scrollback/{terminalId}.log` (rotação por tamanho). Fora do SQLite para não inflar o DB nem competir com a write queue.

**Rejeitadas:** event-sourcing puro (replay caro no boot — inviabiliza NFR4 < 10s com timelines longas); snapshot-only JSON (sem atomicidade granular, corrupção catastrófica); a alternativa híbrida escolhida usa o event-log como *trilha* e o estado relacional como *verdade corrente* — boot lê estado direto, sem replay.
