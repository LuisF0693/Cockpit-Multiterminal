/**
 * @cockpit/core — Session Manager, Lifecycle Engine, Decision Queue e event bus.
 * Session Manager: Story 1.3. State store/persistência: Story 1.4.
 * Lifecycle Engine: 5.x. Ver docs/architecture/components.md.
 */
export { SessionRegistry } from './session-registry';
export type { PtyOps, SessionListener } from './session-registry';
export { ulid } from './ulid';
export { WriteQueue } from './state-store/write-queue';
export type { WriteQueueOptions } from './state-store/write-queue';
export { SqliteStateStore } from './state-store/sqlite-state-store';
export type { SqliteDatabase, SqliteStatement } from './state-store/sqlite-state-store';
export { MemoryStateStore } from './state-store/memory-state-store';
export { PersistenceManager } from './state-store/persistence';
export type {
  PersistedEvent,
  PersistedTask,
  PersistedTerminal,
  StateStore,
  TaskState,
  LearningStatus
} from './state-store/types';
export { TaskManager } from './task-manager';
export type { TaskDecisionAction, TaskEvent, TaskListener, TaskRecord } from './task-manager';
export { assertTransition, canTransition } from './task-lifecycle';
export { planSdcReviewRouting, planSdcCorrectionRouting, planSdcRedirect } from './sdc-routing';
export type { SdcReviewRouting, SdcCorrectionRouting, SdcRedirectPlan } from './sdc-routing';
export { parseGitignorePatterns, isGitignored, isPathWithin, ALWAYS_HIDDEN_NAMES } from './file-explorer';
export { parseGitHead, parseGitdirPointer } from './git-info';
export { TerminalLinkManager } from './terminal-link-manager';
export type { TerminalLink, TerminalLinkEvent, TerminalLinkListener } from './terminal-link-manager';
export { planTerminalLinkRouting } from './terminal-link-routing';
export type { TerminalLinkRouting } from './terminal-link-routing';
export { planExternalAdoption } from './external-adoption';
export type { ExternalSessionInfo, ExternalAdoptionPlan } from './external-adoption';
export { classifyDispatchTask, planAgentDispatch, findDispatcherSession, NON_DISPATCHABLE } from './agent-dispatch';
export type { AgentDispatchPlan, AgentDispatchRequest, DispatchCategory, LiveSessionRef } from './agent-dispatch';
export { DEFAULT_ADAPTER_MATRIX, mergeAdapterMatrix, explainCandidates } from './adapter-profile';
export type { AdapterMatrix, AdapterProfile, CandidateExplanation } from './adapter-profile';
export { BrowserTileManager } from './browser-tile-manager';
export type { BrowserTile, BrowserTileEvent, BrowserTileListener } from './browser-tile-manager';
export { LearningManager, canTransitionLearning } from './learning-manager';
export type { Learning, LearningEvent, LearningListener } from './learning-manager';
export { isSameProject } from './project-link-guard';
