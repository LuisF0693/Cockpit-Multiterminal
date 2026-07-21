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
- **FR30:** O sistema deve permitir registrar um "learning" (aprendizado) com texto livre, categoria e o projeto de origem — capturado manualmente pelo humano a partir da sessão master ou de uma tarefa.
- **FR31:** Learnings devem ser armazenados independentemente do ciclo de vida de um projeto — remover um projeto não remove os learnings originados nele.
- **FR32:** Learnings devem poder ser qualificados (rascunho → revisado → reutilizável) por decisão humana, mesmo princípio de ponto de decisão já usado em tarefas (FR15).
- **FR33:** O sistema deve permitir consultar/filtrar learnings (por categoria, projeto de origem, texto) numa tela dedicada, disponível independente de qual projeto está ativo.
- **FR34:** A barra lateral de projetos (FR21) deve exibir, junto de cada projeto, a árvore de arquivos do projeto ativo (FR23) numa única barra lateral sempre visível — sem exigir navegação a uma view separada.
- **FR35:** Ao selecionar um arquivo Markdown no explorador de arquivos, o sistema deve exibir um preview renderizado do conteúdo, além do modo texto puro já existente.
- **FR36:** O sistema deve permitir vincular dois terminais arrastando de um tile a outro diretamente no canvas, criando um vínculo terminal-a-terminal (reusa a entidade do FR25).
- **FR37:** Terminais do projeto ativo devem ter uma indicação visual (fundo/borda) com a cor do projeto (FR21), para identificar de relance a qual projeto cada terminal pertence.
- **FR38:** Cada adapter (FR3) deve ter uma identidade visual própria (cor/ícone) exibida no tile do terminal e na sessão master, para identificar de relance qual agente está rodando ali.
- **FR39:** O sistema deve incluir adapters funcionais para Gemini CLI (`gemini`) e Antigravity CLI (`agy`), seguindo o mesmo contrato de adapter já estabelecido (FR3).
- **FR40:** O canvas deve exibir um minimapa no canto mostrando a posição de todos os tiles, para navegação rápida em canvases com muitos terminais.
- **FR41:** O sistema deve ter um tema visual coeso definido por tokens centralizados (cores de superfície/texto/borda, tipografia, espaçamento, raios de borda, sombras) num módulo único do pacote de UI, aplicado a TODAS as superfícies (canvas, tiles, barras laterais, sessão master, painéis, modais) — nenhuma superfície com estilos divergentes hardcoded.
- **FR42:** O canvas deve ter uma toolbar compacta com as ações de canvas (novo terminal, novo preview de browser, zoom in/out/reset, alternar minimapa, alternar overlay de vínculos), com ícones e tooltips — consolidando controles hoje espalhados.
- **FR43:** O sistema deve exibir uma status bar global persistente (rodapé) com: projeto ativo, branch git do projeto, status do daemon, contagem de sessões ativas e decisões pendentes.
- **FR44:** O sistema deve detectar e exibir a branch git atual do projeto ativo (lida do repositório em `rootPath`), atualizando ao trocar de projeto e periodicamente — sem executar git no renderer (mesma fronteira Main/renderer do FR23).
- **FR45:** O sistema deve exibir um catálogo de agentes: painel listando todos os adapters com nome, descrição, cor de identidade (FR38), comando de spawn e disponibilidade no PATH (instalado / não encontrado).
- **FR46:** O sistema deve ter uma tela de Configurações dedicada com preferências do app (persistidas via a mesma infraestrutura do FR10), incluindo no mínimo: modelo default do Ollama, intervalo de atualização do preview de browser e escala de zoom padrão do canvas.
- **FR47:** O sistema deve adotar a identidade visual "Multerminal" do mockup de referência (`docs/prd/referencia-visual-multerminal.dc.html`): paleta quase-preta neutra (#0a0a0c…#151517), tipografia monoespaçada (JetBrains Mono) em TODA a interface, e os raios/bordas/acentos do mockup — substituindo os valores atuais dos tokens do FR41 (a arquitetura de tokens permanece).
- **FR48:** O layout do app deve seguir a estrutura do mockup: header compacto com abas e controle de zoom, barra de ferramentas, sidebar esquerda única em seções (projeto ativo, novo agente com descrições, projetos, arquivos, app & sistema, rodapé de build), painel direito de telemetria/eventos e rodapé com cards das sessões ativas — exibindo APENAS dados reais existentes (nada de custos/placeholders sem funcionalidade por trás).
- **FR49:** O canvas deve ser "infinito": navegação por pan (arrastar o fundo) + zoom, com um mundo transformado por translate+scale; terminais de TODOS os projetos visíveis simultaneamente, agrupados por ZONAS coloridas com etiqueta do projeto (o projeto ativo vira destaque e escopo de criação, não filtro de visibilidade).
- **FR50:** Os tiles e vínculos do canvas devem seguir o mockup: tile com barra de título compacta (prefixo `>_`, dot de status pulsante, badge do papel real, chip do adapter, maximizar/fechar) e rodapé com cwd; pontos de conexão nas 4 bordas (arrastar de um ponto a outro tile cria vínculo); vínculos desenhados como curvas bezier tracejadas ANIMADAS com etiqueta e botão de remoção no meio da linha.
- **FR51:** A seleção de um arquivo no explorador deve abrir um painel de preview dedicado (~520px) entre o canvas e o painel direito, com alternância Preview/Markdown para arquivos .md (reusa o renderizador do FR35) — substituindo o preview embutido na sidebar.
- **FR52:** Os três painéis laterais (sidebar esquerda, telemetria à direita, preview de arquivo) devem ser redimensionáveis por arraste na borda, com limites de largura e persistência (mesma infraestrutura do FR46).
- **FR53:** O zoom do canvas deve permitir afastar mais (mínimo 15%), para enxergar topologias grandes de uma vez.
- **FR54:** O sistema deve ter uma janela de Configurações em overlay com navegação lateral (estilo referência OmniRift): Geral (idioma — Português fixo, English "em breve"; preferências existentes do FR46), Privacidade (compromissos reais de NFR1/NFR6: 100% local, zero telemetria) e Aparência — seções sem funcionalidade real por trás (Conta, Feature flags, Memória & Conexões) NÃO aparecem.
- **FR55:** O tema deve ser VIVO: tokens expostos como CSS variables trocáveis em runtime — temas prontos (escuro Multerminal default, claro, e variações), cor de destaque selecionável, fontes de texto/mono selecionáveis, lista "todas as cores" com hex, preview imediato sem reiniciar e persistência (FR46); o xterm re-tematiza junto.
- **FR56:** O sistema deve ter uma Central de API para cadastrar providers de LLM (tipo, apelido, base URL, chave, modelo default) com a CHAVE criptografada pelo keychain do SO (Electron safeStorage) — nunca em texto plano; listar e remover cadastros. Nenhum adapter consome as chaves ainda (preparação para adapters cloud futuros; NFR6 preservado para os CLIs).
- **FR57:** O app deve ter uma barra de ferramentas de ícones abaixo do header (estilo referência) — cada ícone dispara uma AÇÃO REAL existente (novo terminal, novo browser, views, zoom reset etc.), com tooltip; nenhum ícone decorativo sem função.
- **FR58:** A sidebar deve adotar a identidade visual da referência (ícones coloridos por agente na seção NOVO AGENTE, quadrado colorido + fundo no item ativo em PROJETOS) e o rodapé de sessões + painéis laterais devem ser COLAPSÁVEIS, maximizando a área útil do canvas.

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

### Functional (Épico 18)

- **FR59:** Antes de despachar um novo worker, o sistema deve verificar se já existe uma sessão OCIOSA do mesmo adapter (e mesmo modelo, quando aplicável) disponível no daemon, avisando o chefe — reduzindo terminais duplicados desnecessários (reforça a instrução já existente no AGENTS.md com uma verificação real).
- **FR60:** O sistema deve oferecer um atalho de teclado que navegue, em ordem, entre os terminais em estado `waiting-input`/`error`, centralizando o canvas e focando o terminal alvo — funcional mesmo com pan/zoom e além do limite indexado do atalho existente (Ctrl+1..9).
- **FR61:** A regra "vínculo só é permitido entre terminais do mesmo projeto" (FR25) deve ter o MESMO comportamento de recusa tanto no vínculo manual quanto no automático (Épico 17, Story 17.2) — hoje divergem: um bloqueia com erro, o outro apenas registra aviso e segue.
- **FR62:** O sistema deve registrar um histórico de despachos de workers (quem despachou, agente, adapter, modelo, projeto, timestamp e desfecho quando disponível) — insumo factual para decisões futuras de roteamento, sem alterar a matriz de capacidades editável já existente automaticamente.
- **FR63:** O `--recommend` do despacho deve exibir, ao lado de cada candidato, um contador de desfechos históricos (quantas aprovações/rejeições) por adapter e categoria, calculado a partir do histórico do FR62 — dado bruto de apoio à decisão do chefe, nunca reordenando a matriz sozinho.
