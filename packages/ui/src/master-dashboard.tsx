import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  classifyTaskRoles,
  type Learning,
  type LearningStatus,
  type SessionRecord,
  type Task,
  type TaskRole,
  type TerminalLink,
  type TerminalLinkMode
} from '@cockpit/shared';

/** Espelho leve de TaskDecisionRequestSchema['action'] (Story 5.3). */
export type TaskDecisionAction = 'approve' | 'reject' | 'redirect';
import type { DecisionItem, DecisionKind } from './decision-queue';
import { formatDuration } from './format-duration';
import { ICON_SIZE, Icon, Icons, type LucideIcon } from './icons';
import { statusColor, statusLabel } from './status-colors';
import { adapterColor } from './adapter-colors';
import { theme } from './theme';

const queueButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  background: theme.surface.raised,
  color: theme.text.primary,
  border: `1px solid ${theme.border.default}`,
  borderRadius: 6,
  padding: '3px 10px',
  fontSize: theme.font.size.sm,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

/** Superfície tingida pelo âmbar de waiting-input — deriva do STATUS_COLORS, não é um hex novo. */
const WAITING_TINT = `${statusColor('waiting-input')}14`;

/** Mesmo vocabulário de ícones da coluna DECISÕES do rodapé — uma pendência, um símbolo. */
const DECISION_KIND_ICON: Record<DecisionKind, LucideIcon> = {
  'task-decision': Icons.warning,
  'link-gate': Icons.link,
  'agent-waiting': Icons.waiting
};

/**
 * Estado efêmero de UI do MasterDashboard, consolidado num único Model +
 * reducer (Model/Update/View) em vez de 7 `useState` soltos — dados de
 * domínio (sessions/tasks/learnings/terminalLinks) continuam como props,
 * elevados pro dono certo; isso cobre só rascunhos/formulários locais da tela.
 */
interface DashboardUiModel {
  drafts: Record<string, string>;
  sentAt: Record<string, number>;
  redirectTargets: Record<string, string>;
  learningDraft: { text: string; category: string };
  linkDraft: { source: string; target: string; mode: TerminalLinkMode };
}

const initialUiModel: DashboardUiModel = {
  drafts: {},
  sentAt: {},
  redirectTargets: {},
  learningDraft: { text: '', category: 'gotcha' },
  linkDraft: { source: '', target: '', mode: 'manual' }
};

type DashboardUiMsg =
  | { type: 'draft-changed'; sessionId: string; text: string }
  | { type: 'instruction-sent'; sessionId: string }
  | { type: 'sent-flash-cleared'; sessionId: string }
  | { type: 'redirect-target-changed'; taskId: string; sessionId: string }
  | { type: 'redirect-consumed'; taskId: string }
  | { type: 'learning-text-changed'; value: string }
  | { type: 'learning-category-changed'; value: string }
  | { type: 'learning-submitted' }
  | { type: 'link-source-changed'; value: string }
  | { type: 'link-target-changed'; value: string }
  | { type: 'link-mode-changed'; value: TerminalLinkMode }
  | { type: 'link-created' };

function dashboardUiReducer(model: DashboardUiModel, msg: DashboardUiMsg): DashboardUiModel {
  switch (msg.type) {
    case 'draft-changed':
      return { ...model, drafts: { ...model.drafts, [msg.sessionId]: msg.text } };
    case 'instruction-sent':
      return {
        ...model,
        drafts: { ...model.drafts, [msg.sessionId]: '' },
        sentAt: { ...model.sentAt, [msg.sessionId]: Date.now() }
      };
    case 'sent-flash-cleared':
      return { ...model, sentAt: { ...model.sentAt, [msg.sessionId]: 0 } };
    case 'redirect-target-changed':
      return { ...model, redirectTargets: { ...model.redirectTargets, [msg.taskId]: msg.sessionId } };
    case 'redirect-consumed':
      return { ...model, redirectTargets: { ...model.redirectTargets, [msg.taskId]: '' } };
    case 'learning-text-changed':
      return { ...model, learningDraft: { ...model.learningDraft, text: msg.value } };
    case 'learning-category-changed':
      return { ...model, learningDraft: { ...model.learningDraft, category: msg.value } };
    case 'learning-submitted':
      return { ...model, learningDraft: { ...model.learningDraft, text: '' } };
    case 'link-source-changed':
      return { ...model, linkDraft: { ...model.linkDraft, source: msg.value } };
    case 'link-target-changed':
      return { ...model, linkDraft: { ...model.linkDraft, target: msg.value } };
    case 'link-mode-changed':
      return { ...model, linkDraft: { ...model.linkDraft, mode: msg.value } };
    case 'link-created':
      return { ...model, linkDraft: { ...model.linkDraft, source: '', target: '' } };
    default:
      return model;
  }
}

