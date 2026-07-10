# Epic 4 — Persistência & Recuperação Total

Elevar a persistência fundacional (story 1.4) ao contrato central do produto: nenhum cenário de fechamento perde estado; reabrir = retomar. É a vantagem defensiva número 1 identificada na análise competitiva.

### Story 4.1 — State store unificado de sessão

As a desenvolvedor multi-agente,
I want que todo o estado da orquestração seja gravado continuamente em um store único,
so that o cockpit tenha uma fonte de verdade recuperável a qualquer momento.

#### Acceptance Criteria

1. State store consolida: layout, terminais, adapters, status, scrollback, timeline, tarefas e vínculos.
2. Gravação contínua, assíncrona e não-bloqueante (NFR8), com estratégia definida pelo @architect (event-log/snapshot/híbrido).
3. Corrupção de gravação parcial não inutiliza o store (gravação atômica ou recuperação de último estado válido).
4. Testes de integração cobrem gravação sob carga (6 terminais ativos gerando output).

### Story 4.2 — Restauração integral no restart

As a desenvolvedor multi-agente,
I want fechar o app e reabri-lo exatamente onde parei,
so that restart nunca custe contexto nem retrabalho.

#### Acceptance Criteria

1. Reabertura restaura: layout, terminais (relançados com working dir e adapter), scrollback, timeline, tarefas e fila de decisões.
2. Time-to-resume < 10s (NFR4), medido e reportado em log de diagnóstico.
3. Agentes que estavam ativos são relançados pelo adapter com aviso claro de "sessão do agente reiniciada" na timeline.
4. Critério de sucesso do MVP verificado: ciclo com restart no meio sem perda de estado persistido (NFR5).

### Story 4.3 — Recuperação pós-crash com resumo

As a desenvolvedor multi-agente,
I want que após um crash o cockpit me mostre o que estava em andamento,
so that eu retome com confiança em vez de reconstruir a situação de memória.

#### Acceptance Criteria

1. Crash detectado na reabertura (flag de sessão não encerrada corretamente).
2. Tela de recuperação exibe: agentes ativos no momento do crash, tarefas em andamento, decisões pendentes e últimos eventos da timeline.
3. Usuário escolhe: restaurar tudo, restaurar seletivamente ou iniciar sessão limpa (estado anterior arquivado, não destruído).
4. Evento de recuperação registrado na timeline.
