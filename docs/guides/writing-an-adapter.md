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

## Checklist de PR

- [ ] Unit tests com spawn fake (status, dispose, data, exit)
- [ ] Heurísticas de parsing (se houver) com fixtures de saída real do CLI
- [ ] `pnpm verify` verde (inclui a guarda NFR7)
- [ ] Particularidades/limitações do CLI documentadas no próprio package (README)
