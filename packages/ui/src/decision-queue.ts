import type { SessionRecord, Task } from '@cockpit/shared';

/**
 * Fila de decisões UNIFICADA (Story 3.4 + Story 5.3, AC3) — função PURA que
 * junta TODAS as pendências que exigem olho humano numa lista só, ordenada.
 *
 * Por que virou módulo próprio: o pedido do fundador foi "quando aparecer que
 * eu preciso verificar alguma coisa, aparecer lá nas decisões". Antes a lista
 * era montada inline no App.tsx com duas fontes (agentes em waiting-input +
 * tarefas em awaiting_decision) e os GATES de vínculo (`terminalLinkGatePend`)
 * simplesmente não entravam — o evento chegava ao preload e morria ali, sem
 * nenhum assinante no renderer. Com a montagem centralizada e pura, "toda
 * pendência cai na fila" vira uma propriedade testável, não uma promessa.
 *
 * Cada item carrega seu DEEP-LINK (`target`): o clique leva ao tile/terminal
 * ou à tarefa que originou a pendência (AC3 da 3.4 — "ação direta do item").
 */

/** Gate de roteamento retido aguardando APPROVE/REJECT (modo 'gate' do vínculo). */
export interface PendingLinkGate {
  gateId: string;
  sourceId: string;
  targetIds: string[];
  message: string;
  /** Momento em que o gate chegou ao renderer — base do "aguarda há". */
  receivedAt: number;
}

/**
 * Severidade REAL da pendência, não decoração:
 * - `blocking`: existe uma decisão binária represando trabalho (tarefa em
 *   awaiting_decision, gate de vínculo). Nada anda até o humano responder.
 * - `attention`: um agente parou e espera que o fundador digite algo. Não há
 *   decisão formal a registrar, mas há um agente ocioso.
 */
export type DecisionSeverity = 'blocking' | 'attention';

export type DecisionKind = 'task-decision' | 'link-gate' | 'agent-waiting';

/** Para onde o clique no item leva (AC3 da 3.4). */
export type DecisionTarget = { type: 'terminal'; id: string } | { type: 'task'; id: string };

export interface DecisionItem {
  id: string;
  kind: DecisionKind;
  severity: DecisionSeverity;
  /** Linha principal — o nome do que está pendente. */
  title: string;
  /** Linha de apoio — contexto (tarefa vinculada, alvos do gate…). */
  detail: string;
  /** Há quanto tempo aguarda, em ms (AC2 da 3.4). */
  waitingMs: number;
  target: DecisionTarget;
}

export interface DecisionQueueInput {
  sessions: SessionRecord[];
  tasks: Task[];
  gates: PendingLinkGate[];
  /** Agora, injetado para a função continuar pura/testável. */
  now: number;
  /** Título da tarefa vinculada a um terminal (o dono já tem o mapa). */
  taskTitle: (taskId: string | null) => string;
  /** Nome de um terminal por id (idem). */
  sessionName: (id: string) => string;
}

const SEVERITY_RANK: Record<DecisionSeverity, number> = { blocking: 0, attention: 1 };

/**
 * Monta a fila. Ordem: o que REPRESA trabalho primeiro; dentro do mesmo nível,
 * o que espera há mais tempo na frente (o item esquecido sobe sozinho, que é
 * exatamente o que a 3.4 quer evitar: "nenhuma pendência humana esquecida").
 */
export function buildDecisionQueue(input: DecisionQueueInput): DecisionItem[] {
  const items: DecisionItem[] = [];

  for (const task of input.tasks) {
    if (task.state !== 'awaiting_decision') continue;
    items.push({
      id: `task-${task.id}`,
      kind: 'task-decision',
      severity: 'blocking',
      title: task.title,
      detail: 'aguardando sua decisão: aprovar, rejeitar ou redirecionar',
      waitingMs: Math.max(0, input.now - task.updatedAt),
      target: { type: 'task', id: task.id }
    });
  }

  for (const gate of input.gates) {
    const targets = gate.targetIds.map((id) => input.sessionName(id)).join(', ');
    items.push({
      id: `gate-${gate.gateId}`,
      kind: 'link-gate',
      severity: 'blocking',
      title: `"${input.sessionName(gate.sourceId)}" quer instruir ${gate.targetIds.length === 1 ? targets : `${gate.targetIds.length} terminais`}`,
      detail: gate.targetIds.length === 1 ? gate.message : `alvos: ${targets}`,
      waitingMs: Math.max(0, input.now - gate.receivedAt),
      // Deep-link no ORIGEM: é lá que o fundador vê o que o agente produziu
      // e decide se aquilo deve mesmo ser injetado no alvo.
      target: { type: 'terminal', id: gate.sourceId }
    });
  }

  for (const session of input.sessions) {
    if (session.agentStatus !== 'waiting-input' || session.status !== 'running') continue;
    items.push({
      id: `session-${session.id}`,
      kind: 'agent-waiting',
      severity: 'attention',
      title: session.name,
      detail: `aguardando instrução · tarefa: ${input.taskTitle(session.taskId)}`,
      waitingMs: Math.max(0, input.now - session.lastStatusChangeAt),
      target: { type: 'terminal', id: session.id }
    });
  }

  return items.sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    return bySeverity !== 0 ? bySeverity : b.waitingMs - a.waitingMs;
  });
}

/** Quantos itens REPRESAM trabalho — usado para colorir badge/contador. */
export function countBlocking(items: DecisionItem[]): number {
  return items.filter((i) => i.severity === 'blocking').length;
}
