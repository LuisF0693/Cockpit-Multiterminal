# Design Specification — Landing Page Mobile

**Data:** 2026-02-23
**Projeto:** SPFP - Landing Page `/transforme` — Mobile Optimized
**Estilo:** Moderno & Minimalista (mesmo que desktop)
**Cor Primária:** Azul (Confiança, Segurança)
**Breakpoint Base:** 375px (iPhone 12, 13, 14 standard)
**Variações:** 320px (iPhone SE), 425px (larger phones)
**Status:** 📱 Pronto para Prototipagem em Figma

---

## 1. MOBILE-FIRST APPROACH

### Core Principles

```
Mobile-first design philosophy:
├── Start from 375px (base smartphone)
├── Design for touch (min 44x44px tap targets)
├── Optimize for thumbs (bottom 60% of screen)
├── Minimize horizontal scrolling (NO HORIZONTAL SCROLL)
├── Prioritize readability
├── Reduce cognitive load (one action per screen)
├── Leverage native mobile patterns
├── Full screen width (100vw)
└── Natural scroll (vertical only)
```

### Viewport Meta Tag

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

---

## 2. BREAKPOINTS & GRID

### Mobile Breakpoints

```
Small (320px):        iPhone SE, older devices
├── Grid: 4 columns (narrower)
├── Padding: 16px horizontal
├── Font sizes: -2px from base

Base (375px):        iPhone 12, 13, 14 (TARGET)
├── Grid: 4 columns
├── Padding: 20px horizontal
├── Font sizes: as specified

Large (425px):       iPhone 14 Pro Max, Samsung S23+
├── Grid: 6 columns
├── Padding: 24px horizontal
├── Font sizes: +2px from base

Tablet (768px+):     iPad, larger tablets (NOT mobile spec)
├── Grid: 8-12 columns
├── Padding: 32px horizontal
└── Transition to partial desktop layout
```

### Mobile Grid System

```
375px viewport (base):
├── Content width: 375 - (20px * 2 padding) = 335px
├── Grid: 4 columns
├── Column width: (335 - 12px gap) / 4 = ~80px per column
├── Gutter: 12px (reduced from 20px on desktop)
└── All elements: full width OR grid-based

Common widths on 375px:
├── Full width: 335px (375 - 40px padding)
├── 3/4 width: ~258px
├── 1/2 width: ~160px
├── 1/3 width: ~103px
└── Small elements: 44-48px min (touch targets)
```

---

## 3. COLOR PALETTE

Same as desktop spec (see `design-spec-desktop.md`):

```
Primary Blue:   #1A90FF (CTA buttons, links)
Secondary:      Blue-600 (#0070CC) for hover
Neutral:        Gray-0 to Gray-900 (backgrounds, text)
Semantic:       Green, Yellow, Red (success, warning, error)
```

**Mobile-specific adjustments:**
- Higher contrast on small screens
- Larger focus rings (more visible)
- More prominent shadows (better depth perception)

---

## 4. TYPOGRAPHY — MOBILE OPTIMIZED

### Font Stack (Same as Desktop)

```
Headings: Inter, -apple-system, BlinkMacSystemFont, sans-serif
Body: Inter, -apple-system, BlinkMacSystemFont, sans-serif
Monospace: JetBrains Mono, Courier New, monospace
```

### Type Scales — Mobile

