# Epic 20 — Continuidade de Agente

**Formalizado:** 2026-07-31 (junto da execução, a partir de pedido verbal do fundador no terminal).
**Status:** ENTREGUE (Stories 20.1/20.2/20.3) — `pnpm verify` verde; **validação com CLI real pendente do fundador** (ver Pendências).
**Origem:** um pedido único do fundador, com três decisões de design tomadas por ele via `AskUserQuestion`.

---

## Problema

Nas palavras do fundador:

> "Ele abre o mesmo agente para executar a tarefa. Por exemplo, a gente já tem o agente de dev que fez o trabalho, ele está lá no terminal, porém quando na orquestração pede para usar o dev, ele abre outro dev — ele poderia continuar com o dev que está lá já!"

O Épico 19 deu à CLI o caminho para falar com um tile aberto (`--to-session` / `--to-agent`), mas **o despacho normal continuou sempre criando**. Duas causas somadas:

1. **Reuso era só um aviso.** A Story 18.1 fechou com AC5 "nunca bloqueia o despacho": `findIdleCandidate` imprimia *"considere reusar"* no stderr e o worker novo nascia do mesmo jeito. Todo contexto acumulado no agente anterior ficava para trás.
2. **O tile da UI era anônimo no daemon.** `label` só era preenchido por cliente externo (`agent-dispatch`, 17.1). Tile aberto pelo Cockpit chegava ao daemon sem nome e a renomeação nunca atravessava o processo — então nem `--to-agent` nem qualquer casamento por identidade enxergava o "@dev" do fundador. Já constava como pendência conhecida do Épico 19 ("fechar exige um comando `set-label` no protocolo").

## Escopo entregue

| Story | Entrega | Onde |
|---|---|---|
| 20.1 | `set-label` no protocolo — nome do tile propagado UI→daemon na criação e em toda renomeação | `daemon-protocol.ts`, `daemon-server.ts`, `daemon-client.ts`, `daemon-manager.ts`, listener em `session-ipc.ts` |
| 20.2 | Reuso vira o PADRÃO do despacho; `--new` força worker novo | `planAgentReuse` (core, puro) + caminho de reuso em `agent-dispatch.ts` |
| 20.3 | Agente ocupado vira pergunta na fila de Decisões, com fallback que nunca perde a tarefa | relay `dispatch-choice-*` no daemon, poll no Main, `dispatch-choice` na `buildDecisionQueue`, ações no `MasterDashboard` |

## Requisitos derivados

- **FR69** — O despacho por identidade de agente DEVE reusar um tile vivo com esse nome no mesmo projeto antes de criar worker novo; `--new` é o escape explícito.
- **FR70** — `--adapter` explícito divergente do adapter do tile vivo DEVE criar worker novo: escolher a CLI é escolha consciente do chefe (protocolo do E17).
- **FR71** — Dois tiles com o mesmo nome DEVEM abortar o despacho pedindo `--to-session`, nunca escolher um deles.
- **FR72** — Agente alvo OCUPADO DEVE abrir pendência na fila de Decisões (enfileirar × abrir outro worker); sem Cockpit conectado, a tarefa DEVE ir para a fila do próprio agente em vez de virar pendência invisível.
- **FR73** — O nome do tile DEVE ser conhecido pelo daemon, seja ele criado pela UI ou pela CLI.

## Decisões do fundador nesta leva

| Decisão | Escolha | Consequência no código |
|---|---|---|
| Política de reuso | Reuso é o padrão; `--new` força novo | `planAgentReuse` roda antes do loop de spawn |
| Agente ocupado | Pergunta na fila de Decisões | relay `dispatch-choice` no daemon + item `blocking` na fila |
| Adapter divergente | Adapter explícito vence — cria novo | filtro por `explicitAdapter` em `planAgentReuse` |

Duas decisões foram tomadas por mim, dentro do que o pedido implicava, e ficam registradas para revisão:

- **Escopo de projeto no reuso.** Um "@dev" aberto em outro repositório não é o mesmo colaborador — reusá-lo executaria a tarefa no lugar errado. Vale a mesma invariante do vínculo automático (17.2, "mesmo projeto"). Comparação por caminho normalizado, não string crua (Windows mistura `\` e `/` e ignora caixa).
- **Fallback sem Cockpit aberto.** Se ninguém está conectado ao daemon, não existe fila para perguntar; segurar a pendência seria o sumiço silencioso que o Épico 19 existiu para eliminar. A CLI enfileira no próprio agente e avisa no stderr. O daemon distingue app de CLI pelo `configure` — só o Main o envia.

## O que a execução revelou (e não estava previsto)

**"Nenhum adapter de IA disponível" abortava o despacho antes de considerar o reuso.** A checagem de candidatos vinha primeiro, e candidato é o que se usaria para *nascer* worker — com o "@dev" vivo na tela, um daemon sem CLI de IA registrada fazia o despacho falhar em vez de entregar no agente que já existia. O erro foi movido para logo antes do loop de spawn, onde criar é de fato o único caminho restante.

## Pendências conhecidas

- **Validação com CLI real não foi feita.** A regra da [decisão crítica 6](../architecture/decisao-critica-6-entrega-de-instrucao-no-pty.md) é que recurso que escreve no PTY só conta como pronto com smoke de CLI real. O reuso reaproveita o `deliver-task` já validado com claude-code e codex, e os 8 casos de integração usam daemon/PTY reais — mas o fluxo completo (despachar "@dev" com um Claude Code de verdade aberto) ainda não passou pelo olho do fundador. **É a primeira coisa a fazer na próxima sessão dentro do Cockpit.**
- **Reuso não cria vínculo worker→chefe.** O vínculo automático (17.2) nasce na ADOÇÃO de sessão nova; reusar um tile existente não passa por lá. Se aquele tile ainda não estiver vinculado ao chefe, o término dele não instrui o chefe sozinho — a CLI avisa no stderr quando isso pode acontecer. Fechar exige um pedido de vínculo pelo mesmo relay criado na 20.3.
- **Escolhas de despacho não são persistidas** (mesma natureza dos gates de vínculo): somem se o daemon reiniciar. Teto de 16 pendências simultâneas; estourou, a CLI volta a enfileirar sozinha.
- **Daemon ANTIGO em execução ignora `set-label`** (ele sobrevive a upgrades do app; só morre com `cockpit-daemon --stop`). Nesse caso o tile da UI volta a ser anônimo e o reuso não casa — o despacho cria worker novo, exatamente como antes desta leva.
- **A UI da pergunta não foi vista rodando** — os dois botões ("enfileirar" / "abrir outro") passam nos testes da fila, mas o visual no rodapé/dashboard depende do olho do fundador.
