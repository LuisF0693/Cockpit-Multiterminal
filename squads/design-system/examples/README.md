# Design-System Squad — Production Examples

Outputs do squad `design-system` são design tokens, componentes React e Figma assets que vivem em pacotes compartilhados, não no filesystem do squad.

## Onde os outputs reais vivem

| Tipo | Localização |
|---|---|
| Design tokens (colors, spacing, typography) | `packages/ds/tokens/` |
| Componentes React (Shadcn-based) | `packages/ds/src/components/` |
| Figma design system | Figma (AIOX org) |
| Stories (Storybook) | `packages/ds/stories/` |
| Tailwind preset | `packages/ds/tailwind.preset.cjs` |

## Evidência de uso

- Pacote `@aiox/ds` consumido por `apps/web` e demais apps
- Componentes Button, Card, Badge (+variants) em uso ativo
- Storybook disponível para QA visual
- Tokens versionados e sincronizados Figma ↔ código

## Tasks canônicas

- `tasks/` — governança de tokens, criação de componentes, validação de acessibilidade

## Provenance

Design system é infraestrutura compartilhada — outputs são commitados em `packages/ds/` e consumidos cross-apps. Não copiados aqui porque são pacote vivo sob versionamento próprio.
