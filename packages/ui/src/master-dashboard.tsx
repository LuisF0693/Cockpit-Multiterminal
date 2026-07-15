import { useEffect, useMemo, useState } from 'react';
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
import { formatDuration } from './format-duration';
import { statusColor, statusLabel } from './status-colors';
import { adapterColor } from './adapter-colors';
import { theme } from './theme';

const queueButtonStyle: React.CSSProperties = {
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
   * Envia instrução ao agente (Story 3.2). Retorna false se o envio foi
   * cancelado (guarda de error/done) — usado no feedback visual.
   */
  onInstruct: (id: string, text: string) => boolean;
  /** Abre o relatório da sessão (Story 3.5). */
  onOpenReport: (id: string) => void;
  /** Vincula/desvincula tarefa ao terminal (Story 5.2, AC1/AC2). Papel opcional (Story 7.1). */
  onLinkTask: (terminalId: string, taskId: string | null, role?: TaskRole | null) => void;
  /** Decisão humana (Story 5.3, FR15) — aprovar/rejeitar/redirecionar. */
  onDecide: (taskId: string, action: TaskDecisionAction, opts?: { justification?: string; redirectTo?: string }) => void;
  /** Abre o painel de revisão lado a lado (Story 7.3) — só faz sentido em modo three-brain. */
  onOpenReview: (taskId: string) => void;
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
  terminalLinks,
  onCreateLink,
  onRemoveLink,
  onSendLink,
  onCreateLearning,
  learnings,
  onUpdateLearningStatus
}: MasterDashboardProps): JSX.Element {
  const [, setTick] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sentAt, setSentAt] = useState<Record<string, number>>({});
  const [redirectTargets, setRedirectTargets] = useState<Record<string, string>>({});
  const [learningText, setLearningText] = useState('');
  const [learningCategory, setLearningCategory] = useState('gotcha');
  const [linkSource, setLinkSource] = useState('');
  const [linkTarget, setLinkTarget] = useState('');
  const [linkMode, setLinkMode] = useState<TerminalLinkMode>('manual');
  const sessionName = useMemo(() => {
    const byId = new Map(sessions.map((s) => [s.id, s.name]));
    return (id: string): string => byId.get(id) ?? '—';
  }, [sessions]);
  const taskTitle = useMemo(() => {
    const byId = new Map(tasks.map((t) => [t.id, t.title]));
    return (id: string | null): string => (id ? (byId.get(id) ?? '—') : '—');
  }, [tasks]);
  const runningSessions = useMemo(() => sessions.filter((s) => s.status === 'running'), [sessions]);

  // Tempo no status precisa andar sozinho (tick 1s).
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const submit = (id: string): void => {
    const text = (drafts[id] ?? '').trim();
    if (!text) return;
    if (onInstruct(id, text)) {
      setDrafts((d) => ({ ...d, [id]: '' }));
      setSentAt((s) => ({ ...s, [id]: Date.now() }));
      setTimeout(() => setSentAt((s) => ({ ...s, [id]: 0 })), 2500);
    }
  };

  const submitLearning = (): void => {
    const text = learningText.trim();
    if (!text) return;
    onCreateLearning(text, learningCategory.trim() || 'geral');
    setLearningText('');
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
        <span style={{ fontSize: 12 }} title="registrar aprendizado">
          📝
        </span>
        <input
          value={learningText}
          onChange={(e) => setLearningText(e.target.value)}
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
          value={learningCategory}
          onChange={(e) => setLearningCategory(e.target.value)}
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
        <button onClick={submitLearning} disabled={!learningText.trim()} style={queueButtonStyle}>
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
            <h3 style={{ margin: '0 0 10px', fontSize: theme.font.size.md, color: theme.text.muted }}>
              🎓 Learnings para qualificar ({pending.length})
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
                      ✓ reutilizável
                    </button>
                  )}
                  <button
                    onClick={() => onUpdateLearningStatus(l.id, 'discarded')}
                    style={queueButtonStyle}
                    title="descartar"
                  >
                    ✗ descartar
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Fila de decisões pendentes (Story 3.4/FR9) — unificada com tarefas
          em awaiting_decision desde a Story 5.3, AC3 */}
      {(() => {
        const waitingList = sessions.filter(
          (s) => s.agentStatus === 'waiting-input' && s.status === 'running'
        );
        const decidingTasks = tasks.filter((t) => t.state === 'awaiting_decision');
        const total = waitingList.length + decidingTasks.length;
        if (total === 0) return null;
        return (
          <div
            style={{
              marginBottom: 20,
              padding: 14,
              background: WAITING_TINT,
              border: `1px solid ${statusColor('waiting-input')}`,
              borderRadius: theme.radius.md
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: theme.font.size.md, color: statusColor('waiting-input') }}>
              ⏳ Decisões pendentes ({total})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {waitingList.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                  <strong style={{ minWidth: 140 }}>{s.name}</strong>
                  <span style={{ color: theme.text.muted }}>tarefa: {taskTitle(s.taskId)}</span>
                  <span style={{ color: statusColor('waiting-input'), fontFamily: theme.font.mono }}>
                    aguarda há {formatDuration(Date.now() - s.lastStatusChangeAt)}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button onClick={() => onGoToTerminal(s.id)} style={queueButtonStyle}>
                    ir ao terminal →
                  </button>
                </div>
              ))}
              {decidingTasks.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <strong style={{ minWidth: 140 }}>{t.title}</strong>
                  <span style={{ color: theme.text.muted }}>aguardando decisão</span>
                  <span style={{ flex: 1 }} />
                  {classifyTaskRoles(sessions, t.id).isThreeBrain && (
                    <button
                      onClick={() => onOpenReview(t.id)}
                      style={queueButtonStyle}
                      title="painel de revisão lado a lado (Story 7.3)"
                    >
                      🧠 revisão
                    </button>
                  )}
                  <button onClick={() => onDecide(t.id, 'approve')} style={queueButtonStyle} title="aprovar → revisada">
                    ✓ aprovar
                  </button>
                  <button
                    onClick={() => {
                      const justification = window.prompt('Motivo da rejeição (opcional):') ?? undefined;
                      onDecide(t.id, 'reject', justification ? { justification } : {});
                    }}
                    style={queueButtonStyle}
                    title="rejeitar → em execução, com feedback"
                  >
                    ✗ rejeitar
                  </button>
                  <select
                    value={redirectTargets[t.id] ?? ''}
                    onChange={(e) => setRedirectTargets((d) => ({ ...d, [t.id]: e.target.value }))}
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
                      const redirectTo = redirectTargets[t.id];
                      if (!redirectTo) return;
                      onDecide(t.id, 'redirect', { redirectTo });
                      setRedirectTargets((d) => ({ ...d, [t.id]: '' }));
                    }}
                    disabled={!redirectTargets[t.id]}
                    style={queueButtonStyle}
                    title="redirecionar → outro agente"
                  >
                    → redirecionar
                  </button>
                </div>
              ))}
            </div>
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
                    width: 34
                  }}
                >
                  <option value="">—</option>
                  <option value="writer" title="escritor">
                    ✍
                  </option>
                  <option value="reviewer" title="revisor">
                    👁
                  </option>
                </select>
              </span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  value={drafts[s.id] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
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
                {(sentAt[s.id] ?? 0) > 0 && (
                  <span style={{ color: theme.accent.ok, fontSize: theme.font.size.sm }} title="instrução enviada">
                    ✓
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
                  ir ao terminal →
                </button>
              </span>
            </article>
          );
        })}
      </div>

      {/* Vínculos terminal-a-terminal (Épico 9, Story 9.3) — independentes
          de tarefa; um agente na origem pode comandar o alvo. */}
      <h3 style={{ fontSize: theme.font.size.md, fontWeight: 700, margin: '24px 0 10px', color: theme.text.muted }}>
        🔗 Vínculos entre terminais ({terminalLinks.length})
      </h3>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <select
          value={linkSource}
          onChange={(e) => setLinkSource(e.target.value)}
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
        <span style={{ color: theme.text.faint, fontSize: theme.font.size.sm }}>→</span>
        <select
          value={linkTarget}
          onChange={(e) => setLinkTarget(e.target.value)}
          title="Terminal alvo"
          style={selectStyle}
        >
          <option value="">alvo…</option>
          {runningSessions
            .filter((s) => s.id !== linkSource)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
        <select
          value={linkMode}
          onChange={(e) => setLinkMode(e.target.value as TerminalLinkMode)}
          title="Modo do vínculo — manual: botão enviar; auto: dispara sozinho no status da origem"
          style={selectStyle}
        >
          <option value="manual">manual</option>
          <option value="auto">auto</option>
        </select>
        <button
          onClick={() => {
            if (!linkSource || !linkTarget) return;
            onCreateLink(linkSource, linkTarget, linkMode);
            setLinkSource('');
            setLinkTarget('');
          }}
          disabled={!linkSource || !linkTarget}
          style={queueButtonStyle}
        >
          + vincular
        </button>
      </div>
      {terminalLinks.length === 0 ? (
        <p style={{ fontSize: theme.font.size.sm, color: theme.text.faint }}>nenhum vínculo entre terminais ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {terminalLinks.map((l) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span>
                {sessionName(l.sourceId)} → {sessionName(l.targetId)}
              </span>
              <span style={{ color: theme.text.faint }}>({l.mode})</span>
              <span style={{ flex: 1 }} />
              {l.mode === 'manual' && (
                <button onClick={() => onSendLink(l)} style={queueButtonStyle} title="enviar instrução agora">
                  → enviar
                </button>
              )}
              <button onClick={() => onRemoveLink(l.id)} style={queueButtonStyle} title="remover vínculo">
                ✗ remover
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
