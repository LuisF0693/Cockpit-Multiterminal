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
export type { PersistedEvent, PersistedTerminal, StateStore } from './state-store/types';
