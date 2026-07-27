import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Entrega ÚNICA no vínculo `auto` (Onda 1) — regressão do bug de instrução
 * duplicada corrigido no commit 5695b29.
 *
 * O defeito: quando um worker terminava, o Main injetava a instrução no PTY do
 * terminal-chefe (`deliverToTerminal`) E emitia `terminalLinkRouted`; o
 * renderer, que desde a Story 9.2 entregava por conta própria no `onRouted`,
 * injetava a MESMA instrução de novo. O chefe recebia a ordem duas vezes.
 *
 * Por isso este arquivo conta CHAMADAS, não presença. Um teste que só
 * verificasse "a instrução chegou" passaria com o bug de pé — foi exatamente
 * assim que ele sobreviveu até o fundador ver o comando dobrado na tela.
 *
 * Escopo honesto: isto cobre o lado MAIN (quantas vezes o processo principal
 * entrega, e que o `terminalLinkRouted` sai como NOTIFICAÇÃO). O lado
 * renderer — `App.tsx` não chamar `instructAgent` no `onRouted` — não é
 * exercitado aqui; ver a nota no final do arquivo.
 */

interface SentMessage {
  channel: string;
  payload: unknown;
}

const ipcHandlers = new Map<string, (event: unknown, raw: unknown) => unknown>();
const sent: SentMessage[] = [];

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (event: unknown, raw: unknown) => unknown) => {
      ipcHandlers.set(channel, fn);
    },
    on: () => void 0,
    removeHandler: () => void 0
  },
  BrowserWindow: {
    // Uma janela só: o push é broadcast, e mais de uma inflaria a contagem
    // sem representar entrega extra no PTY.
    getAllWindows: () => [
      {
        webContents: {
          send: (channel: string, payload: unknown) => {
            sent.push({ channel, payload });
          }
        }
      }
    ]
  },
  dialog: { showOpenDialogSync: () => undefined },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: () => Buffer.alloc(0), decryptString: () => '' }
}));

// Imports estáticos: `vi.mock` é içado acima deles pelo vitest, então
// `session-ipc` já enxerga o electron falso ao ser carregado.
const { MemoryStateStore } = await import('@cockpit/core');
const { IpcChannels } = await import('@cockpit/shared');
const { registerSessionIpc } = await import('./session-ipc');
type PtyBackend = Parameters<typeof registerSessionIpc>[0];

/** Backend de PTY instrumentado: conta cada caminho de escrita separadamente. */
function makeBackend(): {
  backend: PtyBackend;
  delivered: Array<{ ptyId: string; text: string }>;
  written: Array<{ ptyId: string; text: string }>;
  fireStatus: (ptyId: string, status: string) => void;
} {
  const delivered: Array<{ ptyId: string; text: string }> = [];
  const written: Array<{ ptyId: string; text: string }> = [];
  let statusCb: (ptyId: string, status: string) => void = () => void 0;
  let seq = 0;

  const backend: PtyBackend = {
    createPty: async () => {
      seq += 1;
      return {
        ptyId: `pty-${seq}`,
        pid: 1000 + seq,
        rendererPort: { postMessage: () => void 0 } as unknown as Electron.MessagePortMain
      };
    },
    closePty: async () => ({ orphan: false }),
    resizePty: () => void 0,
    listAdapters: async () => [{ id: 'shell', displayName: 'Shell' }],
    onSessionExit: () => void 0,
    onSessionStatus: (cb) => {
      statusCb = cb;
    },
    onHostExit: () => void 0,
    writePty: (ptyId, text) => {
      written.push({ ptyId, text });
    },
    deliverTask: async (ptyId, text) => {
      delivered.push({ ptyId, text });
      return { outcome: 'delivered', reason: 'ok', queued: 0 };
    }
  };

  return { backend, delivered, written, fireStatus: (ptyId, status) => statusCb(ptyId, status) };
}

async function bootMain(): Promise<{
  handle: ReturnType<typeof registerSessionIpc>;
  delivered: Array<{ ptyId: string; text: string }>;
  written: Array<{ ptyId: string; text: string }>;
  fireStatus: (ptyId: string, status: string) => void;
  invoke: (channel: string, raw?: unknown) => unknown;
}> {
  const { backend, delivered, written, fireStatus } = makeBackend();
  const store = new MemoryStateStore();
  store.init();
  const handle = registerSessionIpc(backend, store, (batch) => {
    for (const fn of batch) fn();
  });
  return {
    handle,
    delivered,
    written,
    fireStatus,
    invoke: (channel, raw) => {
      const fn = ipcHandlers.get(channel);
      if (!fn) throw new Error(`canal IPC não registrado no teste: ${channel}`);
      return fn({ sender: {} }, raw);
    }
  };
}

/** O vínculo exige projeto igual (AC4 da 9.1) — todo terminal do teste nasce no ativo. */
function activeProject(handle: ReturnType<typeof registerSessionIpc>): string {
  return handle.persistence.projects().activeId;
}

