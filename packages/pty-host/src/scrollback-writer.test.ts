import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ScrollbackWriter, readScrollbackTail } from './scrollback-writer';

const dirs: string[] = [];
function tmpFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'cockpit-scrollback-'));
  dirs.push(dir);
  return join(dir, 'sess.log');
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const enc = new TextEncoder();

describe('ScrollbackWriter (Story 1.4, AC3)', () => {
  it('acumula em memória e grava em batch no flush', () => {
    const file = tmpFile();
    const w = new ScrollbackWriter(file, 1024 * 1024, 10_000);
    w.append(enc.encode('linha 1\n'));
    w.append(enc.encode('linha 2\n'));
    expect(existsSync(file)).toBe(false); // nada síncrono por chunk

    w.flush();
    expect(readFileSync(file, 'utf8')).toBe('linha 1\nlinha 2\n');
    w.dispose();
  });

  it('rotaciona ao passar do limite mantendo 2 gerações', () => {
    const file = tmpFile();
    const w = new ScrollbackWriter(file, 64, 10_000); // limite minúsculo p/ teste
    w.append(enc.encode('A'.repeat(100)));
    w.flush(); // 100 > 64 → rotaciona
    w.append(enc.encode('B'.repeat(10)));
    w.dispose();

    expect(readFileSync(`${file}.1`, 'utf8')).toBe('A'.repeat(100));
    expect(readFileSync(file, 'utf8')).toBe('B'.repeat(10));
  });

  it('readScrollbackTail junta gerações e respeita maxBytes', () => {
    const file = tmpFile();
    const w = new ScrollbackWriter(file, 64, 10_000);
    w.append(enc.encode('X'.repeat(100)));
    w.flush();
    w.append(enc.encode('FIM'));
    w.dispose();

    const all = new TextDecoder().decode(readScrollbackTail(file, 10_000));
    expect(all).toBe('X'.repeat(100) + 'FIM');

    const tail = new TextDecoder().decode(readScrollbackTail(file, 5));
    expect(tail).toBe('XXFIM');
  });

  it('tail de sessão sem arquivo é vazio', () => {
    expect(readScrollbackTail(tmpFile(), 100).byteLength).toBe(0);
  });
});
