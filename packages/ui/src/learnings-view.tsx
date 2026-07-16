import { useMemo, useState } from 'react';
import type { Learning, Project } from '@cockpit/shared';
import { theme } from './theme';

/**
 * LearningsView (Épico 11, Story 11.3) — consulta global de learnings.
 * DELIBERADAMENTE independente do projeto ativo (AC2): "banco separado dos
 * projetos" da visão do fundador significa que esta tela NUNCA filtra pelo
 * projeto ativo automaticamente — o filtro de projeto aqui é uma escolha
 * explícita do usuário, não um escopo herdado (diferente de canvas/master/
 * tasks/board, que são escopados ao projeto ativo desde o Épico 8).
 */

const STATUS_LABEL: Record<Learning['status'], string> = {
  draft: 'rascunho',
  reviewed: 'revisado',
  reusable: 'reutilizável',
  discarded: 'descartado'
};

/** Cores do domínio de learning — derivadas do tema (13.1), distintas das de status de agente. */
const STATUS_DOT: Record<Learning['status'], string> = {
  draft: theme.text.muted,
  reviewed: theme.accent.info,
  reusable: theme.accent.ok,
  discarded: theme.accent.danger
};

export interface LearningsViewProps {
  learnings: Learning[];
  projects: Project[];
}

export function LearningsView({ learnings, projects }: LearningsViewProps): JSX.Element {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const projectName = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p.name]));
    return (id: string | null): string => (id ? (byId.get(id) ?? '—') : '(sem projeto)');
  }, [projects]);

  const categories = useMemo(() => [...new Set(learnings.map((l) => l.category))].sort(), [learnings]);

  const filtered = learnings.filter((l) => {
    if (categoryFilter && l.category !== categoryFilter) return false;
    if (projectFilter && l.projectId !== projectFilter) return false;
    if (search.trim() && !l.text.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <section style={{ flex: 1, minWidth: 0, padding: 24, overflowY: 'auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Learnings</h2>
      <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, margin: '0 0 20px' }}>
        {learnings.length} {learnings.length === 1 ? 'learning' : 'learnings'} no banco global — independente do
        projeto ativo
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="buscar no texto…"
          style={{
            flex: 1,
            minWidth: 180,
            background: theme.surface.raised,
            color: theme.text.primary,
            border: `1px solid ${theme.border.default}`,
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: theme.font.size.md
          }}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle}>
          <option value="">todas as categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={selectStyle}>
          <option value="">todos os projetos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontFamily: theme.font.mono, fontSize: theme.font.size.md, color: theme.text.muted }}>
          {learnings.length === 0 ? 'Nenhum learning registrado ainda.' : 'Nenhum learning corresponde ao filtro.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((l) => (
            <article
              key={l.id}
              style={{
                padding: '10px 14px',
                background: theme.surface.panel,
                border: `1px solid ${theme.border.default}`,
                borderRadius: theme.radius.md,
                fontSize: theme.font.size.md
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: STATUS_DOT[l.status], fontSize: 11 }}>●</span>
                <span style={{ fontSize: theme.font.size.xs, color: theme.text.muted }}>{STATUS_LABEL[l.status]}</span>
                <span
                  style={{
                    fontSize: 10,
                    color: theme.text.faint,
                    textTransform: 'uppercase',
                    border: `1px solid ${theme.border.default}`,
                    borderRadius: theme.radius.sm,
                    padding: '1px 6px'
                  }}
                >
                  {l.category}
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: theme.font.size.xs, color: theme.text.faint }}>{projectName(l.projectId)}</span>
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{l.text}</p>
            </article>
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
  padding: '6px 10px',
  fontSize: theme.font.size.md
};
