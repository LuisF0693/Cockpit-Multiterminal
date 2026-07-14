import { useState } from 'react';
import type { CrashSummary } from '@cockpit/shared';

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
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#FBBF24' }}>
          ⚠️ Fechamento inesperado detectado
        </h2>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
          O Cockpit não fechou graciosamente da última vez. Reveja o que estava em andamento antes de
          continuar.
        </p>
      </div>

      <div>
        <h3 style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 8px' }}>
          Terminais ativos no momento do crash ({summary.terminals.length})
        </h3>
        {summary.terminals.length === 0 && (
          <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280' }}>
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
                background: '#0D131B',
                border: '1px solid #1F2937',
                borderRadius: 8,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              <input type="checkbox" checked={kept.has(t.id)} onChange={() => toggle(t.id)} />
              <strong>{t.name}</strong>
              <span style={{ color: '#9CA3AF' }}>{t.adapterId}</span>
              <span style={{ color: '#6B7280', fontFamily: 'monospace' }}>{t.cwd}</span>
              <span style={{ color: '#9CA3AF' }}>último status: {t.lastKnownStatus}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 8px' }}>Últimos eventos</h3>
        {summary.lastEvents.length === 0 && (
          <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280' }}>Sem eventos registrados.</p>
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
                background: '#0D131B',
                border: '1px solid #1F2937',
                borderRadius: 6,
                fontSize: 12
              }}
            >
              <span style={{ color: '#6B7280', fontFamily: 'monospace' }}>
                {new Date(e.ts).toLocaleTimeString('pt-BR')}
              </span>
              <span title={e.origin}>{ORIGIN_ICON[e.origin]}</span>
              <span style={{ color: '#E5E7EB', fontFamily: 'monospace' }}>{e.type}</span>
              <span style={{ color: '#6B7280' }}>{e.terminalId ?? '—'}</span>
            </li>
          ))}
        </ol>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 12 }}>
        <button onClick={() => onResolve('all')} style={{ ...actionButtonStyle, background: '#059669' }}>
          Restaurar tudo
        </button>
        <button
          onClick={() => onResolve('selective', [...kept])}
          disabled={summary.terminals.length === 0}
          style={actionButtonStyle}
        >
          Restaurar selecionados ({kept.size})
        </button>
        <button onClick={() => onResolve('clean')} style={{ ...actionButtonStyle, background: '#7F1D1D' }}>
          Sessão limpa (arquivar tudo)
        </button>
      </div>
    </section>
  );
}

const actionButtonStyle: React.CSSProperties = {
  background: '#111827',
  color: '#E5E7EB',
  border: '1px solid #1F2937',
  borderRadius: 6,
  padding: '8px 16px',
  fontSize: 13,
  cursor: 'pointer'
};
