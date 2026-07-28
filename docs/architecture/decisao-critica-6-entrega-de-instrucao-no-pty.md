# Decisão crítica 6 — Entrega de instrução no PTY

**Data:** 2026-07-27 (Épico 19)
**Contexto:** o Cockpit precisa entregar instrução a um agente sem humano no meio — no nascimento da sessão (`initialInstruction`, FR7) e em sessão já viva (`deliver-task`, FR64).

Este documento existe porque **três defeitos independentes**, todos com o mesmo sintoma ("a instrução some"), custaram um dia inteiro de investigação. Nenhum deles era detectável por teste unitário.

---

## Regra 1 — A instrução inicial vai por **argv**, nunca por write no PTY

CLIs de TUI (Codex/Rust-ratatui, Claude Code/Node-Ink) **não têm composer montado** quando o PTY nasce. Escrever `${instrução}\r` logo após o spawn:

- no **Codex**, os bytes são descartados durante o boot — composer vazio;
- no **Claude Code**, o texto entra mas **o Enter se perde** — texto parado no composer.

Medido (env limpo, sem variáveis `CLAUDE*` herdadas):

| adapter | write no construtor | argv posicional |
|---|---|---|
| codex 0.145.0 | composer vazio após 22s | turno criado e respondido |
| claude-code 2.1.220 | texto parado, status `["starting"]` | submetido em 9-10s, `["starting","working","idle"]` |

**Use o argumento posicional nativo do CLI, atrás de `--`.** O `--` não é opcional: sem ele, instrução que começa com `-` vira opção e instrução que colide com subcomando (`review`, `resume`, `exec`, `agents`, `mcp`) vira comando.

Implementado em `buildCodexArgs` e `buildClaudeArgs`. O contrato (`packages/adapter-contract/src/index.ts`) documenta isso no campo `initialInstruction` — antes ele prometia uma "prontidão" que **nenhum adapter jamais implementou**, e era essa mentira que reproduzia o bug em cada adapter novo.

## Regra 2 — Em sessão viva, o CR pode precisar de **gap temporal**

Fora do boot o composer existe, mas TUIs distinguem *conteúdo colado* de *tecla digitada*. Colar texto multi-linha não pode disparar o turno no primeiro `\n`, então alguns tratam **qualquer Enter que chegue logo após uma colagem como nova linha**.

A janela é **temporal, não sintática** — nenhuma codificação de bytes escapa dela. Medido no Codex (bracketed paste + `\r` em write separado):

| gap | resultado |
|---|---|
| 0ms (`setImmediate`) | não submeteu (45s) |
| 20ms / 40ms | não submeteu |
| **70ms** | submeteu (11,8s) |
| 120ms | submeteu (3,1s) |

Piso real entre 40 e 70ms; adotado **250ms** (`CODEX_SUBMIT_GAP_MS`) — ~3,5x o piso, imperceptível num turno que leva segundos.

**O Claude Code NÃO precisa de gap** — `${texto}\r` num único write submete (2,6s). O Ink não tem essa janela. Por isso o valor mora **em cada adapter**, não no protocolo: é propriedade medida do CLI.

**Onde a correção mora:** no `AgentSession.write` do adapter, não no daemon. O daemon escreve a linha canônica `${texto}\r` e cada adapter traduz. Isso cobre de uma vez os três caminhos programáticos, que todos convergem ali:

- `daemon-server.ts` → `writeTaskLine` → `session.write`
- `session-ipc.ts` → `writePty` → `daemon-manager` → frame `data` → `session.write`
- `App.tsx` → `instructAgent` → MessagePort → `client.write` → `session.write`

O bracketed paste (`ESC[200~ … ESC[201~`) é mantido junto do gap: garante que instrução multi-linha (as do roteamento SDC são) vire um bloco só.

## Regra 3 — Comando de hook/notify **nunca** como string de shell

Três ocorrências da mesma classe de bug nesta leva:

| onde | o que quebrou |
|---|---|
| `notify` do Codex | o CLI anexa o payload JSON do evento; as aspas estouram o parsing do `cmd /c` |
| hooks do Claude Code | o hook roda sob **Git Bash** (`MSYSTEM=MINGW64`); o MSYS reescreve `/c` como `C:/`, o `cmd.exe` sobe **interativo** e despeja o próprio banner no arquivo de status |
| `rebuild-native.cjs` | `execFileSync` com `shell: true` concatena tudo; path sem aspas corta no espaço de `F:\Projetos\Projetos\Meu Cockpit` |

