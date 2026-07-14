import { useEffect, useState } from 'react';
import type { ProjectDirEntry } from '@cockpit/shared';

/**
 * FileExplorer (Story 8.4) — árvore navegável do projeto ativo (AC1),
 * expansão lazy por pasta (só busca filhos quando expandida) + preview de
 * leitura de arquivo de texto (AC2). Leitura real acontece no Main — este
 * componente só chama `onReadDir`/`onReadFile` (props), nunca toca `fs`
 * diretamente (AC4, decisão crítica de fronteira já usada em todo o app).
 */

export interface FileExplorerProps {
  projectId: string;
  rootLabel: string;
  onReadDir: (dirPath?: string) => Promise<ProjectDirEntry[]>;
  onReadFile: (path: string) => Promise<{ content: string; truncated: boolean } | null>;
  onBack: () => void;
}

interface SelectedFile {
  path: string;
  name: string;
  content: string;
  truncated: boolean;
}

export function FileExplorer({ projectId, rootLabel, onReadDir, onReadFile, onBack }: FileExplorerProps): JSX.Element {
  const [rootEntries, setRootEntries] = useState<ProjectDirEntry[] | null>(null);
  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  // Projeto trocou (8.2) — reseta a árvore e o preview.
  useEffect(() => {
    setRootEntries(null);
    setSelected(null);
    void onReadDir(undefined).then(setRootEntries);
  }, [projectId]);

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

  return (
    <section style={{ flex: 1, minWidth: 0, padding: 24, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={buttonStyle}>
          ← voltar
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Arquivos · {rootLabel}</h2>
      </div>
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        <div
          style={{
            width: 280,
            flexShrink: 0,
            overflowY: 'auto',
            border: '1px solid #1F2937',
            borderRadius: 8,
            padding: 8
          }}
        >
          {rootEntries === null ? (
            <p style={{ fontSize: 12, color: '#6B7280', margin: 4 }}>carregando…</p>
          ) : rootEntries.length === 0 ? (
            <p style={{ fontSize: 12, color: '#6B7280', margin: 4 }}>pasta vazia</p>
          ) : (
            rootEntries.map((e) => (
              <TreeNode
                key={e.path}
                entry={e}
                depth={0}
                onReadDir={onReadDir}
                onSelectFile={selectFile}
                selectedPath={selected?.path ?? null}
                loadingFile={loadingFile}
              />
            ))
          )}
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'auto',
            border: '1px solid #1F2937',
            borderRadius: 8,
            padding: 12
          }}
        >
          {!selected ? (
            <p style={{ fontSize: 12, color: '#6B7280' }}>selecione um arquivo para visualizar</p>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
                {selected.name}
                {selected.truncated ? ' (truncado — arquivo grande demais para o preview completo)' : ''}
              </div>
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
            </>
          )}
        </div>
      </div>
    </section>
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
          paddingLeft: 4 + depth * 14,
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
            <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0', paddingLeft: 4 + (depth + 1) * 14 }}>
              carregando…
            </p>
          ) : children.length === 0 ? (
            <p style={{ fontSize: 11, color: '#4B5563', margin: '2px 0', paddingLeft: 4 + (depth + 1) * 14 }}>
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

const buttonStyle: React.CSSProperties = {
  background: '#111827',
  color: '#E5E7EB',
  border: '1px solid #1F2937',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};
