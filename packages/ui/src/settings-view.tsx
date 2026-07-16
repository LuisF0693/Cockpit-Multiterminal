import { useEffect, useState } from 'react';
import type { AppSettings } from '@cockpit/shared';
import { theme } from './theme';

/**
 * SettingsView (Story 13.5, FR46) — tela de Configurações: preferências
 * persistidas em app_meta (chave `settings`, JSON único). Componente de
 * exibição com drafts locais; o merge/persistência acontece no dono (App →
 * Main). Não é cosmética: cada valor tem um consumidor real (AC3).
 */

export interface SettingsViewProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export function SettingsView({ settings, onSave }: SettingsViewProps): JSX.Element {
  const [ollamaModel, setOllamaModel] = useState(settings.ollamaDefaultModel);
  const [intervalMs, setIntervalMs] = useState(String(settings.browserPreviewIntervalMs));
  const [zoom, setZoom] = useState(String(Math.round(settings.canvasDefaultZoom * 100)));
  const [savedAt, setSavedAt] = useState(0);

  // Settings recarregadas de fora (boot tardio) — re-sincroniza os drafts.
  useEffect(() => {
    setOllamaModel(settings.ollamaDefaultModel);
    setIntervalMs(String(settings.browserPreviewIntervalMs));
    setZoom(String(Math.round(settings.canvasDefaultZoom * 100)));
  }, [settings]);

  const save = (): void => {
    const parsedInterval = Number(intervalMs);
    const parsedZoom = Number(zoom) / 100;
    // Spread preserva campos que esta tela não edita (larguras dos painéis, 15.1).
    onSave({
      ...settings,
      ollamaDefaultModel: ollamaModel.trim() || 'llama3',
      browserPreviewIntervalMs: Number.isFinite(parsedInterval) ? parsedInterval : 1500,
      canvasDefaultZoom: Number.isFinite(parsedZoom) ? parsedZoom : 1
    });
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(0), 2500);
  };

  return (
    <section style={{ flex: 1, minWidth: 0, padding: 24, overflowY: 'auto' }}>
      <h2 style={{ fontSize: theme.font.size.xl, fontWeight: 700, margin: '0 0 4px' }}>⚙ Configurações</h2>
      <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, margin: '0 0 20px' }}>
        Preferências persistidas localmente — valores fora dos limites voltam ao padrão ao salvar.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space.md, maxWidth: 520 }}>
        <Field
          label="Modelo default do Ollama"
          hint="usado ao criar um terminal Ollama (pode ser trocado por sessão) — padrão: llama3"
        >
          <input value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} style={inputStyle} />
        </Field>

        <Field
          label="Intervalo do preview de browser (ms)"
          hint="frequência do snapshot dos tiles de browser — 500 a 60000, padrão: 1500"
        >
          <input
            value={intervalMs}
            onChange={(e) => setIntervalMs(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            style={inputStyle}
          />
        </Field>

        <Field label="Zoom padrão do canvas (%)" hint="aplicado ao abrir o app — 40 a 200, padrão: 100">
          <input
            value={zoom}
            onChange={(e) => setZoom(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            style={inputStyle}
          />
        </Field>

        <div style={{ display: 'flex', alignItems: 'center', gap: theme.space.sm }}>
          <button
            onClick={save}
            style={{
              background: theme.accent.primary,
              color: theme.text.inverse,
              border: 'none',
              borderRadius: 6,
              padding: '6px 16px',
              fontSize: theme.font.size.sm,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            salvar
          </button>
          {savedAt > 0 && (
            <span style={{ color: theme.accent.ok, fontSize: theme.font.size.sm }}>✓ salvo</span>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }): JSX.Element {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: theme.font.size.sm, fontWeight: 600, color: theme.text.primary }}>{label}</span>
      {children}
      <span style={{ fontSize: theme.font.size.xs, color: theme.text.faint }}>{hint}</span>
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: theme.surface.raised,
  color: theme.text.primary,
  border: `1px solid ${theme.border.default}`,
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: theme.font.size.md,
  maxWidth: 260
};
