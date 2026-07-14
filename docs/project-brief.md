# Project Brief: Meu Cockpit

> **Autor:** Atlas (@analyst) — AIOX Fase 1 (greenfield-fullstack)
> **Data:** 2026-07-10
> **Insumos:** visão do fundador (transcrição Aiox Cockpit) + `docs/research/competitor-analysis.md`

---

## Executive Summary

O **Meu Cockpit** é uma plataforma desktop de **orquestração multiagente** que funciona como central de controle para múltiplos CLIs de IA (Claude Code, Codex, Grok CLI e outros), cada um operando em seu próprio terminal, sob coordenação de uma **sessão master** que mantém coerência, estado e governança do fluxo de trabalho. O problema central: desenvolvedores que usam vários agentes de IA hoje carregam sozinhos a carga cognitiva de orquestrá-los — alternando janelas, copiando contexto e perdendo estado a cada restart. O Cockpit transforma isso em **entrega agêntica governada**: o usuário foca em decisões de negócio e revisão; o sistema cuida da execução técnica mecânica.

## Problem Statement

**Estado atual:** o desenvolvedor multi-agente opera N terminais desconectados. Cada agente (Claude, Codex, Grok) tem seu próprio contexto, suas próprias convenções de hooks/regras, e nenhum sabe o que os outros estão fazendo. O humano é o barramento de integração.

**Dores concretas:**
- **Carga cognitiva:** alternância constante de contexto entre terminais; o humano memoriza "quem está fazendo o quê".
- **Perda de estado:** fechar/reiniciar o app ou a máquina destrói o estado da orquestração — sessões, histórico de decisões, tarefas em andamento.
- **Acoplamento a providers:** cada CLI tem arquitetura própria de hooks/regras; trocar ou adicionar um modelo exige reaprender tudo.
- **Governança ausente:** decisões humanas (aprovar, redirecionar, rejeitar) acontecem fora de qualquer fluxo estruturado, sem trilha auditável.

**Por que as soluções existentes falham:** Nyx, Maestri e Orca (ver análise competitiva) resolvem a *visualização* de múltiplos agentes (canvas de tiles PTY), mas nenhuma resolve a *orquestração governada* — o usuário continua sendo o orquestrador manual. Persistência total de sessão não é o contrato central de nenhuma delas.

**Por que agora:** a categoria explodiu em 2025–2026 e ainda não tem líder; a dor cresce proporcionalmente à adoção de CLIs agênticos, que está em curva acelerada.

## Proposed Solution

Uma aplicação desktop com três fundações inegociáveis:

1. **Multi-terminal com Adapter Design** — cada agente roda como PTY real em seu terminal; um contrato de *adapter* agnóstico de provider normaliza spawn, ciclo de vida, entrada/saída e sinais de status de cada CLI (Claude Code, Codex, Grok CLI no MVP; extensível a qualquer CLI).
2. **Sessão Master** — uma visão de controle que monitora todos os terminais ativos, mantém o plano de trabalho coerente entre agentes, registra decisões e conecta as informações (o "túnel entre agentes").
3. **Persistência & Recuperação** — todo o estado (sessões, terminais, histórico, lifecycle) sobrevive a fechamento, crash e restart. Reabrir o app = retomar exatamente de onde parou.

Sobre essas fundações, o **Lifecycle Management**: entidades e processos mapeados de ponta a ponta, com pontos de decisão humana integrados ao fluxo (revisão e governança como parte do ciclo, não interrupção).

**Diferencial estrutural:** enquanto concorrentes são "multiplexadores espaciais", o Meu Cockpit ocupa o quadrante vazio de **orquestração governada** — *"eles mostram seus agentes; nós governamos sua entrega"*.

## Target Users

### Segmento primário: Desenvolvedor solo multi-agente ("orquestrador acidental")
Dev profissional (ou founder técnico) que já assina 2+ ferramentas de IA (Claude Max, ChatGPT/Codex, Grok) e as usa em paralelo no dia a dia. Hoje improvisa a orquestração com janelas de terminal, tmux ou apps como Nyx/Orca. Precisa de: menos alternância de contexto, estado que não evapora, e confiança de que nada se perdeu entre agentes. Objetivo: multiplicar seu throughput sem multiplicar sua carga mental.

