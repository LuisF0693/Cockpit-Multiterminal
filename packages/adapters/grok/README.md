# @cockpit/adapter-grok

Adapter do Grok CLI (Story 2.4). **Este README responde a pergunta aberta do
project brief sobre limitações/riscos do Grok CLI no Windows (AC3).**

## Limitações e riscos no Windows

| Tema | Situação | Implicação |
|------|----------|------------|
| Distribuição | Não há um CLI oficial único: existem distribuições npm de terceiros (ex.: `grok-cli`/variantes) com nomes de binário divergentes | `detectAvailability` procura `grok` no PATH e reporta razão clara; se a sua distribuição usa outro binário, ajuste o `command` no registro |
| Canal de status | NENHUM mecanismo nativo de hooks (Claude) ou notify (Codex) conhecido | Detecção limitada: `working` por heurística de input (Enter), `done`/`error` no exit; `idle` NÃO detectável sem parsing de saída com fixtures reais (debt registrado) |
| ConPTY | Distribuições Node/Ink rodam bem sob ConPTY (mesma base validada no spike da 1.1) | Sem risco adicional conhecido; TUIs complexas devem ser validadas visualmente |
| Autenticação | Varia por distribuição (env `XAI_API_KEY` ou login próprio) | NFR6: o adapter herda o ambiente do usuário e NUNCA gerencia/loga credenciais |

## Status possível hoje

`working` (input) → `done`/`error` (exit). Melhorias dependem de coletar
transcripts reais para fixtures de parsing (mesma política dos demais adapters).
