import { describe, expect, it } from 'vitest';
import { AppInfoSchema, AppSettingsSchema, IpcChannels } from './ipc';

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

describe('AppSettingsSchema (Story 13.5, FR46)', () => {
  it('objeto vazio vira os defaults (quem nunca configurou não muda nada)', () => {
    expect(AppSettingsSchema.parse({})).toEqual({
      ollamaDefaultModel: 'llama3',
      browserPreviewIntervalMs: 1500,
      canvasDefaultZoom: 1,
      sidebarWidth: 240,
      telemetryWidth: 230,
      previewWidth: 520
    });
  });

  it('valores válidos são preservados (larguras da 15.1 inclusive)', () => {
    expect(
      AppSettingsSchema.parse({
        ollamaDefaultModel: 'mistral',
        browserPreviewIntervalMs: 3000,
        canvasDefaultZoom: 0.8,
        sidebarWidth: 300,
        telemetryWidth: 260,
        previewWidth: 600
      })
    ).toEqual({
      ollamaDefaultModel: 'mistral',
      browserPreviewIntervalMs: 3000,
      canvasDefaultZoom: 0.8,
      sidebarWidth: 300,
      telemetryWidth: 260,
      previewWidth: 600
    });
  });

  it('valor inválido degrada pro default do CAMPO, sem derrubar os demais', () => {
    const parsed = AppSettingsSchema.parse({
      ollamaDefaultModel: '',
      browserPreviewIntervalMs: 10,
      canvasDefaultZoom: 1.5
    });
    expect(parsed.ollamaDefaultModel).toBe('llama3');
    expect(parsed.browserPreviewIntervalMs).toBe(1500);
    expect(parsed.canvasDefaultZoom).toBe(1.5);
  });
});