### Segmento secundário: Times pequenos com metodologia agêntica
Squads de 2–8 devs que adotam métodos de entrega orientados a agentes (ex.: AIOX) e precisam de governança: quem aprovou o quê, qual agente executou qual story, trilha auditável de decisões.

## Goals & Success Metrics

### Objetivos de negócio
- Lançar MVP funcional em uso próprio (dogfooding) e validar a proposta de valor com o fluxo AIOX real.
- Atingir primeiro círculo de usuários externos (beta) após estabilização do MVP.

### Métricas de sucesso do usuário
- Redução drástica de alternância manual de contexto (o usuário opera a partir da sessão master ≥ 80% do tempo).
- Recuperação de sessão em 100% dos restarts sem perda de estado.
- Adicionar um novo provider/CLI = escrever 1 adapter, sem tocar no core.

### KPIs (MVP)
- **Session survival rate:** 100% dos estados recuperados após fechar/reabrir.
- **Terminais simultâneos estáveis:** ≥ 6 PTYs ativos sem degradação perceptível.
- **Time-to-resume:** reabrir app e retomar trabalho em < 10s.
- **Cobertura de adapters:** 3 providers funcionais (Claude Code, Codex, Grok CLI).

## MVP Scope

### Core Features (Must Have)
- **Grid de multi-terminais PTY:** criar, nomear, redimensionar e fechar terminais reais; cada terminal pode hospedar um agente CLI ou shell comum.
- **Adapter Design (3 adapters):** contrato de adapter + implementações para Claude Code, Codex e Grok CLI — spawn, detecção de status (idle/working/waiting-input/done), captura de saída estruturada.
- **Sessão Master:** painel central com visão de todos os terminais/agentes, status em tempo real, envio de instruções a qualquer terminal, e registro cronológico de eventos e decisões.
- **Persistência & Recuperação:** estado completo (layout, sessões, scrollback, lifecycle, decisões) gravado localmente de forma contínua; restauração integral no restart.
- **Lifecycle básico:** entidades de trabalho (tarefa/story) com estados (planejada → em execução → aguardando decisão → revisada → concluída) e pontos de aprovação humana.

### Fora de escopo (MVP)
- Git worktrees automáticos por tarefa
- Diff review integrado com comentários
- Browser embutido / Design Mode
- Comunicação direta agente-a-agente
- Integrações GitHub/Linear
- Acesso remoto (web/mobile) e colaboração multiusuário
- Marketplace/SDK público de adapters

### Critério de sucesso do MVP
Conseguir conduzir um ciclo AIOX real (story → implementação → revisão) usando 3 agentes de providers diferentes em paralelo, inteiramente de dentro do Cockpit, com pelo menos um restart no meio do caminho **sem perda de estado**.

## Post-MVP Vision

- **Fase 2:** worktrees paralelos por tarefa; diff review com feedback ao agente; comunicação agente-a-agente mediada pela sessão master; templates de orquestração (squads pré-configurados).
- **Longo prazo (1–2 anos):** plataforma de entrega agêntica completa — lifecycle integrado a métodos (AIOX nativo), trilha de auditoria de decisões, dashboards de governança, possivelmente modo servidor para times.
- **Expansões:** SDK público de adapters e comunidade; integração GitHub/Linear; acesso remoto.

## Technical Considerations

> Registros iniciais — **decisões finais são do @architect**.

- **Plataformas-alvo:** desktop Windows (primário — máquina do fundador), macOS e Linux (desejáveis).
- **Performance:** ≥ 6 PTYs simultâneos fluidos; render de terminal com aceleração (referências: xterm.js/WebGL usados por Nyx e Orca).
- **Candidatos de stack (avaliar, não decidir aqui):** Electron ou Tauri como shell desktop; node-pty/portable-pty para PTY real (atenção: ConPTY no Windows); xterm.js para render; persistência local (SQLite ou event-log em disco).
- **Arquitetura:** núcleo agnóstico (session manager, lifecycle engine, state store) + camada de adapters por provider; IPC claro entre UI e processo de terminais.
- **Repositório:** monorepo com `packages/` (ex.: core, adapters, ui), seguindo estrutura L4 do AIOX.
- **Segurança:** tudo local-first; chaves/credenciais dos CLIs permanecem nos próprios CLIs (adapters não interceptam segredos).

