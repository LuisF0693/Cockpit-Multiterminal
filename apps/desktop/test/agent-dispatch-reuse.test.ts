import { describe, expect, it } from 'vitest';
import { DaemonClient } from '@cockpit/pty-host';
// `startDaemon` NÃO sai pelo index do pty-host de propósito (NFR7: só o
// daemon-entry conhece adapters, e o Main não pode puxá-los pro bundle). Por
// isso este teste vive em `test/`, fora de `src/main` — o import direto do
// entry aqui não contamina o processo principal.
import { startDaemon } from '../../../packages/pty-host/src/daemon-entry';
import { dispatchAgent } from '../src/main/agent-dispatch';

/**
 * CONTINUIDADE DE AGENTE ponta-a-ponta (Épico 20, Story 20.2) — daemon REAL,
 * pipe REAL, PTY REAL (`shell`), a MESMA função que a CLI executa.
 *
 * O que este arquivo prova, e por que precisa de daemon de verdade: o sintoma
 * relatado pelo fundador ("a orquestração pede o dev e ele abre OUTRO dev") só
 * é observável na CONTAGEM DE SESSÕES depois do despacho. Um teste que
 * verificasse apenas "a instrução foi entregue" passaria com o bug de pé — o
 * segundo @dev também recebe instrução. Por isso cada caso aqui afirma quantas
 * sessões existem no daemon ao final.
 *
 * Escopo honesto: `shell` recebe os bytes mas não é um CLI de IA — isto cobre a
 * DECISÃO (reusar × criar) e o caminho da CLI até o `deliver-task`. Que a
 * instrução vire um TURNO SUBMETIDO num agente real é o que os smokes de
 * claude-code/codex cobrem (regra da decisão crítica 6), e o reuso reaproveita
 * exatamente aquele caminho de entrega, já validado com CLI real.
 */

const uniquePipe = (): string => `\\\\.\\pipe\\cockpit-reuse-test-${process.pid}-${Math.random().toString(36).slice(2)}`;

const CWD = process.cwd();

async function withDaemon(
  fn: (ctx: { pipe: string; client: DaemonClient }) => Promise<void>
): Promise<void> {
  const pipe = uniquePipe();
  const server = await startDaemon(pipe);
  const client = new DaemonClient();
  await client.connect(pipe);
  try {
    await fn({ pipe, client });
  } finally {
    client.disconnect();
    await server.shutdown();
  }
}

/** Tile "@dev" já aberto, como o fundador tem na tela quando pede o despacho. */
async function openDevTile(client: DaemonClient, over?: { adapterId?: string; label?: string }): Promise<string> {
  const { id } = await client.createSession({
    tag: `dev-${Math.random().toString(36).slice(2)}`,
    cols: 80,
    rows: 24,
    cwd: CWD,
    adapterId: over?.adapterId ?? 'shell',
    label: over?.label ?? '@dev'
  });
  return id;
}

