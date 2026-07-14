# Epic 1 — Fundação & Multi-Terminal

Estabelecer o projeto (monorepo, app desktop, CI local) e entregar valor imediato: um multi-terminal utilizável com PTYs reais e layout que sobrevive a restart. Inclui o spike ConPTY que desriscara todo o produto.

### Story 1.1 — Scaffold do projeto e janela desktop

As a desenvolvedor multi-agente,
I want abrir uma aplicação desktop "Meu Cockpit" instalável na minha máquina Windows,
so that eu tenha a fundação sobre a qual todo o cockpit será construído.

#### Acceptance Criteria

1. Monorepo criado com `packages/` (core, ui, app no mínimo), TypeScript, lint e typecheck configurados e passando.
2. App desktop abre uma janela com tela inicial (canary page) exibindo nome e versão.
3. Resultado do spike ConPTY documentado em `docs/architecture/` com a decisão de shell (Electron/Tauri) e biblioteca PTY registrada pelo @architect.
4. `npm run dev`, `npm run build`, `npm test`, `npm run lint` funcionais na raiz.
5. CI local mínimo (script de verificação) executa lint + typecheck + testes.

### Story 1.2 — Primeiro terminal PTY real

As a desenvolvedor multi-agente,
I want abrir um terminal totalmente interativo dentro do app,
so that eu possa executar qualquer CLI (shell, git, node) sem sair do cockpit.

#### Acceptance Criteria

1. Terminal renderizado (xterm.js ou equivalente decidido no spike) conectado a um PTY real do sistema.
2. Programas interativos TUI (ex.: `vim`, um CLI agêntico) funcionam corretamente, incluindo cores, cursor e resize.
3. Digitação sem lag perceptível; resize da janela redimensiona o PTY corretamente.
4. Fechar o terminal encerra o processo PTY sem processos órfãos.

### Story 1.3 — Grid de múltiplos terminais

As a desenvolvedor multi-agente,
I want criar, nomear, redimensionar e fechar vários terminais em um grid,
so that eu opere múltiplos CLIs lado a lado em um único app.

#### Acceptance Criteria

1. Usuário cria novos terminais (botão e atalho), cada um com PTY independente.
2. Terminais podem ser nomeados/renomeados e exibem cabeçalho com nome.
3. Grid permite reorganizar e redimensionar tiles; ≥ 6 terminais simultâneos estáveis e interativos (NFR3).
4. Fechar tile individual não afeta os demais.
5. Atalhos de teclado para alternar foco entre terminais.

### Story 1.4 — Persistência de layout e sessões (fundação)

As a desenvolvedor multi-agente,
I want que o app reabra com o mesmo layout e terminais da última sessão,
so that eu não reconstrua meu ambiente a cada restart.

#### Acceptance Criteria

1. Layout do grid (quantidade, nomes, posições, tamanhos dos terminais) persiste localmente de forma contínua e assíncrona (NFR8).
2. Ao reabrir o app, o layout é restaurado e os terminais são relançados nos mesmos diretórios de trabalho.
3. Scrollback de cada terminal é persistido e restaurado (limite configurável).
4. Teste de integração automatizado cobre o ciclo persistir → fechar → restaurar.