## Constraints & Assumptions

### Constraints
- **Orçamento:** desenvolvimento próprio, sem funding; custos limitados a assinaturas de IA já existentes.
- **Time:** 1 fundador + agentes AIOX (dev agêntico).
- **Timeline:** MVP orientado a dogfooding, sem data de mercado; priorizar ciclo curto de validação.
- **Técnica:** Windows 10 como ambiente primário de desenvolvimento e primeiro alvo de suporte.

### Key Assumptions
- Os CLIs alvo (Claude Code, Codex, Grok CLI) continuarão operáveis via terminal/PTY e assinaturas do usuário ("bring your own subscription").
- É possível detectar status dos agentes de forma confiável a partir de saída de terminal e/ou hooks dos próprios CLIs.
- A dor de orquestração manual é forte o bastante para sustentar um produto focado em governança (validada por 3 concorrentes ativos na categoria).

## Risks & Open Questions

### Key Risks
- **Detecção de estado dos agentes:** inferir idle/working/waiting a partir de PTY é frágil; cada CLI muda com frequência. *Impacto: núcleo da sessão master.* Mitigação: adapter design isola a fragilidade por provider.
- **Concorrência do Orca (grátis/OSS):** pode copiar qualquer feature rapidamente. Mitigação: competir em governança/metodologia, não em amplitude.
- **PTY no Windows (ConPTY):** historicamente mais problemático que Unix. Mitigação: spike técnico cedo (@architect).
- **Scope creep:** a categoria tem dezenas de features "brilhantes" (browser, worktrees, mobile). Mitigação: MVP travado no trio fundacional.

### Open Questions
- Qual mecanismo de persistência: snapshot contínuo, event sourcing, ou híbrido?
- A sessão master usa um LLM próprio para coordenar, ou é puramente determinística no MVP?
- Como o Grok CLI se comporta em PTY no Windows? (validar disponibilidade/estabilidade)
- Licenciamento/monetização: open core? licença vitalícia estilo Nyx?

### Áreas para pesquisa adicional
- Spike: ConPTY + node-pty/portable-pty no Windows 10 com 6+ sessões.
- Mecanismos de status hook disponíveis em cada CLI (Claude Code hooks, Codex events, Grok).
- Estratégias de persistência de scrollback de terminal (custo de armazenamento × fidelidade).

## Appendices

### A. Research Summary
Ver `docs/research/competitor-analysis.md` — conclusão central: os três concorrentes são "multiplexadores espaciais" sem governança de fluxo; o quadrante **orquestração governada + persistência como contrato** está vazio.

### C. References
- Análise competitiva: `docs/research/competitor-analysis.md`
- Concorrentes: https://getnyx.dev · https://www.themaestri.app/pt-br · https://www.onorca.dev
- Visão original: transcrição da apresentação do Aiox Cockpit (fornecida pelo fundador)

## Next Steps

### Ações imediatas
1. Revisão e aprovação deste brief pelo fundador (governança — ponto de decisão humana).
2. `@pm` (Morgan): criar PRD a partir deste brief (`docs/prd/`), definindo FRs/NFRs e épicos do MVP.
3. `@ux-design-expert` (Uma): front-end spec do cockpit (grid de terminais, sessão master, lifecycle board).
4. `@architect` (Aria): arquitetura fullstack — incluir spike ConPTY/PTY e decisão Electron vs Tauri.

### PM Handoff
Este Project Brief fornece o contexto completo do **Meu Cockpit**. @pm: iniciar em 'PRD Generation Mode' — revisar o brief e a análise competitiva, e trabalhar com o usuário seção a seção do PRD, priorizando o trio fundacional (multi-terminal + adapters, sessão master, persistência) como espinha dorsal dos épicos.
