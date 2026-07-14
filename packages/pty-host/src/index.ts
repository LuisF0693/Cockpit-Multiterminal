export { PtySessionManager, isPidAlive } from './session-manager';
export type { PtyLike, PtySpawnFn, PtySpawnOptions, SessionInfo } from './session-manager';
export type { HostInbound, HostOutbound } from './protocol';
export { ScrollbackWriter, readScrollbackTail } from './scrollback-writer';
export { AdapterRegistry } from './adapter-registry';
// Daemon (Story 6.1) — daemon-entry NÃO é exportado aqui: ele importa os
// adapters (NFR7); consumidores usam DaemonClient ou o binário.
export { FrameDecoder, encodeControl, encodeData, FRAME_CONTROL, FRAME_DATA } from './framing';
export type { Frame } from './framing';
export { DAEMON_PROTOCOL_VERSION, DEFAULT_DAEMON_PIPE } from './daemon-protocol';
export type { DaemonInbound, DaemonOutbound } from './daemon-protocol';
export { DaemonServer } from './daemon-server';
export { DaemonClient } from './daemon-client';
