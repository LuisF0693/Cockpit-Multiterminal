# Como escrever um adapter (Story 2.1)

> O adapter é a ÚNICA forma de integrar um CLI ao cockpit. O core nunca
> conhece providers (NFR7 — verificado por lint + `scripts/check-provider-isolation.mjs`).

## 1. Crie o package

```
packages/adapters/meu-cli/
├── package.json        # name: @cockpit/adapter-meu-cli
├── tsconfig.json       # extends ../../../tsconfig.base.json
└── src/
    ├── index.ts
    └── meu-cli-adapter.ts (+ .test.ts)
```

Dependências: `@cockpit/adapter-contract`, `@cockpit/shared` e o que o spawn exigir (`node-pty`).

## 2. Implemente o contrato (decisão crítica 3 — é LEI)

```typescript
import type { AgentAdapter, AgentSession, SpawnConfig } from '@cockpit/adapter-contract';

export class MeuCliAdapter implements AgentAdapter {
  readonly id = 'meu-cli';
  readonly displayName = 'Meu CLI';
  readonly statusStrategy = 'output-parsing'; // native-hooks > output-parsing > process-only

  async detectAvailability() { /* CLI no PATH? versão? autenticado? */ }
  async spawn(config: SpawnConfig): Promise<AgentSession> { /* PTY + wiring */ }
}
```

**Regras inegociáveis:**

| Regra | Detalhe |
|-------|---------|
| NFR6 credenciais | O spawn herda o ambiente do usuário. NUNCA receber/logar tokens. |
| Dispose sem órfãos | `dispose()` DEVE rejeitar se o processo resistir (o host reporta órfão). Use o padrão `process.kill(pid, 0)` pós-grace. |
| Status por camadas | Preferir hooks nativos do CLI; fallback de parsing com heurísticas TESTADAS por fixture; mínimo process-only (working → done/error). |
| Spawn injetável | Receba a função de spawn no construtor (default node-pty) — os unit tests usam fake. |

Use `packages/adapters/shell` como referência viva.

## 3. Registre no PTY Host

Em `packages/pty-host/src/host-entry.ts`:

```typescript
import { MeuCliAdapter } from '@cockpit/adapter-meu-cli';
registry.register(new MeuCliAdapter());
```

Adicione a dependência no `package.json` do pty-host e o alias em
`apps/desktop/electron.vite.config.ts` (main.resolve.alias) e `tsconfig.base.json`.

## 4. Pronto

O adapter aparece automaticamente no seletor da UI (via `adapter.list`),
a persistência relança sessões com ele no restore, e o status colore o
tile. Nada no core precisa mudar — se precisou, você furou o contrato.

## 5. Entrega de instrução — leia antes de escrever uma linha

**Esta seção existe porque três adapters já nasceram quebrados do mesmo jeito.**
O detalhe completo, com as medições, está em
[`decisão crítica 6`](../architecture/decisao-critica-6-entrega-de-instrucao-no-pty.md).
O resumo operacional:

**Nunca entregue `initialInstruction` com `pty.write` no construtor.** CLIs de TUI
não têm composer montado quando o PTY nasce: o Codex descarta os bytes, o Claude
Code perde o Enter. Use o **argumento posicional** nativo do CLI, atrás de `--`
(sem o `--`, instrução que começa com hífen vira opção e instrução que colide com
subcomando vira comando). Veja `buildCodexArgs` / `buildClaudeArgs`.

**Meça se o seu CLI precisa de gap entre o texto e o Enter.** Em sessão já viva,
alguns TUIs tratam Enter colado a uma colagem como nova linha em vez de submit —
é uma janela **temporal**, nenhuma codificação escapa dela. O Codex precisa de
~250ms; o Claude Code não precisa de nenhum. **Não copie o valor do vizinho:** é
propriedade medida do CLI. Escreva a tabela de medição no comentário, como está
em `CODEX_SUBMIT_GAP_MS`.

**Comando de hook/notify nunca como string de shell.** O CLI pode anexar payload
JSON, e no Windows o comando pode rodar sob Git Bash (que reescreve `/c` como
`C:/` e sobe o `cmd.exe` interativo). Use um `.cjs` chamado por `node`, com dados
variáveis embutidos via `JSON.stringify` e o resto por argv. E não imprima nada
em stdout — o stdout de hook vira contexto do agente.

**Status: `starting` é "nasceu", `idle` é "devolveu o turno".** Não use o mesmo
valor para os dois: `IDLE_AGENT_STATUSES` decide se o tile aceita tarefa nova, e
a colisão faz todo tile vivo virar não-entregável.

## Checklist de PR

- [ ] Unit tests com spawn fake (status, dispose, data, exit)
- [ ] Heurísticas de parsing (se houver) com fixtures de saída real do CLI
- [ ] `pnpm verify` verde (inclui a guarda NFR7)
- [ ] Particularidades/limitações do CLI documentadas no próprio package (README)
- [ ] `initialInstruction` vai por **argv**, e há teste afirmando que o PTY não
      recebeu write no construtor
- [ ] Gap texto→Enter **medido** (ou provado desnecessário), com a tabela no comentário
- [ ] **Smoke com o CLI real** (`*.smoke.ts`, fora da suíte padrão, pulando sem o
      binário no PATH) provando que o turno entregue é SUBMETIDO — o ack
      `delivered` não é prova, ele só diz que os bytes saíram
- [ ] O *needle* da asserção do smoke **não aparece no enunciado do prompt**
      (senão casa com o eco no composer e dá falso-positivo)
