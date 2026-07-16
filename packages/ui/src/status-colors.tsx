import type { AgentStatus } from '@cockpit/shared';

/**
 * Código de cores de status (Story 2.5, AC1) — fonte de verdade ÚNICA:
 * tile, sidebar e header consomem daqui (front-end spec: tokens-first).
 */

// Valores alinhados à paleta Multerminal (Story 14.1, FR47) — âmbar do
// waiting-input preservado (contrato do FR9/teste).
export const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: '#71717A',
  working: '#4ADE80',
  'waiting-input': '#FBBF24',
  done: '#60A5FA',
  error: '#F87171'
};

export const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'ocioso',
  working: 'trabalhando',
  'waiting-input': 'aguardando você',
  done: 'concluído',
  error: 'erro'
};

export function statusColor(status: AgentStatus): string {
  return STATUS_COLORS[status];
}

export function statusLabel(status: AgentStatus): string {
  return STATUS_LABELS[status];
}

/**
 * Keyframes globais — renderizar UMA vez (App): pulso de waiting-input
 * (2.5) + animações do mock Multerminal (14.4): fluxo do tracejado e da
 * bolinha nos vínculos, pulso do dot de status no tile.
 */
export function StatusPulseStyles(): JSX.Element {
  return (
    <style>{`
      @keyframes cockpit-waiting-pulse {
        0%, 100% { box-shadow: 0 0 0 1px ${STATUS_COLORS['waiting-input']}66, 0 0 12px 2px ${STATUS_COLORS['waiting-input']}44; }
        50% { box-shadow: 0 0 0 2px ${STATUS_COLORS['waiting-input']}CC, 0 0 20px 6px ${STATUS_COLORS['waiting-input']}77; }
      }
      @keyframes cockpit-dashflow { to { stroke-dashoffset: -24; } }
      @keyframes cockpit-flowmove {
        from { offset-distance: 0%; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        to { offset-distance: 100%; opacity: 0; }
      }
      @keyframes cockpit-pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
    `}</style>
  );
}
