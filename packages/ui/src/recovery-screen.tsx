import { useState } from 'react';
import type { CrashSummary } from '@cockpit/shared';
import { theme } from './theme';

/**
 * RecoveryScreen (Story 4.3) — mostrada quando o boot anterior não fechou
 * graciosamente (clean_shutdown ≠ '1', FR12). Bloqueia o app até o usuário
 * decidir: nenhum terminal é relançado/adotado automaticamente enquanto
 * esta tela está de pé (AC1). "Tarefas em andamento" fica de fora — entidade
 * do E5, ainda não existe (mesmo tratamento do "tarefa: —" do master).
 */

export interface RecoveryScreenProps {
  summary: CrashSummary;
  onResolve: (choice: 'all' | 'selective' | 'clean', keepIds?: string[]) => void;
}

const ORIGIN_ICON: Record<CrashSummary['lastEvents'][number]['origin'], string> = {
  system: '⚙️',
  agent: '🤖',
  human: '👤'
};

export function RecoveryScreen({ summary, onResolve }: RecoveryScreenProps): JSX.Element {
  const [kept, setKept] = useState<Set<string>>(() => new Set(summary.terminals.map((t) => t.id)));

  const toggle = (id: string): void => {
    setKept((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section
      style={{
        flex: 1,
        minWidth: 0,
        padding: 24,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }}
    >
      <div>
        <h2 style={{ fontSize: theme.font.size.xl, fontWeight: 700, margin: '0 0 4px', color: theme.accent.warn }}>
          ⚠️ Fechamento inesperado detectado
        </h2>
        <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, margin: 0 }}>
          O Cockpit não fechou graciosamente da última vez. Reveja o que estava em andamento antes de
          continuar.
        </p>
      </div>

      <div>
        <h3 style={{ fontSize: theme.font.size.md, color: theme.text.muted, margin: '0 0 8px' }}>
          Terminais ativos no momento do crash ({summary.terminals.length})
        </h3>
        {summary.terminals.length === 0 && (
          <p style={{ fontFamily: theme.font.mono, fontSize: theme.font.size.md, color: theme.text.muted }}>
            Nenhum terminal ativo persistido.
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {summary.terminals.map((t) => (
            <label
              key={t.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '20px 1.4fr 0.8fr 2fr 1fr',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                background: theme.surface.panel,
                border: `1px solid ${theme.border.default}`,
                borderRadius: theme.radius.md,
                fontSize: theme.font.size.sm,
                cursor: 'pointer'
              }}
            >
              <input type="checkbox" checked={kept.has(t.id)} onChange={() => toggle(t.id)} />
              <strong>{t.name}</strong>
              <span style={{ color: theme.text.muted }}>{t.adapterId}</span>
              <span style={{ color: theme.text.faint, fontFamily: theme.font.mono }}>{t.cwd}</span>
              <span style={{ color: theme.text.muted }}>último status: {t.lastKnownStatus}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: theme.font.size.md, color: theme.text.muted, margin: '0 0 8px' }}>Últimos eventos</h3>
        {summary.lastEvents.length === 0 && (
          <p style={{ fontFamily: theme.font.mono, fontSize: theme.font.size.md, color: theme.text.muted }}>Sem eventos registrados.</p>
        )}
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {summary.lastEvents.map((e) => (
            <li
              key={e.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '150px 28px 1.2fr 2fr',
                gap: 10,
                alignItems: 'baseline',
                padding: '5px 12px',
                background: theme.surface.panel,
                border: `1px solid ${theme.border.default}`,
                borderRadius: 6,
                fontSize: theme.font.size.sm
              }}
            >
              <span style={{ color: theme.text.faint, fontFamily: theme.font.mono }}>
                {new Date(e.ts).toLocaleTimeString('pt-BR')}
              </span>
              <span title={e.origin}>{ORIGIN_ICON[e.origin]}</span>
              <span style={{ color: theme.text.primary, fontFamily: theme.font.mono }}>{e.type}</span>
              <span style={{ color: theme.text.faint }}>{e.terminalId ?? '—'}</span>
            </li>
          ))}
        </ol>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 12 }}>
        <button
          onClick={() => onResolve('all')}
          style={{ ...actionButtonStyle, background: theme.accent.ok, color: theme.text.inverse, fontWeight: 600 }}
        >
          Restaurar tudo
        </button>
        <button
          onClick={() => onResolve('selective', [...kept])}
          disabled={summary.terminals.length === 0}
          style={actionButtonStyle}
        >
          Restaurar selecionados ({kept.size})
        </button>
        <button
          onClick={() => onResolve('clean')}
          style={{
            ...actionButtonStyle,
            background: 'transparent',
            border: `1px solid ${theme.accent.danger}`,
            color: theme.accent.danger
          }}
        >
          Sessão limpa (arquivar tudo)
        </button>
      </div>
    </section>
  );
}

const actionButtonStyle: React.CSSProperties = {
  background: theme.surface.raised,
  color: theme.text.primary,
  border: `1px solid ${theme.border.default}`,
  borderRadius: 6,
  padding: '8px 16px',
  fontSize: theme.font.size.md,
  cursor: 'pointer'
};
