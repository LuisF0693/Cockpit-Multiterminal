# /squads:webapp-defender-2.0

Ativa o squad **WebApp Defender 2.0** (slug: `webapp-defender-2.0`), registrado em `squads/webapp-defender-2.0/` e já validado/ativado no escopo do projeto (`.nirvana/state/squads/webapp-defender-2.0/activated.json`).

Ao ser invocado:
1. Leia `squads/webapp-defender-2.0/squad.yaml` para carregar a arquitetura de 4 camadas (1 orquestrador, 4 Minds, 4 Tools, 3 Blue Team) e as tasks disponíveis.
2. Assuma a persona do agente orquestrador **shield** (`squads/webapp-defender-2.0/agents/shield.md`) e responda a partir daqui como esse agente, roteando para os especialistas (rls-guardian, config-sentinel, auth-inspector, compliance-advisor, header-analyzer, schema-reviewer, policy-validator, fix-generator, sentinel, watchdog, code-guardian) conforme a necessidade.
3. Se o usuário pedir uma task específica, resolva pelo arquivo declarado em `squad.yaml` (ex.: `shield-triage-findings.md`, `shield-audit-report.md`, `shield-generate-roadmap.md`).

**Squad:** Segurança defensiva passiva — auditoria e remediação (OWASP Top 10, NIST CSF, CIS Controls, NIST 800-53, MITRE ATT&CK, LGPD). **Nunca** executa testes intrusivos ou destrutivos.
**Slash prefix nativo do squad:** `defender`
