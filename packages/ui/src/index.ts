/**
 * @cockpit/ui — Design system (tokens, atoms/molecules/organisms) e telas do cockpit.
 * Atomic Design, tokens-first (docs/front-end-spec.md).
 */
export { TerminalView } from './terminal-view';
export type { TerminalViewProps } from './terminal-view';
export { TerminalTile } from './terminal-tile';
export type { TerminalTileProps } from './terminal-tile';
export { Sidebar } from './sidebar';
export type { SidebarProps } from './sidebar';
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
export {
  STATUS_COLORS,
  STATUS_LABELS,
  StatusPulseStyles,
  statusColor,
  statusLabel
} from './status-colors';
export { ADAPTER_COLORS, DEFAULT_ADAPTER_COLOR, adapterColor } from './adapter-colors';
export { PROJECT_PALETTE, canvasBackground, theme } from './theme';
export { CanvasMinimap } from './canvas-minimap';
export type { CanvasMinimapProps, MinimapTile } from './canvas-minimap';
export { CanvasToolbar } from './canvas-toolbar';
export type { CanvasToolbarProps } from './canvas-toolbar';
export { PromptModal } from './prompt-modal';
export type { PromptModalProps } from './prompt-modal';
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
export { ProjectFilesSidebar } from './project-files-sidebar';
export type { ProjectFilesSidebarProps } from './project-files-sidebar';
export { BrowserPreviewTile } from './browser-preview-tile';
export type { BrowserPreviewTileProps } from './browser-preview-tile';
export { LearningsView } from './learnings-view';
export type { LearningsViewProps } from './learnings-view';
export { renderMarkdownLite, parseMarkdownLite } from './markdown-lite';
export type { MarkdownBlock, InlineToken } from './markdown-lite';
