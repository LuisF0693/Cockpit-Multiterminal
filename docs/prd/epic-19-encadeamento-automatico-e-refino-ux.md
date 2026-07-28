# Epic 19 — Encadeamento Automático & Refino de UX

**Formalizado:** 2026-07-27 (retroativo — o épico foi executado direto a partir de um briefing verbal do fundador, sem passar pelo ciclo `@sm *draft` → `@po *validate`).
**Status:** ENTREGUE — commits `dc43496`..`b2d0ee7` em `main`, versão instalada `0.2.1`.
**Origem:** lista de 7 pendências ditadas pelo fundador numa única sessão, triadas em 2 ondas via `AskUserQuestion`.

---

## Problema

O fundador não conseguia operar o Cockpit como orquestrador. Nas palavras dele:

> "o conector disponível do cockpit só despacha um novo worker, ele não expõe uma forma de enviar uma tarefa para um tile já aberto e linkado. Não vou duplicar os seus agentes abrindo outros. (…) quando ele terminar o orquestrador já saber que terminou de forma automática (…) não preciso ficar falando que terminou ou apertar enter, vou entrar só para tomar decisões."

Ou seja: o `agent-dispatch` (Épico 17) só sabia **criar** worker, e o fim de turno não fechava o loop sozinho. O humano era o barramento de mensagens entre os próprios agentes.

## Escopo entregue

| # | Pendência | Onde |
|---|---|---|
| 1 | Entregar tarefa em tile JÁ ABERTO + término automático | `deliver-task` no daemon, `--to-session`/`--to-agent`/`--list-sessions` na CLI, injeção real no PTY em `session-ipc` |
| 2 | Terminal novo nasce no cwd do projeto ativo | `resolveDispatchCwd` na CLI (o caminho da UI já estava correto — Story 8.3) |
| 3 | Ctrl+C / Ctrl+V funcionando | `terminal-clipboard.ts` + handlers em `terminal-view.tsx` |
| 4 | Codex não criava a tarefa do agente | instrução inicial por argv posicional (`buildCodexArgs`) |
| 5 | Fila de Decisões com deep-link e hierarquia visual | `decision-queue.ts` + assinatura de `onGatePend` no `App.tsx` |
| 6 | Zoom não borra o terminal | contra-escala do conteúdo (`terminalContentScale`) |
| 7 | Emojis → ícones profissionais | `icons.tsx` sobre `lucide-react`, varredura completa da UI |
| 8 | *(adicional)* Corpo do tile vira superfície lisa em zoom baixo | `terminalContentVisible` + `frozen` no `TerminalView` |

## Requisitos derivados

- **FR64** — Um agente/chefe DEVE conseguir entregar tarefa a uma sessão viva do daemon sem criar sessão nova, identificando o alvo por id ou por label.
- **FR65** — Alvo ocupado DEVE enfileirar a tarefa e recebê-la quando voltar a ficar ocioso, uma por vez; alvo em erro DEVE recusar em vez de prometer entrega.
- **FR66** — Vínculo em `mode: 'auto'` DEVE injetar a instrução no PTY do alvo ao fim do turno da origem, sem intervenção humana. `mode: 'gate'` DEVE reter até o APPROVE.
- **FR67** — Toda pendência que exige verificação humana DEVE aparecer na fila de Decisões com deep-link para o contexto que a originou.
- **FR68** — O conteúdo do terminal NUNCA é escalado por CSS: variação de zoom vira variação de cols/rows, e abaixo do piso de legibilidade o corpo vira superfície lisa.

## O que a execução revelou (e não estava previsto)

Três defeitos **anteriores a este épico** foram descobertos porque a validação exigiu CLI real:

1. **Codex e Grok nunca receberam `initialInstruction`.** Como `codex` é a primeira escolha em `review-planning` (`agent-dispatch.ts`), **todo despacho de revisão/planejamento nascia mudo** desde o Épico 17.
2. **Claude Code nunca reportou fim de turno.** O hook de status era mutilado pelo Git Bash (ver decisão crítica 6), o adapter degradava para process-only e o tile travava em `working` para sempre — sintoma que o fundador via na tela sem saber a causa.
3. **O roteamento automático de revisão (Stories 7.2/7.4, marcadas Done) provavelmente nunca funcionou de fato** para alvos de TUI nativo, pela mesma causa de submissão. Corrigido de carona; **o fluxo SDC especificamente não foi revalidado.**

## Lição de processo

A Onda 1 passou `typecheck`, ~400 testes e lint — **e o recurso não funcionava.** Os testes de integração usavam adapter fake, que emite `waiting-input`/`done` sob demanda; nenhuma CLI real se comporta assim. O teste validava o mock, não o mundo.

O que pegou foi um E2E com Codex real, pedido pelo fundador. Daí a regra que passou a valer (ver `docs/architecture/decisao-critica-6-entrega-de-instrucao-no-pty.md`): **recurso que escreve no PTY só conta como pronto com smoke de CLI real.**

## Pendências conhecidas

- **`grok`, `gemini-cli`, `antigravity`, `ollama` sem cobertura.** Decisão do fundador: "só os que eu uso de verdade, primeiro o claude e o codex". `grok` recebeu a correção de argv junto do Codex mas **não tem smoke**; os demais não foram tocados. Qualquer um que seja TUI nativo tem a mesma Causa A esperando.
- **`--to-agent` só resolve tiles despachados pela CLI** — tile aberto pela UI chega ao daemon sem `label`. Contorno: `--list-sessions` + `--to-session <id>`. Fechar exige um comando `set-label` no protocolo.
- **Gates de vínculo não são persistidos nem escopados por projeto** — somem no restart e aparecem fora do filtro de projeto ativo (reter pendência humana invisível seria pior).
- **Itens 3, 5, 6 e 7 não foram validados com o app rodando** — passam nos testes, mas nitidez de fonte, menu de contexto e deep-link precisam do olho do fundador.
- **Menu nativo da aplicação não existe** (`Menu.setApplicationMenu` nunca é chamado) — o app depende do menu default do Electron para os accelerators de edição.
- **Fluxo SDC (7.2/7.4) não revalidado** após a correção de submissão.

## Decisões do fundador nesta leva

| Decisão | Escolha |
|---|---|
| Comportamento do zoom | Canvas mantém zoom; o **conteúdo do terminal nunca escala** |
| Ordem de entrega | 2 ondas — pipeline (1,2,4) antes de UX (3,5,6,7) |
| Biblioteca de ícones | `lucide-react` |
| Cobertura de adapters | Só `claude-code` e `codex` |
| Corpo do tile em zoom baixo | Superfície lisa, referência visual: AIOX Cockpit |
