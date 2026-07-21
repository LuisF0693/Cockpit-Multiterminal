# Design-System Squad — Architecture

## Overview

O squad `design-system` é provider/core transitório do futuro design-ops, com runtime técnico para aiox-design-starter. Especializado em tokens, foundations, componentes e governance de design system cross-apps.

## Agent Hierarchy

```
design-chief (Orchestrator — Design Triage & Routing)
│
├── Tier 0 — Foundations & Tokens
│   ├── ds-foundations-lead    # Foundations governance
│   └── ds-token-architect     # Design tokens (colors, spacing, typography)
│
├── Tier 1 — Specialists (External Mental Models)
│   ├── brad-frost             # Atomic Design (atoms → molecules → organisms)
│   ├── dan-mall               # Collaborative design-dev handoff
│   └── dave-malouf            # DesignOps methodology
│
└── Tier 2 — Generation & Composition
    ├── nano-banana-generator  # Component scaffolding
    ├── page-composer          # Layout composition
    └── storybook-expert       # Storybook integration & stories
```

## Atomic Design Structure

```
Tokens (atoms-primitive)
  ↓
Atoms (Button, Input, Badge, Label)
  ↓
Molecules (Form Field, Card Header, List Item)
  ↓
Organisms (Form, Card, List, Navigation)
  ↓
Templates (Page layouts)
  ↓
Pages (Composed via page-composer)
```

## Outputs Location

| Artifact | Path |
|----------|------|
| Design tokens | `packages/ds/tokens/` |
| Components (Shadcn-based React) | `packages/ds/src/components/` |
| Stories (Storybook) | `packages/ds/stories/` |
| Tailwind preset | `packages/ds/tailwind.preset.cjs` |
| Figma Design System | Figma (AIOX org) |

## Workflow

```
New component request from @dev or @ux-design-expert
                              ↓
              design-chief triages → routes
                              ↓
           ┌──────────────────┼──────────────────┐
           v                  v                  v
     Token needed?      New variant?     New pattern?
     ds-token-arch      nano-banana      brad-frost
           ↓                  ↓                  ↓
           └──────────────────┼──────────────────┘
                              ↓
                 Component in packages/ds/
                              ↓
                 Storybook stories
                              ↓
              Published + consumed cross-apps
```

## Governance

- **Owner squad:** design-system
- **Consumer apps:** `apps/web`, all AIOX frontends
- **Version policy:** Semver on `@aiox/ds` package
- **Breaking changes:** Require ADR + migration story

## Integration Points

| Consumer | Integration |
|----------|-------------|
| apps/web | Direct import from `@aiox/ds` |
| UX design specialist | Figma ↔ code sync |
| Documentation | Storybook stories + live demos |

## Boundary

- **In scope:** Design tokens, reusable components, foundations (typography, spacing, color), Storybook stories, Tailwind preset
- **Out of scope:** App-specific UI (lives in `apps/`), brand identity (that's @brand-chief), user research (@ux-design-expert)

## Tasks Canônicas (111 total)

Abrangente cobertura de: token management, component creation, foundation patterns, theme generation, Figma sync, accessibility audit, visual regression testing, Storybook setup.