```
h1 (Mobile Hero)
├── Font size: 32px (was 56px desktop)
├── Font weight: 700
├── Line height: 1.2
├── Letter spacing: -0.5px
├── Color: Gray-800
├── Margin: 0 0 16px 0
├── Usage: Hero headline (smaller screens)

h2 (Section Heading)
├── Font size: 24px (was 40px desktop)
├── Font weight: 700
├── Line height: 1.3
├── Letter spacing: 0px
├── Color: Gray-800
├── Margin: 0 0 12px 0
├── Usage: Section titles

h3 (Card/Feature Title)
├── Font size: 18px (was 28px desktop)
├── Font weight: 600
├── Line height: 1.4
├── Letter spacing: 0px
├── Color: Gray-700
├── Margin: 0 0 8px 0
├── Usage: Feature titles, card titles

h4 (Small Heading)
├── Font size: 16px (was 20px desktop)
├── Font weight: 600
├── Line height: 1.4
├── Color: Gray-700
├── Usage: Form labels

Body Large (Lead)
├── Font size: 16px (was 18px desktop)
├── Font weight: 400
├── Line height: 1.6
├── Color: Gray-600
├── Usage: Subheadings, descriptions

Body Regular
├── Font size: 14px (was 16px desktop)
├── Font weight: 400
├── Line height: 1.6 (22px)
├── Color: Gray-600
├── Usage: Body paragraphs, list items

Body Small
├── Font size: 13px (was 14px desktop)
├── Font weight: 400
├── Line height: 1.5
├── Color: Gray-500
├── Usage: Captions, helper text

Button Text
├── Font size: 14px (was 16px desktop)
├── Font weight: 600
├── Line height: 1.4
├── Usage: Button labels (must be legible on small screens)

Caption
├── Font size: 12px
├── Font weight: 500
├── Color: Gray-500
├── Usage: Labels, metadata
```

**Mobile Typography Best Practices:**
- Minimum 13px for body text (13px is readable on mobile)
- Line height >= 1.5 for paragraphs (22px min line-height)
- Letter spacing slightly increased for readability
- Avoid ultra-thin fonts (weight < 400)

---

## 5. SPACING SCALE — MOBILE

### Base Unit: 4px (Same as Desktop)

```
Spacing tokens:
├── xs:   4px
├── sm:   8px
├── md:   12px
├── lg:   16px
├── xl:   24px
├── 2xl:  32px
├── 3xl:  40px (reduced from 48px)
├── 4xl:  48px (reduced from 64px)
└── 5xl:  60px (reduced from 80px)

Mobile usage (more compact):
├── Component padding: md-lg (12-16px)
├── Component margin: lg-xl (16-24px)
├── Section padding: 40px (top/bottom)
├── Heading margin: 24px (vs 48px desktop)
├── Text line spacing: lg (16px)
├── Gap between items: md (12px)
└── Horizontal margins: 20px screen edges

Stacking approach:
├── Everything vertical (no horizontal elements)
├── Cards stack 1 column
├── Buttons full width or side-by-side (50/50 split at max)
├── Minimal nesting (2 levels max)
└── Clear visual hierarchy through spacing
```

---

## 6. LAYOUT STRUCTURE — MOBILE

### Full Page Layout (Vertical Stack)

```
┌─────────────────────────────┐
│ HEADER (mobile nav)         │ 56px
├─────────────────────────────┤
│                             │
│ HERO Section                │ 100vh or 80vh
│ (Video or image bg)         │
│ (Larger headline)           │
│ (Stacked CTAs)              │
│                             │
├─────────────────────────────┤
│ VALUE PROP (problem/solve)  │ ~400px
│ (Text only, stacked)        │
├─────────────────────────────┤
│ FEATURES (carousel or stack)│ ~600px (4 items)
│ (1 feature visible per view)│
├─────────────────────────────┤
│ HOW IT WORKS (3 steps)      │ ~450px
│ (Vertical timeline)         │
├─────────────────────────────┤
│ SOCIAL PROOF (testimonials) │ ~600px
│ (Carousel auto-scroll)      │
├─────────────────────────────┤
│ PRICING (stack vertically)  │ ~800px (2 plans)
│ (One plan per row)          │
├─────────────────────────────┤
│ FAQ (accordion)             │ ~800px (6 items)
│ (Expandable list)           │
├─────────────────────────────┤
│ FINAL CTA (full width)      │ ~250px
│ (Sticky button at bottom?)  │
├─────────────────────────────┤
│ FOOTER                      │ ~400px
│ (Links stacked)             │
└─────────────────────────────┘

Total estimated scroll length: ~5000px (60+ screens worth)
```

---

## 7. COMPONENT SPECIFICATIONS — MOBILE

### Header (Mobile Navigation)

