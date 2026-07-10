# Epic 5 — Lifecycle & Governança

Fechar a visão de entrega agêntica: trabalho como entidades com ciclo de vida, vínculo explícito tarefa↔agente↔terminal e decisões humanas auditáveis integradas ao fluxo.

### Story 5.1 — Entidades de tarefa com estados de lifecycle

As a desenvolvedor multi-agente,
I want criar tarefas com estados (planejada → em execução → aguardando decisão → revisada → concluída),
so that o trabalho seja mapeado de ponta a ponta, não disperso em terminais.

#### Acceptance Criteria

1. CRUD de tarefas com título, descrição e estado; transições de estado válidas impostas pelo core.
2. Transições registradas na timeline com autor e timestamp.
3. Tarefas persistem no state store (sobrevivem a restart).

### Story 5.2 — Vínculo tarefa ↔ agente ↔ terminal

As a desenvolvedor multi-agente,
I want vincular tarefas aos agentes/terminais que as executam,
so that eu sempre saiba quem está fazendo o quê e por quê.

#### Acceptance Criteria

1. Tarefa pode ser vinculada/desvinculada a um ou mais terminais/agentes.
2. Vínculo visível nos dois sentidos: no tile/foco do terminal e no card da tarefa; dashboard master exibe a tarefa de cada agente (completa FR6).
3. Enviar instrução a partir de uma tarefa direciona ao(s) agente(s) vinculado(s).

### Story 5.3 — Pontos de decisão humana auditáveis

As a desenvolvedor multi-agente,
I want aprovar, rejeitar ou redirecionar o trabalho em pontos de decisão explícitos,
so that a governança faça parte do fluxo com trilha auditável completa.

#### Acceptance Criteria

1. Tarefa em "aguardando decisão" expõe ações: aprovar (→ revisada/concluída), rejeitar (→ em execução com feedback) e redirecionar (→ outro agente).
2. Cada decisão registra autor, timestamp e justificativa opcional na timeline (FR15).
3. Decisões pendentes de tarefas integram a fila de decisões do master (unificada com waiting-input dos agentes).
4. Redirecionamento transfere o vínculo e notifica o novo agente via instrução inicial.

### Story 5.4 — Lifecycle Board

As a desenvolvedor multi-agente,
I want um board com as tarefas organizadas por estado,
so that eu visualize o pipeline de entrega inteiro em um relance.

#### Acceptance Criteria

1. Board em colunas por estado do lifecycle, com cards mostrando tarefa, agente(s) vinculado(s) e status do agente.
2. Mover card entre colunas executa a transição de estado (com validação das transições permitidas).
3. Board reflete mudanças em tempo real e persiste (restaurado após restart).
