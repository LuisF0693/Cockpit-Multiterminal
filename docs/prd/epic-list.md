# Epic List

- **Epic 1 — Fundação & Multi-Terminal:** app desktop funcional com grid de terminais PTY reais e persistência de layout desde o primeiro dia.
- **Epic 2 — Adapter Design & Agentes:** contrato de adapter + adapters Claude Code, Codex e Grok CLI com detecção de status em tempo real.
- **Epic 3 — Sessão Master:** painel de comando com visão agregada, envio de instruções, timeline de eventos e fila de decisões.
- **Epic 4 — Persistência & Recuperação Total:** sobrevivência completa de sessão — restauração integral pós-fechamento e pós-crash.
- **Epic 5 — Lifecycle & Governança:** entidades de tarefa com estados, vínculo tarefa↔agente e pontos de decisão humana auditáveis.
- **Epic 6 — Daemon de Terminais:** PTY host como daemon standalone + túnel de transcript — terminais sobrevivem ao app (decisão crítica 5, visão do fundador).
- **Epic 7 — SDC Embutido & Three-Brain:** papéis escritor/revisor na tarefa, roteamento automático de revisão, painel lado a lado, ciclo de correção com feedback agregado (FR16-20, formalizado 2026-07-14, ENTREGUE).
- **Epic 8 — Multi-Projetos & Explorador de Arquivos:** sidebar de projetos (nome/cor/caminho raiz), projeto ativo escopa terminais/tarefas/workspaces, árvore de arquivos navegável estilo Cursor (FR21-24, formalizado 2026-07-14, ENTREGUE).
- **Epic 9 — Vínculo Terminal-a-Terminal:** um agente comanda outro terminal diretamente, fora do contexto de tarefa/three-brain — generalização do roteamento do E7 (FR25-27, formalizado 2026-07-14, ENTREGUE).
- **Epic 10 — Browser Preview & Playwright:** painel de preview web embutido, automatizável pelos agentes via Playwright (FR28-29, NFR9, formalizado 2026-07-14, ENTREGUE).
- **Epic 11 — Learning Logs Globais:** registro manual de aprendizados (gotchas/decisões/padrões), qualificação humana (draft→reviewed→reusable/discarded), consulta global independente do projeto ativo (FR30-33, formalizado 2026-07-14, ENTREGUE).
- **Epic 12 — Identidade Visual & Interação no Canvas:** barra lateral unificada (projetos+arquivos+preview Markdown), vínculo por arraste no canvas, cor por projeto/agente nos terminais, adapters Gemini CLI e Antigravity, minimapa (FR34-40, formalizado 2026-07-14, ENTREGUE).

> Rationale de sequência: Épico 1 estabelece infraestrutura + valor imediato (multi-terminal utilizável). Épicos 2–3 constroem o diferencial (agentes governados pela master). **Ordem de execução revisada (2026-07-14, decisão crítica 5): E3 → E6 (daemon) → E4 → E5** — o daemon muda o substrato de sessões, então precede a persistência total. Épico 4 eleva a persistência incremental (iniciada na story 1.4) ao contrato total. Épico 5 fecha a visão de entrega agêntica. Persistência e status fluem por todos os épicos como cross-cutting — não são etapas finais. **Épicos 8-11 (2026-07-14, extensão da visão via briefing com capturas de tela):** E8 é a base estrutural (projetos de verdade, não só workspaces) que E9/E10 penduram em cima; ordem confirmada pelo fundador: E8 → E9 → E10 → E11.
