# Meu Cockpit — Histórico do Produto (Épicos 1-15)

> Documento consolidado gerado em 2026-07-16. Fonte de verdade detalhada:
> `docs/prd/` (épicos e requisitos FR1-FR58) e `docs/stories/` (56 stories
> com acceptance criteria, decisões e gates de QA). Este guia é o resumo
> executivo de TUDO que foi construído.

## O que é

**Meu Cockpit** é uma central de controle desktop (Electron, Windows-first,
100% local) para orquestrar MÚLTIPLOS terminais com agentes de IA (Claude
Code, Codex, Grok, Gemini CLI, Antigravity, Ollama) ao mesmo tempo, num
canvas infinito com projetos, tarefas, vínculos entre terminais e memória
persistente — os terminais **sobrevivem ao app** (daemon próprio).

- **Repositório:** `github.com/LuisF0693/Cockpit-Multiterminal` (main = PRs #1-#10)
- **Instalado em:** `%LOCALAPPDATA%\Programs\Meu Cockpit\Meu Cockpit.exe` (atalhos no Menu Iniciar e Desktop)
- **Instalador:** `apps/desktop/release/MeuCockpit-Setup-0.1.0.exe` (cópia em `Downloads\`)
- **Rodar em dev:** `pnpm dev` · **Qualidade:** `pnpm verify` + `pnpm --filter @cockpit/desktop smoke:daemon`
- **Números:** 15 épicos · 56 stories · FR1-FR58 + NFR1-NFR9 · **250 testes** · 100 commits

## Arquitetura em uma tela

```
apps/desktop        Electron (Main = dono de fs/git/dialog/safeStorage; renderer nunca toca I/O)
packages/core       SessionRegistry, TaskManager, TerminalLinkManager, BrowserTileManager,
                    LearningManager, PersistenceManager (SQLite WAL + WriteQueue), sdc-routing puro
packages/pty-host   PTYs reais (node-pty/ConPTY) em utilityProcess OU DAEMON standalone
                    (named pipe, framing versionado) — terminais sobrevivem ao app
packages/adapters   8 adapters sob um contrato único (spawn/IO/status idle→working→
                    waiting-input→done→error); NFR7: core/UI nunca importam adapters
packages/ui         Design system (tokens vivos por CSS variables) + todas as telas
packages/shared     Schemas Zod dos canais IPC (validação nas DUAS bordas)
```

**Princípios que valem em tudo:** estado persiste continuamente (nada se
perde em crash — NFR5); decisões de roteamento são funções PURAS testáveis,
efeitos só no Main; só o renderer escreve em PTY; validação Zod em toda
borda; nenhum dado sai da máquina (NFR1).

## Linha do tempo dos épicos

| # | Épico | Entrega (resumo) |
|---|-------|------------------|
| 1 | Fundação Multi-Terminal | Grid de PTYs reais (6+ simultâneos), spike ConPTY, persistência de layout/scrollback em SQLite |
| 2 | Adapters & Agentes | Contrato de adapter + Claude Code/Codex/Grok/Shell/CMD com status em tempo real; realce âmbar de waiting-input |
| 3 | Sessão Master | Dashboard agregado ("conductor"), instruções a qualquer terminal, timeline auditável, relatórios de sessão, workspaces |
| 4 | Persistência Total | WriteQueue robusta (bug real de perda corrigido), time-to-resume medido, Recovery Screen pós-crash |
| 5 | Lifecycle & Governança | Tarefas com estados, vínculo tarefa↔terminal, decisões humanas auditáveis (aprovar/rejeitar/redirecionar), Lifecycle Board com drag-and-drop |
| 6 | Daemon de Terminais | PTY host como daemon standalone (named pipe) — fechar o app NÃO mata os terminais; adoção no boot, reconexão com backoff |
| 7 | SDC & Three-Brain | Papéis escritor/revisor, roteamento AUTOMÁTICO de revisão (1 escreve, 2+ revisam), painel lado a lado, ciclo de correção com feedback agregado |
| 8 | Multi-Projetos | Entidade Projeto (nome/cor/pasta real), escopo por projeto, explorador de arquivos estilo Cursor (gitignore-aware) |
| 9 | Vínculo Terminal-a-Terminal | Um agente comanda outro terminal (manual ou automático por status), visível no canvas |
| 10 | Browser Preview & Playwright | Tile de preview web (Chromium headless), navegação + automação por seletor CSS |
| 11 | Learnings Globais | Banco de aprendizados FORA dos projetos (gotchas/decisões/padrões), qualificação humana draft→reviewed→reusable |
| 12 | Identidade Visual & Canvas | Sidebar unificada + preview Markdown, vínculo por arraste (Alt+drag), cor por projeto/agente, minimapa, adapters Gemini/Antigravity/Ollama, zoom, PromptModal (fix do window.prompt) |
| 13 | Refinamento Visual | Design tokens (theme.ts), status bar com branch git (lida de .git/HEAD no Main), catálogo de agentes com disponibilidade no PATH, tela de Configurações persistida |
| 14 | **Visual Multerminal** | Reconstrução sobre o MOCKUP do fundador: paleta quase-preta mono, shell de layout (header/sidebar em seções/telemetria/rodapé de cards), **canvas infinito pan+zoom com ZONAS por projeto**, tiles com pontos de conexão + links bezier ANIMADOS com remoção no canvas, painel de preview 520px |
| 15 | **Painéis & Configurações OmniRift** | Resize por arraste nos 3 painéis, zoom out 15%, **TEMA VIVO** (CSS variables: Escuro/Claro/Meia-noite, 7 destaques, fontes — aplica na hora, xterm junto), janela de Configurações em overlay (Geral/Privacidade/Aparência), **Central de API** (chaves no keychain/DPAPI, nunca texto plano), toolbar de ícones com ações reais, painéis colapsáveis, sidebar com glifos coloridos |

## Como as peças conversam (fluxos-chave)

- **Criar terminal:** sidebar NOVO AGENTE / toolbar / Ctrl+N → Main resolve projeto ativo (cwd = pasta do projeto) → adapter spawna o CLI → status flui pro tile/master/telemetria.
- **Fechar o app:** daemon segue vivo com os PTYs; reabrir ADOTA as sessões (com replay de transcript) em <1s.
- **Three-brain:** tarefa com 1 escritor + 2 revisores → escritor conclui → revisores recebem instrução de revisão AUTOMÁTICA → humano aprova/rejeita → rejeição devolve ao escritor com feedback agregado.
- **Vincular terminais:** arrastar um ponto da borda do tile (ou Alt+drag) até outro → bezier animado com etiqueta; × no meio remove; modo auto roteia por status.
- **Trocar tema:** ⚙ → Aparência → clique = CSS variables trocam no :root + xterm re-tematiza + persistido.

## Decisões estruturais que explicam o código

1. **Daemon separado da GUI** (E6) — decisão crítica da visão: terminal não pode morrer com o app.
2. **Decisão pura vs. efeito** (E7+) — todo roteamento (`planSdcReviewRouting`, `planTerminalLinkRouting`…) é função pura em core; o Main só executa o plano.
3. **Tiles nunca desmontam** (E1/E3) — xterm+MessagePort morrem no unmount; filtros são sempre CSS-hide.
4. **Tokens-first** (E13) → **CSS variables** (E15): a tokenização de 264 hexes espalhados foi o que deixou trocar TODO o visual (E14) e depois torná-lo VIVO (E15) barato.
5. **Só dados reais** (E14/E15) — nenhuma superfície sem funcionalidade por trás (custos $, MCP Agents etc. ficam fora até existirem).
6. **Chaves no keychain** (E15) — safeStorage/DPAPI; cadastro recusado se o keychain não estiver disponível; a chave nunca volta ao renderer.

## Pendências conhecidas (aguardando o fundador)

- **Validação visual** dos Épicos 14-15 (tema claro em especial) — tudo mais é CONCERNS aprovado com esse único ressalvo.
- **Elicitações:** painel "MCP Agents", "Mapa do código"/comparar/limpar grafo, adapter "Hermes" (comando real nunca confirmado), i18n English.
- **Débitos técnicos:** crash FATAL de teardown do Chromium ao fechar (raro, no encerramento — investigar/upgrade Electron); userData em `%APPDATA%\@cockpit\desktop` (migração exige story própria por causa do daemon); alinhamento fino do schema de zoom (0.15-2 vs clamp 0.15-1.6).

## Gotchas de ambiente (Windows, esta máquina)

- Antivírus dá "Permission denied" transiente em `.git/objects` — retry (arquivo a arquivo se preciso).
- `pnpm verify` NUNCA em paralelo com `pnpm dist` (turbo compartilha out/).
- Antes de `pnpm dist`: fechar processos `Meu Cockpit` (instalado E win-unpacked) — seguram `app.asar`.
- `git checkout` entre branches pode estourar timeout — preferir `git branch -f` p/ sincronizar ponteiros.
- node-pty no Windows usa CreateProcess: comandos de adapter precisam de EXTENSÃO explícita (`claude.cmd`, `agy.exe`).
- `window.prompt` não existe no Electron — sempre `PromptModal`.
