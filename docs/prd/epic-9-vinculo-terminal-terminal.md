# Epic 9 — Vínculo Terminal-a-Terminal

Generalizar o roteamento automático de instrução (Épico 7, FR17) para FORA do
contexto de tarefa/three-brain: qualquer terminal pode ser vinculado a
qualquer outro terminal, para que o agente de origem comande o terminal alvo
— independente de os dois estarem vinculados à mesma tarefa ou de terem
papéis (escritor/revisor) atribuídos.

> **Formalização 2026-07-14 (@pm, spec pipeline):** extensão da visão do
> fundador (briefing com capturas de tela mostrando terminais conectados por
> linhas no canvas). FR25-27 adicionados a `requirements.md`. Depende do
> Épico 8 (projeto ativo escopa quais terminais aparecem no canvas — vínculos
> só fazem sentido dentro do mesmo projeto). Complexidade: STANDARD.
>
> **Decisão de design deliberada:** vínculo terminal-a-terminal e vínculo
> tarefa-terminal (5.2) são conceitos INDEPENDENTES e coexistem — um terminal
> pode estar vinculado a uma tarefa (com papel three-brain) E ter vínculos
> diretos com outros terminais ao mesmo tempo. O roteamento automático deste
> épico reusa o MESMO princípio de decisão pura já estabelecido em
> `planSdcReviewRouting`/`planSdcCorrectionRouting` (Épico 7): uma função sem
> I/O decide SE/O QUE enviar, o Main só executa o efeito colateral. Nenhuma
> tentativa de interpretar semanticamente a saída do terminal de origem — o
> gatilho é status (done/waiting-input), igual ao FR17, nunca parsing de texto.

### Story 9.1 — Entidade de vínculo terminal-a-terminal

As a desenvolvedor multi-agente,
I want vincular um terminal a outro terminal diretamente pelo canvas ou pela sessão master,
so that eu monte cadeias de comando entre agentes sem depender de uma tarefa formal.

#### Acceptance Criteria

1. Um vínculo tem `sourceId`, `targetId` e um modo (`manual` — só habilita o botão de enviar; `auto` — dispara sozinho no status do source).
2. Um terminal pode ter múltiplos vínculos de saída (comanda vários alvos) e múltiplos de entrada (é comandado por vários).
3. Vínculo persiste entre reinicializações (mesma garantia do FR10) e é removido automaticamente se origem ou alvo forem fechados/excluídos.
4. Vínculo é escopado ao projeto ativo (Épico 8) — origem e alvo precisam pertencer ao mesmo projeto.

### Story 9.2 — Roteamento automático (modo `auto`)

As a desenvolvedor multi-agente,
I want que um vínculo em modo automático dispare instrução no terminal alvo quando a origem terminar,
so that eu não precise ficar copiando manualmente o resultado de um agente para o próximo.

#### Acceptance Criteria

1. Quando o terminal de origem de um vínculo `auto` transiciona para `done`/`waiting-input`, o sistema envia automaticamente uma instrução ao(s) terminal(is) alvo (mesmo gatilho de status do FR17).
2. Mensagem referencia o terminal de origem (nome/adapter) e pede ao alvo para agir sobre o resultado — mesmo princípio de redação centralizada numa função pura já usado no Épico 7.
3. Envio automático é registrado na timeline com origem `system` (mesma distinção `human`/`system` do FR17/AC3 da 7.2).
4. Disparo é idempotente por transição (não repete em toda checagem de status) — mesma garantia estrutural do AC4 da 7.2.

### Story 9.3 — Indicação visual no canvas + envio manual

As a desenvolvedor multi-agente,
I want ver os vínculos entre terminais desenhados no canvas e poder disparar manualmente um vínculo `manual`,
so that eu entenda a topologia de comando entre agentes de relance.

#### Acceptance Criteria

1. Canvas desenha uma linha/indicador conectando os tiles de terminais vinculados (origem→alvo), visível sem precisar abrir um painel separado.
2. Vínculo em modo `manual` expõe um botão "enviar" na sessão master (e/ou no tile) que dispara a instrução sob demanda, reusando o `instructAgent` já existente (3.2).
3. Criar/remover um vínculo é possível a partir do canvas (ex.: arrastar de um tile a outro) OU da sessão master (dropdown), qualquer um dos dois caminhos é aceitável — não é obrigatório ter os dois.
4. Vínculos aparecem também numa lista simples na sessão master (origem → alvo, modo) para quem prefere texto a desenhar linhas.