/** Cria worker + chefe no mesmo projeto e devolve os ids (AC4 exige projeto igual). */
async function makePair(
  handle: ReturnType<typeof registerSessionIpc>
): Promise<{ workerId: string; chefeId: string; chefePtyId: string; workerPtyId: string }> {
  const projectId = activeProject(handle);
  const worker = await handle.registry.create({ cols: 80, rows: 24, name: 'worker', projectId });
  const chefe = await handle.registry.create({ cols: 80, rows: 24, name: 'chefe', projectId });
  return {
    workerId: worker.id,
    chefeId: chefe.id,
    workerPtyId: handle.registry.ptyIdOf(worker.id),
    chefePtyId: handle.registry.ptyIdOf(chefe.id)
  };
}

beforeEach(() => {
  ipcHandlers.clear();
  sent.length = 0;
});

describe('vínculo auto: a instrução chega ao chefe EXATAMENTE uma vez (Onda 1)', () => {
  it('worker termina → uma entrega no PTY do chefe, e o routed é só notificação', async () => {
    const main = await bootMain();
    const { workerId, chefeId, chefePtyId, workerPtyId } = await makePair(main.handle);
    main.invoke(IpcChannels.terminalLinkCreate, { sourceId: workerId, targetId: chefeId, mode: 'auto' });

    main.fireStatus(workerPtyId, 'done');
    await vi.waitFor(() => expect(main.delivered.length).toBeGreaterThan(0));

    // A CONTAGEM é o teste. Com o bug, o Main entregava uma vez e o renderer
    // outra — nenhum expect de "chegou" pegaria isso.
    expect(main.delivered).toHaveLength(1);
    expect(main.delivered[0]!.ptyId).toBe(chefePtyId);
    expect(main.delivered[0]!.text).toContain('Instrução automática');
    // `deliverTask` é o único caminho quando o daemon está no ar: um
    // `writePty` aqui seria a entrega paralela que causou a duplicação.
    expect(main.written).toHaveLength(0);

    // O evento ao renderer continua existindo (timeline/UI), mas como AVISO:
    // sai uma vez só, e o renderer não deve derivar escrita dele.
    const routed = sent.filter((m) => m.channel === IpcChannels.terminalLinkRouted);
    expect(routed).toHaveLength(1);
  });

  it('dois alvos no mesmo vínculo → uma entrega para CADA, nunca duas para o mesmo', async () => {
    const main = await bootMain();
    const projectId = activeProject(main.handle);
    const worker = await main.handle.registry.create({ cols: 80, rows: 24, name: 'worker', projectId });
    const chefeA = await main.handle.registry.create({ cols: 80, rows: 24, name: 'chefe-a', projectId });
    const chefeB = await main.handle.registry.create({ cols: 80, rows: 24, name: 'chefe-b', projectId });
    main.invoke(IpcChannels.terminalLinkCreate, { sourceId: worker.id, targetId: chefeA.id, mode: 'auto' });
    main.invoke(IpcChannels.terminalLinkCreate, { sourceId: worker.id, targetId: chefeB.id, mode: 'auto' });

    main.fireStatus(main.handle.registry.ptyIdOf(worker.id), 'done');
    await vi.waitFor(() => expect(main.delivered.length).toBe(2));

    expect(main.delivered.map((d) => d.ptyId).sort()).toEqual(
      [main.handle.registry.ptyIdOf(chefeA.id), main.handle.registry.ptyIdOf(chefeB.id)].sort()
    );
  });

  it('vínculo gate NÃO entrega no disparo — só no APPROVE, e aí uma vez só', async () => {
    const main = await bootMain();
    const { workerId, chefeId, chefePtyId, workerPtyId } = await makePair(main.handle);
    main.invoke(IpcChannels.terminalLinkCreate, { sourceId: workerId, targetId: chefeId, mode: 'gate' });

    main.fireStatus(workerPtyId, 'done');
    await vi.waitFor(() => expect(sent.some((m) => m.channel === IpcChannels.terminalLinkGatePend)).toBe(true));
    expect(main.delivered).toHaveLength(0); // retido aguardando humano

    const pend = sent.find((m) => m.channel === IpcChannels.terminalLinkGatePend)!.payload as { gateId: string };
    main.invoke(IpcChannels.terminalLinkGateResolve, { gateId: pend.gateId, action: 'approve' });
    await vi.waitFor(() => expect(main.delivered.length).toBe(1));

    expect(main.delivered[0]!.ptyId).toBe(chefePtyId);
  });

  it('mesma transição repetida não re-entrega (o registry só emite em MUDANÇA de status)', async () => {
    const main = await bootMain();
    const { workerId, chefeId, workerPtyId } = await makePair(main.handle);
    main.invoke(IpcChannels.terminalLinkCreate, { sourceId: workerId, targetId: chefeId, mode: 'auto' });

    main.fireStatus(workerPtyId, 'done');
    main.fireStatus(workerPtyId, 'done');
    main.fireStatus(workerPtyId, 'done');
    await vi.waitFor(() => expect(main.delivered.length).toBeGreaterThan(0));

    expect(main.delivered).toHaveLength(1);
  });
});

/**
 * NÃO COBERTO AQUI (dito na cara, não arredondado):
 * o handler `onRouted` do renderer (`App.tsx`) hoje é um no-op — foi essa a
 * metade da correção. Provar isso por teste exigiria montar o React inteiro
 * com o `window.cockpit` do preload mockado, e não há nenhuma infra de teste
 * de renderer no repositório. Se alguém reintroduzir `instructAgent` no
 * `onRouted`, os casos acima seguem VERDES e a duplicação volta.
 */
