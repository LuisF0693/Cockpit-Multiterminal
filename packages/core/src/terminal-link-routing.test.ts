import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '@cockpit/shared';
import { planTerminalLinkRouting } from './terminal-link-routing';
import type { TerminalLink } from './terminal-link-manager';

function session(overrides: Partial<SessionRecord>): SessionRecord {
  return {
    id: overrides.id ?? 'source-1',
    name: overrides.name ?? 'Claude',
    cwd: 'C:/work',
    status: 'running',
    pid: 1234,
    createdAt: Date.now(),
    adapterId: 'claude-code',
    agentStatus: 'working',
    lastStatusChangeAt: Date.now(),
    workspace: 'Geral',
    taskId: null,
    taskRole: null,
    projectId: null,
    ...overrides
  };
}

function link(overrides: Partial<TerminalLink>): TerminalLink {
  return {
    id: 'l1',
    sourceId: 'source-1',
    targetId: 'target-1',
    mode: 'auto',
    projectId: null,
    createdAt: Date.now(),
    ...overrides
  };
}

describe('planTerminalLinkRouting (Épico 9, Story 9.2, FR26)', () => {
  it('dispara quando a origem→done com vínculo auto (AC1)', () => {
    const s = session({ id: 'a', agentStatus: 'done' });
    const links = [link({ sourceId: 'a', targetId: 'b' })];
    const result = planTerminalLinkRouting(s, links);

    expect(result).not.toBeNull();
    expect(result!.sourceId).toBe('a');
    expect(result!.targetIds).toEqual(['b']);
  });

  it('dispara em waiting-input também (AC1 cobre os dois status)', () => {
    const s = session({ id: 'a', agentStatus: 'waiting-input' });
    const links = [link({ sourceId: 'a', targetId: 'b' })];
    expect(planTerminalLinkRouting(s, links)).not.toBeNull();
  });

  it('mensagem referencia o terminal de origem (AC2)', () => {
    const s = session({ id: 'a', name: 'Codex', adapterId: 'codex', agentStatus: 'done' });
    const links = [link({ sourceId: 'a', targetId: 'b' })];
    const result = planTerminalLinkRouting(s, links);
    expect(result!.message).toContain('Codex');
    expect(result!.message).toContain('codex');
  });

  it('agrega múltiplos alvos auto do mesmo terminal de origem', () => {
    const s = session({ id: 'a', agentStatus: 'done' });
    const links = [
      link({ id: 'l1', sourceId: 'a', targetId: 'b' }),
      link({ id: 'l2', sourceId: 'a', targetId: 'c' })
    ];
    const result = planTerminalLinkRouting(s, links);
    expect(result!.targetIds.sort()).toEqual(['b', 'c']);
  });

  it('NÃO dispara se o status não é done/waiting-input', () => {
    const s = session({ id: 'a', agentStatus: 'working' });
    const links = [link({ sourceId: 'a', targetId: 'b' })];
    expect(planTerminalLinkRouting(s, links)).toBeNull();
  });

  it('NÃO dispara para vínculo em modo manual', () => {
    const s = session({ id: 'a', agentStatus: 'done' });
    const links = [link({ sourceId: 'a', targetId: 'b', mode: 'manual' })];
    expect(planTerminalLinkRouting(s, links)).toBeNull();
  });

  it('NÃO dispara se não há vínculo auto com essa origem', () => {
    const s = session({ id: 'a', agentStatus: 'done' });
    const links = [link({ sourceId: 'outro', targetId: 'b' })];
    expect(planTerminalLinkRouting(s, links)).toBeNull();
  });
});
