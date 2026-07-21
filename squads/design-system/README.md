# Design System Squad

**Version:** 4.2.0  
**Command:** `/DS`  
**Type:** Specialist Squad

## Overview

The Design System Squad is focused on:

- token architecture and governance
- component system design and composition
- accessibility governance (WCAG)
- design system operations and adoption
- registry and AI-readable metadata
- technical runtime configuration of the `aiox-design-starter` boilerplate
- brandbook/runtime theming, variants, presets, and standalone export for the starter

Current operating identity during EPIC-119:

- `squads/design-system/` acts as the transitional `design-ops` provider/core
- it owns the language of the system, not every page or app surface
- the target final shape of `design-ops` is `design-chief` as the only resident agent
- page composition and app-surface specialization are being separated into
  future consumer lanes

Domain work like brand, logo, thumbnails, photo, and editing was moved to dedicated squads:

- `squads/brand`
- `squads/content-visual`

Important boundary:

- `design-system` owns the technical boilerplate of the starter
- `brand` owns positioning, identity strategy, logo creation, naming, and message architecture
- `aiox-design-starter` is a transitional bootstrap runtime, not the source of truth for the system core
- page composition is still partially present here for brownfield continuity, but
  its long-term owner is `design-pages`
- app-surface specialization does not belong to the provider core and will not
  stay centralized here

If a request is "configure the starter/runtime/brandbook shell", it is in scope here.
If a request is "invent the brand itself", it must be handed off to `brand`.

## Agents

### Active provider shape

| Agent | Command | Specialty |
|---|---|---|
| Design Chief | `@design-chief` | Orchestration, routing, provider triage, dependency-aware sequencing |

### Brownfield legacy roster

The files below still exist for traceability, but are no longer part of the
active `design-ops` shape after Cleanup Phase 1:

- `brad-frost`
- `dan-mall`
- `dave-malouf`
- `ds-foundations-lead`
- `ds-token-architect`
- `storybook-expert`
- `nano-banana-generator`

Boundary:

- these are deprecated brownfield files, not active resident agents
- `design-runtime` also remains only as inactive brownfield utility in config,
  not as an active resident/executable agent
- new provider work routes through `design-chief`
- `page-composer` is intentionally excluded from this deprecation block because
  it remains a protected brownfield capability until `design-pages` is created

Downstream residue still present in brownfield:

- `page-composer` remains physically present in the squad today, but its
  long-term owner is `design-pages`
- there is still no resident legacy agent clearly mapped to the future
  `design-app` lane

## Routing

Use Design Chief as entrypoint:

- `"auditar design system"` -> `@design-chief`
- `"escalar operacao de design"` -> `@design-chief`
- `"preciso vender DS internamente"` -> `@design-chief`
- `"metadata/registry para AI"` -> `@design-chief`
- `"preciso de logo/brand"` -> handoff to `/Brand`
- `"thumbnail/foto/video"` -> handoff to `/ContentVisual`

## Core Tasks

- `ds-*`: architecture, audit, tokenization, migration, registry, metadata, MCP
- `ds-bootstrap-starter`: bootstrap/harden the real `apps/aiox-design-starter` runtime
- `agentic-*`: machine-readability audit and AI-ready setup
- `token-*`: W3C DTCG extraction and token modes governance
- `motion-*`: motion quality and visual regression baselines
- `fluent-*`: Fluent 2 audit/build compatibility tracks
- `ds-govern`, `ds-designops`: governance model and DesignOps operating playbook
- `figma-pipeline`: Figma MCP integration and design-to-code mapping
- `f1-*`, `f2-*`, `f3-*`: foundations pipeline with blocking QA gates
- `a11y-*`: accessibility audits and governance
- `atomic-refactor-*`: decomposition and execution
- `designops-*`: maturity, scaling, process and tooling
- `design-triage`, `design-review-orchestration`: orchestration gates

## Workflows

Provider/core:

- `workflows/audit-only.yaml`
- `workflows/brownfield-complete.yaml`
- `workflows/agentic-readiness.yaml`
- `workflows/dtcg-tokens-governance.yaml`
- `workflows/motion-quality.yaml`
- `workflows/foundations-pipeline.yaml`
- `workflows/critical-eye.yaml`
- `workflows/ops-audit.yaml`
- `workflows/storybook-brownfield-migration.yaml`
- `workflows/storybook-full-setup.yaml`

Consumer residue kept only for brownfield continuity:

- `workflows/page-composition.yaml` -> future `design-pages`
- `workflows/self-healing-workflow.yaml` -> future `design-app`

Transitórios / gerados:

- `workflows/epic-ds-alignment.yaml`
- `workflows/greenfield-new.yaml`
- `workflows/map-generated-quality-gates.yaml`
- `workflows/map-generated-workflow-definition.yaml`

## Modelo de Governance

### Princípio: Governance cria, Execution usa

O squad segue a regra fundamental de separação entre **governance** e **execution**:

- **Governance** define tokens, regras, templates, checklists e protocolos. Esses artefatos são criados e mantidos pelos agentes do squad dentro de `squads/design-system/`.
- **Execution** consome esses artefatos sem modificá-los. Agentes de desenvolvimento, CI/CD e IDEs leem as definições e aplicam as regras durante a implementação.

O protocolo completo está documentado em `squads/design-system/protocols/ai-first-governance.md`.

### Tier System

Definido em `squads/design-system/config.yaml`:

| Tier | Papel |
|------|-------|
| **tier_0_foundation** | Agentes de entrada para operações e estratégia de adoção |
| **tier_1_masters** | Masters de execução com práticas especialistas |
| **tier_2_specialists** | Especialistas profundos para implementação de DS |
| **orchestrator** | Design Chief — roteia requisições para o agente adequado |

### Hierarquia de Fontes Canônicas

Ordem de precedência para resolução de conflitos:

1. `workspace/` — fonte de verdade global (system, ui, domains)
2. `squads/design-system/` — governança e conhecimento local do squad
3. `docs/` — evidência de suporte, nunca fonte final de verdade

Quando dois artefatos conflitam, prevalece a fonte de maior precedência. Conflitos devem ser registrados conforme o protocolo de governance.

## Notes

- Source hierarchy: `workspace/` -> `squads/design-system/` -> `docs/`
- This squad is DS-first by design and currently acts as the transitional provider/core of the future `design-ops`.
- Cross-domain requests are routed to specialized squads instead of being executed here.
- `apps/aiox-design-starter` is a first-class runtime target of this squad.
- `apps/aiox-brandbook` is the canonical provider implementation currently observed in the repo.
