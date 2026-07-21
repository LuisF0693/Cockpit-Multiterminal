# Design System Generation Context — @sinkra/ds-core + @sinkra/tokens-base
# This rule bridges the Design System Squad output to the code generation pipeline.
# Without this file, Claude Code has ZERO awareness of our design system.
# Applies to: any frontend/React/Next.js/dashboard code generation

## DESIGN.md first (NON-NEGOTIABLE)

Before any code generation for a surface, read that surface's `DESIGN.md`:

- **App UI:** `apps/{name}/DESIGN.md`
- **Business canonical:** `workspace/businesses/{biz}/L2-tactical/design/DESIGN.md`
- **Campaign:** `workspace/businesses/{biz}/L4-operational/campaigns/{slug}/DESIGN.md`

The DESIGN.md is the **single source of truth** for that surface's tokens. It carries the YAML front matter (colors, typography, spacing, rounded, components) plus the `## Implementation` section (stack, Tailwind config, shadcn `components.json`, token→utility mapping). The rule below (`@sinkra/ds-core` + `@sinkra/tokens-base`) only applies once DESIGN.md has been consulted — the DS is the parent SOT, `@sinkra/*` packages are the shared base that each app overrides.

If no DESIGN.md exists at the target path:

1. STOP code generation.
2. Offer to extract one via `squads/design-ops/tasks/emit-design-md.md`.
3. Do not hand-roll `globals.css` or guess hex values.

Lint target: `npx @google/design.md lint DESIGN.md` → 0 errors.

## CRITICAL: Use @sinkra/ds-core, NOT raw shadcn/ui

When generating frontend code for ANY Sinkra Hub business (aiox, allfluence, academia-lendaria, bilhon):
- Import from `@sinkra/ds-core`, NEVER from individual shadcn packages
- Use `@sinkra/tokens-base` values, NEVER hardcoded colors/spacing
- Each business overrides tokens with branding — the base is neutral

## Available Components (@sinkra/ds-core)

### Atoms (14)
- `Button` (+ `buttonVariants`) — primary CTA, variants via CVA
- `Input` — text input, pairs with Field molecule
- `Label` — form labels, pairs with Field
- `Badge` (+ `badgeVariants`) — status indicators
- `Checkbox` — binary selection
- `Separator` — visual divider
- `Skeleton` — loading placeholder
- `Spinner` — loading indicator (use in buttons with loading state)
- `Switch` — toggle on/off
- `Textarea` — multiline text input
- `Toggle` (+ `toggleVariants`) — state toggle
- `ToggleGroup` + `ToggleGroupItem` — grouped state toggles
- `Progress` — progress bar
- `Slider` — range selector

### Molecules (8)
- `Alert` + `AlertTitle` + `AlertDescription` + `AlertAction` — contextual messages
- `Breadcrumb` + `BreadcrumbList/Item/Link/Page/Separator/Ellipsis` — navigation
- `Card` + `CardHeader/Footer/Title/Action/Description/Content` — container
- `Field` + `FieldLabel/Description/Error/Group/Legend/Separator/Set/Content/Title` — form layouts (USE THIS, not raw divs)
- `Pagination` + `PaginationContent/Ellipsis/Item/Link/Next/Previous` — list pagination
- `Popover` + `PopoverTrigger/Content/Anchor/Description/Header/Title` — floating content
- `Tooltip` + `TooltipTrigger/Content/Provider` — hover info
- `Empty` + `EmptyHeader/Title/Description/Content/Media` — empty states (USE THIS, not custom markup)

### Organisms (8)
- `Accordion` + `AccordionItem/Trigger/Content` — collapsible sections
- `AlertDialog` + full sub-components — destructive confirmations
- `Dialog` + full sub-components — modal overlay
- `DropdownMenu` + full sub-components — context menus
- `ScrollArea` + `ScrollBar` — custom scrollable areas
- `Select` + full sub-components — dropdown selection
- `Sheet` + `SheetTrigger/Close/Content/Header/Footer/Title/Description` — slide-over panel
- `Table` + `TableHeader/Body/Footer/Head/Row/Cell/Caption` — data tables
- `Tabs` + `TabsList/Trigger/Content` (+ `tabsListVariants`) — tabbed navigation

