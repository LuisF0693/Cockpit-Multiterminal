import type { Project } from '@cockpit/shared';

/**
 * ProjectSidebar (Story 8.2) — faixa estreita de projetos (cor + inicial),
 * PARALELA à Sidebar de sessões (que continua escopada ao projeto ativo).
 * "Projeto" (caminho raiz real no disco) é DIFERENTE de "workspace" (3.6,
 * agrupamento livre de tiles DENTRO de um projeto) — ambos coexistem.
 */

export interface ProjectSidebarProps {
  projects: Project[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function ProjectSidebar({ projects, activeId, onSelect, onCreate }: ProjectSidebarProps): JSX.Element {
  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        width: 44,
        padding: '8px 0',
        background: '#0B0F14',
        borderRight: '1px solid #1F2937',
        flexShrink: 0
      }}
    >
      {projects.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          title={`${p.name} — ${p.rootPath}`}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: p.id === activeId ? '2px solid #E5E7EB' : '2px solid transparent',
            background: p.color,
            color: '#0B0F14',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {p.name.slice(0, 1).toUpperCase()}
        </button>
      ))}
      <button
        onClick={onCreate}
        title="Novo projeto"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: '1px dashed #374151',
          background: 'transparent',
          color: '#9CA3AF',
          fontSize: 16,
          cursor: 'pointer'
        }}
      >
        +
      </button>
    </aside>
  );
}
