import { useState } from 'react';
import type { AppSettings } from '@cockpit/shared';
import {
  ACCENT_OPTIONS,
  FONT_MONO_OPTIONS,
  FONT_TEXT_OPTIONS,
  THEME_PRESETS,
  composeTheme,
  themeToCssVars
} from './theme-runtime';
import { theme } from './theme';

/**
 * SettingsWindow (Story 15.3, FR54) — janela de Configurações em OVERLAY
 * com navegação lateral, fiel às capturas de referência do OmniRift:
 * Geral (idioma PT fixo + preferências do FR46), Privacidade (compromissos
 * REAIS de NFR1/NFR6) e Aparência (tema vivo da 15.2: modo, presets, cor de
 * destaque, fontes, todas as cores — salvo automático). Seções sem lastro
 * real (Conta, Feature flags…) NÃO existem (decisão "só dados reais").
 */

export interface SettingsWindowProps {
  settings: AppSettings;
  /** Merge parcial persistido no Main; o dono re-aplica o tema (15.2). */
  onUpdate: (patch: Partial<AppSettings>) => void;
  onClose: () => void;
}

type Section = 'geral' | 'privacidade' | 'aparencia';

export function SettingsWindow({ settings, onUpdate, onClose }: SettingsWindowProps): JSX.Element {
  const [section, setSection] = useState<Section>('geral');

  return (
    <div
      onPointerDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.surface.overlay,
        display: 'grid',
        placeItems: 'center',
        zIndex: 100000,
        fontFamily: theme.font.ui
      }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: 760,
          maxWidth: '92vw',
          height: 540,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: theme.surface.panel,
          border: `1px solid ${theme.border.default}`,
          borderRadius: theme.radius.lg,
          boxShadow: theme.shadow.overlay,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            height: 42,
            minHeight: 42,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 14px',
            background: theme.surface.app,
            borderBottom: `1px solid ${theme.border.default}`
          }}
        >
          <span style={{ color: theme.accent.primary, fontSize: theme.font.size.md }}>⚙</span>
          <strong style={{ fontSize: theme.font.size.md, color: theme.text.bright }}>Configurações</strong>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} title="Fechar" style={closeButtonStyle}>
            ×
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <nav
            style={{
              width: 172,
              minWidth: 172,
              borderRight: `1px solid ${theme.border.subtle}`,
              padding: '12px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <NavItem icon="🛠" label="Geral" active={section === 'geral'} onClick={() => setSection('geral')} />
            <NavItem icon="🛡" label="Privacidade" active={section === 'privacidade'} onClick={() => setSection('privacidade')} />
            <div style={{ fontSize: 9, letterSpacing: 0.8, color: theme.text.faint, fontWeight: 600, margin: '10px 6px 4px' }}>
              MAIS
            </div>
            <NavItem icon="🎨" label="Aparência" active={section === 'aparencia'} onClick={() => setSection('aparencia')} />
          </nav>

          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '18px 22px' }}>
            {section === 'geral' && <GeneralSection settings={settings} onUpdate={onUpdate} goAppearance={() => setSection('aparencia')} />}
            {section === 'privacidade' && <PrivacySection />}
            {section === 'aparencia' && <AppearanceSection settings={settings} onUpdate={onUpdate} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 6,
        border: 'none',
        width: '100%',
        cursor: 'pointer',
        textAlign: 'left',
        background: active ? theme.accent.soft : 'transparent',
        color: active ? theme.accent.bright : theme.text.secondary,
        fontSize: theme.font.size.sm + 0.5,
        fontFamily: theme.font.ui
      }}
    >
      <span style={{ width: 14, textAlign: 'center', fontSize: theme.font.size.xs }}>{icon}</span>
      {label}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }): JSX.Element {
  return <h3 style={{ margin: '0 0 14px', fontSize: theme.font.size.md, color: theme.text.bright }}>{children}</h3>;
}

function FieldLabel({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ fontSize: 10, letterSpacing: 0.8, color: theme.text.faint, fontWeight: 600, margin: '14px 0 6px' }}>
      {children}
    </div>
  );
}