### Utilities
- `cn(...)` — conditional class names (Tailwind Merge)
- `asSlot` — render-as pattern
- `useIsMobile()` — responsive hook
- `ThemeProvider` + `useTheme()` — dark/light mode
- `ThemeToggle` — theme switch component

## Import Pattern

```tsx
// CORRECT — always import from @sinkra/ds-core
import { Button, Card, CardHeader, CardContent, Field, FieldLabel } from "@sinkra/ds-core"
import { cn, useIsMobile } from "@sinkra/ds-core"
import { ThemeProvider, ThemeToggle } from "@sinkra/ds-core"

// WRONG — never import from individual packages
import { Button } from "@/components/ui/button"  // NO
import { Card } from "shadcn/ui"                  // NO
```

## Design Tokens (@sinkra/tokens-base)

### Colors (Semantic)
- `success: #22C55E` | `warning: #F59E0B` | `error: #EF4444` | `info: #3B82F6`

### Light Mode
- `background: #FAFAFA` | `foreground: #0F172A`
- `primary: #3B82F6` | `accent: #8B5CF6`
- `muted: #F1F5F9` | `mutedForeground: #6B7280`
- `border: #E2E8F0` | `ring: #3B82F6`

### Dark Mode
- `background: #0F172A` | `foreground: #F8FAFC`
- `primary: #3B82F6` | `accent: #8B5CF6`
- `muted: rgba(255,255,255,0.06)` | `mutedForeground: #9CA3AF`
- `border: rgba(255,255,255,0.08)` | `ring: #3B82F6`

### Spacing Scale
`xs: 0.25rem` | `sm: 0.5rem` | `md: 1rem` | `lg: 1.5rem` | `xl: 2rem` | `2xl: 3rem` | `3xl: 4rem`

### Radius Scale
`sm: calc(0.75rem - 4px)` | `md: calc(0.75rem - 2px)` | `lg: 0.75rem` | `xl: +4px` | `2xl: +8px`

### Typography
- Fonts: `Inter` (sans), `JetBrains Mono` (mono), system serif
- Sizes: xs(12px) → 5xl(48px)
- Weights: normal(400), medium(500), semibold(600), bold(700)
- Line height: tight(1.25), snug(1.375), normal(1.5), relaxed(1.625)

### Motion
- Duration: instant(0ms), fast(100ms), normal(200ms), slow(300ms), slower(500ms)
- Easing: linear, easeIn, easeOut, easeInOut (cubic-bezier)

### Surfaces (Dark)
`void: #000` | `base: #0F172A` | `raised: #1E293B` | `elevated: #334155` | `overlay: rgba(0,0,0,0.6)`

### Interactive States
- `hoverOpacity: 0.08` | `activeScale: 0.98` | `disabledOpacity: 0.5`
- `focusRingWidth: 2px` | `focusRingOffset: 2px`

### Z-Index
`base: 0` | `dropdown: 100` | `sticky: 200` | `modal: 300` | `toast: 400` | `tooltip: 500`

## Business Branding Override Pattern

Each business extends tokens-base with their own colors:
```tsx
// workspace/businesses/{slug}/L2-tactical/brand/tokens.css
:root {
  --primary: /* business brand color */;
  --accent: /* business accent */;
}
```
The base tokens above are DEFAULTS. Business tokens override via CSS cascade.

## Form Pattern (MANDATORY)

```tsx
// CORRECT — use Field system
<FieldGroup>
  <Field>
    <FieldLabel>Email</FieldLabel>
    <Input type="email" />
    <FieldDescription>Your work email</FieldDescription>
    <FieldError>Invalid email</FieldError>
  </Field>
</FieldGroup>

// WRONG — raw divs
<div className="space-y-4">
  <div>
    <label>Email</label>
    <input type="email" />
  </div>
</div>
```

## Empty State Pattern (MANDATORY)

```tsx
// CORRECT
<Empty>
  <EmptyMedia><SearchIcon /></EmptyMedia>
  <EmptyHeader>
    <EmptyTitle>No results</EmptyTitle>
    <EmptyDescription>Try a different search</EmptyDescription>
  </EmptyHeader>
</Empty>

// WRONG — custom empty state
<div className="flex flex-col items-center p-8 text-muted-foreground">
  <p>No results found</p>
</div>
```
