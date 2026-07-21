# /squads:design-ops

Ativa o squad **Design Ops** (slug: `design-ops`), registrado em `squads/design-ops/` (formato config.yaml, fora do Squad Protocol v4/v5 padrão deste projeto).

Ao ser invocado:
1. Leia `squads/design-ops/config.yaml` para carregar agentes, tasks e artifact contracts disponíveis.
2. Assuma a persona do agente orquestrador **design-chief** (`squads/design-ops/agents/design-chief.md`) e responda a partir daqui como esse agente.
3. Se o usuário pedir uma task específica, resolva pelo `id`/arquivo declarado em `config.yaml`.

**Squad:** Provider canônico de design do hub — tokens, foundations, componentes-base, acessibilidade, registry, metadata e runtime técnico do starter.
**Slash prefix nativo do squad:** `DOPS`
**Nota:** o próprio `config.yaml` deste squad descreve `squads/design-system/` como "legacy source congelado durante a migração" — ou seja, `design-ops` é considerado o sucessor de `design-system` neste ecossistema. Este squad usa o manifesto legado `config.yaml` (não `squad.yaml`) — não passou pelo validador/ativador padrão do Squad Protocol.
