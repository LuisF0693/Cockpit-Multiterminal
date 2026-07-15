import { useEffect, useRef, useState } from 'react';
import type { Project, ProjectDirEntry } from '@cockpit/shared';
import { renderMarkdownLite } from './markdown-lite';
import { theme } from './theme';

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
  // Painel redimensionável por arraste (pedido do fundador na validação
  // visual do Épico 12) — mesmo princípio de dragRef+listeners globais já
  // usado pelo TerminalTile pra resize de tile.
  const [panelWidth, setPanelWidth] = useState(260);
  const resizeRef = useRef<{ startX: number; originWidth: number } | null>(null);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent): void => {
      const drag = resizeRef.current;
      if (!drag) return;
      const next = drag.originWidth + (e.clientX - drag.startX);
      setPanelWidth(Math.min(560, Math.max(200, next)));
    };
    const onPointerUp = (): void => {
      resizeRef.current = null;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const startResize = (e: React.PointerEvent): void => {
    resizeRef.current = { startX: e.clientX, originWidth: panelWidth };
  };

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
          background: theme.surface.app,
          borderRight: `1px solid ${theme.border.default}`,
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
              borderRadius: theme.radius.md,
              border: p.id === activeId ? `2px solid ${theme.text.primary}` : '2px solid transparent',
              background: p.color,
              color: theme.text.inverse,
              fontSize: theme.font.size.sm,
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
            position: 'relative',
            width: panelWidth,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: theme.surface.panel,
            borderRight: `1px solid ${theme.border.default}`,
            overflow: 'hidden'
          }}
        >
          {/* Alça de resize por arraste — largura do painel, não colapsa/expande (isso é o botão «/»). */}
          <div
            onPointerDown={startResize}
            style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'ew-resize', zIndex: 1 }}
          />
          {selected ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  borderBottom: `1px solid ${theme.border.default}`,
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
                  <p style={{ fontSize: theme.font.size.xs, color: theme.text.muted, margin: '0 0 8px' }}>
                    (truncado — arquivo grande demais para o preview completo)
                  </p>
                )}
                {isMarkdown ? (
                  renderMarkdownLite(selected.content)
                ) : (
                  <pre
                    style={{
                      margin: 0,
                      fontSize: theme.font.size.sm,
                      fontFamily: theme.font.mono,
                      color: theme.text.primary,
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
                  color: theme.text.faint,
                  letterSpacing: 1,
                  margin: '2px 8px 6px',
                  textTransform: 'uppercase'
                }}
              >
                Arquivos
              </p>
              {rootEntries === null ? (
                <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, margin: '4px 8px' }}>carregando…</p>
              ) : rootEntries.length === 0 ? (
                <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, margin: '4px 8px' }}>pasta vazia</p>
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
          background: selectedPath === entry.path ? theme.surface.raised : 'transparent',
          border: 'none',
          color: theme.text.primary,
          fontSize: theme.font.size.sm,
          textAlign: 'left',
          cursor: 'pointer'
        }}
      >
        <span style={{ width: 12, color: theme.text.faint }}>{entry.isDirectory ? (expanded ? '▾' : '▸') : ''}</span>
        <span>{entry.isDirectory ? '📁' : '📄'}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name}
        </span>
        {loadingFile === entry.path && <span style={{ fontSize: 10, color: theme.text.faint }}>…</span>}
      </button>
      {entry.isDirectory && expanded && (
        <div>
          {children === null ? (
            <p style={{ fontSize: theme.font.size.xs, color: theme.text.muted, margin: '2px 0', paddingLeft: 8 + (depth + 1) * 14 }}>
              carregando…
            </p>
          ) : children.length === 0 ? (
            <p style={{ fontSize: theme.font.size.xs, color: theme.text.faint, margin: '2px 0', paddingLeft: 8 + (depth + 1) * 14 }}>
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
  border: `1px solid ${theme.border.default}`,
  background: 'transparent',
  color: theme.text.muted,
  fontSize: theme.font.size.sm,
  cursor: 'pointer'
};
