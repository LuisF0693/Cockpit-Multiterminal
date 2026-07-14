# Data Models

> Modelagem conceitual; DDL detalhado delegado à @data-engineer se necessário (schema local simples — sem RLS/rede).

### Entidades centrais

```typescript
// packages/shared/src/domain.ts
type AgentStatus = 'idle' | 'working' | 'waiting-input' | 'done' | 'error';
type TaskState = 'planned' | 'executing' | 'awaiting-decision' | 'reviewed' | 'completed';

interface TerminalSession {
  id: string;                 // ulid
  name: string;
  adapterId: string;          // 'claude-code' | 'codex' | 'grok' | 'shell' | ...
  cwd: string;
  status: AgentStatus;
  gridPosition: GridRect;     // layout do tile
  createdAt: number;
  lastStatusChangeAt: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  state: TaskState;
  linkedTerminalIds: string[];   // FR14
  createdAt: number;
  updatedAt: number;
}

interface DomainEvent {          // a timeline (FR8) é a projeção disto
  id: string;                    // ulid — ordenável por tempo
  ts: number;
  origin: 'system' | 'agent' | 'human';
  type: string;                  // 'terminal.spawned' | 'status.changed' | 'instruction.sent'
                                 // | 'decision.made' | 'session.recovered' | 'task.transitioned' | ...
  terminalId?: string;
  taskId?: string;
  payload: Record<string, unknown>;  // validado por Zod schema por type
}

interface Decision {             // FR15
  id: string;
  taskId?: string;
  terminalId?: string;
  kind: 'approve' | 'reject' | 'redirect' | 'agent-input';
  justification?: string;
  decidedAt: number;
}
```

### Tabelas SQLite (visão lógica)

`terminals`, `tasks`, `task_terminal_links`, `events` (append-only), `decisions`, `app_meta` (schema version, flag `clean_shutdown` para detecção de crash — FR12), `settings`.
