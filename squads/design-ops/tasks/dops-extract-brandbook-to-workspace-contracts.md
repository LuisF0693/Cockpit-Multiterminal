# Task: Extrair Brandbook para Contratos do Workspace

## Contrato SINKRA

Domain: `Tactical`

task: `dops-extract-brandbook-to-workspace-contracts()`
responsável: `design-chief`
atomic_layer: `Molecule`
Entrada:
- `business_slug` (ex.: `aiox`)
- `ds_root` (ex.: `apps/aiox-brandbook/src/components/brandbook`)
- `workspace_design_root` (ex.: `workspace/businesses/aiox/L2-tactical/design`)
Saída:
- `tokens.yaml` enriquecido com inventário extraído
- `foundations.yaml` com mapeamentos semânticos reais
- `component-contracts.yaml` com contratos e referências reais
- `motion-primitives.yaml` com tokens/primitives reais
Checklist:
- `squads/design-ops/checklists/ds-core-accessibility-minimum.yaml`
- `squads/design-ops/checklists/dops-accessibility-wcag-aa.yaml`
- `squads/design-ops/checklists/dops-component-quality.yaml`
- `squads/design-ops/checklists/dops-a11y-release-gate.yaml`
pre_condition: contratos canônicos L2-006..L2-009 existem no workspace
post_condition: contratos atualizados e validados com gate estrito
performance: extração auditável, reproduzível e sem dependência de Figma/Storybook

## Task Anatomy

| Field | Value |
|---|---|
| **Task ID** | `dops-extract-brandbook-to-workspace-contracts` |
| **Version** | `1.1.0` |
| **Status** | `active` |
| **Responsible Executor** | `design-chief` |
| **Execution Type** | `Composed` |

## Correspondência com `design-system` (legado)

Task fonte mais compatível para trazer e adaptar:
- `squads/design-system/tasks/ds-extract-tokens.md` (`Task ID: brad-extract-tokens`)

Tasks complementares úteis:
- `squads/design-system/tasks/ds-context-contract.md` (contrato de contexto de execução)
- `squads/design-system/tasks/ds-motion-extraction.md` (extração estruturada de motion)

Decisão de migração:
- **Base principal:** `brad-extract-tokens` (pipeline de extração + qualidade de cobertura).
- **Adaptação obrigatória:** trocar output `outputs/design-system/*` por contratos canônicos em `workspace/businesses/{business}/L2-tactical/design/`.
- **Escopo ampliado em relação ao legado:** além de tokens, também cobre `foundations`, `component-contracts` e `motion-primitives`.

## Objetivo

Padronizar a extração de conhecimento de um brandbook implementado em código
para os contratos canônicos no workspace, garantindo `workspace-first` como
fonte da verdade para consumers (`design-pages`, `design-app`, `dev`, `qa`).

## Sequência de execução

1. **Inventariar tokens CSS**
   - Fonte primária: `styles/tokens.css`.
   - Extrair variáveis CSS únicas e classificar por domínio semântico.
2. **Inventariar classes/componentes**
   - Fonte primária: `styles/components-lib.css` + `atoms/`, `molecules/`, `organisms/`.
   - Mapear componentes core (`button`, `input`, `dialog`) para referências reais.
3. **Inventariar motion**
   - Fontes primárias: `motion/constants.ts` e `motion/presets.ts`.
   - Mapear durations/easings/presets para `motion-primitives.yaml`.
4. **Materializar contratos canônicos**
   - Atualizar no workspace:
     - `tokens.yaml` (L2-006)
     - `foundations.yaml` (L2-007)
     - `component-contracts.yaml` (L2-008)
     - `motion-primitives.yaml` (L2-009)
5. **Executar quality gates**
   - `node squads/design-ops/scripts/validate-workspace-contracts.cjs --business=<slug> --strict`
   - `npm run validate:yaml:changed`
6. **Emitir relatório de extração**
   - Registrar fontes usadas, contagens, cobertura e lacunas.

## Comandos de referência

```bash
node squads/design-ops/scripts/resolve-workspace-contracts.cjs --business=aiox --format=yaml
node squads/design-ops/scripts/validate-workspace-contracts.cjs --business=aiox --strict --format=json
npm run validate:yaml:changed
```

## Critérios de conclusão

- Contratos L2-006..L2-009 atualizados com evidências de extração.
- Gate `validate-workspace-contracts --strict` em `ok: true`.
- YAML incremental validado sem erro.
- Consumers continuam obrigados a ler apenas do workspace.

## Quality Gate (adaptado de `brad-extract-tokens`)

| Métrica | Threshold | Ação se FAIL |
|---|---|---|
| Cobertura de tokens mapeados | >= 95% dos tokens extraíveis | adicionar mapping manual e revalidar |
| Rastreabilidade de fontes | 100% dos blocos mapeados com `primary_sources` | bloquear merge até preencher evidência |
| Coerência de contratos | `ok: true` no `validate-workspace-contracts --strict` | corrigir shape/ids/source_of_truth |
| Validação YAML | 100% pass (`validate:yaml:changed`) | corrigir sintaxe/estrutura e reexecutar |

## Failure Handling

- **`ds_root` inválido ou incompleto:** abortar e pedir caminho correto do brandbook.
- **Cobertura <95%:** listar gaps por domínio (`tokens`, `foundations`, `components`, `motion`) e não concluir task.
- **Contrato quebrado (shape/id/source_of_truth):** bloquear e corrigir antes de qualquer handoff.
- **Ambiguidade de componente core (`button/input/dialog`):** exigir referência explícita em `implementation_refs`.
