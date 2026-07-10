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
pnpm dev              # abrir o app (canary)
pnpm verify           # lint + typecheck + testes
pnpm --filter @cockpit/desktop spike:conpty   # spike ConPTY (Story 1.1)
```

## Estrutura

```
apps/desktop/         # Electron (main + preload + renderer)
packages/shared/      # domínio + schemas Zod de IPC
packages/core/        # session manager, lifecycle engine (Stories 1.3+)
packages/ui/          # design system + telas (Stories 1.2+)
docs/                 # PRD, arquitetura, stories (método AIOX)
```

Projeto desenvolvido com o método **Synkra AIOX** (story-driven, multiagente).
