# Competitive Analysis Report: Meu Cockpit

> **Autor:** Atlas (@analyst) — AIOX Fase 1 (greenfield-fullstack)
> **Data:** 2026-07-10
> **Fontes:** getnyx.dev, themaestri.app/pt-br, onorca.dev (páginas oficiais, capturadas em 2026-07-10)

---

## Executive Summary

O mercado de "multi-terminal para agentes de IA" consolidou-se em 2025–2026 como uma nova categoria: **ambientes de orquestração de CLIs agênticos** (Claude Code, Codex, Gemini, Grok etc.). Os três concorrentes analisados — **Nyx**, **Maestri** e **Orca** — convergem no mesmo padrão: canvas/painéis espaciais + PTY real por agente + git worktrees para paralelismo + revisão de diffs integrada.

**Principais achados:**

1. **Orca é a maior ameaça:** gratuito, open source (MIT), multiplataforma (inclusive mobile), ~30 agentes suportados, ritmo de entrega diário e tração social (Linear, Vercel, Stripe citados como usuários).
2. **Todos são "multiplexadores espaciais", nenhum é "orquestrador governado":** os três resolvem o problema de *ver e operar* vários agentes ao mesmo tempo, mas **nenhum oferece uma camada de governança de ciclo de vida** — sessão master que mantém coerência entre agentes, decisões humanas integradas ao fluxo, e mapeamento de entidades ponta a ponta.
3. **Persistência de sessão é tratada como feature, não como fundação:** Orca tem restauração de histórico e reconexão SSH; nenhum anuncia sobrevivência completa de estado de orquestração (quem estava fazendo o quê, por quê, e qual o próximo passo).

**Oportunidade estratégica (blue ocean):** o Meu Cockpit não deve competir como "mais um canvas de terminais" — deve competir como **plataforma de entrega agêntica com governança**: sessão master + lifecycle + adapters agnósticos + persistência/recuperação como contrato central.

---

## Escopo & Metodologia da Análise

### Propósito
Avaliação de entrada em mercado (new market entry) + análise de gap de funcionalidades para posicionar o Meu Cockpit.

### Categorias analisadas
- **Concorrentes diretos:** Nyx, Maestri, Orca (mesmo produto, mesmo público: devs orquestrando múltiplos CLIs de IA).
- **Concorrentes indiretos (não perfilados, monitorar):** tmux/Zellij + scripts, VS Code + extensões de agentes, Wave Terminal, Conductor, Claude Squad.
- **Substitutos:** rodar um único agente por vez em terminal comum (status quo).

### Metodologia
- Fonte primária: sites oficiais dos produtos (capturados em 2026-07-10).
- Confiança: **alta** para funcionalidades/preço anunciados; **média** para tração/market share (autodeclarados).
- Limitação: não foram testados hands-on nesta fase; sem dados de receita/usuários auditáveis.

---

## Panorama Competitivo

### Estrutura do mercado
Categoria emergente e fragmentada (2025–2026), sem líder consolidado. Barreiras de entrada baixas para o "casco" (terminal + tiles), altas para o diferencial real (orquestração coerente, persistência robusta, integração de fluxo). Entradas recentes frequentes; expectativa de consolidação.

### Matriz de Priorização

| | Alta ameaça | Baixa ameaça |
|---|---|---|
| **Alta tração** | **P1: Orca** (grátis, OSS, multiplataforma, 30+ agentes) | — |
| **Baixa/média tração** | **P2: Nyx** (barato, Windows+macOS, canvas maduro) | **P3: Maestri** (macOS-only, nicho Apple) |

---

## Perfis dos Concorrentes

### Orca — Prioridade 1

- **Modelo de negócio:** gratuito e open source (licença MIT); monetização não explícita.
- **Proposta de valor:** "Agent Development Environment (ADE)" — IDE construída "para você e seus agentes".
- **Plataformas:** macOS (ARM64/Intel), Windows, Linux, iOS, Android.
- **Agentes suportados:** Claude Code, Codex, OpenCode, **Grok**, Gemini, Cursor CLI, GitHub Copilot, Continue, Cline e ~30 outros ("traga sua assinatura").
- **Funcionalidades-chave:**
  - Worktrees git paralelos e isolados por tarefa (inclusive **worktrees SSH remotos** com reconexão automática)
  - Terminal classe Ghostty com WebGL, splits infinitos, **restauração de histórico** e busca em scrollback
  - Design Mode: Chromium real por worktree — clicar em elementos e enviar HTML/CSS/screenshot ao agente
  - Dashboard de orquestração: status de agentes, tarefas em execução, tempo decorrido, PRs criados
  - Integração nativa GitHub/Linear (PRs, issues, boards) + editor VS Code-based + diff review anotável
  - Alternador de contas com visão de rate-limits de Claude/Codex
  - CLI próprio para automação
