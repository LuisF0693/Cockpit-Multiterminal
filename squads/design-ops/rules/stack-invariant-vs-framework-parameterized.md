# Stack Invariant vs Framework Parameterized — Design-Ops Rule

Clarifies what the archetype **locks** (non-negotiable — every DS has it) vs what is a **parameter** (framework of choice) vs what is **brand-driven** (every business chooses).
First version 2026-04-19 (Redpine session). Revised 2026-04-27 — split brand-driven dimensions out of LOCKED based on cross-DS empirical analysis (39 reference DS).

## The principle

The design-ops archetype (`data/ds-archetype.yaml` v2.0.0) produces **structurally consistent DSs** because the styling/component plumbing is locked. **Brand identity dimensions** (icons, animations, fonts) are NOT locked — they are the canvas of brand differentiation.

Three categories:

1. **LOCKED** — Technical coupling forces this (changing breaks others). Apply to every DS.
2. **PARAMETERIZED** — Framework shell varies (Next/Vite/Astro). DS quality unaffected.
3. **BRAND-DRIVEN** — Every business chooses. Default exists for fast bootstrap, but override is expected and supported.

## What's LOCKED (technical invariant — interconnected stack)

| Concern | Locked choice | Why locked |
|---|---|---|
| **Styling engine** | Tailwind CSS v4 (`@tailwindcss/postcss`) | `@theme inline` and CSS vars are Tailwind-specific |
| **Component kit** | shadcn/ui (style: new-york) | cva variants + CSS vars + data-slot contract |
| **Headless primitives** | Radix UI via `radix-ui` namespace package | shadcn is built on Radix; coupled |
| **UI library** | React | Radix UI is React-only (today); cva is React-friendly |
| **Language** | TypeScript strict | Type safety across DS surface; contracts |
| **Class utils contract** | `cn()` helper from clsx + tailwind-merge | Convention — alternatives (cnbuilder, classnames) work but break shadcn snippet portability |
| **Token architecture** | 4-tier (raw HSL/oklch → semantic → shadcn slots → @theme inline) | Portable across frameworks; DTCG-aligned |
| **Focus policy** | Global CSS rule WCAG 2.2 AAA (`:is(*, :hover):focus-visible` + 3px + transition:none) | Framework-agnostic pure CSS |
| **DTCG tokens emission** | `tokens.dtcg.json` + `designTokensLanguageServer` config | W3C standard; framework-agnostic |
| **Drift check** | 6-rule Tailwind audit (`npm run check:drift`) | Tailwind is invariant, so patterns are universal |
| **Component manifest** | `components.manifest.json` generator | React + cva invariant; scraping logic reusable |
| **Status labels** | ready/beta/experimental/deprecated in components.map.json | Metadata-level, framework-agnostic |
| **A11y metadata** | role/keyboard/aria/focus/notes in components.map.json | Framework-agnostic |
| **Concurrent-writer audit** | CWA protocol before structural renames | OS/filesystem-level |

**Coupling rationale:** these 8 technical items (Styling/Component/Primitives/Library/Language/cn/Tokens/Focus) are interconnected — changing any one breaks the others. shadcn IS cva IS Radix IS React IS Tailwind IS TypeScript. They cannot be picked à la carte.

## What's PARAMETERIZED (framework shell — differs per DS)

| Concern | Parameter options | Notes |
|---|---|---|
| **Framework** | `next` \| `vite` \| `astro` \| `remix` \| `sveltekit` | Shapes routing, entry, config files |
| **Image primitive** | next/image \| `<img>` + dims \| @unpic/react \| astro:assets \| enhanced:img | Per-framework |
| **Link primitive** | next/link \| react-router Link \| astro `<a>` \| remix Link \| sveltekit kit router | Per-framework |
| **Routing mechanism** | App Router (next) \| file router (vite+router-plugins) \| Astro routes \| Remix loaders \| SvelteKit routes | |
| **Server Components** | next App Router only | Next.js exclusive feature |
| **Entry file** | src/app/layout.tsx (next) \| src/main.tsx + index.html (vite) \| src/layout.astro (astro) \| root.tsx (remix) \| +layout.svelte (sveltekit) | |
| **Theme provider** | next-themes (next, also works in vite) \| Astro's ViewTransitions + inline script | |
| **Build cache dir** | `.next/` \| `.vite/` \| `.astro/` \| `.cache/` \| `.svelte-kit/` | Affects post-rename cleanup |

## What's BRAND-DRIVEN (every business chooses — default exists, override expected)

These dimensions express brand identity and are NOT technically coupled to the locked stack. The squad ships sensible defaults for fast bootstrap, but overrides are first-class.

### Icon library

**Default:** `lucide-react` (used by shadcn/ui examples; broad coverage; tree-shakable).
**Override:** YES, explicitly supported. shadcn does not require lucide — any SVG icon library works.

Cross-DS evidence (39 reference DS analyzed 2026-04-27): mature DS publish their **own** icon system (Carbon: 4373 SVGs, Material-UI: 10741 SVGs, Polaris: 549 SVGs). Icon library is brand expression, not stack constraint.

