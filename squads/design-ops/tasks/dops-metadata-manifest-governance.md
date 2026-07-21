# Task: Metadata + Manifest Governance

> Task ID: dops-metadata-manifest-governance
> Owner: `design-chief`
> Version: 1.0.0

## Objetivo

Garantir governança estrutural do `design-ops` com dois artefatos sincronizados:
- manifesto do squad (`design-manifest.yaml`)
- metadata de componentes derivada dos contratos canônicos do workspace

## Sequência

1. Gerar metadata de componentes:
`node squads/design-ops/scripts/generate-components-metadata.cjs --business=<slug>`
2. Validar metadata:
`node squads/design-ops/scripts/validate-components-metadata.cjs`
3. Sincronizar manifesto:
`node squads/design-ops/scripts/sync-design-manifest.cjs`
4. Validar drift do manifesto:
`node squads/design-ops/scripts/validate-design-manifest-drift.cjs`

## Critérios de conclusão

- `components-metadata.json` gerado e válido.
- `design-manifest.yaml` sincronizado sem drift.
- Componentes core (`button`, `input`, `dialog`) presentes na metadata.