```
Dimensions:
├── Height: 56px (smaller than desktop 64px)
├── Width: 100vw (full screen)
├── Padding: 12px 20px
├── Position: Sticky or fixed to top

Layout (3-zone):
├── Left (8px): Logo (24x24px, smaller)
├── Middle (stretch): Empty or subtitle
├── Right (8px): Hamburger menu icon (24x24px)

Logo:
├── Size: 24x24px (down from 32px)
├── Margin: 0
├── Clickable area: 44x44px (centered on icon)

Hamburger Menu:
├── Icon: 24x24px (3 lines)
├── Tap target: 44x44px
├── Color: Gray-800
├── Hover: Gray-600
├── Animation: Rotate 90° to X when open

Mobile Menu (off-canvas):
├── Position: fixed, full-screen overlay
├── Background: White or translucent dark overlay
├── Z-index: 1000
├── Width: 100% or 80% (full-width simpler)
├── Height: 100vh
├── Padding: 80px 20px 20px (below header)
├── Links stacked vertically
│   ├── Link: 16px, Gray-700
│   ├── Padding: 16px 0 (vertical only)
│   ├── Margin: 0 0 12px 0
│   └── Border-bottom: 1px Gray-200 (between items)

Menu items:
├── Home
├── Plataforma
├── FAQ
├── Contato
├── [CTA Button: "Começar Agora"]
│   ├── Full width: 100%
│   ├── Margin: 24px 0 0 0
│   └── Height: 48px (larger on mobile)

Close button (X):
├── Position: top-right, inside menu
├── Size: 24x24px
├── Tap target: 44x44px
├── Color: Gray-600
└── Hover: Gray-800
```

### Hero Section — Mobile

```
Dimensions:
├── Min-height: 80vh (slightly less than desktop 100vh)
├── Height: auto if content longer
├── Width: 100%
├── Padding: 40px 20px (top/bottom), no horizontal padding
├── Display: flex, flex-direction: column, justify-content: center

Layout (vertical stack):
├── All elements centered, full width
└── No columns on mobile

Background:
├── Video: Same /landing/hero-video.mp4 (auto-play muted)
├── Fallback: Static image (important for performance)
├── Overlay: Black 50% (more opaque for readability on small screens)
│   └── rgba(0, 0, 0, 0.5) to rgba(0, 0, 0, 0.3) gradient
├── Background size: cover
├── Background position: center
└── No parallax (too janky on mobile)

Content (centered, stacked):
├── Headline (h1)
│   ├── Text: "Planeje suas finanças em minutos"
│   ├── Font: 32px Bold, White
│   ├── Text-align: center
│   ├── Line: 1.2 (38px)
│   ├── Margin: 0 0 12px 0
│   └── Animation: fade-in + slide-up (10px, 600ms)
│
├── Subheadline (P body-large)
│   ├── Text: "Com IA que entende VOCÊ"
│   ├── Font: 16px Regular, Gray-100
│   ├── Text-align: center
│   ├── Line: 1.6 (26px)
│   ├── Margin: 0 0 24px 0
│   └── Animation: fade-in + slide-up (600ms, 200ms delay)
│
├── CTA Buttons (flex column, gap 12px, centered)
│   ├── Button 1 (Primary)
│   │   ├── Width: 100% (full screen width - padding)
│   │   ├── Height: 48px (min 44px touch target)
│   │   ├── Padding: 12px 20px (vertical tight)
│   │   ├── Font: 14px Bold
│   │   ├── Text: "Começar com Plataforma"
│   │   ├── Style: Blue-500 bg, white text
│   │   ├── Border-radius: 8px
│   │   ├── Tap feedback: highlight (0.8 opacity)
│   │   ├── Active: scale 0.95
│   │   └── Shadow: subtle (0 2px 8px rgba(...))
│   │
│   └── Button 2 (Secondary)
│       ├── Width: 100%
│       ├── Height: 48px
│       ├── Style: White border (2px), transparent bg, white text
│       ├── Hover/Active: White 20% bg
│       └── Stacked below, not side-by-side
│
└── Scroll indicator (optional on mobile)
    ├── Icon: ChevronDown (16px, smaller)
    ├── Animation: bounce (2s infinite)
    ├── Margin: 40px 0 0 0
    └── Opacity: 0.6 (less prominent)

Mobile-specific considerations:
├── NO auto-play video on first load (use thumbnail + play button)
├── Static image fallback MUST be present
├── Text must not overlap video (use solid overlay)
├── Buttons must be easily tappable (48px height)
├── Two buttons vertically stacked, never side-by-side
```

### Features Section — Mobile

