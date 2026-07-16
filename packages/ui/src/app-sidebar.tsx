import type { AdapterInfo, Project, ProjectDirEntry } from '@cockpit/shared';
import { adapterCatalogEntry } from './adapter-catalog';
import { adapterColor } from './adapter-colors';
import { FileTree } from './file-tree';
import { theme } from './theme';

/**
 * AppSidebar (Story 14.2, FR48) — sidebar única de 240px em seções, anatomia
 * do mockup Multerminal (`docs/prd/referencia-visual-multerminal.dc.html`,
 * linhas 64-119): PROJETO (ativo + branch git), NOVO AGENTE (adapters reais
 * com descrição — clicar cria terminal), PROJETOS, ARQUIVOS (árvore lazy) e
 * APP & SISTEMA (views secundárias), com rodapé de build. SÓ dados reais
 * (decisão do fundador): sem custos, sem "PARALELOS" — branch git entra
 * como o dado git-native real que já existe (13.3).
 */

export interface AppSidebarProps {
  projects: Project[];
  activeProjectId: string;
  gitBranch: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  /** Cria terminal no projeto SEM trocar o ativo (duplo-clique, 8.3 AC3). */
  onCreateTerminalIn: (projectId: string) => void;
  adapters: AdapterInfo[];
  onCreateTerminal: (adapterId: string) => void;
  rootEntries: ProjectDirEntry[] | null;
  onReadDir: (dirPath?: string) => Promise<ProjectDirEntry[]>;
  onSelectFile: (entry: ProjectDirEntry) => void;
  selectedFilePath: string | null;
  /** Entradas de APP & SISTEMA — views secundárias reais (label + ícone + ativo). */
  systemEntries: Array<{ icon: string; label: string; active: boolean; onClick: () => void }>;
  appVersion: string;
}

export function AppSidebar(props: AppSidebarProps): JSX.Element {
  const active = props.projects.find((p) => p.id === props.activeProjectId) ?? null;

  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        background: theme.surface.panel,
        borderRight: `1px solid ${theme.border.subtle}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: theme.font.ui
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', fontSize: theme.font.size.sm }}>
        <SectionTitle>PROJETO</SectionTitle>
        {active ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              padding: '6px 8px',
              borderRadius: 5,
              border: `1px solid ${theme.border.default}`,
              marginBottom: 14
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: active.color, flexShrink: 0 }} />
              <span style={{ color: theme.text.primary, fontSize: theme.font.size.sm + 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {active.name}
              </span>
            </div>
            <div title={active.rootPath} style={{ color: theme.text.faint, fontSize: theme.font.size.xs - 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {active.rootPath}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  color: theme.accent.ok,
                  fontSize: 9,
                  background: '#12261F',
                  border: '1px solid #1F4D3A',
                  padding: '1px 5px',
                  borderRadius: theme.radius.sm
                }}
              >
                git-native
              </span>
              <span style={{ color: theme.accent.bright, fontSize: theme.font.size.xs }}>
                {props.gitBranch ? `⎇ ${props.gitBranch}` : '⎇ —'}
              </span>
            </div>
          </div>
        ) : (
          <button onClick={props.onCreateProject} style={{ ...rowButtonStyle, marginBottom: 14 }}>
            📁 Selecionar pasta…
          </button>
        )}

        <SectionTitle>NOVO AGENTE</SectionTitle>
        {props.adapters.map((a) => {
          const meta = adapterCatalogEntry(a.id);
          return (
            <button
              key={a.id}
              onClick={() => props.onCreateTerminal(a.id)}
              title={meta ? meta.command : a.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                padding: '5px 8px',
                borderRadius: 5,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                marginBottom: 2,
                width: '100%',
                textAlign: 'left',
                fontFamily: theme.font.ui
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: adapterColor(a.id), flexShrink: 0 }} />
                <span style={{ fontSize: theme.font.size.sm + 0.5, color: theme.text.primary }}>{a.displayName}</span>
              </span>
              <span style={{ fontSize: 9.5, color: theme.text.faint, paddingLeft: 13 }}>
                {meta?.description ?? 'adapter registrado'}
              </span>
            </button>
          );
        })}

        <SectionTitle style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          PROJETOS
          <button
            onClick={props.onCreateProject}
            title="Novo projeto (escolhe a pasta)"
            style={{ background: 'transparent', border: 'none', color: theme.text.faint, cursor: 'pointer', fontSize: 13, padding: 0 }}
          >
            +
          </button>
        </SectionTitle>
        {props.projects.map((p) => {
          const isActive = p.id === props.activeProjectId;
          return (
            <button
              key={p.id}
              onClick={() => props.onSelectProject(p.id)}
              onDoubleClick={() => props.onCreateTerminalIn(p.id)}
              title={`${p.rootPath}\n(duplo-clique: novo terminal aqui, sem trocar de projeto)`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 6px',
                borderRadius: 5,
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                background: isActive ? theme.surface.raised : 'transparent',
                fontFamily: theme.font.ui
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: theme.font.size.md, color: isActive ? theme.text.bright : theme.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
            </button>
          );
        })}

        <SectionTitle style={{ marginTop: 14 }}>ARQUIVOS</SectionTitle>
        <FileTree
          entries={props.rootEntries}
          onReadDir={props.onReadDir}
          onSelectFile={props.onSelectFile}
          selectedPath={props.selectedFilePath}
        />

        <SectionTitle style={{ marginTop: 14 }}>APP &amp; SISTEMA</SectionTitle>
        {props.systemEntries.map((entry) => (
          <button
            key={entry.label}
            onClick={entry.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 6px',
              borderRadius: theme.radius.sm,
              border: 'none',
              width: '100%',
              cursor: 'pointer',
              background: entry.active ? theme.surface.raised : 'transparent',
              color: entry.active ? theme.text.primary : theme.text.secondary,
              fontSize: theme.font.size.sm + 0.5,
              fontFamily: theme.font.ui,
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: theme.font.size.xs, width: 13, textAlign: 'center' }}>{entry.icon}</span>
            <span>{entry.label}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: 10, borderTop: `1px solid ${theme.border.subtle}`, fontSize: theme.font.size.xs, color: theme.text.muted }}>
        <div style={{ color: theme.text.faint }}>v{props.appVersion} · build local</div>
      </div>
    </aside>
  );
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }): JSX.Element {
  return (
    <div
      style={{
        fontSize: 10,
        letterSpacing: 0.8,
        color: theme.text.faint,
        marginBottom: 6,
        fontWeight: 600,
        ...style
      }}
    >
      {children}
    </div>
  );
}

const rowButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 8px',
  borderRadius: 5,
  border: `1px solid ${theme.border.default}`,
  background: 'transparent',
  color: theme.text.secondary,
  fontSize: theme.font.size.sm + 0.5,
  fontFamily: theme.font.ui,
  cursor: 'pointer',
  width: '100%',
  textAlign: 'left'
};
