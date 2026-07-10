# Decisão Crítica 3: Adapter Contract (NFR7) ✅

```typescript
// packages/adapter-contract/src/index.ts
export interface AgentAdapter {
  readonly id: string;                    // 'claude-code'
  readonly displayName: string;           // 'Claude Code'
  readonly statusStrategy: 'native-hooks' | 'output-parsing' | 'process-only';
  detectAvailability(): Promise<AdapterAvailability>;  // CLI no PATH? versão? autenticado?
  spawn(config: SpawnConfig): Promise<AgentSession>;
}

export interface AgentSession {
  readonly terminalId: string;
  write(data: string): void;              // input do usuário / instruções da master (FR7)
  resize(cols: number, rows: number): void;
  dispose(): Promise<void>;               // kill limpo, sem órfãos
  onData(cb: (chunk: Buffer) => void): Unsubscribe;    // saída bruta → xterm
  onStatus(cb: (s: AgentStatus, detail?: string) => void): Unsubscribe;  // FR5
  onExit(cb: (code: number | null) => void): Unsubscribe;
}

export interface SpawnConfig {
  cwd: string;
  cols: number; rows: number;
  env?: Record<string, string>;           // NUNCA credenciais injetadas (NFR6)
  initialInstruction?: string;
}
```

**Regras do contrato:**
1. Adapters vivem no PTY Host; o core (Main) consome apenas `AgentAdapter`/`AgentSession` — dependência de provider no core é **erro de lint** (regra ESLint `no-restricted-imports` por package, verificada em CI — AC da Story 2.1).
2. **Detecção de status por camadas:** preferir `native-hooks` (ex.: hooks do Claude Code notificando via arquivo/socket local) → fallback `output-parsing` (heurísticas documentadas por adapter, com testes de fixture) → mínimo `process-only` (running/exited, caso do Shell Adapter).
3. Adapter **não intercepta credenciais** (NFR6): spawn herda o ambiente do usuário; nada de tokens em config/logs.
4. Novo provider = novo package em `packages/adapters/*` implementando o contrato + registro no `AdapterRegistry`. Guia em `docs/guides/writing-an-adapter.md` (AC Story 2.1).
