# shadcn Palette System — Must Override Framework Slots

Thin lazy-loaded rule. Promoted from heuristic AN_KE_170 (archived as shadcn-specific implementation).

## When to Load

Load this rule only when you are about to:

- Implement palette system via `data-attribute` (e.g. `data-palette="ink"`) in a shadcn-based DS
- Add a new palette/theme to existing shadcn DS
- Debug invisible/white-on-white text in a custom palette

## Rule

**SE** sistema de paleta via data-attribute em DS shadcn-based **ENTÃO** override AMBOS:
1. **Custom CSS vars** (`--bg`, `--brand-primary`, etc — declarados pelo DS)
2. **Framework slots shadcn** (mínimo 8: `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`)

**NUNCA** override apenas custom vars. Tailwind/shadcn utilities (`bg-background`, `text-foreground`) não enxergam custom vars — resolvem para os slots default e produzem `white-on-white invisible`.

## Why

shadcn UI library e Tailwind theme têm **slots próprios** (`bg-background` resolve para `var(--background)`). Custom vars do DS (`--bg`) são paralelas — não substituem os slots. Componentes shadcn (Button, Card, Input) usam slots, não custom vars.

Se uma palette dark override apenas `--bg` mas mantém `--background: snow` default → `<Card className="bg-background">` resolve `snow` (white) → texto white herdado → invisível.

## Pattern (mínimo 12 slots por palette dark)

```css
[data-palette="ink"] {
  /* Custom DS vars */
  --bg: hsl(220 30% 8%);
  --brand-primary: hsl(120 60% 50%);

  /* Framework slots — MUST override all */
  --background: hsl(220 30% 8%);
  --foreground: hsl(0 0% 95%);
  --card: hsl(220 30% 12%);
  --card-foreground: hsl(0 0% 95%);
  --popover: hsl(220 30% 10%);
  --popover-foreground: hsl(0 0% 95%);
  --primary: hsl(120 60% 50%);
  --primary-foreground: hsl(0 0% 5%);
  --secondary: hsl(220 30% 15%);
  --secondary-foreground: hsl(0 0% 90%);
  --muted: hsl(220 30% 14%);
  --muted-foreground: hsl(0 0% 70%);
  --accent: hsl(220 30% 18%);
  --accent-foreground: hsl(0 0% 95%);
  --input: hsl(220 30% 16%);
  --border: hsl(220 30% 20%);
  --ring: hsl(120 60% 50%);
}
```

## Anti-Pattern

```css
/* ERRADO — só custom vars, slots ficam default */
[data-palette="ink"] {
  --bg: hsl(220 30% 8%);
  --brand-primary: hsl(120 60% 50%);
  /* faltam --background, --foreground, --card, etc */
}

/* Resultado: <Card> usa --background default (snow), texto branco invisível */
```

## Detection

Se ver "buttons invisíveis em data-palette=X" ou "white-on-white", suspeitar de palette com slots shadcn não-overrided.

## Source

- Original heuristic: AN_KE_170 (archived 2026-04-27 v3.13.0 — shadcn-specific implementation)
- Archived L3 doc: `minds/alan_nicolas/heuristics/_archived/AN_KE_170-archived-v3.13.0-shadcn-specific.md`
- Original case: Redpine wave 4 palette bug (2026-04-19) — 3 dark palettes overriding 12 slots cada
- Authority: `@design-chief` owns DS rules (`squads/design-ops/`)
