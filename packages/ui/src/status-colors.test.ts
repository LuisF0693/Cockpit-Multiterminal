import { describe, expect, it } from 'vitest';
import { AgentStatusSchema } from '@cockpit/shared';
import { STATUS_COLORS, STATUS_LABELS, statusColor, statusLabel } from './status-colors';

describe('status-colors (Story 2.5 — fonte de verdade única)', () => {
  it('cobre TODOS os AgentStatus do domínio (cor e label)', () => {
    for (const status of AgentStatusSchema.options) {
      expect(STATUS_COLORS[status], `cor de ${status}`).toMatch(/^#[0-9A-F]{6}$/i);
      expect(STATUS_LABELS[status], `label de ${status}`).toBeTruthy();
    }
  });

  it('waiting-input é âmbar (destaque FR9) e helpers resolvem', () => {
    expect(statusColor('waiting-input')).toBe('#FBBF24');
    expect(statusLabel('waiting-input')).toBe('aguardando você');
  });
});
