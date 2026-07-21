# WCAG Focus Policy — Global Rule, Not Per-Component

Thin lazy-loaded rule. Promoted from heuristic AN_KE_169 (archived as CSS/WCAG implementation specific).

## When to Load

Load this rule only when you are about to:

- Implement focus discipline for WCAG 2.2 AAA in a design system
- Refactor `focus-visible:ring-*` patterns spread across components
- Audit a DS for accessibility coverage

## Rule

**SE** WCAG 2.2 AAA focus discipline em DS **ENTÃO** single global rule em `globals.css` cobre todos elementos focáveis. **NUNCA** declarar `focus-visible:ring-*` ou `outline-*` por componente — drift inevitável.

**EXCEÇÃO:** componente precisa inset/offset intencionalmente diferente (ex: card com border externo conflitando com ring).

## Why

- Per-component focus rules: 9 componentes = 9 declarações divergentes (`ring-2`, `ring-zinc-400/50`, `ring-primary`, etc) = drift
- Global rule: 5 linhas em `globals.css` = 100% cobertura WCAG 2.2 AAA + um lugar para mudar token
- Componentes novos automaticamente herdam compliance

## Pattern

```css
/* globals.css — single source of focus policy */
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* Reset framework's default for inputs */
input:focus-visible,
button:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

## Anti-Pattern

```tsx
// ERRADO — per-component focus, hardcoded alpha
<button className="focus-visible:ring-ring/50 focus-visible:ring-2">
<input className="focus-visible:ring-ring/40 focus-visible:ring-1">
<div className="focus-visible:outline-2 focus-visible:outline-offset-1">
```

Cada componente re-declara, drift inevitável após 3-5 redefinições.

## Source

- Original heuristic: AN_KE_169 (archived 2026-04-27 v3.13.0 — CSS/WCAG implementation pattern)
- Archived L3 doc: `minds/alan_nicolas/heuristics/_archived/AN_KE_169-archived-v3.13.0-css-wcag-specific.md`
- Original case: Redpine wave 3 focus refactor (2026-04-19) — 9 per-component rules → 1 global
- Authority: `@design-chief` owns DS rules (`squads/design-ops/`)
