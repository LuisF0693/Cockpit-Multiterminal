# Epic 11 — Learning Logs Globais

Cada aprendizado real (um gotcha descoberto, uma decisão de design que valeu
a pena, um padrão que funcionou) fica registrado num banco GLOBAL — fora do
ciclo de vida de qualquer projeto específico — para que a metodologia evolua
com o uso, independente de qual modelo/projeto o gerou.

> **Formalização 2026-07-14 (@pm, spec pipeline):** ponto 6 da visão do
> fundador (`docs/prd/visao-do-fundador-cockpit-aiox.md`): *"cada
> skill/execução gera learnings num banco SEPARADO dos projetos, digerido,
> qualificado e reutilizado — a metodologia evolui independente do modelo."*
> Já estava no backlog como "Épico 8" antes da extensão de visão de
> 2026-07-14 (multi-projeto/vínculo/browser preview) — renumerado para
> Épico 11 quando aqueles três entraram na frente (E8-E10). FR30-33
> adicionados a `requirements.md`. Complexidade: SIMPLE (reusa lifecycle e
> padrão de decisão já existentes, nenhuma infraestrutura nova de
> persistência além de uma tabela).
>
> **Decisão de design deliberada:** "learning" é capturado MANUALMENTE pelo
> humano nesta formalização — não há extração automática de aprendizados a
> partir da saída de um agente (isso seria inventar um pipeline de
> sumarização/NLP sem lastro em nenhum FR aprovado; a visão do fundador fala
> em "digerido, qualificado", que aqui vira o fluxo de qualificação humana
> da 11.2, não uma digestão automática por IA). "Banco separado dos
> projetos" é satisfeito por uma tabela independente de `project_id`
> obrigatório — remover um projeto (Épico 8) nunca cascade-deleta learnings
> associados a ele, mesmo princípio de independência que tarefas/sessões já
> têm entre si hoje.

### Story 11.1 — Entidade Learning (registro manual)

As a desenvolvedor multi-projeto,
I want registrar um aprendizado com texto livre, categoria e o projeto de origem,
so that gotchas e decisões que valeram a pena fiquem capturados em vez de esquecidos.

#### Acceptance Criteria

1. Um learning tem `id`, `text` (texto livre), `category` (string livre curta — ex.: "gotcha", "decisão", "padrão"), `projectId` de origem (nullable — pode ser registrado sem projeto ativo) e `status` de qualificação (`draft` por padrão).
2. Learning é capturável a partir da sessão master (campo de captura rápida) — sem exigir navegação a uma tela dedicada para o caso comum.
3. Learnings persistem independentemente de reinicialização do app (mesma garantia do FR10) e independentemente da existência do projeto de origem (FR31) — remover o projeto (Épico 8) não remove learnings associados.
4. Nenhuma tabela por-projeto: um único armazenamento global, mesmo banco SQLite já usado pelo resto do app (não é infraestrutura de persistência nova, só uma tabela nova).

### Story 11.2 — Qualificação (fila de decisão humana)

As a desenvolvedor multi-projeto,
I want revisar um learning e marcá-lo como reutilizável (ou descartá-lo),
so that só aprendizados validados entrem na base que a metodologia reusa.

#### Acceptance Criteria

1. Um learning tem 3 estados: `draft` (recém-capturado) → `reviewed` (revisado, mas não necessariamente valioso) → `reusable` (qualificado como reaproveitável); ou `draft` → `discarded` (não vale a pena manter).
2. Transições são decisão HUMANA explícita (mesmo princípio do FR15 — nunca automática/heurística) — reusa o MESMO padrão de ponto de decisão já usado para tarefas (5.3), sem inventar uma máquina de estados nova.
3. Learnings em `draft` aparecem numa fila simples (mesmo padrão da fila de decisões pendentes já existente na sessão master) para o humano revisar quando quiser — não é bloqueante, não pausa nada.
4. Trilha auditável: cada transição de status registrada com autor e timestamp (mesmo padrão de `task.decision`).

### Story 11.3 — Consulta global de learnings

As a desenvolvedor multi-projeto,
I want buscar/filtrar learnings por categoria, projeto de origem ou texto,
so that eu reaproveite um aprendizado anterior sem depender de lembrar onde/quando o registrei.

#### Acceptance Criteria

1. Tela dedicada (nova view, acessível pelo nav do header) lista todos os learnings, com filtro por categoria, projeto de origem e busca textual simples.
2. Tela é INDEPENDENTE do projeto ativo (Épico 8) — ao contrário de sessões/tarefas/vínculos, learnings NÃO são escopados ao projeto ativo por padrão (a busca por projeto é um FILTRO opcional, não um escopo automático) — é exatamente o ponto da visão do fundador ("banco separado dos projetos", reutilizável entre eles).
3. Cada learning mostra categoria, status de qualificação, projeto de origem (se houver) e texto completo.
4. Nenhuma reformulação do lifecycle de tarefa (FR13) — learnings são uma entidade paralela, sem relação obrigatória com tarefas (FR20).
