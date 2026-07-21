# v0-Level Frontend Quality Rules
# Source: Vercel v0 Composite Model Architecture (system prompt extracted 2025-06-16)
# Adapted for Claude Code by Intelligence Pipeline (2026-04-09)
# Applies to: any frontend/React/Next.js work in this repo
# COMPANION: squads/design-ops/rules/design-system-generation.md (component registry + tokens)

## Coding Guidelines

- Default to Next.js App Router unless context indicates otherwise
- Set crossOrigin="anonymous" for `new Image()` when rendering on canvas
- Escape JSX special chars: `<div>{'1 + 1 < 3'}</div>` not `<div>1 + 1 < 3</div>`
- Split code into multiple components. Never one massive page.tsx
- Use SWR for data fetching and client-side state sync between components
- NEVER fetch inside useEffect. Pass data from RSC or use SWR
- Update layout.tsx metadata (title, description) and viewport (theme-color) for SEO
- For geographic maps: ALWAYS use react-simple-maps, Leaflet, or Mapbox — never hand-roll SVGs

## Data Persistence

- NEVER use localStorage for data persistence unless explicitly requested
- Default to real backend storage (Supabase, Neon, etc)
- Auth: native Supabase Auth when using Supabase; custom auth with bcrypt + HTTP-only cookies otherwise
- NEVER implement mock auth or client-side only auth
- Always: password hashing, secure sessions, RLS when applicable, parameterized queries, input validation

## Next.js 16 Patterns

- `params`, `searchParams`, `headers`, `cookies` in Server Components MUST be awaited
- Turbopack is default bundler
- React Compiler support via `reactCompiler` in next.config.js
- `revalidateTag()` requires cacheLife profile as 2nd arg: `revalidateTag('posts', 'max')`
- `updateTag()` for read-your-writes semantics
- `refresh()` for refreshing uncached data only
- `'use cache'` directive for caching pages, components, functions

## React 19.2 Patterns

- `useEffectEvent` for non-reactive logic extraction from Effects
- `<Activity mode="visible"|"hidden">` for hiding/restoring UI with preserved state

## Design System Rules

### Colors
- ALWAYS use exactly 3-5 colors total
- 1 primary brand color + 2-3 neutrals + 1-2 accents
- NEVER exceed 5 colors without explicit permission
- NEVER use purple/violet prominently unless asked
- Override text color when overriding background color (contrast)
- Avoid gradients unless asked. If needed: analogous colors only (blue-teal, purple-pink)
- NEVER mix opposing temperatures in gradients (pink-green, orange-blue)

### Typography
- Maximum 2 font families (heading + body)
- line-height 1.4-1.6 for body (leading-relaxed or leading-6)
- NEVER decorative fonts for body text
- NEVER fonts smaller than 14px
- Use next/font/google for font loading
- Apply via font-sans, font-serif, font-mono Tailwind classes

### Layout
- Mobile-first, then enhance for larger screens
- Minimum 16px font for text inputs (iOS Safari)
- 44px minimum touch targets for interactive elements
- **Fluid spacing tokens (non-negotiable)**: any vertical padding ≥4rem MUST use `--section-py-*` clamp-based tokens, never raw rem literals. See `squads/design-ops/rules/responsive-first-contract.md` for the full 7-rule contract + QA checklist.
- **Mobile navigation (non-negotiable)**: any sidebar/menu MUST have a mobile counterpart (shadcn `Sheet` drawer recommended). `hidden lg:block` without a mobile surface = QA gate FAIL.
- **Display titles**: for monumental editorial text (POSICIONAMENTO-style), use SVG `<text>` with `textLength` + `lengthAdjust="spacingAndGlyphs"` so the word scales to container width without wrapping. `clamp(6rem, 14vw, 18rem)` on long uppercase words is forbidden.
- **Horizontal scroll guard (non-negotiable)**: `globals.css` MUST declare `html, body { overflow-x: clip; max-width: 100vw }` + `*, *::before, *::after { min-width: 0 }`.

### Tailwind Patterns
- Flexbox first, CSS Grid for complex 2D layouts, NEVER floats
- Prefer Tailwind spacing scale: `p-4` not `p-[16px]`
- Prefer gap classes: `gap-4`, `gap-x-2`
- Use responsive prefixes: `md:grid-cols-2`, `lg:text-xl`
- Use semantic design tokens: `bg-background`, `text-foreground`
- Wrap titles in `text-balance` or `text-pretty`
- NEVER mix margin/padding with gap on same element
- NEVER use space-* classes
- DO NOT use direct colors (text-white, bg-black). Theme via design tokens

### shadcn/ui Patterns
- Use FieldGroup + Field + FieldLabel for form layouts (not raw divs with space-y-*)
- Use FieldSet + FieldLegend for grouped checkboxes/radios/switches
- Use InputGroup + InputGroupInput for inputs with icons (not raw Input)
- Use Empty for empty states
- Use Spinner for loading buttons
- Use ButtonGroup for grouped actions (ToggleGroup for state toggles)
- Use Recharts for charts with shadcn chart components

### Visual Elements
- Use real images, NEVER abstract shapes/blobs as filler
- NEVER generate SVGs for complex illustrations
- NEVER use emojis as icons
- Icon sizing: 16px, 20px, or 24px consistently

## AI SDK Patterns (when building AI features)

- Use Vercel AI SDK unless told otherwise
- Latest: "ai": "^6.0.0", "@ai-sdk/react": "^3.0.0"
- AI SDK uses Vercel AI Gateway by default — pass model string directly
- Supported zero-config: AWS Bedrock, Google Vertex, OpenAI, Fireworks AI, Anthropic

## Context Gathering Before Changes

- When searching finds multiple files, examine ALL of them
- Check if component is the right variant/version
- Layout issues? Check parents, wrappers, global styles first
- Adding features? Find existing similar implementations first
- State changes? Trace where state lives and flows
- Styling? Check theme systems, utility classes, component variants
- New dependencies? Check if utilities already exist
- Use parallel tool calls for independent reads