Prova do caso do MSYS:

```
$ cmd /c echo hello                     → "Microsoft Windows [Version ...]"
$ MSYS_NO_PATHCONV=1 cmd /c echo hello  → "hello"
```

**Padrão correto:** um `.cjs` invocado por `node`, com os dados variáveis embutidos via `JSON.stringify` (imune a barra invertida e espaço) e o resto por **argv** — vetor, sem shell no meio. Implementado em `buildNotifyScript` (codex) e `buildHookScript` (claude-code).

Corolário: o hook **não deve imprimir nada em stdout** — o stdout de hooks como `UserPromptSubmit`/`SessionStart` é injetado no contexto do agente.

## Regra 4 — `idle` significa "devolveu o turno", `starting` significa "nasceu"

O `HOOK_STATUS_MAP` mapeava **`SessionStart` e `Stop` ambos para `idle`**. A colisão fez `IDLE_AGENT_STATUSES` excluir `idle` por precaução — e junto foi o fim de turno legítimo, que é exatamente o sinal que `deliver-task` precisa. Resultado: `deliver-task` respondia `queued` para sempre em **qualquer tile de IA vivo**, e `flushPendingTask` nunca disparava.

Resolvido **na origem**: `SessionStart: 'starting'`, `Stop: 'idle'`, e `IDLE_AGENT_STATUSES = ['idle','waiting-input','done']`. `starting` fica de fora — medido: o hook roda **antes** de o CLI aceitar input.

Ao desambiguar status na origem, verifique o efeito em `status-colors.tsx`, `adapter-catalog.ts` e `decision-queue.ts` — um status novo não pode deixar buraco visual nem sumir com pendência da fila.

## Regra 5 — Só conta como pronto com **smoke de CLI real**

A Onda 1 do Épico 19 passou `typecheck`, ~400 testes e lint, **e não funcionava**. Os testes de integração usavam adapter fake, que emite `waiting-input`/`done` sob demanda; nenhuma CLI real faz isso.

Regras práticas para esses smokes:

- Ficam em `*.smoke.ts`, **fora** do `include` default do vitest (exclusão estrutural, não flag que alguém esquece). Rodam com `pnpm --filter @cockpit/pty-host smoke`.
- Pulam com mensagem clara quando o binário não está no PATH — CI limpo continua verde.
- **O ack `delivered` não é prova.** Ele só confirma que os bytes saíram, que é precisamente o que acontecia em todos os bugs acima. A prova é a resposta observada na saída do CLI.
- O *needle* da asserção **não pode aparecer no enunciado do prompt** — senão casa com o eco do próprio texto no composer e dá falso-positivo (aconteceu).
- Ao testar a partir de um agente rodando dentro do Claude Code, **remova as variáveis `CLAUDE*` herdadas** — elas contaminam a sessão filha e já fizeram um teste passar e depois falhar.

## Regra 6 — Quem entrega é o Main, e `terminalLinkRouted` é notificação

A Story 9.2 previa que só o renderer escrevesse na PTY (decisão crítica 4). **Invertido de propósito:** entrega pelo renderer morre com a janela fechada e não existe no daemon standalone (Épico 6) — o encadeamento pararia em silêncio, que é o oposto do requisito.

A decisão crítica 4 continua valendo no que ela protege: o **stream de dados** do terminal segue na MessagePort binária, fora do Main. Uma linha de instrução é **controle**, não dado.

Consequência a não esquecer: `terminalLinkRouted` é **notificação**. Quem consumir esse evento chamando `instructAgent` entrega a instrução **em duplicata** — foi um bug real, presente tanto no modo `gate` quanto no `auto`.

**Freio de ping-pong:** com injeção real, dois vínculos `auto` recíprocos (A→B, B→A) viram loop infinito de agentes se instruindo. `chargeAutoDeliveryBudget` limita injeções automáticas por alvo numa janela de tempo; estourou, para de injetar e a UI segue notificada.

---

## Ver também

- `docs/guides/writing-an-adapter.md` — checklist para adapter novo
- `docs/architecture/decisao-critica-3-adapter-contract-nfr7.md` — contrato de adapter
- `docs/architecture/decisao-critica-4-ipc-tipado.md` — separação controle/dados
- `docs/prd/epic-19-encadeamento-automatico-e-refino-ux.md` — o épico que originou estas regras
