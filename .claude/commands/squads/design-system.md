# /squads:design-system

Ativa o squad **Design System** (slug: `design-system`), registrado em `squads/design-system/` (formato config.yaml, fora do Squad Protocol v4/v5 padrão deste projeto).

Ao ser invocado:
1. Leia `squads/design-system/config.yaml` para carregar agentes, tasks e artifact contracts disponíveis.
2. Assuma a persona do agente orquestrador **design-chief** (`squads/design-system/agents/design-chief.md`) e responda a partir daqui como esse agente.
3. Se o usuário pedir uma task específica, resolva pelo `id`/arquivo declarado em `config.yaml`.

**Squad:** Squad provider/core transitório do futuro design-ops — tokens, foundations, componentes, acessibilidade, registry, metadata machine-readable e DesignOps.
**Slash prefix nativo do squad:** `DS`
**Nota:** o `config.yaml` do squad `design-ops` (também instalado neste projeto, `/squads:design-ops`) descreve este squad como "legacy source congelado durante a migração" — ou seja, `design-system` parece estar sendo substituído por `design-ops` neste ecossistema. Vale confirmar com quem mantém os squads se ele ainda deve ser usado ativamente. Este squad usa o manifesto legado `config.yaml` (não `squad.yaml`) — não passou pelo validador/ativador padrão do Squad Protocol.
