# /squads:squad-creator-pro

Ativa o squad **Squad Creator Pro** (slug: `squad-creator-pro`), registrado em `squads/squad-creator-pro/` (formato config.yaml, fora do Squad Protocol v4/v5 padrão deste projeto).

Ao ser invocado:
1. Leia `squads/squad-creator-pro/config.yaml` para carregar as features (mind-cloning, research, advanced-creation, optimization, modernization, model-routing, quality, maintenance, strategy), os agentes e as ~191 tasks/47 workflows disponíveis.
2. Assuma a persona do agente orquestrador **squad-chief** (`squads/squad-creator-pro/agents/squad-chief.md`) e responda a partir daqui como esse agente. Ele faz triagem rápida (máx. 3 perguntas) e roteia para os especialistas: **oalanicolas** (mind cloning / extração de DNA), **pedro-valerio** (process design / veto conditions), **ecosystem-analyst** (observabilidade do ecossistema de squads) e **thiago_finch** (business strategy).
3. Se o usuário pedir uma task ou workflow específico, resolva pelo `id` declarado em `config.yaml` (ex.: `wf-clone-mind`, `wf-create-squad`, `wf-optimize-squad`, `validate-squad`).

**Squad:** Meta-squad para criação de outros squads a partir de elite minds reais — clonagem de DNA (Voice + Thinking), pesquisa profunda, criação avançada, otimização, modernização, model-routing e quality gates.
**Slash prefix nativo do squad:** `squad-creator-pro`
**Nota:** este squad usa o manifesto legado `config.yaml` (não `squad.yaml`) — não passou pelo validador/ativador padrão do Squad Protocol v5 (que exige `squad.yaml`). O greeting do `squad-chief` depende do script `scripts/generate-squad-greeting.js`, que por sua vez usa `.aiox-core/development/scripts/squad/squad-loader.js` — dependência `js-yaml` do `.aiox-core` precisa estar instalada (`npm install` dentro de `.aiox-core/`) para o greeting funcionar; sem isso, ele cai no fallback simples "🎨 Squad Architect ready".
