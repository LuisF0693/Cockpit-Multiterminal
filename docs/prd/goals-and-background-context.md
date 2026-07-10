# Goals and Background Context

### Goals

- Eliminar a carga cognitiva de gerenciar manualmente múltiplos CLIs de IA em terminais desconectados.
- Entregar uma central de controle multiagente desktop com sessão master que mantém coerência entre agentes.
- Garantir sobrevivência total de sessão: fechar/reiniciar o app nunca perde estado, contexto ou histórico.
- Ser agnóstico de provider via adapter design — adicionar um novo CLI = escrever 1 adapter.
- Integrar decisões humanas (aprovar/revisar/redirecionar) ao fluxo como governança de primeira classe.
- Validar o MVP conduzindo um ciclo AIOX real com 3 agentes de providers diferentes, com restart no meio, sem perda de estado.

### Background Context

Desenvolvedores multi-agente operam hoje como "barramento humano de integração": N terminais, N contextos, N convenções de hooks — e todo o estado evapora a cada restart. A análise competitiva (Nyx, Maestri, Orca) mostrou que o mercado resolveu a *visualização* de múltiplos agentes (canvas de tiles PTY), mas ninguém resolveu a *orquestração governada*: sessão master com memória, lifecycle ponta a ponta e persistência como contrato. O Meu Cockpit ocupa esse quadrante vazio, transformando desenvolvimento multi-LLM em **entrega agêntica**: o humano governa, o sistema executa a mecânica.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-10 | 0.1 | Draft inicial a partir do project brief | Morgan (@pm) |
