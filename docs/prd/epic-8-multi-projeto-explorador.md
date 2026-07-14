# Epic 8 — Multi-Projetos & Explorador de Arquivos

Generalizar o Cockpit de "um projeto implícito com workspaces internos" (Story
3.6) para "vários projetos DE VERDADE" — cada um com seu próprio caminho raiz
no disco — com uma barra lateral para cadastrar/alternar entre eles e uma
árvore de arquivos navegável do projeto ativo, estilo Cursor/VS Code.

> **Formalização 2026-07-14 (@pm, spec pipeline):** extensão da visão do
> fundador capturada via briefing direto com 4 capturas de tela de referência
> (`docs/prd/visao-do-fundador-cockpit-aiox.md`, seção "Extensão da visão").
> FR21-24 adicionados a `requirements.md`. Base estrutural dos Épicos 9 e 10
> (ambos penduram em cima do conceito de projeto). Complexidade: STANDARD.
>
> **Decisão de design deliberada:** "projeto" (Épico 8) e "workspace" (Story
> 3.6) são conceitos DIFERENTES e ambos permanecem — projeto é o caminho raiz
> no disco (onde `git`/CLIs rodam); workspace continua sendo o agrupamento
> livre de tiles DENTRO de um projeto (ex.: "Geral", "Marketing"). Um projeto
> tem N workspaces; um workspace pertence a exatamente 1 projeto. Isso evita
> reescrever o que a 3.6 já resolveu (rename, `Geral` indelével, filtro de
> canvas) — só adiciona uma camada acima.
>
> **Escopo deliberadamente mínimo no explorador de arquivos:** leitura apenas
> (preview de texto). Edição de arquivos pelo humano direto no Cockpit NÃO é
> AC desta epic — os CLIs/agentes já editam arquivos; o explorador existe para
> DAR VISIBILIDADE ao humano, não para competir com um editor de código.

### Story 8.1 — Entidade Projeto (cadastro, persistência, ativo)

As a desenvolvedor multi-projeto,
I want cadastrar projetos com nome, cor e caminho raiz no disco,
so that eu possa organizar meu trabalho por projeto real, não só por rótulo dentro de um único repo.

#### Acceptance Criteria

1. Um projeto tem `id`, `name`, `color` e `rootPath` (caminho absoluto validado no disco).
2. O sistema mantém um projeto "ativo" por vez (análogo ao workspace ativo da 3.6); a primeira execução do app cria um projeto "Padrão" apontando para o cwd atual (sem quebrar instalações existentes).
3. Projetos persistem entre reinicializações (mesma garantia do FR10/app_meta) e sobrevivem a crash (mesma trilha de recuperação da 4.x).
4. CRUD básico (criar, renomear, trocar cor, remover — exceto o último projeto restante) exposto via IPC com Zod na borda (mesmo padrão de workspace da 3.6).

### Story 8.2 — Barra lateral de projetos + escopo do canvas

As a desenvolvedor multi-projeto,
I want uma barra lateral com todos os projetos cadastrados e alternar entre eles,
so that eu veja só os terminais/tarefas/workspaces do projeto em que estou focado.

#### Acceptance Criteria

1. Barra lateral lista todos os projetos (nome + cor) com o ativo destacado; clicar troca o projeto ativo.
2. Trocar de projeto escopa o canvas, a sessão master, o TasksPanel e o LifecycleBoard para mostrar só sessões/tarefas/workspaces do projeto ativo (mesmo princípio de filtro sem desmontar tiles já usado no workspace da 3.6 — trocar de projeto NÃO mata terminais de outros projetos).
3. Workspaces (3.6) do projeto ativo continuam funcionando exatamente como hoje (seletor de workspace já existente, agora escopado ao projeto).
4. Criar um novo projeto oferece um seletor de pasta (diálogo nativo do SO) para o `rootPath`.

### Story 8.3 — Novo terminal nasce no projeto ativo

As a desenvolvedor multi-projeto,
I want que novos terminais nasçam automaticamente no diretório do projeto ativo,
so that eu não precise `cd` manualmente toda vez que troco de projeto.

#### Acceptance Criteria

1. `session.create` usa `rootPath` do projeto ativo como cwd quando nenhum cwd explícito é passado (reusa o campo `cwd` já existente no contrato de sessão desde o Épico 1).
2. Sessões existentes mantêm seu cwd original ao trocar de projeto ativo (troca de projeto não afeta terminais já abertos).
3. Terminal criado a partir da barra lateral de um projeto específico nasce nesse projeto mesmo que não seja o ativo no momento (atalho de conveniência).

### Story 8.4 — Explorador de arquivos do projeto ativo

As a desenvolvedor multi-projeto,
I want uma árvore navegável dos arquivos/pastas do projeto ativo com preview de leitura,
so that eu tenha visibilidade do que os agentes estão mexendo sem sair do Cockpit.

#### Acceptance Criteria

1. Painel lateral (paralelo ao canvas) exibe a árvore de diretórios do `rootPath` do projeto ativo, expansível/colapsável por pasta.
2. Clicar num arquivo de texto mostra seu conteúdo em modo leitura (sem edição — fora de escopo desta story).
3. Árvore respeita `.gitignore` do projeto quando presente (não lista `node_modules`, `.git`, etc. — ruído demais sem isso).
4. Leitura de diretório/arquivo acontece no Main (Node `fs`), nunca no renderer — mesmo princípio de fronteira de processo já usado em todo o app (contextIsolation, Zod na borda).
