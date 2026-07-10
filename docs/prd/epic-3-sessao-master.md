# Epic 3 — Sessão Master

Entregar o painel de comando que diferencia o produto: visão agregada de todos os agentes, envio de instruções sem trocar de contexto, timeline auditável e fila de decisões pendentes.

### Story 3.1 — Dashboard master com visão agregada

As a desenvolvedor multi-agente,
I want um painel master com todos os terminais/agentes, status e tempos,
so that eu governe a operação inteira de um único lugar.

#### Acceptance Criteria

1. Dashboard lista todos os terminais ativos: nome, adapter, status, tempo no status atual, tarefa vinculada (quando houver).
2. Atualização em tempo real a partir dos eventos dos adapters.
3. Clicar em um agente navega para o terminal correspondente (e atalho de volta ao master).
4. Dashboard é a tela inicial padrão do app.

### Story 3.2 — Envio de instruções a partir do master

As a desenvolvedor multi-agente,
I want enviar instruções de texto a qualquer agente diretamente do painel master,
so that eu direcione o trabalho sem alternar entre terminais.

#### Acceptance Criteria

1. Campo de instrução por agente no dashboard envia texto ao PTY correspondente (com confirmação visual de envio).
2. Instrução enviada aparece no terminal do agente como se digitada localmente.
3. Envio registrado na timeline (autor: humano via master).
4. Guarda de segurança: envio para agente em estado error/done exibe aviso antes de transmitir.

### Story 3.3 — Timeline de eventos e decisões

As a desenvolvedor multi-agente,
I want uma linha do tempo cronológica de tudo que aconteceu na sessão,
so that eu audite o fluxo e reconstrua o raciocínio da operação.

#### Acceptance Criteria

1. Timeline registra: spawn/fechamento de terminais, mudanças de status, instruções enviadas, decisões humanas, recuperações de sessão.
2. Cada evento tem timestamp, origem (agente/humano/sistema) e payload resumido.
3. Timeline é filtrável por agente e por tipo de evento.
4. Eventos persistem (integração com state store) e sobrevivem a restart.

### Story 3.4 — Fila de decisões pendentes

As a desenvolvedor multi-agente,
I want uma fila visível de agentes aguardando minha entrada,
so that nenhuma pendência humana fique esquecida e o fluxo nunca trave silenciosamente.

#### Acceptance Criteria

1. Agentes em waiting-input entram automaticamente na fila de decisões do dashboard (FR9).
2. Item da fila mostra agente, tarefa vinculada e há quanto tempo aguarda.
3. Ação direta do item: ir ao terminal ou responder via campo de instrução.
4. Notificação visual (badge/contador) visível de qualquer tela do app.
