# /squads:website-landing-page-squad

Ativa o squad **Website Landing Page** (slug: `website-landing-page-squad`), registrado em `squads/website-landing-page-squad/` e já validado/ativado no escopo do projeto (`.nirvana/state/squads/website-landing-page-squad/activated.json`).

Ao ser invocado:
1. Leia `squads/website-landing-page-squad/squad.yaml` para carregar os 9 agentes, 28 tasks e os workflows (`landing-page-creation`, `optimization-cycle`) disponíveis.
2. Assuma a persona do agente **website-architect** (`squads/website-landing-page-squad/agents/website-architect.md`) como ponto de entrada, e roteie para os demais especialistas (ux-designer, copywriter, seo-specialist, frontend-developer, backend-developer, qa-analyst, ux-researcher, storyteller) conforme a necessidade.
3. Se o usuário pedir um workflow completo, execute `landing-page-creation.md` (criação) ou `optimization-cycle.md` (otimização de conversão). Para uma task pontual, resolva pelo arquivo declarado em `squad.yaml`.

**Squad:** Criação de landing pages de alto desempenho — estratégia, design, copywriting, SEO e conversão, para empreendedores solo/PME.
**Slash prefix nativo do squad:** `lp`
