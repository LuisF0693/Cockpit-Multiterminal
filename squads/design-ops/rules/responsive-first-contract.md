# Responsive Mobile-First Contract

**Applies to:** every frontend artifact produced by `/design-system` / `/design-artifact-cycle` (components, pages, decks with HTML export, dashboards, emails).

**Posture:** Mobile-first is not optional. "Desktop-only" or "desktop-assumed" outputs are rejected at QA gate. Tailwind + shadcn do not ship mobile-responsive by default — they provide the tools. This rule enforces using them.

**Enforcement posture:** Responsiveness is built into the **generation starting point**, not patched at the QA gate. The pipeline MUST copy the starter templates from `squads/design-ops/templates/` before writing custom code — not as a cleanup pass. See the "Generator Starting Point" section below.

## Generator Starting Point (MANDATORY, Phase 3 + Phase 4)

Before `/design-artifact-cycle` writes any `globals.css`, `layout.tsx`, or navigation component, it MUST copy the canonical starter templates listed in `squads/design-ops/templates/RESPONSIVE-STARTERS.md`. The order is non-negotiable:

1. **Phase 3 (Token emission)** — copy `responsive-tokens.css.tmpl` into the target `globals.css`. This installs fluid spacing tokens, horizontal-scroll guard, section utilities, and app-shell pattern BEFORE any custom declarations. Custom brand tokens (colors, typography) extend but never overwrite.
2. **Phase 4 (Build — layout scaffolding)** — if the surface has navigation, copy `mobile-topbar.tsx.tmpl` + `responsive-layout.tsx.tmpl`. The layout pairs `MobileTopBar` (<lg) with `Sidebar` (≥lg). Skipping MobileTopBar is a P4 FAIL.
3. **Phase 4 (Build — editorial components)** — if the surface has monumental single-word titles, copy `display-title.tsx.tmpl`. Writing a raw `<h2 style={{ fontSize: "clamp(...)" }}>LONGWORD</h2>` is forbidden.

This "starter-first" posture is a generator-level default. Writing from scratch, then fixing violations at QA gate, costs 3-4× more iterations than starting from the canonical template. The redpine-ds retro (2026-04-19) measured 4 post-hoc fix rounds that could have been zero under starter-first.

---

## Why This Rule Exists

Observation from real production artifacts (redpine-ds brandbook, 2026-04-19): when designers write layouts with hardcoded large values (`paddingBlock: "10rem"`, `gap: "6rem"`, `fontSize: "clamp(6rem, 14vw, 18rem)"`), the resulting page breaks on mobile — horizontal scroll, cramped content, huge whitespace, and occasionally broken words. Each of these bugs had to be fixed surgically after the fact.

Root causes:

1. **Inline `style={{}}` values bypass Tailwind's breakpoint system.** Tailwind is only responsive when you use `sm:/md:/lg:` utility prefixes.
2. **shadcn/ui is a "copy-paste library"** — installed components are responsive, but any custom component built on top inherits nothing.
3. **Custom nav components almost never add mobile drawer by default.** Sidebars with `hidden lg:block` leave mobile users without navigation.
4. **Large fixed values don't collapse.** `10rem` = 100px vertical padding is editorial on desktop, oppressive on a 360px viewport.

---

## Non-Negotiable Contract

### 1. Fluid spacing tokens — NOT hardcoded values ≥4rem

Every vertical spacing value **≥4rem** MUST use a fluid token, not a raw rem literal:

```css
/* globals.css — declare once */
:root {
  --section-py-xl: clamp(4rem, 9vw, 10rem);
  --section-py-lg: clamp(3.2rem, 7vw, 8rem);
  --section-py-md: clamp(2.4rem, 5vw, 6rem);
  --section-py-sm: clamp(1.6rem, 3vw, 4rem);
  --gap-xl: clamp(2.4rem, 4vw, 6rem);
  --gap-lg: clamp(2rem, 3.5vw, 4rem);
  --gap-md: clamp(1.6rem, 2.5vw, 3rem);
  --gap-sm: clamp(1.2rem, 2vw, 2rem);
  --panel-p: clamp(2.4rem, 5vw, 6rem);
}
```

```tsx
// Page — consume token
<section style={{ paddingBlock: "var(--section-py-xl)" }}>
```

**Forbidden:**

```tsx
// ❌ Hardcoded large value — blows up on mobile
<section style={{ paddingBlock: "10rem" }}>

// ❌ Inline breakpoint chain — reinvents what clamp() does
<section className="py-20 md:py-28 lg:py-40">

// ❌ Hardcoded gap >4rem without media queries
<div className="gap-[6rem]">
```

Contract for clamp values: **mobile floor ≤ 50% of desktop ceiling.** `clamp(10rem, Xvw, 12rem)` is a NO — the floor must actually be mobile-friendly.

### 2. Mobile navigation — ALWAYS present

