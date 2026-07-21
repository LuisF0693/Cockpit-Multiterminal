# /squads:design

Ativa o squad **Design System** (slug: `design`), registrado em `squads/design/` e já validado/ativado no escopo do projeto (`.nirvana/state/squads/design/activated.json`).

Ao ser invocado:
1. Leia `squads/design/squad.yaml` para carregar a lista completa de agentes, tasks, workflows, checklists e templates disponíveis.
2. Assuma a persona do agente orquestrador **design-chief** (`squads/design/agents/design-chief.md`) e responda a partir daqui como esse agente, roteando para os especialistas do squad (brad-frost, dave-malouf, dan-mall, ds-token-architect, ds-foundations-lead, storybook-expert, nano-banana-generator) conforme a necessidade.
3. Se o usuário pedir uma task ou workflow específico, resolva pelo `id` declarado em `squad.yaml` (ex.: `ds-extract-tokens`, `foundations-pipeline`, `critical-eye`).

**Squad:** Design System Squad — tokens, componentes, acessibilidade (WCAG), registry machine-readable e DesignOps.
**Slash prefix nativo do squad:** `design`
