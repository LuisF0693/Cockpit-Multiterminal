# Testing Strategy

- **Unit (Vitest):** `core` (máquina de estados do lifecycle, decision queue), `state-store` (write queue, atomicidade com fault injection), `adapters` (parsers de status com fixtures de output real de cada CLI).
- **Integration:** spawn real de PTY (shell adapter) em CI Windows; ciclo **persist → kill process → restore** automatizado (contrato central — Stories 1.4/4.1/4.2); supervisão do PTY Host (kill do host → recuperação).
- **E2E (Playwright-Electron):** fluxos 1–4 do front-end spec; smoke com 6 terminais ativos.
- **Métrica contínua:** benchmark de eco de digitação e time-to-resume gravado em log de diagnóstico (NFR3/NFR4 — AC Story 4.2).