```
Dimensions:
├── Padding: 40px 20px (top/bottom)
├── Background: Gray-0 (white)
├── Width: 100%

Layout options (choose one):

OPTION A: Stack vertically (recommended)
├── Features: 1 column, 4 items vertically stacked
├── Full width per card: 100%
├── Card height: auto (content)

OPTION B: Carousel (better UX)
├── Horizontal scroll (limited, careful with mobile UX)
├── 1 feature visible at a time
├── Auto-scroll: disabled on mobile (manual swipe only)
├── Dots/indicators at bottom
├── Snap-to-item scroll behavior

Feature Card (stacked layout):
├── Background: Gray-0 (white)
├── Border: 1px Gray-200
├── Border-radius: 8px
├── Padding: 20px (reduced from 32px desktop)
├── Margin: 0 0 16px 0
├── Width: 100%
├── Box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05)
│
├── Icon
│   ├── Size: 40x40px (reduced from 48px)
│   ├── Color: Blue-500
│   ├── Margin: 0 0 12px 0
│
├── Title (h3)
│   ├── Font: 18px Bold
│   ├── Color: Gray-800
│   ├── Margin: 0 0 8px 0
│
├── Description
│   ├── Font: 14px Regular
│   ├── Color: Gray-600
│   ├── Line: 1.6
│   ├── Margin: 0 0 12px 0
│
└── Link
    ├── Font: 13px 600
    ├── Color: Blue-500
    └── Text: "Explorar →"

Mobile hover/active:
├── Tap feedback: scale 0.98, shadow increase
├── No persistent hover state (no hover on touch)
└── Transition: 300ms

Section header:
├── Title (h2): 24px, centered
├── Subtitle: 14px, centered, Gray-600
└── Margin: 0 0 32px 0
```

### Pricing Section — Mobile

```
Dimensions:
├── Padding: 40px 20px
├── Background: Blue-50
├── Width: 100%

Layout:
├── Pricing cards: stack vertically (1 column)
├── Card width: 100%
├── Card margin: 0 0 16px 0 (between cards)

Pricing Card:
├── Background: White
├── Border: 2px solid (Gray-200 or Blue-500 for Popular)
├── Border-radius: 12px
├── Padding: 24px (reduced from 48px)
├── Width: 100%
│
├── Badge ("POPULAR")
│   ├── Position: absolute top-12 right-12
│   ├── Font: 10px uppercase 600
│   ├── Background: Blue-500
│   ├── Padding: 4px 8px
│   ├── Border-radius: 16px
│   └── Color: White
│
├── Plan name (h3)
│   ├── Font: 20px Bold
│   ├── Color: Gray-800
│   ├── Margin: 0 0 12px 0
│
├── Price (display)
│   ├── Font: 36px Bold
│   ├── Color: Blue-600
│   ├── Margin: 0 0 4px 0
│   ├── "/mês": 12px, Gray-500
│
├── Feature list
│   ├── Items: 4-5 features (not all, prioritize)
│   ├── Format: ✓ Text
│   ├── Checkmark: 14x14px, Green-500
│   ├── Text: 13px, Gray-600
│   ├── Margin: 0 0 10px 0
│   └── List margin: 0 0 24px 0
│
└── CTA Button
    ├── Width: 100%
    ├── Height: 48px (touch target)
    ├── Font: 14px 600
    ├── Primary for right card, secondary for left
    ├── Border-radius: 8px
    └── Tap feedback: scale 0.95

Popular card styling:
├── No transform/scale (already prominent)
├── Slightly larger shadow
└── Border: 2px Blue-500
```

### FAQ Section — Mobile

