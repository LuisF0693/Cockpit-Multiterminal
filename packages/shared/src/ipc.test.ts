import { describe, expect, it } from 'vitest';
import { AppInfoSchema, IpcChannels } from './ipc';

describe('AppInfoSchema (teste canário do pipeline — Story 1.1)', () => {
  it('aceita payload válido', () => {
    const result = AppInfoSchema.safeParse({
      name: 'Meu Cockpit',
      version: '0.1.0',
      platform: 'win32'
    });
    expect(result.success).toBe(true);
  });

  it('rejeita versão fora do semver', () => {
    const result = AppInfoSchema.safeParse({
      name: 'Meu Cockpit',
      version: 'v1',
      platform: 'win32'
    });
    expect(result.success).toBe(false);
  });

  it('rejeita nome de app desconhecido', () => {
    const result = AppInfoSchema.safeParse({
      name: 'Outro App',
      version: '0.1.0',
      platform: 'linux'
    });
    expect(result.success).toBe(false);
  });

  it('expõe canal canônico app.info', () => {
    expect(IpcChannels.appInfo).toBe('app.info');
  });
});
