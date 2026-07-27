import { defineConfig } from 'vitest/config';

/**
 * Runner dos SMOKES que dependem de CLI de IA real (Onda 1).
 *
 * A suíte padrão (`vitest run`, sem `--config`) usa o `include` default do
 * vitest — `*.{test,spec}.*` — então os arquivos `*.smoke.ts` ficam de fora
 * por construção: `pnpm -w test` num runner limpo não tenta rodar Codex, não
 * depende de rede e não gasta token nenhum do fundador.
 *
 * Este config existe só para o caminho inverso: rodar EXPLICITAMENTE os
 * smokes, via `pnpm --filter @cockpit/pty-host smoke:codex`.
 *
 * Os timeouts são longos porque um turno de CLI de IA real leva dezenas de
 * segundos (boot de config + MCP servers + o turno em si) — o timeout padrão
 * de 5s do vitest reprovaria por impaciência, não por defeito.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.smoke.ts'],
    testTimeout: 600_000,
    hookTimeout: 120_000,
    // Um CLI de IA por vez: dois Codex simultâneos disputariam rate limit e
    // tornariam a leitura de "quem travou" ambígua.
    fileParallelism: false
  }
});
