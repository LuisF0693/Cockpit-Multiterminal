# Technical Assumptions

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