describe('agent-dispatch: reuso do agente já aberto (Story 20.2)', () => {
  it(
    'com um "@dev" vivo, o despacho NÃO abre um segundo — entrega no que já existe',
    { timeout: 60_000 },
    async () => {
      await withDaemon(async ({ pipe, client }) => {
        const devId = await openDevTile(client);

        const code = await dispatchAgent([
          '--agent',
          '@dev',
          '--task',
          'continuar a story 20.2',
          '--cwd',
          CWD,
          '--pipe',
          pipe,
          '--no-link'
        ]);

        expect(code).toBe(0);
        const sessions = await client.listSessions();
        expect(sessions).toHaveLength(1); // o ponto do épico: nenhum worker novo
        expect(sessions[0]?.id).toBe(devId);
      });
    }
  );

  it(
    '--new força worker novo mesmo com o "@dev" na tela',
    { timeout: 60_000 },
    async () => {
      await withDaemon(async ({ pipe, client }) => {
        await openDevTile(client);

        const code = await dispatchAgent([
          '--agent',
          '@dev',
          '--task',
          'tocar outra frente em paralelo',
          '--cwd',
          CWD,
          '--adapter',
          'shell', // adapter explícito: sem ele não há candidato de IA no daemon de teste
          '--pipe',
          pipe,
          '--no-link',
          '--new'
        ]);

        expect(code).toBe(0);
        expect(await client.listSessions()).toHaveLength(2);
      });
    }
  );

  it(
    'sem tile com o nome do agente, cria worker novo (comportamento pré-20.2 preservado)',
    { timeout: 60_000 },
    async () => {
      await withDaemon(async ({ pipe, client }) => {
        await openDevTile(client, { label: '@qa' });

        const code = await dispatchAgent([
          '--agent',
          '@dev',
          '--task',
          'implementar o reuso',
          '--cwd',
          CWD,
          '--adapter',
          'shell',
          '--pipe',
          pipe,
          '--no-link'
        ]);

        expect(code).toBe(0);
        expect(await client.listSessions()).toHaveLength(2);
      });
    }
  );

  it(
    'tile do MESMO nome em OUTRO projeto não é reusado (invariante do vínculo 17.2)',
    { timeout: 60_000 },
    async () => {
      await withDaemon(async ({ pipe, client }) => {
        await client.createSession({
          tag: 'dev-outro-projeto',
          cols: 80,
          rows: 24,
          cwd: CWD,
          adapterId: 'shell',
          label: '@dev'
        });

        const code = await dispatchAgent([
          '--agent',
          '@dev',
          '--task',
          'mexer no outro repositório',
          // cwd DIFERENTE do tile aberto acima
          '--cwd',
          `${CWD}/src`,
          '--adapter',
          'shell',
          '--pipe',
          pipe,
          '--no-link'
        ]);

        expect(code).toBe(0);
        expect(await client.listSessions()).toHaveLength(2);
      });
    }
  );

  it(
    'dois "@dev" abertos ABORTAM o despacho em vez de escolher o errado',
    { timeout: 60_000 },
    async () => {
      await withDaemon(async ({ pipe, client }) => {
        await openDevTile(client);
        await openDevTile(client);

        const code = await dispatchAgent([
          '--agent',
          '@dev',
          '--task',
          'qual dos dois?',
          '--cwd',
          CWD,
          '--pipe',
          pipe,
          '--no-link'
        ]);

        expect(code).toBe(1);
        expect(await client.listSessions()).toHaveLength(2); // nada foi criado
      });
    }
  );

  it(
    'agente OCUPADO sem Cockpit aberto: enfileira em vez de segurar pergunta que ninguém veria (Story 20.3)',
    { timeout: 60_000 },
    async () => {
      await withDaemon(async ({ pipe, client }) => {
        // Sessão recém-criada está `working` (boot do CLI) — é o estado ocupado
        // que dispara a pergunta. Nenhum app conectado neste daemon de teste.
        const devId = await openDevTile(client);

        const code = await dispatchAgent([
          '--agent',
          '@dev',
          '--task',
          'entrar na fila dele',
          '--cwd',
          CWD,
          '--pipe',
          pipe,
          '--no-link'
        ]);

        expect(code).toBe(0);
        // Nenhum worker novo E nenhuma pergunta pendente: a tarefa foi pra fila
        // do próprio agente, que é o desfecho que nunca perde a tarefa.
        expect(await client.listSessions()).toHaveLength(1);
        expect(await client.listDispatchChoices()).toEqual([]);
        expect(devId).toBeTruthy();
      });
    }
  );

  it(
    'agente OCUPADO com Cockpit conectado: abre pergunta na fila de Decisões e NÃO entrega ainda (Story 20.3)',
    { timeout: 60_000 },
    async () => {
      await withDaemon(async ({ pipe, client }) => {
        const devId = await openDevTile(client);

        // Consultar a fila é a assinatura do app — é o poll de 4s do Main que
        // prova ao daemon que existe uma fila de Decisões viva para a pergunta.
        const app = new DaemonClient();
        await app.connect(pipe);
        await app.listDispatchChoices();

        const code = await dispatchAgent([
          '--agent',
          '@dev',
          '--task',
          'decidir depois',
          '--cwd',
          CWD,
          '--pipe',
          pipe,
          '--no-link'
        ]);

        expect(code).toBe(0);
        expect(await client.listSessions()).toHaveLength(1);
        const choices = await app.listDispatchChoices();
        expect(choices).toHaveLength(1);
        expect(choices[0]).toMatchObject({ agent: '@dev', targetId: devId, targetLabel: '@dev' });
        app.disconnect();
      });
    }
  );

  it(
    'reusa mesmo sem NENHUM adapter de IA candidato — o agente já existe, não há o que criar',
    { timeout: 60_000 },
    async () => {
      await withDaemon(async ({ pipe, client }) => {
        // `shell` é NON_DISPATCHABLE: a política não o ofereceria pra nascer
        // worker. Antes da 20.2 a CLI abortava aqui ("nenhum adapter de IA
        // disponível") mesmo com o @dev vivo logo ali.
        const devId = await openDevTile(client);

        const code = await dispatchAgent([
          '--agent',
          '@dev',
          '--task',
          'seguir com o que já está aberto',
          '--cwd',
          CWD,
          '--pipe',
          pipe,
          '--no-link'
        ]);

        expect(code).toBe(0);
        const sessions = await client.listSessions();
        expect(sessions).toHaveLength(1);
        expect(sessions[0]?.id).toBe(devId);
      });
    }
  );
});