```
Dimensions:
├── Padding: 40px 20px
├── Background: White
├── Width: 100%

Accordion:
├── Background: Gray-0
├── Border-radius: 8px
├── Margin: 0 0 8px 0

Accordion Item:
├── Header (clickable)
│   ├── Padding: 16px 20px (reduced)
│   ├── Background: Gray-50
│   ├── Display: flex justify-between align-center
│   ├── Gap: 12px
│   ├── Tap target: 100% height (minimum 44px)
│   ├── Cursor: pointer
│   ├── Border-bottom: 1px Gray-200
│   └── Hover: Gray-100 bg
│
├── Question text
│   ├── Font: 14px 600
│   ├── Color: Gray-800
│   ├── Flex: 1
│   ├── Text-align: left
│   └── Margin: 0
│
├── Chevron icon
│   ├── Size: 16x16px
│   ├── Color: Gray-600
│   ├── Transition: rotate 300ms
│   ├── Rotate: 0deg closed, 180deg open
│   └── Flex-shrink: 0
│
└── Content (expandable)
    ├── Padding: 16px 20px
    ├── Font: 13px 400
    ├── Color: Gray-600
    ├── Line-height: 1.6 (21px)
    ├── Max-height: 0 (closed) → auto (open)
    ├── Overflow: hidden
    ├── Transition: max-height 300ms, opacity 300ms
    └── Opacity: 0 (closed) → 1 (open)

Section header:
├── Title (h2): 24px Bold, centered
├── Margin: 0 0 32px 0

Support CTA:
├── Text: "Ainda tem dúvidas? [Chat ao Vivo]"
├── Font: 14px, Gray-600
├── Margin: 32px 0 0 0
└── Text-align: center
```

### Mobile Navigation Patterns

```
Tab bar (bottom navigation) - OPTIONAL:
├── Position: fixed bottom
├── Height: 56px
├── Width: 100%
├── Background: White
├── Border-top: 1px Gray-200
├── Tabs:
│   ├── Home (icon + label)
│   ├── Features (icon + label)
│   ├── Pricing (icon + label)
│   └── More (menu)
├── Tap target: 56x56px per tab (safe to tap)
└── Active tab: Blue-500 icon, Blue-600 label

Sticky footer CTA:
├── Position: fixed bottom 0
├── Width: 100%
├── Height: 60px (button + padding)
├── Background: White
├── Border-top: 1px Gray-200
├── Padding: 8px 20px
├── Button: full width, 44px height
└── Content: sticky behind, scrolls on top
```

### Footer — Mobile

```
Dimensions:
├── Padding: 40px 20px
├── Background: Gray-800
├── Color: White

Layout (vertical stack):
├── All content stacked vertically
├── 100% width
├── No columns

Content:
├── Logo (24x24px) + Tagline (13px, Gray-300)
│   ├── Margin: 0 0 24px 0
│
├── Links section
│   ├── Title: "Produto" (h4, 12px)
│   ├── Links: stacked vertically
│   │   ├── Font: 13px, Gray-300
│   │   ├── Margin: 8px 0 per link
│   │   └── Tap target: 44px height (spacious)
│   └── Margin: 0 0 24px 0
│
├── Social icons
│   ├── Icons: 20x20px
│   ├── Gap: 12px (horizontal)
│   ├── Tap target: 44x44px (larger than icon)
│   └── Margin: 0 0 24px 0
│
└── Copyright
    ├── Font: 12px, Gray-500
    ├── Text-align: center
    └── Margin: 24px 0 0 0
```

---

## 8. TOUCH TARGETS & USABILITY

### Minimum Touch Target Sizes

```
iOS/Android Guidelines:
├── Minimum: 44x44px (Apple iOS standard)
├── Recommended: 48x48px (more comfortable)
├── Safe: 56x56px (for frequent actions)

Button sizes on mobile:
├── Primary CTAs: 48px height, full width
├── Secondary buttons: 44px height, full width
├── Small buttons: 40px height (for density)
├── Link tap area: 44x44px minimum

Icon tap targets:
├── Standalone icon button: 44x44px
├── Icon in button: already within button bounds
└── Menu icon: 44x44px centered on icon

Spacing between tap targets:
├── Minimum: 8px (safe distance)
├── Recommended: 12-16px (prevents fat-finger errors)
├── Links in body text: 24px tall min (padding)

Form inputs:
├── Input height: 44px (= tap target)
├── Label touch target: expands to 44px
├── Checkbox: 44x44px
└── Radio: 44x44px
```

---

## 9. PERFORMANCE OPTIMIZATION — MOBILE

### Image Optimization

