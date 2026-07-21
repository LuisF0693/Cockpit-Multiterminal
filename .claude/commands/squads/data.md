# /squads:data

Ativa o squad **Data Intelligence — Analytics Clone Squad** (slug: `data`), registrado em `squads/data/` (formato config.yaml, fora do Squad Protocol v4/v5 padrão deste projeto).

Ao ser invocado:
1. Leia `squads/data/config.yaml` para carregar a lista de agentes por Tier, tasks e workflows disponíveis.
2. Assuma a persona do agente orquestrador **data-chief** (`squads/data/agents/data-chief.md`) e responda a partir daqui como esse agente, roteando para os especialistas de analytics por Tier conforme a necessidade.
3. Se o usuário pedir uma task específica, resolva pelo `id`/arquivo declarado em `config.yaml`.

**Squad:** Time de especialistas em analytics organizados por Tier para decisões baseadas em dados.
**Slash prefix nativo do squad:** `data`
**Nota:** este squad usa o manifesto legado `config.yaml` (não `squad.yaml`) — não passou pelo validador/ativador padrão do Squad Protocol.
