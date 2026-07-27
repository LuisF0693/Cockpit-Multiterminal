import { describe, expect, it } from 'vitest';
import {
  AUTO_DELIVERY_MAX_PER_WINDOW,
  AUTO_DELIVERY_WINDOW_MS,
  chargeAutoDeliveryBudget,
  planTaskDelivery,
  resolveDeliveryTarget,
  type DeliveryTargetRef
} from './task-delivery';

const tile = (overrides: Partial<DeliveryTargetRef>): DeliveryTargetRef => ({
  id: overrides.id ?? 't1',
  adapterId: overrides.adapterId ?? 'claude-code',
  status: overrides.status ?? 'waiting-input',
  ...overrides
});

describe('resolveDeliveryTarget (Onda 1 — alvo da entrega em tile aberto)', () => {
  const sessions = [
    tile({ id: 'a', label: '@dev', adapterId: 'claude-code' }),
    tile({ id: 'b', label: '@qa', adapterId: 'codex', status: 'working' }),
    tile({ id: 'c', label: '@dev-frontend', adapterId: 'grok' })
  ];

  it('resolve por session id exato', () => {
    const r = resolveDeliveryTarget(sessions, { sessionId: 'b' });
    expect(r.kind).toBe('resolved');
    expect(r.kind === 'resolved' && r.target.id).toBe('b');
  });

  it('id inexistente é not-found (nunca cai pro label)', () => {
    const r = resolveDeliveryTarget(sessions, { sessionId: 'zzz', agentLabel: '@dev' });
    expect(r.kind).toBe('not-found');
  });

  it('label exato vence o casamento por substring (@dev não puxa @dev-frontend)', () => {
    const r = resolveDeliveryTarget(sessions, { agentLabel: '@dev' });
    expect(r.kind === 'resolved' && r.target.id).toBe('a');
  });

  it('casa por substring quando não há exato', () => {
    const r = resolveDeliveryTarget(sessions, { agentLabel: 'frontend' });
    expect(r.kind === 'resolved' && r.target.id).toBe('c');
  });

  it('ignora caixa e espaços em volta do label', () => {
    const r = resolveDeliveryTarget(sessions, { agentLabel: '  @QA ' });
    expect(r.kind === 'resolved' && r.target.id).toBe('b');
  });

  it('mais de um casamento no mesmo nível é AMBÍGUO (não chuta o tile)', () => {
    const dupes = [tile({ id: 'a', label: '@dev' }), tile({ id: 'b', label: '@dev' })];
    const r = resolveDeliveryTarget(dupes, { agentLabel: '@dev' });
    expect(r.kind).toBe('ambiguous');
    expect(r.kind === 'ambiguous' && r.matches.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('tiles sem label não participam do casamento por nome', () => {
    const r = resolveDeliveryTarget([tile({ id: 'a' })], { agentLabel: '@dev' });
    expect(r.kind).toBe('not-found');
  });

  it('sem seletor nenhum devolve not-found com instrução de uso', () => {
    const r = resolveDeliveryTarget(sessions, {});
    expect(r.kind).toBe('not-found');
    expect(r.kind === 'not-found' && r.reason).toContain('--to-session');
  });
});

describe('planTaskDelivery (Onda 1 — respeita o estado do alvo)', () => {
  it('entrega quando o alvo está waiting-input', () => {
    expect(planTaskDelivery(tile({ status: 'waiting-input' })).decision).toBe('deliver');
  });

  it('entrega quando o alvo está done', () => {
    expect(planTaskDelivery(tile({ status: 'done' })).decision).toBe('deliver');
  });

  it('ENFILEIRA quando o alvo está ocupado — nunca descarta nem força', () => {
    expect(planTaskDelivery(tile({ status: 'working' })).decision).toBe('queue');
  });

  it('idle também enfileira: o CLI pode ainda não estar pronto pra receber', () => {
    expect(planTaskDelivery(tile({ status: 'idle' })).decision).toBe('queue');
  });

  it('RECUSA alvo em erro — enfileirar ali seria prometer entrega que nunca ocorre', () => {
    const plan = planTaskDelivery(tile({ status: 'error' }));
    expect(plan.decision).toBe('refuse');
    expect(plan.reason).toContain('erro');
  });

  it('queueIfBusy=false troca a fila por recusa explícita', () => {
    expect(planTaskDelivery(tile({ status: 'working' }), { queueIfBusy: false }).decision).toBe('refuse');
  });
});

describe('chargeAutoDeliveryBudget (Onda 1 — freio de ping-pong)', () => {
  it('primeira injeção sempre passa e abre a janela', () => {
    const r = chargeAutoDeliveryBudget(undefined, 1_000);
    expect(r.allowed).toBe(true);
    expect(r.budget).toEqual({ windowStartedAt: 1_000, count: 1 });
  });

  it('permite até o teto dentro da janela e barra a partir dele', () => {
    let budget = chargeAutoDeliveryBudget(undefined, 0).budget;
    for (let i = 2; i <= AUTO_DELIVERY_MAX_PER_WINDOW; i++) {
      const r = chargeAutoDeliveryBudget(budget, i);
      expect(r.allowed).toBe(true);
      budget = r.budget;
    }
    const blocked = chargeAutoDeliveryBudget(budget, AUTO_DELIVERY_MAX_PER_WINDOW + 1);
    expect(blocked.allowed).toBe(false);
    expect(blocked.budget.count).toBe(AUTO_DELIVERY_MAX_PER_WINDOW);
  });

  it('a janela expira sozinha — alvo barrado volta a receber', () => {
    const saturated = { windowStartedAt: 0, count: AUTO_DELIVERY_MAX_PER_WINDOW };
    expect(chargeAutoDeliveryBudget(saturated, AUTO_DELIVERY_WINDOW_MS - 1).allowed).toBe(false);
    const recovered = chargeAutoDeliveryBudget(saturated, AUTO_DELIVERY_WINDOW_MS);
    expect(recovered.allowed).toBe(true);
    expect(recovered.budget).toEqual({ windowStartedAt: AUTO_DELIVERY_WINDOW_MS, count: 1 });
  });

  it('teto e janela são configuráveis (usado pelos testes e por tuning futuro)', () => {
    const budget = { windowStartedAt: 0, count: 2 };
    expect(chargeAutoDeliveryBudget(budget, 10, { maxPerWindow: 2, windowMs: 1_000 }).allowed).toBe(false);
    expect(chargeAutoDeliveryBudget(budget, 10, { maxPerWindow: 3, windowMs: 1_000 }).allowed).toBe(true);
  });
});
