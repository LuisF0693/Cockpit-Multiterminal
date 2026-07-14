# 🛰️ Meu Cockpit

Central de controle multiagente — orquestração de CLIs de IA (Claude Code, Codex, Grok) com **sessão master**, **lifecycle com governança humana**, **persistência total de sessão** e **adapter design** agnóstico de provider.

> *"Eles mostram seus agentes. Nós governamos sua entrega."*

## Documentação

| Documento | Caminho |
|-----------|---------|
| Project Brief | `docs/project-brief.md` |
| Análise competitiva | `docs/research/competitor-analysis.md` |
| PRD (sharded) | `docs/prd/` |
| UI/UX Spec | `docs/front-end-spec.md` |
| Arquitetura (sharded) | `docs/architecture/` |
| Stories | `docs/stories/` |

## Stack

TypeScript · Electron + node-pty + xterm.js · React 18 · SQLite (WAL) · Zod · pnpm workspaces + Turborepo · Vitest

## Desenvolvimento

```bash
pnpm install          # instalar dependências
pnpm dev              # abrir o app (terminal PTY real)
pnpm verify           # lint + typecheck + testes
pnpm --filter @cockpit/desktop smoke:abi      # valida node-pty sob ABI do Electron
pnpm --filter @cockpit/desktop spike:conpty   # spike ConPTY (Story 1.1)
```

### Módulos nativos (node-pty, better-sqlite3)

- **node-pty 1.1+**: prebuilds N-API carregam direto no Electron — `smoke:abi` confirma.
- **better-sqlite3**: NÃO é N-API — precisa do prebuilt para a ABI do Electron.
  Após `pnpm install` (ou upgrade do Electron), rode:

```bash
pnpm --filter @cockpit/desktop rebuild:native   # baixa prebuilt electron via prebuild-install
pnpm --filter @cockpit/desktop smoke:store      # valida SQLite WAL sob Electron
```

> ⚠️ Depois do rebuild, better-sqlite3 não carrega sob Node puro — testes
> vitest usam a interface `StateStore` com fake em memória; o ciclo real roda
> em `smoke:persist` (Electron-run). Não use o rebuild do electron-builder
> (`npmRebuild: false` é intencional — gotcha da Story 1.1).

## Estrutura

```
apps/desktop/         # Electron (main + preload + renderer)
packages/shared/      # domínio + schemas Zod de IPC
packages/core/        # session manager, lifecycle engine (Stories 1.3+)
packages/pty-host/    # sessões PTY em utilityProcess isolado (node-pty)
packages/ui/          # design system + telas (TerminalView, Stories 1.2+)
docs/                 # PRD, arquitetura, stories (método AIOX)
```

Projeto desenvolvido com o método **Synkra AIOX** (story-driven, multiagente).
