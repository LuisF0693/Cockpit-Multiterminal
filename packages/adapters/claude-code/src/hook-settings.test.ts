import { describe, expect, it } from 'vitest';
import { IDLE_AGENT_STATUSES, isIdleAgentStatus } from '@cockpit/shared';
import { HOOK_STATUS_MAP, buildHookSettings } from './hook-settings';

/**
 * Regressão da Causa B2 — a AMBIGUIDADE na origem.
 *
 * `SessionStart` e `Stop` mapeavam os dois para `'idle'`: "o CLI acabou de
 * nascer" e "o agente devolveu o turno" viravam o mesmo sinal. O consumidor
 * (`IDLE_AGENT_STATUSES`) só podia tratá-los juntos, e escolheu excluir
 * `'idle'` — matando junto o fim de turno legítimo. Efeito: `deliver-task`
 * respondia `queued` para sempre em QUALQUER tile de IA vivo (claude-code
 * inclusive, não só Codex) e `flushPendingTask` nunca disparava.
 *
 * Este arquivo trava as DUAS pontas na suíte padrão, porque o smoke que
 * descobriu o defeito (`pty-host/src/idle-status-contract.smoke.ts`) fica
 * fora do `pnpm -w test` por construção. Se alguém recolar os dois eventos
 * no mesmo status, quebra aqui.
 */
describe('HOOK_STATUS_MAP (Causa B2 — nascer ≠ devolver o turno)', () => {
  it('SessionStart e Stop NÃO compartilham status', () => {
    expect(HOOK_STATUS_MAP.SessionStart).not.toBe(HOOK_STATUS_MAP.Stop);
  });

  it('Stop (fim de turno) é entregável — é aqui que o tile aceita tarefa nova', () => {
    expect(HOOK_STATUS_MAP.Stop).toBe('idle');
    expect(
      isIdleAgentStatus(HOOK_STATUS_MAP.Stop),
      `IDLE_AGENT_STATUSES é [${IDLE_AGENT_STATUSES.join(', ')}]`
    ).toBe(true);
  });

  it('SessionStart (boot) NÃO é entregável — precaução: não se sabe se o CLI já aceita input', () => {
    expect(HOOK_STATUS_MAP.SessionStart).toBe('starting');
    expect(isIdleAgentStatus(HOOK_STATUS_MAP.SessionStart)).toBe(false);
  });

  it('todo evento mapeado vira um hook de comando no settings gerado', () => {
    const settings = buildHookSettings('C:\\tmp\\session.status') as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>>;
    };
    for (const [event, status] of Object.entries(HOOK_STATUS_MAP)) {
      expect(settings.hooks[event]?.[0]?.hooks[0]?.command).toContain(`echo ${status}`);
    }
  });
});
