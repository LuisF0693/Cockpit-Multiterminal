import { ICON_SIZE, Icon, Icons, type LucideIcon } from './icons';
import { theme } from './theme';

/**
 * AppToolbar (Story 15.5, FR57) — grupo de ícones da faixa de comando única
 * (Story 15.5 + auditoria UX Don Norman, achado #3): cada ícone dispara uma
 * AÇÃO REAL existente, com tooltip; nenhum ícone decorativo. Inclui os
 * toggles de colapso dos painéis (FR58 — canvas maior) e a pill central de
 * prontidão REAL. Renderiza SEM wrapper próprio (Fragment) — é composto
 * diretamente dentro do `<header>` do App, que já é a única faixa de
 * comando; antes vivia numa segunda faixa de 38px empilhada sob o header,
 * duplicando "+ novo terminal"/"+ browser" e consumindo 80px de altura só
 * pra oferecer as mesmas duas ações do header em dois lugares.
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
    <>
      {/* "abrir um terminal" e "abrir um browser" — os dois botões que o
          fundador citou nominalmente ao pedir a troca dos emojis por ícones. */}
      <ToolButton glyph={Icons.terminalNew} title="Novo terminal (Ctrl+N)" onClick={props.onNewTerminal} badge="add" />
      <ToolButton glyph={Icons.browser} title="Novo preview de browser (Playwright)" onClick={props.onNewBrowser} badge="add" />

      <Divider />

      <ToolButton glyph={Icons.timeline} title="Timeline de eventos (Ctrl+T)" onClick={props.onOpenTimeline} />
      <ToolButton glyph={Icons.learnings} title="Learnings (banco global)" onClick={props.onOpenLearnings} />
      <ToolButton glyph={Icons.agents} title="Catálogo de agentes" onClick={props.onOpenAgents} />

      <Divider />

      <ToolButton
        glyph={Icons.panelLeft}
        title={props.sidebarCollapsed ? 'Mostrar sidebar' : 'Ocultar sidebar (canvas maior)'}
        active={props.sidebarCollapsed}
        onClick={props.onToggleSidebar}
      />
      <ToolButton
        glyph={Icons.panelRight}
        title={props.telemetryCollapsed ? 'Mostrar telemetria' : 'Ocultar telemetria (canvas maior)'}
        active={props.telemetryCollapsed}
        onClick={props.onToggleTelemetry}
      />
      <ToolButton
        glyph={Icons.panelBottom}
        title={props.sessionsBarCollapsed ? 'Mostrar rodapé de sessões' : 'Ocultar rodapé de sessões (canvas maior)'}
        active={props.sessionsBarCollapsed}
        onClick={props.onToggleSessionsBar}
      />

      <Divider />

      {/* Pill de prontidão REAL (mock linha 56) — sessões sem pendência.
          Cor segue a proporção de verdade (auditoria UX Don Norman, achado #1):
          só é verde quando TODAS as sessões rodando estão prontas; caso
          contrário é âmbar (parcial/nenhuma pronta), e neutra sem sessões
          rodando — nunca mais "0/5 prontos" num pill que parece "tudo ok". */}
      {(() => {
        const { readyCount, runningCount } = props;
        const noneRunning = runningCount === 0;
        const allReady = !noneRunning && readyCount === runningCount;
        const dotColor = noneRunning ? theme.text.muted : allReady ? theme.accent.ok : theme.accent.warn;
        return (
          <span
            title="Sessões rodando sem pendência (ocioso/concluído) sobre o total rodando"
            style={{
              padding: '4px 10px',
              borderRadius: theme.radius.pill,
              background: `color-mix(in srgb, ${dotColor} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${dotColor} 40%, transparent)`,
              color: dotColor,
              fontSize: theme.font.size.xs + 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor }} />
            {readyCount}/{runningCount} prontos
          </span>
        );
      })()}

      <ToolButton glyph={Icons.zoomReset} title="Zoom 100%" onClick={props.onZoomReset} />
      <ToolButton glyph={Icons.settings} title="Configurações" onClick={props.onOpenSettings} />
    </>
  );
}

/**
 * Botão de ícone da faixa: o ícone é o ÚNICO conteúdo, então o `title` (que
 * já existia como tooltip) vira TAMBÉM o nome acessível via `aria-label` —
 * sem isso o botão é literalmente mudo para leitor de tela.
 * `badge="add"` desenha um "+" miúdo no canto, que era o que os antigos
 * "⌨+"/"🌐+" comunicavam ("criar um novo", não "abrir o existente").
 */
function ToolButton({
  glyph,
  title,
  onClick,
  active,
  badge
}: {
  glyph: LucideIcon;
  title: string;
  onClick: () => void;
  active?: boolean;
  badge?: 'add';
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        position: 'relative',
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
        fontFamily: theme.font.ui
      }}
    >
      <Icon glyph={glyph} size={ICON_SIZE.md} />
      {badge === 'add' && (
        <Icon glyph={Icons.add} size={ICON_SIZE.xs - 2} style={{ position: 'absolute', right: 1, bottom: 1 }} />
      )}
    </button>
  );
}

function Divider(): JSX.Element {
  return <span style={{ width: 1, height: 16, background: theme.border.default, margin: '0 4px' }} />;
}
