# Decisão Crítica 4: IPC Tipado ✅

**Dois canais com naturezas distintas:**

1. **Canal de controle (baixa frequência, alta semântica):** request/response e eventos de domínio entre Renderer ↔ Main via `contextBridge` + `ipcRenderer.invoke`. Todos os contratos definidos em `packages/shared/src/ipc.ts` como schemas Zod — payload inválido é rejeitado na borda, nos dois sentidos:

```typescript
// exemplos de contrato (nomes canônicos)
'terminal.create'   : { in: CreateTerminalInput, out: TerminalSession }
'terminal.close'    : { in: { terminalId }, out: void }
'instruction.send'  : { in: { terminalId, text }, out: void }        // FR7
'task.transition'   : { in: { taskId, to: TaskState, justification? }, out: Task }
'decision.make'     : { in: DecisionInput, out: Decision }           // FR15
'session.snapshot'  : { in: void, out: SessionSnapshot }             // hidratação da UI
// eventos Main → Renderer (push, aria-live na fila de decisões):
'events.domain'     : DomainEvent (stream)                           // alimenta timeline/fila/status
```

2. **Canal de dados de terminal (alta vazão, binário):** `MessagePort` direto entre Renderer e PTY Host (negociado pelo Main na criação do terminal). Chunks `Buffer` sem serialização JSON, com backpressure (pause/resume do PTY quando o renderer está atrás — e taxa reduzida para terminais desfocados, conforme spec da Uma). Input de teclado segue o caminho inverso pelo mesmo port.

**Rationale:** misturar dados de PTY com IPC de controle é o erro clássico que mata a latência de digitação (NFR3 <16ms). A separação física dos canais torna o requisito estrutural, não otimização posterior.
