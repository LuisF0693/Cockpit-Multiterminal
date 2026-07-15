import { useEffect, useState } from 'react';
import type { Project, ProjectDirEntry } from '@cockpit/shared';
import { renderMarkdownLite } from './markdown-lite';

/**
 * ProjectFilesSidebar (Story 12.1, FR34) — une `ProjectSidebar` (8.2) e
 * `FileExplorer` (8.4) numa ÚNICA barra lateral persistente, substituindo a
 * view dedicada `'files'`. Faixa estreita de projetos à esquerda (mesmo
 * componente/comportamento da 8.2) + árvore de arquivos do projeto ativo à
 * direita, sempre visível — sem precisar navegar a outra tela (AC1).
 * Leitura real continua no Main (Zod na borda) — este componente só chama
 * `onReadDir`/`onReadFile` (props), nunca `fs` diretamente (mesmo princípio
 * de fronteira de processo da 8.4).
 */

export interface ProjectFilesSidebarProps {
  projects: Project[];
  activeId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  /** Cria um terminal NESSE projeto sem trocar o ativo (Story 8.3, AC3). */
  onCreateTerminalIn: (id: string) => void;
  onReadDir: (dirPath?: string) => Promise<ProjectDirEntry[]>;
  onReadFile: (path: string) => Promise<{ content: string; truncated: boolean } | null>;
}

interface SelectedFile {
  path: string;
  name: string;
  content: string;
  truncated: boolean;
}

export function ProjectFilesSidebar({
  projects,
  activeId,
  onSelectProject,
  onCreateProject,
  onCreateTerminalIn,
  onReadDir,
  onReadFile
}: ProjectFilesSidebarProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const [rootEntries, setRootEntries] = useState<ProjectDirEntry[] | null>(null);
  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  // Projeto trocou (8.2) — reseta a árvore e o preview (AC2).
  useEffect(() => {
    setRootEntries(null);
    setSelected(null);
    void onReadDir(undefined).then(setRootEntries);
  }, [activeId]);

  const selectFile = (entry: ProjectDirEntry): void => {
    setLoadingFile(entry.path);
    void onReadFile(entry.path)
      .then((res) =>
        setSelected(
          res
            ? { path: entry.path, name: entry.name, content: res.content, truncated: res.truncated }
            : { path: entry.path, name: entry.name, content: '(arquivo binário ou ilegível)', truncated: false }
        )
      )
      .finally(() => setLoadingFile(null));
  };

  const isMarkdown = selected ? /\.mdx?$/i.test(selected.name) : false;

  return (
    <aside style={{ display: 'flex', flexShrink: 0 }}>
      <div
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
            onClick={() => onSelectProject(p.id)}
            onDoubleClick={() => onCreateTerminalIn(p.id)}
            title={`${p.name} — ${p.rootPath}\n(duplo-clique: novo terminal aqui, sem trocar de projeto)`}
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
        <button onClick={onCreateProject} title="Novo projeto" style={dashedButtonStyle}>
          +
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={() => setCollapsed((v) => !v)} title={collapsed ? 'Expandir arquivos' : 'Recolher arquivos'} style={dashedButtonStyle}>
          {collapsed ? '»' : '«'}
        </button>
      </div>

      {!collapsed && (
        <div
          style={{
            width: 260,
            display: 'flex',
            flexDirection: 'column',
            background: '#0D131B',
            borderRight: '1px solid #1F2937',
            overflow: 'hidden'
          }}
        >
          {selected ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  borderBottom: '1px solid #1F2937',
                  flexShrink: 0
                }}
              >
                <button onClick={() => setSelected(null)} title="voltar à árvore" style={dashedButtonStyle}>
                  ←
                </button>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {selected.name}
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 12 }}>
                {selected.truncated && (
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 8px' }}>
                    (truncado — arquivo grande demais para o preview completo)
                  </p>
                )}
                {isMarkdown ? (
                  renderMarkdownLite(selected.content)
                ) : (
                  <pre
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#E5E7EB',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {selected.content}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '8px 4px' }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#6B7280',
                  letterSpacing: 1,
                  margin: '2px 8px 6px',
                  textTransform: 'uppercase'
                }}
              >
                Arquivos
              </p>
              {rootEntries === null ? (
                <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 8px' }}>carregando…</p>
              ) : rootEntries.length === 0 ? (
                <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 8px' }}>pasta vazia</p>
              ) : (
                rootEntries.map((e) => (
                  <TreeNode
                    key={e.path}
                    entry={e}
                    depth={0}
                    onReadDir={onReadDir}
                    onSelectFile={selectFile}
                    selectedPath={selected ? (selected as SelectedFile).path : null}
                    loadingFile={loadingFile}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function TreeNode({
  entry,
  depth,
  onReadDir,
  onSelectFile,
  selectedPath,
  loadingFile
}: {
  entry: ProjectDirEntry;
  depth: number;
  onReadDir: (dirPath?: string) => Promise<ProjectDirEntry[]>;
  onSelectFile: (entry: ProjectDirEntry) => void;
  selectedPath: string | null;
  loadingFile: string | null;
}): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<ProjectDirEntry[] | null>(null);

  const toggle = (): void => {
    if (!entry.isDirectory) {
      onSelectFile(entry);
      return;
    }
    if (!expanded && children === null) {
      void onReadDir(entry.path).then(setChildren);
    }
    setExpanded((v) => !v);
  };

  return (
    <div>
      <button
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          padding: '3px 4px',
          paddingLeft: 8 + depth * 14,
          background: selectedPath === entry.path ? '#111827' : 'transparent',
          border: 'none',
          color: '#E5E7EB',
          fontSize: 12,
          textAlign: 'left',
          cursor: 'pointer'
        }}
      >
        <span style={{ width: 12, color: '#6B7280' }}>{entry.isDirectory ? (expanded ? '▾' : '▸') : ''}</span>
        <span>{entry.isDirectory ? '📁' : '📄'}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name}
        </span>
        {loadingFile === entry.path && <span style={{ fontSize: 10, color: '#6B7280' }}>…</span>}
      </button>
      {entry.isDirectory && expanded && (
        <div>
          {children === null ? (
            <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0', paddingLeft: 8 + (depth + 1) * 14 }}>
              carregando…
            </p>
          ) : children.length === 0 ? (
            <p style={{ fontSize: 11, color: '#4B5563', margin: '2px 0', paddingLeft: 8 + (depth + 1) * 14 }}>
              vazio
            </p>
          ) : (
            children.map((c) => (
              <TreeNode
                key={c.path}
                entry={c}
                depth={depth + 1}
                onReadDir={onReadDir}
                onSelectFile={onSelectFile}
                selectedPath={selectedPath}
                loadingFile={loadingFile}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

const dashedButtonStyle: React.CSSProperties = {
  width: 32,
  height: 22,
  borderRadius: 6,
  border: '1px solid #1F2937',
  background: 'transparent',
  color: '#9CA3AF',
  fontSize: 12,
  cursor: 'pointer'
};
