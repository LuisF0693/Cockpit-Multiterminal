/**
 * Framing do túnel daemon↔cliente (Story 6.1, decisão crítica 5).
 * Frame: [len u32 LE][kind u8][payload] — len cobre kind+payload.
 * kind 0 = controle (JSON utf8); kind 1 = dados binários de sessão,
 * payload = [idLen u8][sessionId utf8][bytes do terminal].
 */

export const FRAME_CONTROL = 0;
export const FRAME_DATA = 1;

const HEADER_BYTES = 4;
/** Teto defensivo por frame (dados do PTY chegam em chunks bem menores). */
const MAX_FRAME_BYTES = 8 * 1024 * 1024;

export function encodeControl(message: unknown): Buffer {
  const payload = Buffer.from(JSON.stringify(message), 'utf8');
  const frame = Buffer.allocUnsafe(HEADER_BYTES + 1 + payload.byteLength);
  frame.writeUInt32LE(1 + payload.byteLength, 0);
  frame.writeUInt8(FRAME_CONTROL, HEADER_BYTES);
  payload.copy(frame, HEADER_BYTES + 1);
  return frame;
}

export function encodeData(sessionId: string, bytes: Uint8Array): Buffer {
  const id = Buffer.from(sessionId, 'utf8');
  if (id.byteLength > 255) throw new Error(`sessionId longo demais: ${sessionId}`);
  const frame = Buffer.allocUnsafe(HEADER_BYTES + 1 + 1 + id.byteLength + bytes.byteLength);
  frame.writeUInt32LE(1 + 1 + id.byteLength + bytes.byteLength, 0);
  frame.writeUInt8(FRAME_DATA, HEADER_BYTES);
  frame.writeUInt8(id.byteLength, HEADER_BYTES + 1);
  id.copy(frame, HEADER_BYTES + 2);
  Buffer.from(bytes).copy(frame, HEADER_BYTES + 2 + id.byteLength);
  return frame;
}

export type Frame =
  | { kind: 'control'; message: unknown }
  | { kind: 'data'; sessionId: string; bytes: Uint8Array };

/**
 * Decoder stateful: alimente com chunks do socket (parciais/múltiplos);
 * devolve frames completos na ordem. Nunca lança em frame incompleto.
 */
export class FrameDecoder {
  private buffer = Buffer.alloc(0);

  push(chunk: Uint8Array): Frame[] {
    this.buffer = this.buffer.byteLength === 0 ? Buffer.from(chunk) : Buffer.concat([this.buffer, Buffer.from(chunk)]);
    const frames: Frame[] = [];
    for (;;) {
      if (this.buffer.byteLength < HEADER_BYTES) break;
      const len = this.buffer.readUInt32LE(0);
      if (len === 0 || len > MAX_FRAME_BYTES) throw new Error(`frame inválido (len ${len})`);
      if (this.buffer.byteLength < HEADER_BYTES + len) break;
      const body = this.buffer.subarray(HEADER_BYTES, HEADER_BYTES + len);
      this.buffer = this.buffer.subarray(HEADER_BYTES + len);
      const kind = body.readUInt8(0);
      if (kind === FRAME_CONTROL) {
        frames.push({ kind: 'control', message: JSON.parse(body.subarray(1).toString('utf8')) as unknown });
      } else if (kind === FRAME_DATA) {
        const idLen = body.readUInt8(1);
        frames.push({
          kind: 'data',
          sessionId: body.subarray(2, 2 + idLen).toString('utf8'),
          // cópia: o subarray referencia o buffer interno que será reciclado
          bytes: Uint8Array.from(body.subarray(2 + idLen))
        });
      } else {
        throw new Error(`kind de frame desconhecido: ${kind}`);
      }
    }
    return frames;
  }
}