/**
 * MasterDashboard (Story 3.1) — o Conductor: visão agregada de todos os
 * agentes com envio de instruções por linha (Story 3.2). Tela inicial do app.
 * Coluna "tarefa" vincula/mostra tarefas reais desde a Story 5.2.
 */

export interface MasterDashboardProps {
  sessions: SessionRecord[];
  tasks: Task[];
  onGoToTerminal: (id: string) => void;
  /**
   * Envia instrução ao agente (Story 3.2). Resolve false se o envio foi
   * cancelado (guarda de error/done, confirmada via modal temático — auditoria
   * UX Don Norman, achado #2) — usado no feedback visual.
   */
  onInstruct: (id: string, text: string) => Promise<boolean>;
  /** Abre o relatório da sessão (Story 3.5). */
  onOpenReport: (id: string) => void;
  /** Vincula/desvincula tarefa ao terminal (Story 5.2, AC1/AC2). Papel opcional (Story 7.1). */
  onLinkTask: (terminalId: string, taskId: string | null, role?: TaskRole | null) => void;
  /** Decisão humana (Story 5.3, FR15) — aprovar/rejeitar/redirecionar. */
  onDecide: (taskId: string, action: TaskDecisionAction, opts?: { justification?: string; redirectTo?: string }) => void;
  /** Abre o painel de revisão lado a lado (Story 7.3) — só faz sentido em modo three-brain. */
  onOpenReview: (taskId: string) => void;
  /**
   * Fila unificada JÁ montada pelo dono (`buildDecisionQueue`) — o dashboard
   * não recalcula: a MESMA lista alimenta o rodapé e o badge do header, então
   * as três superfícies nunca podem divergir (era o risco de montar inline).
   */
  decisions: DecisionItem[];
  /** Deep-link do item — leva ao terminal/tarefa de origem (AC3 da 3.4). */
  onOpenDecision: (item: DecisionItem) => void;
  /** Resolve um gate de vínculo retido (APPROVE injeta a instrução, REJECT descarta). */
  onResolveGate?: (gateId: string, action: 'approve' | 'reject') => void;
  /** Vínculos terminal-a-terminal (Épico 9, FR25) — independentes de tarefa. */
  terminalLinks: TerminalLink[];
  onCreateLink: (sourceId: string, targetId: string, mode: TerminalLinkMode) => void;
  onRemoveLink: (id: string) => void;
  /** Envio manual (Story 9.3, AC2) — só faz sentido para vínculos em modo `manual`. */
  onSendLink: (link: TerminalLink) => void;
  /** Captura rápida de learning (Story 11.1, AC2) — nasce em status `draft`. */
  onCreateLearning: (text: string, category: string) => void;
  /** Learnings globais (Épico 11) — NUNCA escopados ao projeto ativo (11.3, AC2). */
  learnings: Learning[];
  /** Qualificação (Story 11.2, FR32) — decisão humana explícita. */
  onUpdateLearningStatus: (id: string, status: LearningStatus) => void;
  /**
   * Pede texto ao usuário via modal (PromptModal do App) — `window.prompt`
   * NÃO é implementado pelo Electron (retorna `null` sempre, sem UI); sem
   * esta prop, a justificativa de rejeição é silenciosamente impossível
   * (bug herdado da 12.6, corrigido pós-13.1).
   */
  onPromptText?: (message: string, defaultValue?: string) => Promise<string | null>;
}