/** GERAL — idioma (PT fixo, i18n depois) + preferências reais do FR46. */
function GeneralSection({
  settings,
  onUpdate,
  goAppearance
}: {
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
  goAppearance: () => void;
}): JSX.Element {
  const [ollama, setOllama] = useState(settings.ollamaDefaultModel);
  const [interval, setIntervalMs] = useState(String(settings.browserPreviewIntervalMs));
  const [zoom, setZoom] = useState(String(Math.round(settings.canvasDefaultZoom * 100)));

  return (
    <div>
      <SectionTitle>Geral</SectionTitle>

      <FieldLabel>IDIOMA</FieldLabel>
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={pillActiveStyle}>Português</span>
        <span title="Em breve — i18n é um épico próprio" style={{ ...pillIdleStyle, opacity: 0.5, cursor: 'not-allowed' }}>
          English
        </span>
      </div>

      <FieldLabel>MODELO DEFAULT DO OLLAMA</FieldLabel>
      <input
        value={ollama}
        onChange={(e) => setOllama(e.target.value)}
        onBlur={() => onUpdate({ ollamaDefaultModel: ollama.trim() || 'llama3' })}
        style={inputStyle}
      />

      <FieldLabel>INTERVALO DO PREVIEW DE BROWSER (MS · 500-60000)</FieldLabel>
      <input
        value={interval}
        onChange={(e) => setIntervalMs(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={() => onUpdate({ browserPreviewIntervalMs: Number(interval) || 1500 })}
        inputMode="numeric"
        style={inputStyle}
      />

      <FieldLabel>ZOOM PADRÃO DO CANVAS (% · 15-160)</FieldLabel>
      <input
        value={zoom}
        onChange={(e) => setZoom(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={() => onUpdate({ canvasDefaultZoom: (Number(zoom) || 100) / 100 })}
        inputMode="numeric"
        style={inputStyle}
      />

      <FieldLabel>&nbsp;</FieldLabel>
      <button
        onClick={goAppearance}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '12px 14px',
          background: theme.surface.header,
          border: `1px solid ${theme.border.default}`,
          borderRadius: theme.radius.md,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: theme.font.ui
        }}
      >
        <span style={{ color: theme.accent.bright }}>🎨</span>
        <span style={{ flex: 1 }}>
          <div style={{ fontSize: theme.font.size.sm + 1, color: theme.text.primary }}>Aparência</div>
          <div style={{ fontSize: theme.font.size.xs, color: theme.text.muted }}>Tema, cores e fontes</div>
        </span>
        <span style={{ color: theme.text.faint }}>↗</span>
      </button>
    </div>
  );
}

/** PRIVACIDADE — compromissos REAIS do produto (NFR1/NFR6), sem invenção. */
function PrivacySection(): JSX.Element {
  return (
    <div>
      <SectionTitle>Privacidade</SectionTitle>
      <div
        style={{
          padding: '12px 14px',
          background: theme.accent.soft,
          border: `1px solid ${theme.accent.ring}`,
          borderRadius: theme.radius.md,
          marginBottom: 12,
          display: 'flex',
          gap: 10
        }}
      >
        <span style={{ color: theme.accent.bright }}>🔒</span>
        <p style={{ margin: 0, fontSize: theme.font.size.sm + 1, lineHeight: 1.6, color: theme.text.primary }}>
          O Meu Cockpit roda 100% na sua máquina. Sessões, código e o trabalho dos agentes NUNCA saem daqui — zero
          telemetria, zero coleta de dados.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '4px 2px' }}>
        <span style={{ color: theme.accent.bright }}>🛡</span>
        <p style={{ margin: 0, fontSize: theme.font.size.sm + 1, lineHeight: 1.6, color: theme.text.secondary }}>
          Os adapters não interceptam, armazenam nem logam credenciais dos CLIs — a autenticação fica nos próprios
          CLIs (Claude, Codex, Gemini…), na SUA conta ("bring your own subscription").
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '4px 2px' }}>
        <span style={{ color: theme.accent.bright }}>🗝</span>
        <p style={{ margin: 0, fontSize: theme.font.size.sm + 1, lineHeight: 1.6, color: theme.text.secondary }}>
          Chaves cadastradas na Central de API são criptografadas pelo keychain do Windows (DPAPI) e nunca ficam em
          texto plano nem são exibidas de volta.
        </p>
      </div>
    </div>
  );
}

