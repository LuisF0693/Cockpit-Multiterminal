# User Interface Design Goals

### Overall UX Vision

Um cockpit, não um caos de janelas: o usuário vive na **sessão master** (visão de comando) e mergulha em terminais individuais apenas quando decide intervir. Sensação de controle de missão — status de tudo visível em um relance, decisões pendentes destacadas, zero medo de fechar o app. Tema escuro por padrão, densidade de informação alta porém hierarquizada.

### Key Interaction Paradigms

- **Master-first:** painel de comando como home; terminais como drill-down.
- **Grid manipulável:** criar/arrastar/redimensionar terminais como tiles.
- **Fila de decisões:** agentes em waiting-input formam uma fila visível de pendências humanas.
- **Timeline auditável:** todo evento relevante é navegável cronologicamente.
- **Atalhos de teclado** para alternância rápida master ↔ terminal N.

### Core Screens and Views

- **Master Session Dashboard** — visão agregada: cards/linhas de agentes com status, tarefa, tempo; fila de decisões pendentes; timeline.
- **Terminal Grid** — grid de terminais PTY interativos com cabeçalho por tile (nome, adapter, status).
- **Terminal Focus View** — terminal expandido com contexto (tarefa vinculada, histórico de eventos do agente).
- **Lifecycle Board** — tarefas por estado (colunas), com vínculos a agentes/terminais.
- **Session Recovery Screen** — resumo pós-restart/crash: o que estava rodando, o que aguarda decisão, ação de retomar.
- **Settings / Adapters** — configuração de adapters disponíveis e preferências.

### Accessibility: None

Sem meta formal WCAG no MVP (produto local de nicho dev); boas práticas básicas de contraste e navegação por teclado aplicadas por padrão.

### Branding

A definir. Direção inicial: estética "mission control" — tema escuro, acentos de cor por status (working/waiting/done/error), tipografia monoespaçada nos terminais. Sem style guide existente.

### Target Device and Platforms: Desktop Only

Windows 10/11 primário; macOS/Linux desejáveis pós-MVP. Sem responsividade web/mobile no MVP.
