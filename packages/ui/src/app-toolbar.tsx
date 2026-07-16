import { theme } from './theme';

/**
 * AppToolbar (Story 15.5, FR57) — barra de ícones de 38px abaixo do header
 * (estilo referência): cada ícone dispara uma AÇÃO REAL existente, com
 * tooltip; nenhum ícone decorativo. Inclui os toggles de colapso dos
 * painéis (FR58 — canvas maior) e a pill central de prontidão REAL.
 */

export interface AppToolbarProps {
  onNewTerminal: () => void;
  onNewBrowser: () => void;
  onOpenTimeline: () => void;
  onOpenLearnings: () => void;
  onOpenAgents: () => void;
  onOpenSettings: () => void;
  onZoomReset: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  telemetryCollapsed: boolean;
  onToggleTelemetry: () => void;
  sessionsBarCollapsed: boolean;
  onToggleSessionsBar: () => void;
  /** Prontidão REAL: sessões rodando sem pendência (idle/done) / rodando. */
  readyCount: number;
  runningCount: number;
}

export function AppToolbar(props: AppToolbarProps): JSX.Element {
  return (
    <div
      style={{
        height: 38,
        minHeight: 38,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 14px',
        background: theme.surface.panel,
        borderBottom: `1px solid ${theme.border.subtle}`,
        fontFamily: theme.font.ui
      }}
    >
      <ToolButton glyph="⌨+" title="Novo terminal (Ctrl+N)" onClick={props.onNewTerminal} />
      <ToolButton glyph="🌐+" title="Novo preview de browser (Playwright)" onClick={props.onNewBrowser} />

      <Divider />

      <ToolButton glyph="≡" title="Timeline de eventos (Ctrl+T)" onClick={props.onOpenTimeline} />
      <ToolButton glyph="🎓" title="Learnings (banco global)" onClick={props.onOpenLearnings} />
      <ToolButton glyph="🤖" title="Catálogo de agentes" onClick={props.onOpenAgents} />

      <Divider />

      <ToolButton
        glyph="⟨"
        title={props.sidebarCollapsed ? 'Mostrar sidebar' : 'Ocultar sidebar (canvas maior)'}
        active={props.sidebarCollapsed}
        onClick={props.onToggleSidebar}
      />
      <ToolButton
        glyph="⟩"
        title={props.telemetryCollapsed ? 'Mostrar telemetria' : 'Ocultar telemetria (canvas maior)'}
        active={props.telemetryCollapsed}
        onClick={props.onToggleTelemetry}
      />
      <ToolButton
        glyph="⌄"
        title={props.sessionsBarCollapsed ? 'Mostrar rodapé de sessões' : 'Ocultar rodapé de sessões (canvas maior)'}
        active={props.sessionsBarCollapsed}
        onClick={props.onToggleSessionsBar}
      />

      <div style={{ flex: 1 }} />

      {/* Pill de prontidão REAL (mock linha 56) — sessões sem pendência. */}
      <span
        title="Sessões rodando sem pendência (ocioso/concluído) sobre o total rodando"
        style={{
          padding: '4px 10px',
          borderRadius: theme.radius.pill,
          background: 'color-mix(in srgb, var(--ck-accent-ok) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--ck-accent-ok) 40%, transparent)',
          color: theme.accent.ok,
          fontSize: theme.font.size.xs + 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 5
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.accent.ok }} />
        {props.readyCount}/{props.runningCount} prontos
      </span>

      <div style={{ flex: 1 }} />

      <ToolButton glyph="⛶" title="Zoom 100%" onClick={props.onZoomReset} />
      <ToolButton glyph="⚙" title="Configurações" onClick={props.onOpenSettings} />
    </div>
  );
}

function ToolButton({
  glyph,
  title,
  onClick,
  active
}: {
  glyph: string;
  title: string;
  onClick: () => void;
  active?: boolean;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        minWidth: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 5px',
        borderRadius: 5,
        border: active ? `1px solid ${theme.accent.ring}` : '1px solid transparent',
        background: active ? theme.accent.soft : 'transparent',
        color: active ? theme.accent.bright : theme.text.muted,
        cursor: 'pointer',
        fontSize: theme.font.size.sm + 1,
        fontFamily: theme.font.ui
      }}
    >
      {glyph}
    </button>
  );
}

function Divider(): JSX.Element {
  return <span style={{ width: 1, height: 16, background: theme.border.default, margin: '0 4px' }} />;
}