If the surface has any navigation (sidebar, header menu, tabs with >3 items), a mobile variant MUST exist. Acceptable patterns:

- **shadcn `Sheet`** as drawer (hamburger opens `SheetContent`). Shared nav content between desktop aside + mobile Sheet via an extracted `Nav` component.
- **Responsive top-bar** that collapses into dropdown on `<md`.
- **Bottom nav** for app-like surfaces.

**Forbidden:**

```tsx
// ❌ Desktop-only nav — mobile users are stranded
<aside className="hidden lg:block">
  <Nav />
</aside>
```

Sidebar + no MobileTopBar = QA gate FAIL.

### 3. Display titles — never break, never overflow, never scroll

Editorial monumental titles (letter-height >10vh) MUST use one of:

- **SVG `<text>` with `viewBox` + `textLength="..." lengthAdjust="spacingAndGlyphs"`** — scales proportionally to container width, single line, no overflow ever. Canonical solution.
- **Smaller `clamp()` + `overflow-wrap: anywhere`** — acceptable when wrap is visually tolerable (bad for single-word editorial pages).

**Forbidden:**

```tsx
// ❌ Large vw-based clamp on uppercase word — breaks on narrow viewports
<h2 style={{ fontSize: "clamp(6rem, 14vw, 18rem)" }}>POSICIONAMENTO</h2>
```

### 4. Horizontal scroll — systemic guard

`globals.css` MUST include:

```css
html, body { overflow-x: clip; max-width: 100vw; }
*, *::before, *::after { min-width: 0; }  /* flex/grid children escape valve */
h1, h2, h3, [data-display-heading] {
  overflow-wrap: anywhere;
  max-width: 100%;
}
img, video, svg, canvas { max-width: 100%; height: auto; }
```

This is a **belt-and-suspenders** layer — primary fix is still correct sizing, but this guarantees no single component can produce horizontal scroll.

### 5. Touch targets — 44px minimum

Any interactive element (link, button, checkbox, menu item) MUST meet `min-height: 4.4rem` (44px) AND `min-width: 4.4rem` when the 62.5% base is active. In pure Tailwind spacing scale, `min-h-11 min-w-11`.

### 6. Form inputs — 16px+ on mobile

Text inputs must render at ≥16px font-size on mobile. Smaller triggers iOS Safari auto-zoom on focus — disorienting and breaks layout.

### 7. Container padding — scale from viewport edges

`.container-ds` (or equivalent) pattern:

```css
.container-ds {
  padding-inline: clamp(1.6rem, 4vw, 4rem);
  margin-inline: auto;
  max-width: 1480px;
}
```

Fixed `padding-inline: 4rem` on mobile (40px × 2 = 80px) devours a 360px viewport.

---

## Checklist (QA gate uses this)

Before marking any frontend artifact PASS:

- [ ] All vertical padding ≥4rem uses `--section-py-*` tokens (or equivalent fluid clamp)
- [ ] All gaps ≥3rem use `--gap-*` tokens
- [ ] No `paddingBlock: "Xrem"` literals where `X ≥ 4`
- [ ] No `hidden lg:block` on a navigation surface without a mobile counterpart
- [ ] `html, body { overflow-x: clip }` is present in the stylesheet
- [ ] Test viewport at **360×640** (smallest common mobile) — no horizontal scroll, no content cut
- [ ] Test viewport at **768×1024** (tablet) — layout readable, no excessive whitespace
- [ ] Test viewport at **1440×900** (desktop) — editorial intent preserved
- [ ] Every interactive element has ≥44px hit target on mobile
- [ ] Text inputs render at ≥16px on mobile
- [ ] Long single-word titles fit without wrap or overflow (SVG `<text>` with `textLength`)

---

## Pipeline Integration

`/design-artifact-cycle` enforces this rule at:

- **P03 — Token emission**: validates `globals.css` declares the fluid spacing token family
- **P05 — BUILD**: AST scan flags any inline `style={{ paddingBlock: "Xrem" }}` with `X ≥ 4` — advisory on first build, blocking on revise
- **P07 — VERIFY**: runs Lighthouse viewport test at 360×640; fails if CLS >0.1 or horizontal scroll detected

---

## Precedent

- **redpine-ds brandbook 2026-04-19** — POSICIONAMENTO broke on mobile due to `clamp(6rem, 14vw, 18rem)` on 14-char word. Fix required 4 iterations (guard global, component props, SVG title, spacing tokens). Had this contract been enforced upstream, the iterations would have been zero.
- **AN_KE_147** (mind heuristic) — "Principle is aspiration, enforcement is mechanism." Mobile-first as "guideline" produces the same output as no guideline at all. This rule is the mechanism.

---

## Version

v1.0 — 2026-04-19 — Extracted from redpine-ds mobile optimization retro. Authored by @design-chief via `/design-system`.
