/**
 * @cockpit/ui — Design system (tokens, atoms/molecules/organisms) e telas do cockpit.
 * Atomic Design, tokens-first (docs/front-end-spec.md).
 */
export { TerminalView } from './terminal-view';
export type { TerminalViewProps } from './terminal-view';
export { TerminalTile } from './terminal-tile';
export type { TerminalTileProps } from './terminal-tile';
export { AppSidebar } from './app-sidebar';
export type { AppSidebarProps } from './app-sidebar';
export { FileTree } from './file-tree';
export type { FileTreeProps } from './file-tree';
export { StatusFooter } from './status-footer';
export type { StatusFooterProps, DecisionItem } from './status-footer';
export { FilePreviewPanel } from './file-preview-panel';
export type { FilePreviewPanelProps, PreviewFile } from './file-preview-panel';
export { PanelResizeHandle } from './panel-resize-handle';
export type { PanelResizeHandleProps } from './panel-resize-handle';
export {
  addTile,
  bringToFront,
  createLayout,
  moveTile,
  removeTile,
  resizeTile,
  snapToGrid,
  DEFAULT_TILE_HEIGHT,
  DEFAULT_TILE_WIDTH,
  GRID_SNAP,
  MIN_TILE_HEIGHT,
  MIN_TILE_WIDTH
} from './layout';
export type { CanvasLayout, TileLayout } from './layout';
export { matchShortcut } from './shortcuts';
export type { KeyStroke, ShortcutAction } from './shortcuts';
export { attentionTiles, nextAttentionTile } from './attention-cycle';
export type { AttentionCandidate } from './attention-cycle';
export {
  STATUS_COLORS,
  STATUS_LABELS,
  StatusPulseStyles,
  statusColor,
  statusLabel
} from './status-colors';
export { ADAPTER_COLORS, DEFAULT_ADAPTER_COLOR, adapterColor } from './adapter-colors';
export { PROJECT_PALETTE, canvasBackground, theme } from './theme';
export {
  ACCENT_OPTIONS,
  FONT_MONO_OPTIONS,
  FONT_TEXT_OPTIONS,
  THEME_PRESETS,
  applyTheme,
  composeTheme,
  fontStackOf,
  getActiveTheme,
  subscribeTheme,
  themeToCssVars
} from './theme-runtime';
export type { ThemeData, ThemeSelection } from './theme-runtime';
export { CanvasMinimap } from './canvas-minimap';
export type { CanvasMinimapProps, MinimapTile } from './canvas-minimap';
export { ADAPTER_CATALOG, adapterCatalogEntry } from './adapter-catalog';
export type { AdapterCatalogEntry } from './adapter-catalog';
export { AgentCatalog } from './agent-catalog';
export type { AgentCatalogProps } from './agent-catalog';
export { SettingsWindow } from './settings-window';
export type { SettingsWindowProps } from './settings-window';
export { AppToolbar } from './app-toolbar';
export type { AppToolbarProps } from './app-toolbar';
export { PromptModal } from './prompt-modal';
export type { PromptModalProps } from './prompt-modal';
export { ConfirmModal } from './confirm-modal';
export type { ConfirmModalProps } from './confirm-modal';
export { MasterDashboard } from './master-dashboard';
export type { MasterDashboardProps } from './master-dashboard';
export { formatDuration } from './format-duration';
export { TimelineView } from './timeline-view';
export type { TimelineViewProps } from './timeline-view';
export { SessionReportView } from './session-report';
export type { SessionReportViewProps } from './session-report';
export { RecoveryScreen } from './recovery-screen';
export type { RecoveryScreenProps } from './recovery-screen';
export { TasksPanel } from './tasks-panel';
export type { TasksPanelProps } from './tasks-panel';
export { LifecycleBoard } from './lifecycle-board';
export type { LifecycleBoardProps } from './lifecycle-board';
export {
  TASK_NEXT_STATES,
  TASK_STATE_LABEL,
  TASK_STATE_ORDER,
  canTransitionTask
} from './task-lifecycle-ui';
export { ReviewPanel } from './review-panel';
export type { ReviewPanelProps } from './review-panel';
export { BrowserPreviewTile } from './browser-preview-tile';
export type { BrowserPreviewTileProps } from './browser-preview-tile';
export { LearningsView } from './learnings-view';
export type { LearningsViewProps } from './learnings-view';
export { renderMarkdownLite, parseMarkdownLite } from './markdown-lite';
export type { MarkdownBlock, InlineToken } from './markdown-lite';
