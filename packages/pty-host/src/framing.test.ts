import { describe, expect, it } from 'vitest';
import { FrameDecoder, encodeControl, encodeData } from './framing';

describe('framing do túnel daemon (Story 6.1)', () => {
  it('roundtrip de frame de controle (JSON)', () => {
    const decoder = new FrameDecoder();
    const frames = decoder.push(encodeControl({ type: 'hello', protocolVersion: 1 }));
    expect(frames).toEqual([{ kind: 'control', message: { type: 'hello', protocolVersion: 1 } }]);
  });

  it('roundtrip de frame de dados com sessionId', () => {
    const decoder = new FrameDecoder();
    const bytes = new TextEncoder().encode('echo até-com-acento\r');
    const frames = decoder.push(encodeData('01ULID-TESTE', bytes));
    expect(frames).toHaveLength(1);
    const f = frames[0]!;
    if (f.kind !== 'data') throw new Error('esperava frame de dados');
    expect(f.sessionId).toBe('01ULID-TESTE');
    expect(Buffer.from(f.bytes).toString('utf8')).toBe('echo até-com-acento\r');
  });

  it('chunks parciais: frame só sai quando completo', () => {
    const decoder = new FrameDecoder();
    const frame = encodeControl({ type: 'resize', id: 'a', cols: 100, rows: 30 });
    expect(decoder.push(frame.subarray(0, 3))).toEqual([]); // header incompleto
    expect(decoder.push(frame.subarray(3, 7))).toEqual([]); // payload incompleto
    const frames = decoder.push(frame.subarray(7));
    expect(frames).toHaveLength(1);
  });

  it('múltiplos frames num chunk único + emenda com o próximo', () => {
    const decoder = new FrameDecoder();
    const a = encodeControl({ n: 1 });
    const b = encodeData('s', new Uint8Array([1, 2, 3]));
    const c = encodeControl({ n: 2 });
    const glued = Buffer.concat([a, b, c.subarray(0, 5)]);
    const first = decoder.push(glued);
    expect(first.map((f) => f.kind)).toEqual(['control', 'data']);
    const rest = decoder.push(c.subarray(5));
    expect(rest).toEqual([{ kind: 'control', message: { n: 2 } }]);
  });

  it('kind desconhecido lança (conexão deve ser derrubada)', () => {
    const decoder = new FrameDecoder();
    const bogus = Buffer.alloc(6);
    bogus.writeUInt32LE(2, 0);
    bogus.writeUInt8(7, 4); // kind inválido
    expect(() => decoder.push(bogus)).toThrow(/kind/);
  });
});
