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
- **FR16:** Cada terminal vinculado a uma tarefa deve poder receber um papel (escritor ou revisor); uma tarefa em modo "three-brain" tem exatamente 1 escritor e no mínimo 2 revisores.
- **FR17:** Quando o agente escritor de uma tarefa em modo three-brain sinalizar conclusão (status done/waiting-input), o sistema deve rotear automaticamente uma instrução de revisão a todos os revisores vinculados, sem ação humana.
- **FR18:** As saídas mais recentes de cada revisor devem ficar visíveis lado a lado num painel de revisão vinculado à tarefa, junto do resultado do escritor.
- **FR19:** Rejeitar uma revisão (fluxo humano existente, FR15) devolve a tarefa ao escritor com o feedback agregado dos revisores anexado como instrução de correção automática.
- **FR20:** O ciclo three-brain deve reusar o lifecycle de tarefa existente (FR13) e os pontos de decisão humana (FR15) — nenhuma máquina de estados nova, só orquestração sobre o que já existe.
- **FR21:** O sistema deve permitir cadastrar múltiplos projetos (nome, cor, caminho raiz no disco) e alternar entre eles a partir de uma barra lateral.
- **FR22:** O projeto ativo deve determinar o cwd de novos terminais e escopar quais sessões, tarefas e workspaces são exibidos no canvas.
- **FR23:** O sistema deve exibir uma árvore navegável de arquivos/pastas do projeto ativo, com preview de leitura de arquivos de texto.
- **FR24:** Projetos cadastrados devem persistir entre reinicializações do app (mesma garantia do FR10).
- **FR25:** O sistema deve permitir vincular um terminal a outro terminal diretamente, independente de vínculo com tarefa, para que o agente de origem possa comandar o terminal alvo.
- **FR26:** Um vínculo terminal-a-terminal deve permitir envio manual de instrução (via master/canvas) e roteamento automático quando o terminal de origem mudar de status (mesmo padrão do FR17, generalizado para fora do contexto de tarefa/three-brain).
- **FR27:** Vínculos terminal-a-terminal devem ser visíveis no canvas (indicação visual da conexão) e na sessão master, e persistir entre reinicializações (mesma garantia do FR10).
- **FR28:** O sistema deve exibir um painel de preview de browser embutido, navegável por URL.
- **FR29:** O preview de browser deve ser controlável via Playwright, permitindo que agentes automatizem navegação e interação nele.

### Non Functional

- **NFR1:** Aplicação desktop local-first; nenhum dado de sessão, código ou credencial sai da máquina do usuário.
- **NFR2:** Windows 10/11 é a plataforma primária de suporte; arquitetura não deve impedir portabilidade futura para macOS/Linux.
- **NFR3:** Render de terminal fluido (sem lag perceptível de digitação) com ≥ 6 PTYs ativos em hardware modesto (referência: máquina de desenvolvimento Windows 10 do fundador).
- **NFR4:** Time-to-resume < 10 segundos: da abertura do app à retomada completa do trabalho.
- **NFR5:** Session survival rate de 100%: nenhum cenário de fechamento (normal ou crash) pode resultar em perda de estado persistido.
- **NFR6:** Adapters não devem interceptar, armazenar ou logar credenciais dos CLIs; autenticação permanece nos próprios CLIs ("bring your own subscription").
- **NFR7:** O core (session manager, state store, lifecycle engine) não pode ter dependência de provider específico; toda especificidade vive nos adapters.
- **NFR8:** Persistência incremental sem degradar performance dos terminais (gravação assíncrona/batched, nunca bloqueante do input do usuário).
- **NFR9:** Playwright é a única exceção ao NFR1 de dependências mínimas do core — dependência externa nova, confinada ao processo de preview de browser (Épico 10), nunca importada por core/shared (mesmo isolamento de provider do NFR7).