```
Hero background:
├── WebP: 150-200KB
├── JPEG fallback: 200-300KB
├── Serve via srcset (different sizes)
├── Use object-fit: cover

Feature icons:
├── SVG (inline) for vector icons
├── PNG/WebP for raster images
├── Max size: 40x40px (mobile size)

Testimonial avatars:
├── 40x40px on mobile (vs 48px desktop)
├── WebP format
├── Lazy load via loading="lazy"

Video background:
├── DO NOT auto-play on mobile
├── Thumbnail image instead
├── Play button overlay
├── Single format (mp4 only, no multiple sources)
├── Max 2MB (heavily compressed)
└── Mute on load (silent autoplay if allowed)
```

### Bundle Size Goals

```
Landing page mobile target:
├── HTML: < 50KB
├── CSS: < 30KB (or inline)
├── JS: < 200KB (including React)
├── Images: < 400KB (lazy-loaded)
├── Total: < 700KB initial load

Performance targets:
├── LCP: < 2.5s
├── FID: < 100ms
├── CLS: < 0.1
├── TTI: < 3.5s

Mobile-specific optimizations:
├── Inline critical CSS (above-the-fold)
├── Defer non-critical JS
├── Lazy load below-the-fold images
├── Code split for modals
├── Minimize animations (GPU-friendly only)
└── Avoid blocking fonts (use system fonts or FOUT strategy)
```

---

## 10. ANIMATIONS — MOBILE

### Reduced Motion

```
Mobile animation considerations:
├── Respect prefers-reduced-motion media query
├── Disable animations for low-end devices
├── Simplify animations (no complex curves)
├── Shorter durations (200ms vs 800ms desktop)

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

Mobile animations (optimized):
├── Page load: fade-in (400ms, simpler)
├── Button press: scale 0.95 (100ms, instant feel)
├── Carousel: snap-to-item (no smooth scroll)
├── Accordion: max-height transition (300ms)
├── Links: color change (200ms)

NO animations on mobile:
├── Parallax scrolling (janky)
├── Complex transforms
├── Hover states (no hover on touch)
├── Complex SVG animations
└── 60fps+ framerate animations (drain battery)

GPU-friendly animations:
├── transform: translate/scale/rotate
├── opacity changes
└── filter adjustments
```

---

## 11. RESPONSIVE BREAKPOINTS — MOBILE VARIANTS

### Small Phones (320px)

```
Changes from 375px base:
├── Font sizes: -2px (smaller)
├── Padding: 16px (vs 20px)
├── Spacing: reduce by 10%
├── Grid: 4 columns (narrower)
├── Hero buttons: single column, even tighter
├── Feature cards: padding 16px (vs 20px)
├── Section padding: 32px (vs 40px)
└── Icons: 36x36px (vs 40px)
```

### Large Phones (425px)

```
Changes from 375px base:
├── Font sizes: +2px (slightly larger)
├── Padding: 24px (vs 20px)
├── Spacing: increase by 10%
├── Grid: 6 columns (for better layout)
├── Feature cards: 2 per row (if space allows)
├── Section padding: 48px (vs 40px)
└── Icons: 44x44px (vs 40px)
```

### Tablet Transition (768px+)

```
At tablet breakpoint, transition to partial desktop:
├── Grid: 8-12 columns
├── Padding: 32px
├── Features: 2 columns per row
├── Pricing: side-by-side (2 cols)
├── Hero buttons: side-by-side (2 cols)
├── Font sizes: back to near-desktop
├── Navigation: toggle between mobile/desktop
└── See design-spec-desktop.md for full spec

This is still "mobile-friendly tablet" not full desktop
```

---

## 12. ACCESSIBILITY — MOBILE

### Touch & Motor Accessibility

```
Considerations:
├── Large touch targets (44x44px minimum)
├── Sufficient spacing (8px+ between targets)
├── No tiny buttons (avoid < 40px)
├── Swipe gestures must have alternatives
├── Long-press actions need tap alternatives
├── Orientation support (portrait & landscape)

Implementation:
├── Buttons: padding-based sizing (not width/height)
├── Links: apply touch-friendly padding
├── Form inputs: 44px height
├── Focus ring: visible (4px minimum)
└── No hover-required content
```

### Visual Accessibility

