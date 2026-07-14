# Epic 2 — Adapter Design & Agentes

Introduzir o contrato de adapter agnóstico de provider e entregar os três adapters do MVP com detecção de status em tempo real — a fundação do agnosticismo que protege o produto do churn de providers.

### Story 2.1 — Contrato de adapter e adapter genérico de shell

As a desenvolvedor multi-agente,
I want que cada terminal seja hospedado por um adapter com contrato único,
so that qualquer CLI presente ou futuro possa ser integrado sem tocar no core.

#### Acceptance Criteria

1. Contrato de adapter definido e documentado: spawn, ciclo de vida, entrada/saída, sinais de status, encerramento.
2. Adapter genérico de shell implementa o contrato (status básico: running/exited).
3. Core não referencia nenhum provider específico (NFR7) — verificado por teste/lint de dependência.
4. Criar terminal permite escolher o adapter; documentação de como escrever um novo adapter em `docs/guides/`.

### Story 2.2 — Adapter Claude Code com detecção de status

As a desenvolvedor multi-agente,
I want rodar o Claude Code em um terminal com status detectado automaticamente,
so that o cockpit saiba quando ele está trabalhando, aguardando minha decisão ou concluído.

#### Acceptance Criteria

1. Adapter spawna Claude Code via PTY com sessão interativa plena.
2. Status idle/working/waiting-input/done/error detectado — preferencialmente via hooks nativos do Claude Code; fallback de parsing documentado.
3. Mudanças de status emitidas como eventos consumíveis pela UI (cabeçalho do tile reflete status em tempo real).
4. Autenticação permanece no CLI; adapter não intercepta credenciais (NFR6).

### Story 2.3 — Adapter Codex

As a desenvolvedor multi-agente,
I want rodar o Codex CLI como agente gerenciado,
so that eu use meu segundo provider no cockpit com a mesma experiência.

#### Acceptance Criteria

1. Adapter Codex implementa o contrato completo com detecção de status.
2. Sessão interativa plena via PTY; particularidades do CLI documentadas no adapter.
3. Dois agentes (Claude + Codex) rodando simultaneamente com status independentes corretos.

### Story 2.4 — Adapter Grok CLI

As a desenvolvedor multi-agente,
I want rodar o Grok CLI como agente gerenciado,
so that os três providers do MVP estejam operacionais em paralelo.

#### Acceptance Criteria

1. Adapter Grok CLI implementa o contrato completo com detecção de status.
2. Três agentes de providers distintos rodando simultaneamente, cada um com status correto.
3. Limitações/riscos do CLI no Windows documentados (pergunta aberta do brief respondida).

### Story 2.5 — Painel de status dos agentes no grid

As a desenvolvedor multi-agente,
I want ver em um relance o status de todos os agentes no grid,
so that eu identifique imediatamente quem precisa de mim.

#### Acceptance Criteria

1. Cada tile exibe status com código de cor consistente (working/waiting/done/error/idle).
2. Agentes em waiting-input recebem destaque visual proeminente (pré-requisito do FR9).
3. Transições de status aparecem em < 2s após o evento do adapter.
