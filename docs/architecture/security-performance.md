# Security & Performance

- **Local-first (NFR1):** zero telemetria; nenhum dado sai da máquina; scrollback/DB em `%APPDATA%/meu-cockpit`.
- **Electron hardening:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` no renderer; preload mínimo; CSP estrita; navegação externa bloqueada.
- **Credenciais (NFR6):** herdadas do ambiente do usuário pelos CLIs; nunca lidas/persistidas/logadas pelo app.
- **Performance:** canais separados (Decisão 4), WebGL rendering, render throttle para tiles desfocados, virtualização de timeline, batch writes (250ms).
