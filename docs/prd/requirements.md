# Requirements

### Functional

- **FR1:** O sistema deve criar, nomear, redimensionar, reorganizar e fechar múltiplos terminais em um grid, cada um hospedando um PTY real (shell comum ou agente CLI).
- **FR2:** O sistema deve suportar no mínimo 6 terminais PTY simultâneos ativos e interativos.
- **FR3:** O sistema deve implementar um contrato de adapter que normalize, por provider: spawn do CLI, ciclo de vida do processo, entrada/saída e sinais de status.
- **FR4:** O sistema deve incluir adapters funcionais para Claude Code, Codex e Grok CLI, além de um adapter genérico de shell.
- **FR5:** Cada adapter deve detectar e reportar o status do agente (idle / working / waiting-input / done / error) em tempo real.
- **FR6:** A sessão master deve exibir visão agregada de todos os terminais ativos com status, agente, tarefa vinculada e tempo decorrido.
- **FR7:** A sessão master deve permitir enviar instruções (texto) a qualquer terminal sem sair do painel master.
- **FR8:** A sessão master deve manter um registro cronológico (timeline) de eventos: spawns, mudanças de status, decisões humanas, conclusões.
- **FR9:** O sistema deve notificar visualmente quando qualquer agente entra em estado waiting-input (aguardando decisão/entrada humana).
- **FR10:** O sistema deve persistir continuamente todo o estado: layout do grid, sessões, scrollback dos terminais, timeline, entidades de lifecycle e vínculos.
- **FR11:** Ao reabrir o app (fechamento normal ou crash), o sistema deve restaurar integralmente o estado anterior, incluindo reconexão/relançamento dos terminais com seu contexto.
- **FR12:** Após recuperação de crash, o sistema deve apresentar um resumo do que estava em andamento (agentes ativos, tarefas, últimas decisões).
- **FR13:** O sistema deve gerenciar entidades de trabalho (tarefas) com estados de lifecycle: planejada → em execução → aguardando decisão → revisada → concluída.
- **FR14:** Cada tarefa deve poder ser vinculada a um ou mais terminais/agentes, e o vínculo deve ser visível na sessão master e na tarefa.
- **FR15:** Pontos de decisão humana (aprovar / rejeitar / redirecionar) devem ser registrados na timeline com autor, timestamp e justificativa opcional.

### Non Functional

- **NFR1:** Aplicação desktop local-first; nenhum dado de sessão, código ou credencial sai da máquina do usuário.
- **NFR2:** Windows 10/11 é a plataforma primária de suporte; arquitetura não deve impedir portabilidade futura para macOS/Linux.
- **NFR3:** Render de terminal fluido (sem lag perceptível de digitação) com ≥ 6 PTYs ativos em hardware modesto (referência: máquina de desenvolvimento Windows 10 do fundador).
- **NFR4:** Time-to-resume < 10 segundos: da abertura do app à retomada completa do trabalho.
- **NFR5:** Session survival rate de 100%: nenhum cenário de fechamento (normal ou crash) pode resultar em perda de estado persistido.
- **NFR6:** Adapters não devem interceptar, armazenar ou logar credenciais dos CLIs; autenticação permanece nos próprios CLIs ("bring your own subscription").
- **NFR7:** O core (session manager, state store, lifecycle engine) não pode ter dependência de provider específico; toda especificidade vive nos adapters.
- **NFR8:** Persistência incremental sem degradar performance dos terminais (gravação assíncrona/batched, nunca bloqueante do input do usuário).
