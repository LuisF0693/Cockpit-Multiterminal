import { describe, expect, it } from 'vitest';
import { planExternalAdoption, type ExternalSessionInfo } from './external-adoption';

function session(id: string, adapterId: string, cwd: string): ExternalSessionInfo {
  return { id, adapterId, pid: 1000, cwd, createdAt: 42 };
}

describe('planExternalAdoption (Story 16.3, Épico 16)', () => {
  const projects = [
    { id: 'p-root', rootPath: 'F:\\Projetos' },
    { id: 'p-cockpit', rootPath: 'F:\\Projetos\\Meu Cockpit' }
  ];

  it('ignora sessões já conhecidas (registry OU em criação pelo app)', () => {
    const plans = planExternalAdoption(
      [session('a', 'codex', 'F:\\Projetos'), session('b', 'shell', 'F:\\Projetos')],
      new Set(['a']),
      projects
    );
    expect(plans.map((p) => p.id)).toEqual(['b']);
  });

  it('casa o projeto pelo rootPath MAIS específico, case-insensitive e com separadores mistos', () => {
    const plans = planExternalAdoption(
      [session('x', 'claude-code', 'f:/projetos/meu cockpit/packages')],
      new Set(),
      projects
    );
    expect(plans[0]?.projectId).toBe('p-cockpit');
  });

  it('não casa prefixo parcial de nome de pasta (boundary de segmento)', () => {
    const plans = planExternalAdoption(
      [session('x', 'codex', 'F:\\Projetos\\Meu CockpitOutro')],
      new Set(),
      [{ id: 'p-cockpit', rootPath: 'F:\\Projetos\\Meu Cockpit' }]
    );
    expect(plans[0]?.projectId).toBeNull();
  });

  it('cwd igual ao rootPath casa; sem projeto correspondente vira null', () => {
    const [same, none] = planExternalAdoption(
      [session('s', 'codex', 'F:\\Projetos\\Meu Cockpit\\'), session('n', 'codex', 'C:\\Outro')],
      new Set(),
      projects
    );
    expect(same?.projectId).toBe('p-cockpit');
    expect(none?.projectId).toBeNull();
  });

  it('deriva nome e preserva metadados do daemon', () => {
    const [plan] = planExternalAdoption([session('z', 'codex', 'C:\\qualquer')], new Set(), []);
    expect(plan).toMatchObject({ id: 'z', name: 'codex (externo)', adapterId: 'codex', pid: 1000, createdAt: 42 });
  });

  it('label do despacho vira o nome do tile; label vazio cai no genérico (Story 17.1, AC4)', () => {
    const [labeled, blank] = planExternalAdoption(
      [
        { ...session('a', 'claude-code', 'C:\\proj'), label: '@dev' },
        { ...session('b', 'codex', 'C:\\proj'), label: '   ' }
      ],
      new Set(),
      []
    );
    expect(labeled?.name).toBe('@dev');
    expect(blank?.name).toBe('codex (externo)');
  });

  it('propaga dispatchedBy do despacho; ausente ou em branco vira null (Story 17.2, AC3)', () => {
    const [linked, blank, absent] = planExternalAdoption(
      [
        { ...session('a', 'claude-code', 'C:\\proj'), dispatchedBy: 'chefe-01' },
        { ...session('b', 'codex', 'C:\\proj'), dispatchedBy: '  ' },
        session('c', 'codex', 'C:\\proj')
      ],
      new Set(),
      []
    );
    expect(linked?.dispatchedBy).toBe('chefe-01');
    expect(blank?.dispatchedBy).toBeNull();
    expect(absent?.dispatchedBy).toBeNull();
  });
});
