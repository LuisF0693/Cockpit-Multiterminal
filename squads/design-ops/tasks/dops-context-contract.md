# Task: Context Contract Workspace-First

> Task ID: dops-context-contract
> Owner: `design-chief`
> Version: 1.0.0
> Origem: adaptado de `squads/design-system/tasks/ds-context-contract.md`

## Descrição

Define o contrato mínimo de contexto para qualquer execução do `design-ops`,
com fonte de verdade no `workspace` e sem dependência obrigatória de
Storybook/Figma.

## Contrato de contexto

```yaml
context:
  project:
    name: string
    type: enum # "greenfield" | "brownfield" | "migration"
    stack: array

  design_provider:
    squad: "design-ops"
    orchestrator: "design-chief"
    mode: "workspace-first"

  workspace:
    business_slug: string
    design_root: string # workspace/businesses/{business}/L2-tactical/design
    required_contracts:
      - tokens.yaml
      - foundations.yaml
      - component-contracts.yaml
      - motion-primitives.yaml

  source_runtime:
    ds_root: string # ex.: apps/aiox-brandbook/src/components/brandbook

  constraints:
    wcag_level: enum # "A" | "AA" | "AAA"
    token_coverage_min: number # default 0.95
```

## Validação pré-execução

1. Confirmar existência de `workspace/businesses/{business}/L2-tactical/design/`.
2. Confirmar existência dos 4 contratos obrigatórios.
3. Confirmar `source_of_truth: workspace` em todos os contratos.
4. Bloquear execução se qualquer campo obrigatório estiver ausente.

## Critérios de conclusão

- Contrato de contexto anexado à execução.
- Pré-validação executada com evidência.
- Gaps de contexto documentados quando houver bloqueio.
