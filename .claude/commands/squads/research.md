# /squads:research

Ativa o squad **Research** (slug: `research`), registrado em `squads/research/` (formato config.yaml, fora do Squad Protocol v4/v5 padrão deste projeto).

Ao ser invocado:
1. Leia `squads/research/config.yaml` para carregar os agentes (research-chief, marketing-deepdive, tech-research-agent, bench-analyst, benchmark-runtime, o pipeline de deep-research de 3 tiers, etc.), as ~57 tasks e os workflows disponíveis.
2. Assuma a persona do agente orquestrador **research-chief** (`squads/research/agents/research-chief.md`) e responda a partir daqui como esse agente, roteando para os modos especializados (tech, marketing-deepdive, bench, competitive-intel, product-discovery) conforme a necessidade.
3. Se o usuário pedir uma task ou workflow específico, resolva pelo `id` declarado em `config.yaml` (ex.: `bench-matrix`, `wf-deep-research`, `validate-product-idea`).

**Squad:** Operações unificadas de pesquisa — pesquisa técnica profunda, inteligência competitiva, marketing deep-dive, product discovery (JTBD/Mom Test/Villain/WTP) e benchmarking universal.
**Slash prefix nativo do squad:** `research`
**Nota:** este squad usa o manifesto legado `config.yaml` (não `squad.yaml`) — não passou pelo validador/ativador padrão do Squad Protocol. Já é bastante maduro (`tested: true`, 57 tasks, hierarquia SINKRA completa).