- **Forças:** preço imbatível (grátis), amplitude de plataforma e agentes, velocidade de ship ("features diárias"), prova social forte (Linear, Uber, Vercel, Stripe, OpenAI citados).
- **Fraquezas:** amplitude sem profundidade de governança — dashboard mostra *status*, não coordena *fluxo*; sem sessão master que mantenha coerência entre agentes; complexidade crescente pode gerar UX sobrecarregada; sustentabilidade do modelo gratuito é incógnita.

### Nyx — Prioridade 2

- **Modelo de negócio:** licença vitalícia US$ 29 (3 dispositivos), trial 14 dias, sem assinatura; aceita cripto.
- **Proposta de valor:** "Mission control for AI coding agents" — canvas infinito onde cada agente é um tile PTY/TUI real.
- **Plataformas:** macOS 12+, Windows 10/11; Linux "em breve". Early access (v0.2.0).
- **Agentes suportados:** Claude Code, Codex, Gemini — "qualquer CLI que rode em terminal".
- **Funcionalidades-chave:**
  - Canvas infinito com 6 tipos de tile: Agent, Terminal (xterm.js), Browser (com element picker), Todo, Diff, Editor (Monaco)
  - Status de agente em tempo real (Configuring → Working → Done)
  - Git worktrees automáticos por branch
  - Diff review com comentários inline enviados de volta ao agente ("Send Review — no copy-paste")
  - Focus Mode (split de foco por atalho)
  - Offline-first: tudo local
- **Forças:** preço acessível de compra única; UX de revisão (feedback → agente) bem resolvida; suporta Windows; simplicidade conceitual.
- **Fraquezas:** produto early-stage (0.2.x); equipe pequena/indie; sem camada de orquestração entre agentes (tiles são independentes); persistência de sessão não é destaque; sem integrações de fluxo (GitHub/Linear).

### Maestri — Prioridade 3

- **Modelo de negócio:** freemium — grátis (1 workspace, agentes ilimitados) / Pro R$ 95 compra única (2 Macs).
- **Proposta de valor:** canvas infinito nativo para orquestrar agentes que "conversam entre si".
- **Plataformas:** **exclusivo macOS 26.2+ com Apple Silicon** (100% Swift/SwiftUI, Metal).
- **Agentes suportados:** Claude Code, Codex, OpenCode, shells padrão.
- **Funcionalidades-chave:**
  - Comunicação direta agente-a-agente via PTY (delegação de tarefas entre agentes) — **único dos três com esse conceito**
  - Papéis nomeados de agente ("Bug Whisperer", "Refactor Gremlin")
  - "Ombro": IA on-device (Apple Foundation Models) que monitora agentes, resume conclusões e sugere próximos passos
  - Floors: cópias instantâneas de workspace via APFS copy-on-write
  - Scheduled prompts, sticky notes escritas pelos agentes, portais de browser
  - Zero telemetria, tudo local (JSON/Markdown)
- **Forças:** conceitos de orquestração mais avançados da categoria (delegação entre agentes, monitor de IA); polish nativo.
- **Fraquezas:** prisão total ao ecossistema Apple (irrelevante para usuários Windows/Linux); dependência de APIs proprietárias (APFS, Foundation Models) impossibilita expansão; alcance de mercado estruturalmente limitado.

---

## Análise Comparativa

### Matriz de Funcionalidades

| Categoria | **Meu Cockpit (visão)** | Orca | Nyx | Maestri |
|---|---|---|---|---|
| Multi-terminal PTY real | ✅ planejado | ✅ | ✅ | ✅ |
| Multi-LLM (Claude/Codex/Grok/…) | ✅ via adapters | ✅ (~30) | ✅ (3+ qualquer CLI) | ⚠️ (3) |
| **Sessão master orquestradora** | ✅ **núcleo do produto** | ❌ (só dashboard de status) | ❌ | ⚠️ (Ombro observa, não governa) |
| **Lifecycle com governança humana** | ✅ **núcleo do produto** | ❌ | ❌ | ❌ |
| **Persistência/recuperação total de sessão** | ✅ **núcleo do produto** | ⚠️ (histórico/reconexão) | ❌ (não anunciado) | ⚠️ (workspaces locais) |
| Adapter design agnóstico de provider | ✅ | ⚠️ (implícito) | ⚠️ (PTY genérico) | ❌ |
| Comunicação agente-a-agente | 🔄 pós-MVP | ❌ | ❌ | ✅ |
| Git worktrees paralelos | 🔄 pós-MVP | ✅ | ✅ | ⚠️ (Floors/APFS) |
| Diff review integrado | 🔄 pós-MVP | ✅ | ✅ | ❌ |
| Browser embutido p/ agente | ❌ fora do MVP | ✅ | ✅ | ✅ |
| Integração GitHub/Linear | 🔄 pós-MVP | ✅ | ❌ | ❌ |
| Windows | ✅ (plataforma primária) | ✅ | ✅ | ❌ |
| Preço | a definir | Grátis/OSS | US$29 vitalício | Grátis/R$95 |

