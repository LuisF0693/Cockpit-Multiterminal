/**
 * Adoção ao vivo de sessões externas do daemon (Story 16.3, Épico 16).
 * Sessões criadas por clientes externos do daemon (ex.: um agente
 * orquestrador escrevendo no pipe) não existem no registry nem na
 * persistência — este planner puro decide QUAIS adotar e com que metadados;
 * o chamador (Main) executa os efeitos (adoptPty, registry.adopt, porta).
 * Mesmo princípio de `planTerminalLinkRouting` (9.2): decisão sem I/O.
 */

/** Espelho mínimo de DaemonSessionInfo (pty-host) — core não depende do pacote. */
export interface ExternalSessionInfo {
  id: string;
  adapterId: string;
  pid: number;
  cwd: string;
  createdAt: number;
  /** Nome dado pelo cliente externo no create (Story 17.1) — ex.: "@dev". */
  label?: string;
}

export interface ExternalAdoptionPlan {
  id: string;
  name: string;
  adapterId: string;
  pid: number;
  cwd: string;
  createdAt: number;
  /** Projeto cujo rootPath contém o cwd (match mais específico) — null se nenhum. */
  projectId: string | null;
}

/** Normaliza pra comparação de caminhos no Windows: separador único, sem barra final, case-insensitive. */
function normalizePath(p: string): string {
  const unified = p.replace(/\\/g, '/').toLowerCase();
  return unified.endsWith('/') ? unified.slice(0, -1) : unified;
}

function projectIdFor(cwd: string, projects: ReadonlyArray<{ id: string; rootPath: string }>): string | null {
  const target = normalizePath(cwd);
  let best: { id: string; len: number } | null = null;
  for (const p of projects) {
    const root = normalizePath(p.rootPath);
    if (target !== root && !target.startsWith(root + '/')) continue;
    if (!best || root.length > best.len) best = { id: p.id, len: root.length };
  }
  return best?.id ?? null;
}

/**
 * Decide quais sessões vivas no daemon são EXTERNAS (desconhecidas do app)
 * e devem virar tile. `knownIds` deve incluir também ids em criação pelo
 * próprio app (portas estacionadas) — fecha o race entre o create no daemon
 * e o insert no registry.
 */
export function planExternalAdoption(
  daemonSessions: ExternalSessionInfo[],
  knownIds: ReadonlySet<string>,
  projects: ReadonlyArray<{ id: string; rootPath: string }>
): ExternalAdoptionPlan[] {
  return daemonSessions
    .filter((s) => !knownIds.has(s.id))
    .map((s) => ({
      id: s.id,
      // Com label (despacho de agente, 17.1) o tile carrega a identidade do
      // agente; sem label, cai no nome genérico por adapter (16.3).
      name: s.label !== undefined && s.label.trim() !== '' ? s.label.trim() : `${s.adapterId} (externo)`,
      adapterId: s.adapterId,
      pid: s.pid,
      cwd: s.cwd,
      createdAt: s.createdAt,
      projectId: projectIdFor(s.cwd, projects)
    }));
}
