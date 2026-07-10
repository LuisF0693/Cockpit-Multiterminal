# Next Steps

### UX Expert Prompt

@ux-design-expert: criar o front-end spec (`docs/front-end-spec.md`) a partir deste PRD. Foco: Master Session Dashboard (home), Terminal Grid, fila de decisões, timeline e Lifecycle Board. Paradigma "mission control" dark-theme, master-first com drill-down para terminais, atalhos de teclado como cidadãos de primeira classe.

### Architect Prompt

@architect: criar a arquitetura fullstack (`docs/architecture.md`) a partir deste PRD + front-end spec. Decisões críticas: shell desktop (Electron vs Tauri) com spike ConPTY/node-pty no Windows 10, estratégia de persistência (event-log vs snapshot vs híbrido — NFR5/NFR8), contrato de adapter (NFR7) e IPC UI↔core de terminais. Monorepo TypeScript conforme Technical Assumptions.
