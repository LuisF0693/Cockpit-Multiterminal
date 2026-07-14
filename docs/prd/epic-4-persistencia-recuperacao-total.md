# Epic 4 — Persistência & Recuperação Total

Elevar a persistência fundacional (story 1.4) ao contrato central do produto: nenhum cenário de fechamento perde estado; reabrir = retomar. É a vantagem defensiva número 1 identificada na análise competitiva.

> **Revisão 2026-07-14 (@pm/@po, pós-Épico 6):** o daemon mudou o patamar — a
> adoção (6.3) SUPERA o relançamento como caminho primário de retomada. 4.1
> vira prova de robustez do store existente (consolidação já entregue por
> 1.4/3.x; "tarefas e vínculos" saem do AC — entidades nascem no E5). 4.2 vira
> medição/observabilidade da retomada (NFR4) sobre adoção+relaunch. 4.3
> (recovery screen) permanece integral.

### Story 4.1 — Robustez do state store sob carga e falha (revisada)

As a desenvolvedor multi-agente,
I want o state store provado sob carga real e falha parcial,
so that a fonte de verdade seja confiável em qualquer cenário de queda.

#### Acceptance Criteria

1. Teste de integração com 6 sessões reais gerando output simultâneo: eventos e estado gravados sem perda nem bloqueio do fluxo (NFR8).
2. Batch parcial que falha no meio não corrompe o store (transação atômica da WriteQueue provada por teste — tudo-ou-nada).
3. Timeline/events sob carga preservam ordenação consultável (ts + limit) e contagens consistentes (base dos relatórios 3.5).
4. Tarefas/vínculos ficam explicitamente FORA (entidades do E5) — documentado.

### Story 4.2 — Retomada medida e observável (revisada)

As a desenvolvedor multi-agente,
I want a retomada (adoção ou relançamento) medida e visível,
so that o contrato "reabrir = retomar" seja verificável, não prometido.

#### Acceptance Criteria

1. Time-to-resume medido no boot (restore+adoção até janela pronta) e reportado em log de diagnóstico; orçamento NFR4 < 10s.
2. Trilha distingue retomadas: `session.adopted` (contínua, sem perda) vs `session.recovered` (relançada) — timeline e relatório da sessão (3.5) mostram a diferença.
3. Contadores do boot logados: adotadas / relançadas / arquivadas.
4. Critério de sucesso do MVP verificado por smoke: ciclo com restart no meio sem perda de estado persistido (NFR5) — smoke:persist (relaunch) + smoke:daemon (adoção) referenciados como evidência.

### Story 4.3 — Recuperação pós-crash com resumo (revisada)

As a desenvolvedor multi-agente,
I want que após um crash o cockpit me mostre o que estava em andamento,
so that eu retome com confiança em vez de reconstruir a situação de memória.

#### Acceptance Criteria

1. Crash detectado na reabertura (flag `clean_shutdown`, FR12 — já existe desde a 1.4); boot NÃO relança/adota automaticamente enquanto a tela de recuperação não for resolvida.
2. Tela de recuperação exibe: terminais ativos no momento do crash (nome, adapter, cwd, último status conhecido pela trilha) e últimos eventos globais da timeline. "Tarefas em andamento" fica FORA (entidade do E5, ainda não existe — mesmo tratamento da coluna "tarefa: —" do master).
3. Usuário escolhe: restaurar tudo, restaurar seletivamente (checklist) ou iniciar sessão limpa — terminais não escolhidos são ARQUIVADOS (nunca destruídos, mesma garantia da 1.4).
4. Evento de recuperação (`crash.recovery`: escolha + contadores) registrado na timeline.