| Library | When to use | Reason |
|---|---|---|
| `lucide-react` | **Default** for new apps; dev tools; admin dashboards | Tree-shakable; consistent 24px stroke; ~1500 icons; shadcn standard |
| `@phosphor-icons/react` | Marketing, brand-rich apps, e-commerce | 4 weights (regular/bold/duotone/fill); designed for emotional UI |
| `@heroicons/react` | Tailwind-canonical; minimalist; matches Tailwind UI patterns | 24px outline + 24px solid; small set (~300); free |
| `@tabler/icons-react` | Apps needing wide variety + niche icons | ~5000 icons; unique stroke style |
| `react-icons` | Apps consuming many ecosystem brands (logos for SaaS integrations) | Aggregator with 25+ icon packs (FontAwesome, Material, Ionicons, etc.) |
| `@iconify/react` | Custom icon needs; on-demand loading | 200,000+ icons via Iconify API; bundle by use |
| Internal SVG component | Brand-owned mark; small icon set; full control | When library overhead exceeds inline cost |

**Decision rule:** if the brand has a documented icon style (e.g., AIOS uses developer-tool flat lines, Bilhon uses friendly e-commerce duotone), pick the library that matches. Default to lucide only when no brand guidance exists.

**File:** declared in `apps/{name}/package.json` and documented in `apps/{name}/DESIGN.md`.

### Animation library

**Default:** `tw-animate-css` (Tailwind-native CSS animations; zero JS overhead for simple transitions).
**Override:** YES, expected for motion-rich brands.

| Library | When to use | Reason |
|---|---|---|
| `tw-animate-css` | **Default**; B2B dashboards; admin UI; minimal motion | Pure CSS; SSR-safe; shadcn-compat |
| `framer-motion` (alias `motion/react`) | Marketing landing pages; hero animations; gesture-driven UI | Industry standard; spring physics; layoutId; gesture handlers |
| `motion` (vanilla, framework-agnostic) | Astro / non-React contexts; smaller bundle | Same Motion engine without React adapter |
| `@formkit/auto-animate` | List/grid reorder; minimal-effort smooth transitions | Drop-in for parent containers; ~1KB |
| `@react-spring/web` | Physics-based, low-level control; complex gesture interactions | More verbose API but more flexible than Framer for niche cases |
| Native CSS `@keyframes` | One-off micro-interactions; reduced-motion respect | Zero dependency; reduced-motion automatic |

**Decision rule:** B2B/admin → `tw-animate-css` is enough. Marketing/brand-driven → `framer-motion`. Mixed (e.g., admin with one animated landing) → `tw-animate-css` core + `framer-motion` per-route lazy.

**File:** declared in `apps/{name}/package.json` and documented in `apps/{name}/DESIGN.md`.

### Typography (font families)

**Default:** system font stack (`-apple-system, BlinkMacSystemFont, ...`).
**Override:** ALWAYS expected — typography is the strongest brand signal.

See `templates/ds-tokens-defaults-tmpl.yaml` `core.typography.font-base` / `font-heading` / `font-mono`.

### Brand colors

**Default:** shadcn neutral oklch (near-black primary).
**Override:** ALWAYS expected — brand colors are why we exist.

See `templates/ds-tokens-defaults-tmpl.yaml` `core.color.accent-primary` / `accent-secondary`.

### Brand voice and casing

**Default:** none — no voice has no brand.
**Override:** REQUIRED per business — discovered from `workspace/businesses/{biz}/L0-identity/founder-dna.yaml` and brandbook.

## What this means for consumers

### When a DS is scaffolded

1. `scaffold-ds.sh` asks for `--framework <option>` (default: `next`)
2. All **locked** contracts emit identically regardless of framework choice
3. **Parameterized** shape (config files, routing, entry) emits the framework-specific variant

### When a check/rule/template is authored

Author MUST declare:
- `applies_to_frameworks: all` if the concern works across Tailwind+shadcn+React (default)
- `applies_to_frameworks: [next]` if the concern is Next.js-specific (e.g., RSC serialization)
- `applies_to_frameworks: [vite, remix, astro]` if concerns non-Next React frameworks

Default to **all** whenever possible. The archetype's value proposition is that 95% of DS discipline is framework-agnostic.

### When comparing across DSs

Two DSs on this archetype with different frameworks are:
- **Visually indistinguishable** at the component/token level (Tailwind+shadcn locked)
- **Structurally different** at the app shell/routing level (framework parameterized)

This is intentional — lets each business pick framework per-DS based on their needs (Next for SSR/marketing, Vite for SPA/dashboard, Astro for content sites, etc.) without forking the DS quality discipline.

## Anti-pattern

- **DO NOT** hardcode `next.config.ts` assumptions in drift checks, manifest generators, or validators
- **DO NOT** use `.next/` cache paths as universal — reference per-framework table
- **DO NOT** require `"use client"` directive in checks that run against non-Next frameworks
- **DO NOT** assume App Router folder structure — Vite puts routes wherever `vite-plugin-pages` or user chooses

## References

- Archetype: `squads/design-ops/data/ds-archetype.yaml` (v2.0.0)
- Playbook integration: `squads/design-ops/docs/redpine-playbook-integration-2026-04-19.md`
- Framework variants (future): Vite-ready archetype variant pending reference implementation
