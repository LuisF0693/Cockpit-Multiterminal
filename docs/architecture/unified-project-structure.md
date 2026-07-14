# Unified Project Structure

```
meu-cockpit/                    # L4 — dentro de packages/ do workspace AIOX? NÃO:
├── apps/                       # raiz do produto é o próprio repo (docs/ já existe)
│   └── desktop/                # Electron app (main + preload + renderer entry)
├── packages/
│   ├── ui/
│   ├── core/
│   ├── state-store/
│   ├── pty-host/
│   ├── adapter-contract/
│   ├── adapters/
│   │   ├── shell/
│   │   ├── claude-code/
│   │   ├── codex/
│   │   └── grok/
│   └── shared/
├── docs/                       # PRD, arquitetura, stories (AIOX)
├── package.json                # pnpm workspaces + turbo
├── turbo.json
└── tsconfig.base.json          # paths absolutos (Constitution Art. VI)
```
