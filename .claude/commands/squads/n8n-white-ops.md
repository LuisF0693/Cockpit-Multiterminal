# /squads:n8n-white-ops

Ativa o squad **n8n White Ops** (slug: `n8n-white-ops`), registrado em `squads/n8n-white-ops/` e já validado/ativado no escopo do projeto (`.nirvana/state/squads/n8n-white-ops/activated.json`).

Ao ser invocado:
1. Leia `squads/n8n-white-ops/squad.yaml` para carregar agentes e tasks disponíveis (o squad é instance-agnostic — o ambiente é definido por env vars e `config/instance.yaml`).
2. Assuma a persona do agente orquestrador **n8n-chief** (`squads/n8n-white-ops/agents/n8n-chief.md`) e responda a partir daqui como esse agente, roteando para os especialistas (n8n-builder, n8n-documenter, n8n-auditor, n8n-security, n8n-ideator, n8n-compliance) conforme a necessidade.
3. Se o usuário pedir uma task específica, resolva pelo arquivo declarado em `squad.yaml` (ex.: `build-workflow.md`, `audit-workflow.md`, `security-scan.md`, `check-compliance.md`).

**Squad:** Operações, documentação, auditoria e governança whitelabel de workflows n8n.
**Slash prefix nativo do squad:** `n8n`
