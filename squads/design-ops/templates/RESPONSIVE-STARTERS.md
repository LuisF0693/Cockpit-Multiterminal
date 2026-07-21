# Responsive Mobile-First Starter Kit

**Purpose:** drop-in templates that make every new /design-system artifact
mobile-first **by construction**, not by post-hoc gate enforcement.

**Rule owner:** `squads/design-ops/rules/responsive-first-contract.md`

---

## When to use

The `/design-system` → `/design-artifact-cycle` pipeline MUST reach for
these templates **at Phase 3 (token emission) and Phase 4 (build)** before
writing any custom CSS or layout code. The order is non-negotiable:

1. **Copy the starter first.**
2. **Customize branding second** (colors, typography, logo path).
3. **Add unique features third.**

Writing a new `globals.css`, `layout.tsx`, or mobile nav from scratch is
forbidden when these starters cover the use case.

---

## Catalog

| File | Role | Copies into |
|------|------|-------------|
| `responsive-tokens.css.tmpl` | Fluid spacing tokens + scroll guard + section utilities + app-shell | `src/app/globals.css` (appended to `:root`) |
| `mobile-topbar.tsx.tmpl` | Mobile nav via shadcn `Sheet` drawer | `src/components/mobile-topbar.tsx` |
| `responsive-layout.tsx.tmpl` | Root app-shell layout (MobileTopBar + Sidebar pair) | `src/app/(app)/layout.tsx` |
| `display-title.tsx.tmpl` | SVG fit-to-width title (never wraps/breaks) | `src/components/display-title.tsx` |

Dependencies:

- shadcn `Sheet` installed (`npx shadcn@latest add sheet`)
- The registered icon library installed (per `data/ds-archetype.yaml#brand_driven.icons` — default `lucide-react`)
- A `Sidebar` component that exports a `SidebarNav` sub-component
  (content only, rendered inside both desktop aside AND mobile Sheet)

---

## Contract checklist (pipeline P03/P05 use this)

Before marking Phase 3 (tokens) complete, verify in the target stylesheet:

- [ ] `--section-py-{sm,md,lg,xl}` tokens declared
- [ ] `--gap-{sm,md,lg,xl}` tokens declared
- [ ] `--panel-p{,-sm,-lg}` tokens declared
- [ ] `html, body { overflow-x: clip; max-width: 100vw }` present
- [ ] `*, *::before, *::after { min-width: 0 }` present
- [ ] `--mobile-topbar-h` declared and `.app-shell` consumes it
- [ ] `h1/h2/h3 { overflow-wrap: anywhere; max-width: 100% }` present

Before marking Phase 4 (build) complete, verify:

- [ ] `MobileTopBar` component exists and is rendered in root app layout
- [ ] `Sidebar` is NOT rendered alone (no `hidden lg:block` without pair)
- [ ] No inline `style={{ paddingBlock: "Xrem" }}` where `X ≥ 4`
- [ ] No `className="py-[Xrem]"` where `X ≥ 4` — use `--section-py-*`
- [ ] Editorial single-word titles use `DisplayTitle` (SVG)

---

## What this file is NOT

- Not an abstraction to import at runtime. These are **source code copies**.
- Not versioned with semver — they're snapshots. When the contract evolves,
  the starters are rewritten; consumers migrate as they update.
- Not project-specific. Business-specific tokens (brand colors, typography)
  belong in separate files that extend — never overwrite — these starters.

---

## Precedent

- **redpine-ds brandbook 2026-04-19** — first application. Starters were
  retroactively extracted from the redpine-ds fix cycle (mobile nav,
  fluid tokens, SVG title, scroll guard). Next artifact should hit zero
  mobile-breakage iterations when using these as the baseline.

---

## Version

v1.0 — 2026-04-19 — Extracted from redpine-ds → authored by `/design-system`.