/** APARÊNCIA — a tela da referência, sobre o runtime da 15.2 (salvo automático). */
function AppearanceSection({
  settings,
  onUpdate
}: {
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
}): JSX.Element {
  const composed = composeTheme({
    themePreset: settings.themePreset,
    accentColor: settings.accentColor,
    fontText: settings.fontText,
    fontMono: settings.fontMono
  });
  const vars = themeToCssVars(composed);
  const colorRows: Array<[string, string]> = [
    ['Fundo', vars['--ck-surface-canvas']!],
    ['Superfície 1', vars['--ck-surface-panel']!],
    ['Superfície 2', vars['--ck-surface-header']!],
    ['Superfície 3', vars['--ck-surface-raised']!],
    ['Borda', vars['--ck-border-default']!],
    ['Texto', vars['--ck-text-primary']!],
    ['Texto suave', vars['--ck-text-muted']!],
    ['Destaque', vars['--ck-accent-primary']!],
    ['Destaque (claro)', vars['--ck-accent-bright']!],
    ['Perigo', vars['--ck-accent-danger']!]
  ];
  const darkPresets = THEME_PRESETS.filter((p) => p.mode === 'dark');
  const isLight = composed.mode === 'light';

  return (
    <div>
      <SectionTitle>Aparência</SectionTitle>

      <FieldLabel>MODO</FieldLabel>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onUpdate({ themePreset: 'multerminal-dark' })} style={!isLight ? pillActiveStyle : pillIdleStyle}>
          Escuro
        </button>
        <button onClick={() => onUpdate({ themePreset: 'multerminal-light' })} style={isLight ? pillActiveStyle : pillIdleStyle}>
          Claro
        </button>
      </div>

      <FieldLabel>TEMAS PRONTOS</FieldLabel>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[...darkPresets, ...THEME_PRESETS.filter((p) => p.mode === 'light')].map((p) => (
          <button
            key={p.id}
            onClick={() => onUpdate({ themePreset: p.id })}
            style={settings.themePreset === p.id ? pillActiveStyle : pillIdleStyle}
          >
            {p.label}
          </button>
        ))}
      </div>

      <FieldLabel>COR DE DESTAQUE</FieldLabel>
      <div style={{ display: 'flex', gap: 8 }}>
        {ACCENT_OPTIONS.map((a) => {
          const selected = a.primary.toUpperCase() === settings.accentColor.toUpperCase();
          return (
            <button
              key={a.primary}
              onClick={() => onUpdate({ accentColor: a.primary })}
              title={a.label}
              style={{
                width: 22,
                height: 22,
                borderRadius: selected ? 6 : '50%',
                background: a.primary,
                border: selected ? `2px solid ${theme.text.bright}` : '2px solid transparent',
                cursor: 'pointer',
                padding: 0
              }}
            />
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <FieldLabel>FONTE (TEXTO)</FieldLabel>
          <select value={settings.fontText} onChange={(e) => onUpdate({ fontText: e.target.value })} style={inputStyle}>
            {FONT_TEXT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <FieldLabel>FONTE (MONO)</FieldLabel>
          <select value={settings.fontMono} onChange={(e) => onUpdate({ fontMono: e.target.value })} style={inputStyle}>
            {FONT_MONO_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FieldLabel>TODAS AS CORES</FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
        {colorRows.map(([label, hex]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: hex,
                border: `1px solid ${theme.border.strong}`,
                flexShrink: 0
              }}
            />
            <span style={{ flex: 1, fontSize: theme.font.size.sm + 0.5, color: theme.text.secondary }}>{label}</span>
            <span style={{ fontSize: theme.font.size.xs, color: theme.text.faint, fontFamily: theme.font.mono }}>
              {hex.toLowerCase()}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 18,
          paddingTop: 10,
          borderTop: `1px solid ${theme.border.subtle}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: theme.font.size.xs,
          color: theme.text.faint
        }}
      >
        <span style={{ flex: 1 }}>Preview ao vivo — salvo automático.</span>
        <button
          onClick={() =>
            onUpdate({ themePreset: 'multerminal-dark', accentColor: '#22D3EE', fontText: 'JetBrains Mono', fontMono: 'JetBrains Mono' })
          }
          title="Resetar pro padrão"
          style={{ ...pillIdleStyle, cursor: 'pointer' }}
        >
          ↺ padrão
        </button>
      </div>
    </div>
  );
}

const pillBase: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: 6,
  fontSize: theme.font.size.sm,
  fontFamily: theme.font.ui,
  border: `1px solid ${theme.border.default}`,
  background: 'transparent',
  color: theme.text.secondary,
  cursor: 'pointer'
};

const pillActiveStyle: React.CSSProperties = {
  ...pillBase,
  border: `1px solid ${theme.accent.ring}`,
  background: theme.accent.soft,
  color: theme.accent.bright
};

const pillIdleStyle: React.CSSProperties = pillBase;

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 320,
  background: theme.surface.raised,
  color: theme.text.primary,
  border: `1px solid ${theme.border.default}`,
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: theme.font.size.md,
  fontFamily: theme.font.ui
};

const closeButtonStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  border: 'none',
  background: 'transparent',
  color: theme.text.faint,
  cursor: 'pointer',
  fontSize: 15,
  borderRadius: 4
};
