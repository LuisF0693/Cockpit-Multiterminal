# Tech Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| Language | TypeScript | 5.x (strict) | todo o código | contrato único ponta a ponta |
| Runtime | Node.js | 20 LTS | Electron main/pty-host | LTS atual, compatível Electron |
| Desktop shell | Electron | ≥ 31 | app desktop | Decisão Crítica 1 |
| PTY | node-pty | latest | ConPTY/winpty | referência de produção (VS Code) |
| Terminal render | xterm.js + @xterm/addon-webgl | 5.x | render de terminais | 60fps, NFR3 |
| UI framework | React | 18.x | renderer | ecossistema, shadcn |
| UI components | shadcn/ui + Radix | latest | design system base | recomendação da Uma, tokens-first |
| Styling | Tailwind CSS | 4.x | styling com tokens | zero hardcoded values |
| State (UI) | Zustand | 5.x | estado da UI no renderer | leve, event-friendly, sem boilerplate |
| Schemas/validação | Zod | 3.x | contratos IPC + domínio | Decisão Crítica 4 |
| Persistência | better-sqlite3 (WAL) | latest | state store | Decisão Crítica 2 |
| Build | Vite + electron-builder | latest | dev/build/package | DX rápida, packaging Windows |
| Monorepo | pnpm workspaces + Turborepo | latest | orquestração de packages | caching, pipelines |
| Unit tests | Vitest | latest | core/adapters/UI | rápido, TS nativo |
| Integration/E2E | Playwright (Electron) | latest | ciclo persist→restart→restore | AC da Story 1.4/4.2 |
| Lint/format | ESLint + Prettier | latest | qualidade | padrão AIOX |
