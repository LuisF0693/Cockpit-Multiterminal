/**
 * Metadados de catálogo por adapter (Story 13.4, FR45) — mesmo princípio de
 * fonte única do `ADAPTER_COLORS` (12.4): descrição e comando de spawn por
 * `adapterId`, consumidos pelo painel de catálogo sem duplicar strings no
 * App.tsx. Os comandos ESPELHAM os `DEFAULT_COMMAND` dos pacotes de adapter
 * (a UI não pode importá-los — NFR7); o teste de sanidade garante paridade
 * de ids com `ADAPTER_COLORS`.
 */

export interface AdapterCatalogEntry {
  /** Descrição curta exibida no catálogo. */
  description: string;
  /** Comando exato de spawn (Windows exige extensão — CreateProcess não resolve PATHEXT). */
  command: string;
  /** Glifo de identidade (Story 15.6, FR58) — tingido pela cor do adapter. */
  glyph: string;
  /** Args default quando o adapter exige argumento por sessão (só Ollama hoje). */
  defaultArgs?: string[];
}

export const ADAPTER_CATALOG: Record<string, AdapterCatalogEntry> = {
  shell: {
    description: 'PowerShell puro — terminal de uso geral, sem agente.',
    command: 'powershell.exe',
    glyph: '▤'
  },
  cmd: {
    description: 'Prompt de comando clássico do Windows (cmd.exe).',
    command: 'cmd.exe',
    glyph: '▦'
  },
  'claude-code': {
    description: 'Claude Code (Anthropic) — agente de código com hooks nativos de status.',
    command: 'claude.cmd',
    glyph: '✦'
  },
  codex: {
    description: 'Codex CLI (OpenAI) — agente de código com notify + heurística de input.',
    command: 'codex.cmd',
    glyph: '◈'
  },
  grok: {
    description: 'Grok CLI (xAI) — agente de código via parsing de saída.',
    command: 'grok.cmd',
    glyph: '⌁'
  },
  'gemini-cli': {
    description: 'Gemini CLI (Google) — agente de código via parsing de saída.',
    command: 'gemini.cmd',
    glyph: '◇'
  },
  antigravity: {
    description: 'Antigravity CLI (Google) — instalado via antigravity.google/cli.',
    command: 'agy.exe',
    glyph: '△'
  },
  ollama: {
    description: 'Ollama — modelos locais; o modelo é escolhido por sessão (ollama run <modelo>).',
    command: 'ollama.exe',
    glyph: 'λ',
    defaultArgs: ['run', 'llama3']
  }
};

export function adapterCatalogEntry(adapterId: string): AdapterCatalogEntry | null {
  return ADAPTER_CATALOG[adapterId] ?? null;
}
