# Components

| Package | Plano | Responsabilidade |
|---------|-------|------------------|
| `apps/desktop` | Main + Renderer entry | bootstrap Electron, janelas, wiring |
| `packages/ui` | Renderer | React app: Dashboard, Grid, Focus, Board, Recovery, Settings + design system (tokens, atoms/molecules/organisms da Uma) |
| `packages/core` | Main | Session Manager, Lifecycle Engine (máquina de estados de Task — transições válidas impostas aqui, FR13), Decision Queue, event bus |
| `packages/state-store` | Main | SQLite WAL, write queue, repositories, scrollback file manager, crash detection |
| `packages/pty-host` | utilityProcess | host de PTYs, AdapterRegistry, supervisão de sessões |
| `packages/adapter-contract` | shared | contrato + tipos (Decisão 3) |
| `packages/adapters/{shell,claude-code,codex,grok}` | PTY Host | implementações por provider |
| `packages/shared` | todos | domínio, schemas Zod de IPC, utils |