export function MasterDashboard({
  sessions,
  tasks,
  onGoToTerminal,
  onInstruct,
  onOpenReport,
  onLinkTask,
  onDecide,
  onOpenReview,
  decisions,
  onOpenDecision,
  onResolveGate,
  terminalLinks,
  onCreateLink,
  onRemoveLink,
  onSendLink,
  onCreateLearning,
  learnings,
  onUpdateLearningStatus,
  onPromptText
}: MasterDashboardProps): JSX.Element {
  const [, setTick] = useState(0);
  const [ui, dispatch] = useReducer(dashboardUiReducer, initialUiModel);
  const sessionName = useMemo(() => {
    const byId = new Map(sessions.map((s) => [s.id, s.name]));
    return (id: string): string => byId.get(id) ?? '—';
  }, [sessions]);
  // (o antigo `taskTitle` saiu daqui: a tarefa vinculada de um agente em
  // waiting-input agora vem pronta no `detail` do item da fila unificada —
  // ver `decision-queue.ts`; manter o mapa aqui duplicaria a mesma verdade)
  const runningSessions = useMemo(() => sessions.filter((s) => s.status === 'running'), [sessions]);

  // Tempo no status precisa andar sozinho (tick 1s).
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const submit = (id: string): void => {
    const text = (ui.drafts[id] ?? '').trim();
    if (!text) return;
    void onInstruct(id, text).then((sent) => {
      if (!sent) return;
      dispatch({ type: 'instruction-sent', sessionId: id });
      setTimeout(() => dispatch({ type: 'sent-flash-cleared', sessionId: id }), 2500);
    });
  };

  const submitLearning = (): void => {
    const text = ui.learningDraft.text.trim();
    if (!text) return;
    onCreateLearning(text, ui.learningDraft.category.trim() || 'geral');
    dispatch({ type: 'learning-submitted' });
  };

  return (
    <section style={{ flex: 1, minWidth: 0, padding: 24, overflowY: 'auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Sessão Master</h2>
      <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, margin: '0 0 20px' }}>
        {sessions.length} {sessions.length === 1 ? 'agente' : 'agentes'} sob governança — Ctrl+M alterna com o canvas
      </p>

      {/* Captura rápida de learning (Épico 11, Story 11.1, AC2) — sem
          precisar navegar a uma tela dedicada para o caso comum. */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 20 }}>
        <span style={{ display: 'flex', color: theme.text.muted }} title="registrar aprendizado">
          <Icon glyph={Icons.note} size={ICON_SIZE.md} label="registrar aprendizado" />
        </span>
        <input
          value={ui.learningDraft.text}
          onChange={(e) => dispatch({ type: 'learning-text-changed', value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitLearning();
          }}
          placeholder="registrar um aprendizado (gotcha, decisão, padrão)…"
          list="learning-categories"
          style={{
            flex: 1,
            background: theme.surface.raised,
            color: theme.text.primary,
            border: `1px solid ${theme.border.default}`,
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: theme.font.size.sm
          }}
        />
        <input
          value={ui.learningDraft.category}
          onChange={(e) => dispatch({ type: 'learning-category-changed', value: e.target.value })}
          list="learning-categories"
          placeholder="categoria"
          style={{
            width: 110,
            background: theme.surface.raised,
            color: theme.text.primary,
            border: `1px solid ${theme.border.default}`,
            borderRadius: 6,
            padding: '5px 8px',
            fontSize: theme.font.size.sm
          }}
        />
        <datalist id="learning-categories">
          <option value="gotcha" />
          <option value="decisão" />
          <option value="padrão" />
        </datalist>
        <button onClick={submitLearning} disabled={!ui.learningDraft.text.trim()} style={queueButtonStyle}>
          registrar
        </button>
        <span style={{ fontSize: theme.font.size.xs, color: theme.text.faint }} title="learnings no banco global">
          {learnings.length} no banco
        </span>
      </div>

      {/* Fila de qualificação (Épico 11, Story 11.2, AC3) — draft/reviewed
          aguardando decisão humana; não bloqueante, mesmo padrão visual da
          fila de decisões de tarefa acima. */}
      {(() => {
        const pending = learnings.filter((l) => l.status === 'draft' || l.status === 'reviewed');
        if (pending.length === 0) return null;
        return (
          <div
            style={{
              marginBottom: 20,
              padding: 14,
              background: theme.surface.panel,
              border: `1px solid ${theme.border.default}`,
              borderRadius: theme.radius.md
            }}
          >
            <h3
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                margin: '0 0 10px',
                fontSize: theme.font.size.md,
                color: theme.text.muted
              }}
            >
              <Icon glyph={Icons.learnings} size={ICON_SIZE.md} />
              Learnings para qualificar ({pending.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pending.map((l) => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ color: theme.text.faint, fontSize: 10, textTransform: 'uppercase' }}>{l.category}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.text}
                  </span>
                  {l.status === 'draft' ? (
                    <button
                      onClick={() => onUpdateLearningStatus(l.id, 'reviewed')}
                      style={queueButtonStyle}
                      title="marcar como revisado"
                    >
                      revisado
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateLearningStatus(l.id, 'reusable')}
                      style={queueButtonStyle}
                      title="qualificar como reutilizável"
                    >
                      <Icon glyph={Icons.approve} size={ICON_SIZE.sm} />
                      reutilizável
                    </button>
                  )}
                  <button
                    onClick={() => onUpdateLearningStatus(l.id, 'discarded')}
                    style={queueButtonStyle}
                    title="descartar"
                  >
                    <Icon glyph={Icons.reject} size={ICON_SIZE.sm} />
                    descartar
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/*
        Fila de decisões (Story 3.4/FR9 + Story 5.3 AC3), reescrita com o
        feedback do fundador: "quando aparecer que eu preciso verificar alguma
        coisa, aparecer lá nas decisões; melhora o visual também, acho que está
        mal otimizado".

        O que mudou de verdade:
        - a lista vem do `buildDecisionQueue` (puro, testado), que também traz
          os GATES de vínculo — antes eles nem chegavam à UI;
        - HIERARQUIA: o que REPRESA trabalho (decisão de tarefa / gate) fica em
          cima, com superfície e borda próprias; o que só aguarda resposta
          (agente em waiting-input) fica abaixo, plano. Antes tudo dividia o
          mesmo bloco âmbar, então "aprove isto agora" e "um agente parou" se
          pareciam;
        - CADA item tem deep-link para a origem;
        - estado vazio explícito em vez de sumir da tela.
      */}
      {(() => {
        const blockingItems = decisions.filter((d) => d.severity === 'blocking');
        const attentionItems = decisions.filter((d) => d.severity === 'attention');

        /** Ações completas de uma tarefa em awaiting_decision (5.3 AC1). */
        const taskActions = (taskId: string): JSX.Element => (
          <>
            {classifyTaskRoles(sessions, taskId).isThreeBrain && (
              <button
                onClick={() => onOpenReview(taskId)}
                style={queueButtonStyle}
                title="painel de revisão lado a lado (Story 7.3)"
              >
                <Icon glyph={Icons.threeBrain} size={ICON_SIZE.sm} />
                revisão
              </button>
            )}
            <button
              onClick={() => onDecide(taskId, 'approve')}
              style={{ ...queueButtonStyle, borderColor: theme.accent.ok, color: theme.accent.ok }}
              title="aprovar → revisada"
            >
              <Icon glyph={Icons.approve} size={ICON_SIZE.sm} />
              aprovar
            </button>
            <button
              onClick={() => {
                if (!onPromptText) {
                  onDecide(taskId, 'reject', {});
                  return;
                }
                void onPromptText('Motivo da rejeição (opcional):').then((justification) => {
                  onDecide(taskId, 'reject', justification ? { justification } : {});
                });
              }}
              style={{ ...queueButtonStyle, borderColor: theme.accent.danger, color: theme.accent.danger }}
              title="rejeitar → em execução, com feedback"
            >
              <Icon glyph={Icons.reject} size={ICON_SIZE.sm} />
              rejeitar
            </button>
            <select
              value={ui.redirectTargets[taskId] ?? ''}
              onChange={(e) => dispatch({ type: 'redirect-target-changed', taskId, sessionId: e.target.value })}
              title="Novo agente para redirecionar"
              style={{
                background: theme.surface.raised,
                color: theme.text.primary,
                border: `1px solid ${theme.border.default}`,
                borderRadius: 6,
                padding: '3px 6px',
                fontSize: theme.font.size.xs
              }}
            >
              <option value="">redirecionar para…</option>
              {runningSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const redirectTo = ui.redirectTargets[taskId];
                if (!redirectTo) return;
                onDecide(taskId, 'redirect', { redirectTo });
                dispatch({ type: 'redirect-consumed', taskId });
              }}
              disabled={!ui.redirectTargets[taskId]}
              style={queueButtonStyle}
              title="redirecionar → outro agente"
            >
              <Icon glyph={Icons.goTo} size={ICON_SIZE.sm} />
              redirecionar
            </button>
          </>
        );

        /** Ações de um gate de vínculo retido — APPROVE injeta, REJECT descarta. */
        const gateActions = (gateId: string): JSX.Element => (
          <>
            <button
              onClick={() => onResolveGate?.(gateId, 'approve')}
              style={{ ...queueButtonStyle, borderColor: theme.accent.ok, color: theme.accent.ok }}
              title="aprovar: a instrução entra no terminal alvo agora"
            >
              <Icon glyph={Icons.approve} size={ICON_SIZE.sm} />
              liberar
            </button>
            <button
              onClick={() => onResolveGate?.(gateId, 'reject')}
              style={{ ...queueButtonStyle, borderColor: theme.accent.danger, color: theme.accent.danger }}
              title="rejeitar: a instrução é descartada e nada é injetado"
            >
              <Icon glyph={Icons.reject} size={ICON_SIZE.sm} />
              descartar
            </button>
          </>
        );

        const row = (d: DecisionItem): JSX.Element => {
          const tone = d.severity === 'blocking' ? theme.accent.danger : statusColor('waiting-input');
          const gateId = d.kind === 'link-gate' ? d.id.slice('gate-'.length) : null;
          const taskId = d.kind === 'task-decision' ? d.id.slice('task-'.length) : null;
          return (
            <div
              key={d.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                background: d.severity === 'blocking' ? `color-mix(in srgb, ${tone} 10%, transparent)` : WAITING_TINT,
                border: `1px solid color-mix(in srgb, ${tone} ${d.severity === 'blocking' ? 45 : 30}%, transparent)`,
                borderLeft: `3px solid ${tone}`,
                borderRadius: theme.radius.md,
                fontSize: 12
              }}
            >
              <span style={{ display: 'flex', color: tone }}>
                <Icon glyph={DECISION_KIND_ICON[d.kind]} size={ICON_SIZE.lg} />
              </span>
              {/* O TÍTULO é o alvo do deep-link: clicar leva ao terminal/tarefa
                  que originou (AC3 da 3.4) — nada de caçar o tile no canvas. */}
              <button
                onClick={() => onOpenDecision(d)}
                title="ir ao contexto que originou esta pendência"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: theme.font.ui
                }}
              >
                <strong
                  style={{
                    fontSize: 13,
                    color: theme.text.bright,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {d.title}
                </strong>
                <span
                  style={{
                    fontSize: theme.font.size.sm,
                    color: theme.text.muted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {d.detail}
                </span>
              </button>
              <span
                title="há quanto tempo aguarda (Story 3.4, AC2)"
                style={{ color: tone, fontFamily: theme.font.mono, fontSize: theme.font.size.sm, flexShrink: 0 }}
              >
                {formatDuration(d.waitingMs)}
              </span>
              {taskId && taskActions(taskId)}
              {gateId && gateActions(gateId)}
              {d.kind === 'agent-waiting' && (
                <button onClick={() => onOpenDecision(d)} style={queueButtonStyle}>
                  responder
                  <Icon glyph={Icons.goTo} size={ICON_SIZE.sm} />
                </button>
              )}
            </div>
          );
        };

        return (
          <div style={{ marginBottom: 20 }}>
            <h3
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '0 0 10px',
                fontSize: theme.font.size.md,
                color: decisions.length === 0 ? theme.text.muted : statusColor('waiting-input')
              }}
            >
              <Icon glyph={Icons.waiting} size={ICON_SIZE.md} />
              Decisões pendentes ({decisions.length})
              {blockingItems.length > 0 && (
                <span
                  style={{
                    fontSize: theme.font.size.xs,
                    fontWeight: 700,
                    color: theme.accent.danger,
                    border: `1px solid ${theme.accent.danger}`,
                    borderRadius: theme.radius.pill,
                    padding: '1px 8px'
                  }}
                >
                  {blockingItems.length} represando trabalho
                </span>
              )}
            </h3>

            {decisions.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 16px',
                  border: `1px dashed ${theme.border.default}`,
                  borderRadius: theme.radius.md,
                  color: theme.text.muted,
                  fontSize: theme.font.size.md
                }}
              >
                <Icon glyph={Icons.approve} size={ICON_SIZE.md} color={theme.accent.ok} />
                Nada aguardando você. Pendências de agente, tarefa e vínculo aparecem aqui automaticamente.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {blockingItems.map(row)}
                {/* Separador só existe quando os DOIS grupos existem — sem ele
                    a fila vira uma lista chapada de novo. */}
                {blockingItems.length > 0 && attentionItems.length > 0 && (
                  <div
                    style={{
                      fontSize: 9.5,
                      letterSpacing: 0.6,
                      color: theme.text.faint,
                      textTransform: 'uppercase',
                      margin: '6px 0 0'
                    }}
                  >
                    aguardando sua resposta
                  </div>
                )}
                {attentionItems.map(row)}
              </div>
            )}
          </div>
        );
      })()}

      {sessions.length === 0 && (
        <p style={{ fontFamily: theme.font.mono, fontSize: theme.font.size.md, color: theme.text.muted }}>
          Nenhum agente ativo — Ctrl+N para criar o primeiro.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.map((s) => {
          const waiting = s.agentStatus === 'waiting-input' && s.status === 'running';
          return (
            <article
              key={s.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '18px 1.4fr 0.8fr 1fr 0.8fr 0.6fr 2fr auto',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: waiting ? WAITING_TINT : theme.surface.panel,
                border: `1px solid ${waiting ? statusColor('waiting-input') : theme.border.default}`,
                borderRadius: theme.radius.md
              }}
            >
              <span style={{ color: statusColor(s.agentStatus), fontSize: 12 }}>●</span>
              <strong style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </strong>
              <span
                title="agente"
                style={{ fontSize: 12, fontWeight: 600, color: adapterColor(s.adapterId) }}
              >
                {s.adapterId}
              </span>
              <span style={{ fontSize: 12, color: statusColor(s.agentStatus) }}>
                {statusLabel(s.agentStatus)}
              </span>
              <span
                title="tempo no status atual"
                style={{ fontSize: theme.font.size.sm, color: theme.text.muted, fontFamily: theme.font.mono }}
              >
                {formatDuration(Date.now() - s.lastStatusChangeAt)}
              </span>
              <span style={{ display: 'flex', gap: 4, minWidth: 0 }}>
                <select
                  value={s.taskId ?? ''}
                  onChange={(e) => onLinkTask(s.id, e.target.value || null, s.taskRole)}
                  title="Tarefa vinculada (Story 5.2)"
                  style={{
                    background: theme.surface.raised,
                    color: s.taskId ? theme.text.primary : theme.text.muted,
                    border: `1px solid ${theme.border.default}`,
                    borderRadius: 6,
                    padding: '4px 6px',
                    fontSize: theme.font.size.xs,
                    minWidth: 0,
                    flex: 1
                  }}
                >
                  <option value="">— sem tarefa —</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                {/* Papel na tarefa (Story 7.1, FR16) — só faz sentido com tarefa vinculada. */}
                <select
                  value={s.taskRole ?? ''}
                  onChange={(e) => onLinkTask(s.id, s.taskId, (e.target.value || null) as TaskRole | null)}
                  disabled={!s.taskId}
                  title="Papel na tarefa (escritor/revisor — Story 7.1)"
                  style={{
                    background: theme.surface.raised,
                    color: s.taskRole ? theme.text.primary : theme.text.muted,
                    border: `1px solid ${theme.border.default}`,
                    borderRadius: 6,
                    padding: '4px 4px',
                    fontSize: theme.font.size.xs,
                    // 34px cabia o glifo ✍/👁; rótulo textual precisa de mais.
                    width: 52
                  }}
                >
                  <option value="">—</option>
                  {/* `<option>` só renderiza TEXTO (o SO desenha o popup) —
                      ícone SVG aqui simplesmente não aparece. Trocado o par
                      ✍/👁 por rótulos textuais curtos, que é o único formato
                      que um select nativo consegue mostrar de verdade. */}
                  <option value="writer" title="escritor">
                    esc
                  </option>
                  <option value="reviewer" title="revisor">
                    rev
                  </option>
                </select>
              </span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  value={ui.drafts[s.id] ?? ''}
                  onChange={(e) => dispatch({ type: 'draft-changed', sessionId: s.id, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit(s.id);
                  }}
                  placeholder="instrução para o agente…"
                  disabled={s.status === 'exited'}
                  style={{
                    flex: 1,
                    background: theme.surface.raised,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border.default}`,
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: theme.font.size.sm
                  }}
                />
                {(ui.sentAt[s.id] ?? 0) > 0 && (
                  <span style={{ display: 'flex', color: theme.accent.ok }} title="instrução enviada">
                    <Icon glyph={Icons.approve} size={ICON_SIZE.md} label="instrução enviada" />
                  </span>
                )}
              </span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => onOpenReport(s.id)}
                  title="relatório da sessão (Story 3.5)"
                  style={queueButtonStyle}
                >
                  relatório
                </button>
                <button
                  onClick={() => onGoToTerminal(s.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: theme.surface.raised,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border.default}`,
                    borderRadius: 6,
                    padding: '5px 12px',
                    fontSize: theme.font.size.sm,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ir ao terminal
                  <Icon glyph={Icons.goTo} size={ICON_SIZE.sm} />
                </button>
              </span>
            </article>
          );
        })}
      </div>

      {/* Vínculos terminal-a-terminal (Épico 9, Story 9.3) — independentes
          de tarefa; um agente na origem pode comandar o alvo. */}
      <h3
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          fontSize: theme.font.size.md,
          fontWeight: 700,
          margin: '24px 0 10px',
          color: theme.text.muted
        }}
      >
        <Icon glyph={Icons.link} size={ICON_SIZE.md} />
        Vínculos entre terminais ({terminalLinks.length})
      </h3>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <select
          value={ui.linkDraft.source}
          onChange={(e) => dispatch({ type: 'link-source-changed', value: e.target.value })}
          title="Terminal de origem"
          style={selectStyle}
        >
          <option value="">origem…</option>
          {runningSessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span style={{ display: 'flex', color: theme.text.faint }}>
          <Icon glyph={Icons.goTo} size={ICON_SIZE.sm} />
        </span>
        <select
          value={ui.linkDraft.target}
          onChange={(e) => dispatch({ type: 'link-target-changed', value: e.target.value })}
          title="Terminal alvo"
          style={selectStyle}
        >
          <option value="">alvo…</option>
          {runningSessions
            .filter((s) => s.id !== ui.linkDraft.source)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
        <select
          value={ui.linkDraft.mode}
          onChange={(e) => dispatch({ type: 'link-mode-changed', value: e.target.value as TerminalLinkMode })}
          title="Modo do vínculo — manual: botão enviar; auto: dispara sozinho no status da origem"
          style={selectStyle}
        >
          <option value="manual">manual</option>
          <option value="auto">auto</option>
        </select>
        <button
          onClick={() => {
            if (!ui.linkDraft.source || !ui.linkDraft.target) return;
            onCreateLink(ui.linkDraft.source, ui.linkDraft.target, ui.linkDraft.mode);
            dispatch({ type: 'link-created' });
          }}
          disabled={!ui.linkDraft.source || !ui.linkDraft.target}
          style={queueButtonStyle}
        >
          <Icon glyph={Icons.add} size={ICON_SIZE.sm} />
          vincular
        </button>
      </div>
      {terminalLinks.length === 0 ? (
        <p style={{ fontSize: theme.font.size.sm, color: theme.text.faint }}>nenhum vínculo entre terminais ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {terminalLinks.map((l) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {sessionName(l.sourceId)}
                <Icon glyph={Icons.goTo} size={ICON_SIZE.xs} />
                {sessionName(l.targetId)}
              </span>
              <span style={{ color: theme.text.faint }}>({l.mode})</span>
              <span style={{ flex: 1 }} />
              {l.mode === 'manual' && (
                <button onClick={() => onSendLink(l)} style={queueButtonStyle} title="enviar instrução agora">
                  <Icon glyph={Icons.send} size={ICON_SIZE.sm} />
                  enviar
                </button>
              )}
              <button onClick={() => onRemoveLink(l.id)} style={queueButtonStyle} title="remover vínculo">
                <Icon glyph={Icons.close} size={ICON_SIZE.sm} />
                remover
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const selectStyle: React.CSSProperties = {
  background: theme.surface.raised,
  color: theme.text.primary,
  border: `1px solid ${theme.border.default}`,
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: theme.font.size.sm
};
