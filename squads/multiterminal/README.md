# Multiterminal Systems Squad

> Squad de elite minds para melhorar sistemas de multiterminal — engenharia de terminal, dashboards TUI multi-painel e orquestração de agentes de IA.

## Sobre

Criado via `squad-creator-pro` (`*create-squad`), seguindo o `wf-mind-research-loop`: 3 iterações de pesquisa real (Broad Research → Devil's Advocate → Framework Validation) sobre 19 nomes, refinados até os 5 finais abaixo.

**Modo de criação:** YOLO (pesquisa web pública, sem livros/transcrições licenciadas). **Fidelidade estimada:** 60-75%. Toda citação literal nos agents carrega `[SOURCE: url]`; o restante é síntese razoável do trabalho documentado.

## Agentes

| Tier | Agent | Especialidade |
|------|-------|----------------|
| Orch | `multiterminal-chief` | Roteamento entre os 5 especialistas |
| 0 | `addy-osmani` | Diagnóstico e taxonomia de padrões de orquestração multi-agente |
| 1 | `mitchell-hashimoto` | Engenharia de terminal desde as fundações (Ghostty) |
| 1 | `nicholas-marriott` | Modelo de referência de multiplexação — session/window/pane (tmux) |
| 2 | `christian-rocha` | Framework de TUI/dashboard multi-painel (Bubble Tea/Charm) |
| 2 | `geoffrey-huntley` | Loop determinístico de agentes nativo de terminal (Ralph Wiggum Technique) |

## Ativação

```bash
@multiterminal-chief          # Orquestrador — roteia pra o especialista certo
@addy-osmani                  # Direto pro diagnóstico
@mitchell-hashimoto            # Direto pra engenharia de terminal
@nicholas-marriott              # Direto pro modelo de sessão/multiplexação
@christian-rocha                # Direto pro dashboard TUI
@geoffrey-huntley                # Direto pro loop de agentes
```

Ou via slash command do projeto: `/squads:multiterminal`.

## Fluxo Recomendado

```
1. @addy-osmani        → diagnostica o padrão atual (subagents / agent teams / orquestrador)
2. @nicholas-marriott  → modelo de sessão/window/pane (se o gap é estrutural)
3. @mitchell-hashimoto → fundação de renderização (se o gap é performance/protocolo)
4. @christian-rocha    → Model/Update/View do dashboard (camada visual)
5. @geoffrey-huntley   → loop de execução e critério de "done" (camada de execução)
```

## Minds Consideradas mas Não Selecionadas

Ver `config.yaml` → `minds_not_selected` para a lista completa com motivos (Wez Furlong, Kovid Goyal, João Moura, Harrison Chase, Simon Willison, Fernand Galiana, Jesse Duffield, Zach Lloyd).

## Notas

- Squad ainda não testado em produção (`tested: false` em `config.yaml`).
- Segue o manifesto legado `config.yaml` (não `squad.yaml` do Squad Protocol v5), mesmo padrão usado por `data`, `design`, `research` neste projeto.
