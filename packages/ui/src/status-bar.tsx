import type { DaemonStatus } from '@cockpit/shared';
import { statusColor } from './status-colors';
import { theme } from './theme';

/**
 * StatusBar (Story 13.3, FR43) — rodapé persistente com o estado vital do
 * sistema: projeto ativo (nome+cor), branch git (FR44), daemon, sessões
 * ativas e decisões pendentes. Componente de exibição puro — todo dado vem
 * do dono (App), que já espelha tudo isso por push/poll.
 */

export interface StatusBarProps {
  projectName: string;
  projectColor: string | null;
  /** Branch git do projeto ativo — null = pasta sem repositório (estado neutro). */
  gitBranch: string | null;
  daemonState: DaemonStatus['state'];
  activeSessionCount: number;
  /** Agentes waiting-input + tarefas awaiting_decision (badge unificado da 5.3). */
  pendingDecisionCount: number;
  /** Navega à fila de decisões (master) — mesmo atalho do badge do header. */
  onOpenDecisions: () => void;
}

const DAEMON_LABEL: Record<DaemonStatus['state'], string> = {
  connected: 'daemon ok',
  starting: 'daemon subindo…',
  reconnecting: 'daemon reconectando…',
  disconnected: 'daemon desconectado'
};

export function StatusBar(props: StatusBarProps): JSX.Element {
  const daemonColor =
    props.daemonState === 'connected'
      ? theme.accent.ok
      : props.daemonState === 'disconnected'
        ? theme.accent.danger
        : theme.accent.warn;

  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.space.lg,
        padding: `3px ${theme.space.md}px`,
        background: theme.surface.panel,
        borderTop: `1px solid ${theme.border.default}`,
        fontSize: theme.font.size.xs,
        color: theme.text.muted,
        flexShrink: 0,
        userSelect: 'none'
      }}
    >
      <span title="projeto ativo" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: props.projectColor ?? theme.border.strong,
            flexShrink: 0
          }}
        />
        <span style={{ color: theme.text.secondary }}>{props.projectName}</span>
      </span>

      <span title="branch git do projeto (lida de .git/HEAD)" style={{ fontFamily: theme.font.mono }}>
        {props.gitBranch ? `⎇ ${props.gitBranch}` : '⎇ —'}
      </span>

      <span title="estado do daemon de terminais" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: theme.radius.pill, background: daemonColor }} />
        {DAEMON_LABEL[props.daemonState]}
      </span>

      <span style={{ flex: 1 }} />

      <span title="sessões ativas no projeto">
        {props.activeSessionCount} {props.activeSessionCount === 1 ? 'sessão ativa' : 'sessões ativas'}
      </span>

      <button
        onClick={props.onOpenDecisions}
        disabled={props.pendingDecisionCount === 0}
        title={props.pendingDecisionCount > 0 ? 'Ir à fila de decisões pendentes' : 'Nenhuma decisão pendente'}
        style={{
          background: props.pendingDecisionCount > 0 ? statusColor('waiting-input') : 'transparent',
          color: props.pendingDecisionCount > 0 ? theme.text.inverse : theme.text.faint,
          fontWeight: props.pendingDecisionCount > 0 ? 700 : 400,
          border: props.pendingDecisionCount > 0 ? 'none' : `1px solid ${theme.border.subtle}`,
          borderRadius: theme.radius.pill,
          padding: '1px 8px',
          fontSize: theme.font.size.xs,
          cursor: props.pendingDecisionCount > 0 ? 'pointer' : 'default'
        }}
      >
        {props.pendingDecisionCount} {props.pendingDecisionCount === 1 ? 'decisão pendente' : 'decisões pendentes'}
      </button>
    </footer>
  );
}
