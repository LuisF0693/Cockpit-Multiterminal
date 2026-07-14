# Epic List

- **Epic 1 — Fundação & Multi-Terminal:** app desktop funcional com grid de terminais PTY reais e persistência de layout desde o primeiro dia.
- **Epic 2 — Adapter Design & Agentes:** contrato de adapter + adapters Claude Code, Codex e Grok CLI com detecção de status em tempo real.
- **Epic 3 — Sessão Master:** painel de comando com visão agregada, envio de instruções, timeline de eventos e fila de decisões.
- **Epic 4 — Persistência & Recuperação Total:** sobrevivência completa de sessão — restauração integral pós-fechamento e pós-crash.
- **Epic 5 — Lifecycle & Governança:** entidades de tarefa com estados, vínculo tarefa↔agente e pontos de decisão humana auditáveis.
- **Epic 6 — Daemon de Terminais:** PTY host como daemon standalone + túnel de transcript — terminais sobrevivem ao app (decisão crítica 5, visão do fundador).
- **Epic 7 — SDC Embutido & Three-Brain:** papéis escritor/revisor na tarefa, roteamento automático de revisão, painel lado a lado, ciclo de correção com feedback agregado (FR16-20, formalizado 2026-07-14).
- **Epic 8 — Learning Logs Globais (backlog):** banco de learnings fora dos projetos — aguarda formalização própria após o E7.

> Rationale de sequência: Épico 1 estabelece infraestrutura + valor imediato (multi-terminal utilizável). Épicos 2–3 constroem o diferencial (agentes governados pela master). **Ordem de execução revisada (2026-07-14, decisão crítica 5): E3 → E6 (daemon) → E4 → E5** — o daemon muda o substrato de sessões, então precede a persistência total. Épico 4 eleva a persistência incremental (iniciada na story 1.4) ao contrato total. Épico 5 fecha a visão de entrega agêntica. Persistência e status fluem por todos os épicos como cross-cutting — não são etapas finais.