```
Mobile-specific issues:
├── Small fonts are less readable
├── Contrast ratio must be higher (higher than desktop)
├── Color-only indicators fail (add icons/text)
├── Smaller target areas harder to hit

Requirements:
├── Font: minimum 13px for body text
├── Color contrast: 4.5:1 for normal text (vs 3:1 desktop)
├── 7:1 for large text (14px+ 600 weight)
├── Focus ring: visible, 2px minimum
└── Focus visible for keyboard & touch
```

### Screen Reader & Semantic HTML

```
Mobile considerations:
├── Semantic HTML (button, link, form)
├── ARIA labels on touch buttons without text
├── Skip to main content link
├── Role attributes on custom components
├── aria-expanded on accordion/menu
├── aria-label on icon buttons
└── Form labels explicitly associated (id + for)

Mobile screen reader testing:
├── VoiceOver (iOS)
├── TalkBack (Android)
├── Reading order (logical flow)
└── Touch gesture support
```

---

## 13. MOBILE CHECKLIST

```
Design checklist:
[ ] All text readable (minimum 13px)
[ ] Colors have sufficient contrast (4.5:1+)
[ ] Touch targets >= 44x44px
[ ] Spacing between targets >= 8px
[ ] No horizontal scrolling
[ ] Buttons full width or 50/50 split (never 3+ per row)
[ ] Icons large enough (36x36px minimum)
[ ] Focus rings visible (2px+)
[ ] Tested on landscape orientation
[ ] Video has static fallback image
[ ] Forms work on mobile keyboards
[ ] Modals don't cover CTA buttons
[ ] Footer doesn't hide behind sticky CTA
[ ] Performance targets met (LCP < 2.5s)

Content checklist:
[ ] Hamburger menu for navigation (not crowded header)
[ ] Headline text short & scannable
[ ] CTA copy short (< 20 characters)
[ ] Feature descriptions concise
[ ] Pricing not truncated
[ ] FAQ questions visible without expansion
[ ] No email/phone unlinked (should be tel: and mailto:)

Interaction checklist:
[ ] Tap feedback visible (scale or color)
[ ] Modals closeable (X or back button)
[ ] Carousel/scroll smooth without janking
[ ] Form validation clear
[ ] Error messages readable
[ ] Loading states visible
[ ] Success feedback (toast/modal)
[ ] Back navigation works (browser back)
```

---

## 14. FIGMA SETUP — MOBILE

### Artboard Sizes

```
Create artboards for each breakpoint:
├── iPhone SE (375x667px) — BASE
├── iPhone 14 (390x844px) — similar to base
├── Galaxy S20 (360x800px) — small Android
├── Pixel 7 (412x915px) — large Android
├── iPad (768x1024px) — tablet (reference)

Frame naming:
├── Mobile/Hero-375px
├── Mobile/Features-375px
├── Mobile/Pricing-375px
├── Mobile/FAQ-375px
├── Mobile/Footer-375px
```

### Component Library — Mobile

```
Create mobile-specific components:
├── Button/Primary-Mobile (48px height)
├── Button/Secondary-Mobile
├── Input/Text-Mobile (44px height)
├── Card/Feature-Mobile
├── Card/Pricing-Mobile
├── Accordion/Item-Mobile
├── Header/Mobile-Nav
├── Footer/Mobile
└── Icons/All (36-40px standard on mobile)

Variants:
├── Default, hover, active, disabled
├── Different sizes (40px, 44px, 48px)
├── With/without icon
└── Full width vs constrained
```

---

## 15. NEXT STEPS

### For Figma Prototyping:

1. Create artboards at 375px (base mobile)
2. Set up grid (4 columns, 12px gutter)
3. Build components with mobile-specific sizes
4. Design all sections mobile-first
5. Create variants for 320px and 425px
6. Add interactions (hamburger menu, accordion, carousel)
7. Export for developer handoff

### For Frontend Implementation:

```css
/* Mobile-first CSS approach */
@media (min-width: 376px) {
  /* Changes for 375px and up */
}

@media (min-width: 426px) {
  /* Changes for 425px and up */
}

@media (min-width: 769px) {
  /* Changes for tablet and up */
}

@media (min-width: 1025px) {
  /* Changes for desktop and up */
}
```

---

**Especificação mobile pronta para prototipagem em Figma!**

Use junto com `design-spec-desktop.md` para criar design system completo.

Próxima etapa: Criar Design System (cores, tipografia, componentes documentados)
