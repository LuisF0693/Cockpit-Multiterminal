# Visão do Fundador — Cockpit AIOX (captura 2026-07-14)

> Registrado pelo @pm a partir do briefing do fundador durante o desenvolvimento
> do Épico 2. Fonte de verdade para reconciliação do roadmap.

## A visão em 8 pontos

1. **Plataforma própria instalada** que orquestra múltiplos terminais, projetos e modelos de IA (Claude, Codex, Grok, Gemini...) num único ambiente visual — velocidade, persistência de sessões e gestão do processo de desenvolvimento (SDC, épicos, stories, learning, QA).
2. **Conductor/copilot central:** abre terminais, cria sub-sessões, distribui tarefas, registra learnings e apresenta filas de decisões humanas — o fundador foca em ENTREGAR, não em administrar ferramentas.
3. **Arquitetura daemon + túnel de transcript:** camada acima dos CLIs; um "daemon" de terminais SEPARADO da interface gráfica, conectado por túnel de transcript. Os terminais reais rodam FORA do app; o Cockpit embeda as sessões (como um iframe) e controla orquestração, self-healing e roteamento entre modelos.
4. **Gestão de sessões e decisões:** sessões ativas com relatórios por sessão (run, tokens, tools chamadas) + coluna/fila de "decisões pendentes" mostrando quais terminais pararam aguardando intervenção humana — retomar stories, aprovar pushes, revisar PRs sem se perder entre dezenas de terminais.
5. **SDC embutido:** ciclo canônico (validate → develop → review → apply → fix → push → deploy → verify → close) com **"three brain self-heal"**: um motor escreve, outros dois revisam — código nunca validado só pelo modelo que o gerou.
6. **Learning logs globais:** cada skill/execução gera learnings num banco SEPARADO dos projetos, digerido, qualificado e reutilizado — a metodologia evolui independente do modelo.
7. **Multimodelo por design:** integrar novo modelo = adicionar um adapter, nunca reescrever o loop de self-healing/orquestração.
8. **Uso diário:** 4+ projetos abertos simultaneamente com áreas de terminais dedicadas (marketing, OBS, integrações, processos, frameworks); zoom, acompanhamento e retomada rápida de qualquer sessão.

## Gap-analysis vs PRD atual (@pm)

| # Visão | Cobertura no PRD atual | Gap / Ação |
|---------|------------------------|------------|
| 1 Plataforma multi-terminal | ✅ Épico 1 (ENTREGUE) | — |
| 7 Multimodelo via adapters | ✅ Épico 2 (em curso: 2.1 ✓, 2.2 em dev) | Adicionar Gemini ao backlog (PRD cita Claude/Codex/Grok) |
| 2 Conductor central | 🟡 Épico 3 (Sessão Master) | Revisar escopo do E3: sub-sessões + distribuição de tarefas explícitas |
| 4 Fila de decisões | 🟡 Épico 5 (Decision Queue já existe em components.md) | Antecipar? Reavaliar prioridade E3↔E5 com @po |
| 4 Relatórios de sessão (tokens/tools) | ❌ Não coberto | NOVO: candidato a story no E3 (telemetria por sessão) |
| 3 Daemon separado + túnel de transcript | ❌ DIVERGÊNCIA ARQUITETURAL | Hoje o pty-host morre com o app. Sobrevivência de terminais além do app = decisão crítica nova → **spike do @architect** (daemon standalone + reconexão). NÃO bloquear E2; avaliar antes do E4 |
| 5 SDC embutido + three-brain | ❌ Não coberto (E5 cobre lifecycle/governança genérica) | NOVO: épico futuro (E6?) — orquestração de workflow SDC + revisão cruzada multi-modelo |
| 6 Learning logs globais | ❌ Não coberto | NOVO: épico futuro (E7?) — banco de learnings global (fora dos projetos) |
| 8 Multi-projetos (áreas) | 🟡 Parcial (canvas livre existe) | NOVO: conceito de workspace/projeto agrupando tiles — candidato a story no E3 |

## Decisões de roadmap propostas (aguardando @po/fundador)

1. **Seguir o Épico 2 até o fim** (2.2-2.5) — é a fundação do multimodelo da visão. ✅ em andamento
2. **Spike do daemon (E-novo):** @architect avaliar terminal-daemon standalone + túnel de transcript ANTES do Épico 4 (persistência total) — as duas coisas se tocam (sobrevivência de sessão).
3. **Épico 3 revisado:** incorporar sub-sessões, distribuição de tarefas, relatórios de sessão e workspaces à Sessão Master.
4. **Épicos novos (backlog):** E6 SDC embutido + three-brain self-heal; E7 learning logs globais.
5. **Gemini adapter:** adicionar como story 2.6 ou ao backlog do E2.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-14 | 0.1 | Captura da visão + gap-analysis + propostas de roadmap | Morgan (@pm) via Orion |
