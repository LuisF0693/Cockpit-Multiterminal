import { useState } from 'react';
import type { ProjectDirEntry } from '@cockpit/shared';
import { theme } from './theme';

/**
 * FileTree (extraído do ProjectFilesSidebar da 12.1 na Story 14.2) — árvore
 * LAZY de arquivos: só busca filhos ao expandir. Leitura real no Main via
 * `onReadDir` (props); selecionar arquivo delega ao dono (que abre o painel
 * de preview — Story 14.5).
 */

export interface FileTreeProps {
  entries: ProjectDirEntry[] | null;
  onReadDir: (dirPath?: string) => Promise<ProjectDirEntry[]>;
  onSelectFile: (entry: ProjectDirEntry) => void;
  selectedPath: string | null;
}

export function FileTree({ entries, onReadDir, onSelectFile, selectedPath }: FileTreeProps): JSX.Element {
  if (entries === null) {
    return <p style={emptyStyle}>carregando…</p>;
  }
  if (entries.length === 0) {
    return <p style={emptyStyle}>pasta vazia</p>;
  }
  return (
    <div>
      {entries.map((e) => (
        <TreeNode key={e.path} entry={e} depth={0} onReadDir={onReadDir} onSelectFile={onSelectFile} selectedPath={selectedPath} />
      ))}
    </div>
  );
}

function TreeNode({
  entry,
  depth,
  onReadDir,
  onSelectFile,
  selectedPath
}: {
  entry: ProjectDirEntry;
  depth: number;
  onReadDir: (dirPath?: string) => Promise<ProjectDirEntry[]>;
  onSelectFile: (entry: ProjectDirEntry) => void;
  selectedPath: string | null;
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
          gap: 6,
          width: '100%',
          padding: '3px 4px',
          paddingLeft: 4 + depth * 12,
          background: selectedPath === entry.path ? theme.surface.raised : 'transparent',
          border: 'none',
          borderRadius: theme.radius.sm,
          color: theme.text.secondary,
          fontSize: theme.font.size.sm + 0.5,
          fontFamily: theme.font.ui,
          textAlign: 'left',
          cursor: 'pointer'
        }}
      >
        <span style={{ width: 12, color: theme.text.faint, fontSize: 10 }}>
          {entry.isDirectory ? (expanded ? '▾' : '▸') : ''}
        </span>
        <span style={{ fontSize: theme.font.size.xs, opacity: 0.7, width: 12, textAlign: 'center' }}>
          {entry.isDirectory ? '📁' : entry.name.endsWith('.md') ? '📘' : '📄'}
        </span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
      </button>
      {entry.isDirectory && expanded && (
        <div>
          {children === null ? (
            <p style={{ ...emptyStyle, paddingLeft: 16 + (depth + 1) * 12 }}>carregando…</p>
          ) : children.length === 0 ? (
            <p style={{ ...emptyStyle, paddingLeft: 16 + (depth + 1) * 12, color: theme.text.faint }}>vazio</p>
          ) : (
            children.map((c) => (
              <TreeNode key={c.path} entry={c} depth={depth + 1} onReadDir={onReadDir} onSelectFile={onSelectFile} selectedPath={selectedPath} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

const emptyStyle: React.CSSProperties = {
  fontSize: theme.font.size.xs,
  color: theme.text.muted,
  margin: '2px 4px'
};