Legenda: ✅ tem/planejado no MVP · ⚠️ parcial · 🔄 roadmap pós-MVP · ❌ não tem/não planejado

### SWOT — Meu Cockpit

- **Forças:** diferencial conceitual claro (governança + sessão master + persistência como contrato); integração natural com o método AIOX (story-driven, gates de qualidade) que nenhum concorrente possui; dono do produto usa o produto (dogfooding total).
- **Fraquezas:** partimos do zero contra produtos maduros; time pequeno; sem marca.
- **Oportunidades:** categoria nova e sem líder; nenhum player ataca governança/lifecycle; dor real e crescente (carga cognitiva de gerenciar N agentes manualmente).
- **Ameaças:** Orca grátis e veloz pode absorver qualquer feature nossa; possíveis entradas de players grandes (Anthropic/OpenAI/Microsoft) na categoria; churn de APIs/CLIs dos providers (mitigado pelo adapter design).

### Mapa de Posicionamento

Dimensões: **Multiplexação espacial** (ver/operar N terminais) × **Orquestração governada** (coordenar fluxo, decisões, estado).

- Orca: altíssima multiplexação, baixa governança
- Nyx: alta multiplexação, governança nula
- Maestri: média multiplexação, governança embrionária (Ombro/delegação)
- **Meu Cockpit: multiplexação suficiente + governança máxima — quadrante vazio**

---

## Análise Estratégica

### Vantagens sustentáveis a construir
- **Switching cost por estado:** quanto mais lifecycle/histórico de decisões o Cockpit acumula, mais caro sair.
- **Barreira metodológica:** governança integrada a método (AIOX) é difícil de copiar sem repensar o produto inteiro — concorrentes precisariam abandonar o paradigma "canvas de tiles".
- **Adapter design:** agnosticismo de provider protege contra churn de CLIs e vira ponto de extensão da comunidade.

### Pontos vulneráveis dos concorrentes
- **Orca:** sem coerência entre agentes; usuário continua sendo o orquestrador manual (a dor original persiste).
- **Nyx:** early-stage, sem persistência anunciada, sem integrações de fluxo.
- **Maestri:** irrelevante fora do Mac; ideias boas (delegação, Ombro) aprisionadas em APIs Apple.

### Blue Ocean
1. **Governança de entrega agêntica:** decisões humanas como cidadãs de primeira classe no fluxo (aprovar/revisar/redirecionar), não como interrupções.
2. **Sessão master com memória:** um plano coerente distribuído entre terminais, com estado recuperável após crash/restart — "túnel entre agentes".
3. **Lifecycle de entidades ponta a ponta:** de intenção → spec → execução → revisão → entrega, mapeado e auditável.
4. **Windows como cidadão de primeira classe:** Maestri ignora, e a maioria dos players trata como porta secundária.

---

## Recomendações Estratégicas

1. **Não competir em amplitude de features com Orca.** Competir em profundidade de orquestração. Mensagem: *"Eles mostram seus agentes. Nós governamos sua entrega."*
2. **MVP focado no trio inegociável:** (a) multi-terminal PTY com adapters, (b) sessão master, (c) persistência/recuperação total. Worktrees, diff review e browser vêm depois — são commodities da categoria.
3. **Adapter design como arquitetura pública:** especificação clara de adapter (Claude Code, Codex, Grok CLI no MVP) para permitir extensão futura.
4. **Defensiva:** persistência de estado robusta desde o dia 1 — é o que torna a troca custosa e é o ponto mais fraco comum aos três.
5. **Parceria/ecossistema:** avaliar integração com o próprio framework AIOX como diferencial de lançamento (cockpit que entende stories, gates e agentes do método).

---

## Plano de Monitoramento

- **Rastrear (prioridade):** Orca (releases diárias, GitHub), Nyx (changelog/versões), Maestri (novos conceitos de orquestração), Wave Terminal, Conductor, Claude Squad e anúncios de Anthropic/OpenAI sobre ferramentas de orquestração.
- **Métricas:** novas features de orquestração/persistência, mudanças de preço, adoção declarada, movimento de players grandes.
- **Fontes:** sites/changelogs oficiais, GitHub (Orca), X/Reddit (r/ClaudeAI, r/LocalLLaMA), Hacker News.
- **Cadência:** mensal (features/preço); trimestral (revisão estratégica completa).
