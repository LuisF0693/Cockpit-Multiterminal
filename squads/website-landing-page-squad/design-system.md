# Design System — SPFP Landing Page

**Data:** 2026-02-23
**Projeto:** SPFP - Landing Page `/transforme`
**Versão:** 1.0.0
**Status:** 🎨 Complete Design System
**Target:** React + TailwindCSS Implementation

---

## Table of Contents

1. Design Tokens
2. Atomic Components
3. Composite Components
4. Patterns & Behaviors
5. Responsive Guidelines
6. Accessibility Standards
7. Implementation Guide

---

## 1. DESIGN TOKENS

### Color Palette

```json
{
  "colors": {
    "primary": {
      "50": "#F0F6FF",
      "100": "#E0ECFF",
      "200": "#B3D9FF",
      "300": "#80C1FF",
      "400": "#4DA8FF",
      "500": "#1A90FF",
      "600": "#0070CC",
      "700": "#004399",
      "800": "#002E66"
    },
    "gray": {
      "0": "#FFFFFF",
      "50": "#F8F9FA",
      "100": "#F1F3F5",
      "200": "#E8EAED",
      "300": "#D7DADD",
      "400": "#B9BDC3",
      "500": "#868B94",
      "600": "#5A5F66",
      "700": "#3E4248",
      "800": "#202428",
      "900": "#000000"
    },
    "semantic": {
      "success": {
        "50": "#E8F5E8",
        "500": "#27AE60",
        "700": "#1E8449"
      },
      "warning": {
        "50": "#FFF3E0",
        "500": "#F39C12",
        "700": "#D68910"
      },
      "error": {
        "50": "#FFEBEE",
        "500": "#E74C3C",
        "700": "#C0392B"
      },
      "info": {
        "50": "#E3F2FD",
        "500": "#2196F3",
        "700": "#1565C0"
      }
    }
  }
}
```

### Typography

```json
{
  "typography": {
    "fontFamily": {
      "sans": "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      "mono": "'JetBrains Mono', 'Courier New', monospace"
    },
    "fontSize": {
      "h1": { "desktop": "56px", "mobile": "32px", "weight": 700, "lineHeight": 1.2 },
      "h2": { "desktop": "40px", "mobile": "24px", "weight": 700, "lineHeight": 1.3 },
      "h3": { "desktop": "28px", "mobile": "18px", "weight": 600, "lineHeight": 1.4 },
      "h4": { "desktop": "20px", "mobile": "16px", "weight": 600, "lineHeight": 1.4 },
      "bodyLarge": { "size": "18px", "mobile": "16px", "weight": 400, "lineHeight": 1.6 },
      "body": { "size": "16px", "mobile": "14px", "weight": 400, "lineHeight": 1.6 },
      "bodySmall": { "size": "14px", "mobile": "13px", "weight": 400, "lineHeight": 1.5 },
      "caption": { "size": "12px", "weight": 500, "lineHeight": 1.4 },
      "button": { "size": "16px", "mobile": "14px", "weight": 600, "lineHeight": 1.5 }
    }
  }
}
```

### Spacing

```json
{
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "12px",
    "lg": "16px",
    "xl": "24px",
    "2xl": "32px",
    "3xl": "48px",
    "4xl": "64px",
    "5xl": "80px",
    "6xl": "96px",
    "sectionPadding": {
      "desktop": "80px",
      "mobile": "40px"
    },
    "containerPadding": {
      "desktop": "30px",
      "mobile": "20px"
    }
  }
}
```

### Shadows

```json
{
  "shadows": {
    "sm": "0 1px 3px rgba(0, 0, 0, 0.08)",
    "md": "0 4px 12px rgba(0, 0, 0, 0.12)",
    "lg": "0 12px 24px rgba(26, 144, 255, 0.12)",
    "xl": "0 20px 40px rgba(26, 144, 255, 0.2)",
    "none": "none"
  }
}
```

### Border Radius

```json
{
  "borderRadius": {
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "full": "9999px"
  }
}
```

### Transitions & Animations

```json
{
  "transitions": {
    "fast": "200ms cubic-bezier(0.4, 0, 0.2, 1)",
    "base": "300ms cubic-bezier(0.4, 0, 0.2, 1)",
    "slow": "400ms cubic-bezier(0.4, 0, 0.2, 1)",
    "bounce": "300ms cubic-bezier(0.34, 1.56, 0.64, 1)"
  }
}
```

### Z-Index Scale

```json
{
  "zIndex": {
    "dropdown": 10,
    "sticky": 20,
    "fixed": 30,
    "modalBackdrop": 40,
    "modal": 50,
    "popover": 60,
    "tooltip": 70,
    "notification": 80
  }
}
```

---

## 2. ATOMIC COMPONENTS

### Button

#### Variants

```
Primary Button:
├── Background: primary-500
├── Text: white
├── Hover: primary-600, scale 1.02
├── Active: primary-700, scale 0.98
├── Disabled: gray-400, opacity 0.5
└── Shadow: md

Secondary Button:
├── Border: 2px primary-500
├── Text: primary-500
├── Background: transparent
├── Hover: primary-50 bg, primary-600 border
├── Active: primary-100 bg
└── Shadow: none

Outline Button:
├── Border: 1px gray-300
├── Text: gray-700
├── Background: transparent
├── Hover: gray-50 bg
└── Disabled: gray-200 border

Ghost Button:
├── Text: primary-500
├── Background: transparent
├── No border
├── Hover: primary-600, underline
└── Shadow: none
```

#### Sizes

```
Large (lg):
├── Height: 50px (desktop), 48px (mobile)
├── Padding: 14px 32px (desktop)
├── Font: button (16px desktop, 14px mobile)
└── Min-width: 160px

Medium (md):
├── Height: 44px
├── Padding: 10px 24px
├── Font: button (14px)
└── Min-width: 120px

Small (sm):
├── Height: 36px
├── Padding: 6px 16px
├── Font: button (12px)
└── Min-width: 80px

Full width:
├── Width: 100%
└── Max-width: none
```

#### States

```
Default:
├── Cursor: pointer
├── Outline: none

Hover:
├── Transform: scale(1.02)
├── Box-shadow: enhanced
└── Duration: 300ms

Focus:
├── Ring: 2px primary-400
├── Offset: 4px
└── Visible: always

Active/Pressed:
├── Transform: scale(0.98)
├── Shadow: reduced
└── Duration: 100ms

Disabled:
├── Opacity: 0.5
├── Cursor: not-allowed
└── No hover effects

Loading:
├── Spinner animation
├── Text: hidden or "Loading..."
└── Pointer-events: none
```

#### HTML

```html
<!-- Primary Button -->
<button class="btn btn-primary btn-lg">
  Começar Agora
</button>

<!-- Secondary Button -->
<button class="btn btn-secondary btn-md">
  Agendar Demo
</button>

<!-- Full Width Button (Mobile) -->
<button class="btn btn-primary btn-lg w-full">
  Enviar
</button>

<!-- Button with Icon -->
<button class="btn btn-primary btn-md gap-2">
  <span>Explorar</span>
  <ChevronRight class="w-4 h-4" />
</button>
```

---

### Input / Text Field

#### States

```
Default:
├── Border: 1px gray-300
├── Background: white
├── Height: 44px (desktop), 40px (mobile)
├── Padding: 12px 16px
├── Font: body (16px desktop, 14px mobile)
└── Border-radius: md

Focus:
├── Border: 2px primary-500
├── Background: primary-50
├── Box-shadow: 0 0 0 3px rgba(26, 144, 255, 0.1)
└── Outline: none

Hover (not focused):
├── Border: 1px gray-400
└── Background: white

Disabled:
├── Border: 1px gray-200
├── Background: gray-50
├── Text: gray-400
├── Cursor: not-allowed

Error:
├── Border: 2px error-500
├── Background: white
├── Box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1)
└── Helper text: error-600 (12px)

Success:
├── Border: 2px success-500
├── Background: white
└── Helper text: success-600
```

#### HTML

```html
<!-- Text Input -->
<div class="form-group">
  <label for="name" class="form-label">Nome</label>
  <input
    id="name"
    type="text"
    class="form-input"
    placeholder="Seu nome completo"
  />
</div>

<!-- Input with Error -->
<div class="form-group">
  <label for="email">Email</label>
  <input
    id="email"
    type="email"
    class="form-input form-input-error"
  />
  <span class="form-error">Email inválido</span>
</div>

<!-- Select Dropdown -->
<select class="form-input">
  <option>Escolha uma opção</option>
  <option>Opção 1</option>
</select>
```

---

### Badge / Pill

#### Variants

```
Primary Badge:
├── Background: primary-100
├── Text: primary-700
├── Padding: 4px 12px
├── Font: 12px, 600 weight
├── Border-radius: full

Secondary Badge:
├── Background: gray-100
├── Text: gray-700

Success Badge:
├── Background: success-50
├── Text: success-700

Warning Badge:
├── Background: warning-50
├── Text: warning-700

Error Badge:
├── Background: error-50
├── Text: error-700
```

#### HTML

```html
<span class="badge badge-primary">Popular</span>
<span class="badge badge-success">✓ Ativo</span>
<span class="badge badge-warning">Pendente</span>
```

---

### Icon

#### Standards

```
Sizes:
├── xs:  16x16px (inline text)
├── sm:  20x20px (buttons, nav)
├── md:  24x24px (headers, feature icons)
├── lg:  32x32px (standalone, prominent)
├── xl:  40x40px (hero, large icons)
└── 2xl: 48x48px (full-width sections)

Colors:
├── Current: inherit from parent
├── Primary: primary-500
├── Gray: gray-600
├── Success: success-500
├── Error: error-500

Implementation:
├── SVG icons (preferred)
├── Inline SVG or <use>
├── Font icons (fallback)
└── Never rasterize (use SVG)
```

#### HTML

```html
<!-- SVG Icon -->
<svg class="icon icon-md" viewBox="0 0 24 24">
  <path d="M..." fill="currentColor" />
</svg>

<!-- Icon with Fallback Color -->
<svg class="icon icon-lg text-primary-500">...</svg>

<!-- Icon in Button -->
<button class="btn btn-sm gap-2">
  <ChevronRight class="icon icon-sm" />
  <span>Next</span>
</button>
```

---

## 3. COMPOSITE COMPONENTS

### Card

#### Variants

```
Default Card:
├── Background: white
├── Border: 1px gray-200
├── Border-radius: lg
├── Padding: 32px (desktop), 20px (mobile)
├── Box-shadow: sm
└── Margin: lg (between cards)

Hoverable Card:
├── All above, plus:
├── Hover: translateY(-4px), shadow-lg
├── Transition: 300ms
└── Cursor: pointer

Flat Card:
├── Background: gray-50
├── Border: none
├── Box-shadow: none

Elevated Card:
├── Box-shadow: lg
├── Border: none
└── Background: white
```

#### HTML

```html
<!-- Feature Card -->
<div class="card">
  <ChartIcon class="icon icon-lg text-primary-500 mb-4" />
  <h3 class="card-title">Veja tudo de uma olhada</h3>
  <p class="card-description">Dashboard que qualquer um entende...</p>
  <a href="#" class="card-link">Explorar →</a>
</div>

<!-- Pricing Card -->
<div class="card pricing-card">
  <span class="badge badge-primary">Popular</span>
  <h3 class="text-2xl font-bold mb-2">Consultoria</h3>
  <div class="text-4xl font-bold text-primary-600 mb-2">
    R$349,90<span class="text-sm text-gray-500">/mês</span>
  </div>
  <ul class="feature-list">
    <li>✓ Tudo acima</li>
    <li>✓ Consultor especialista</li>
  </ul>
  <button class="btn btn-primary w-full">Agendar Demo</button>
</div>
```

---

### Header / Navigation

#### Structure

```
Desktop Header:
├── Height: 64px
├── Position: sticky
├── Content: Logo | Nav Links | CTA Button
├── Padding: 12px 30px
├── Background: white
└── Border-bottom: 1px gray-200

Mobile Header:
├── Height: 56px
├── Content: Logo | Hamburger Menu
├── Padding: 12px 20px
├── Background: white
└── Mobile Menu: off-canvas overlay

Navigation Links:
├── Font: body (14px)
├── Color: gray-700
├── Hover: blue-500, underline
├── Active: blue-500 + underline (2px)
└── Spacing: 24px between items
```

#### HTML

```html
<!-- Desktop Navigation -->
<header class="header sticky-top bg-white border-b">
  <div class="container mx-auto px-6 h-16 flex items-center justify-between">
    <!-- Logo -->
    <a href="/" class="logo">
      <img src="logo.svg" alt="SPFP" class="h-8" />
    </a>

    <!-- Nav Links -->
    <nav class="hidden md:flex gap-8">
      <a href="#home" class="nav-link">Home</a>
      <a href="#features" class="nav-link active">Plataforma</a>
      <a href="#faq" class="nav-link">FAQ</a>
      <a href="#contact" class="nav-link">Contato</a>
    </nav>

    <!-- CTA -->
    <button class="btn btn-primary hidden md:block">Começar Agora</button>

    <!-- Mobile Menu Toggle -->
    <button class="hamburger md:hidden" aria-label="Menu">☰</button>
  </div>
</header>

<!-- Mobile Menu (Off-Canvas) -->
<nav class="mobile-menu fixed inset-0 bg-white z-50 hidden">
  <button class="close-btn absolute top-4 right-4">✕</button>
  <div class="p-6 space-y-4">
    <a href="#" class="block text-lg font-semibold">Home</a>
    <a href="#" class="block text-lg font-semibold">Plataforma</a>
    <a href="#" class="block text-lg font-semibold">FAQ</a>
    <button class="btn btn-primary w-full mt-6">Começar Agora</button>
  </div>
</nav>
```

---

### Accordion / Collapsible

#### Structure

```
Accordion Container:
├── Background: white
├── Border: 1px gray-200
├── Border-radius: md
├── Overflow: hidden

Accordion Item:
├── Header (clickable)
│   ├── Background: gray-50
│   ├── Padding: 20px 24px
│   ├── Display: flex justify-between
│   ├── Cursor: pointer
│   ├── Border-bottom: 1px gray-200
│   └── Hover: gray-100 bg
│
├── Content (expandable)
│   ├── Padding: 24px
│   ├── Background: white
│   ├── Max-height: 0 (closed) → auto (open)
│   ├── Overflow: hidden
│   ├── Transition: 300ms ease-out
│   └── Opacity: 0 → 1

Chevron Icon:
├── Rotation: 0deg (closed) → 180deg (open)
└── Transition: 300ms
```

#### HTML

```html
<div class="accordion">
  <div class="accordion-item">
    <button class="accordion-header">
      <span>Não confio em IA com minhas finanças</span>
      <ChevronDown class="icon icon-sm transition-transform" />
    </button>
    <div class="accordion-content">
      <p>IA recomenda. Você decide. Controle total...</p>
    </div>
  </div>

  <div class="accordion-item">
    <button class="accordion-header">
      <span>Como funciona o setup inicial?</span>
      <ChevronDown class="icon icon-sm transition-transform" />
    </button>
    <div class="accordion-content">
      <p>Leva apenas 5 minutos...</p>
    </div>
  </div>
</div>
```

---

### Carousel / Slider

#### Behavior

```
Auto-play:
├── Interval: 8 seconds
├── Pause on hover (desktop only)
├── NO auto-play on mobile (manual swipe)

Navigation:
├── Desktop: Previous/Next buttons
├── Mobile: Swipe gestures
├── Both: Dot indicators

Scroll Behavior:
├── Snap-to-item (mobile)
├── Smooth scroll (desktop)
├── Fade transitions between slides

Accessibility:
├── ARIA live region
├── Keyboard navigation (arrow keys)
├── Focus management
└── Screen reader support
```

#### HTML

```html
<div class="carousel">
  <!-- Slide Container -->
  <div class="carousel-viewport" role="region" aria-label="Testimonials">
    <div class="carousel-inner">
      <!-- Slides -->
      <div class="carousel-slide">
        <blockquote class="testimonial">
          <p>"Depois do SPFP, finalmente sei..."</p>
          <footer>Lucas Silva, Dono de Agência</footer>
        </blockquote>
      </div>
      <!-- More slides... -->
    </div>
  </div>

  <!-- Controls -->
  <div class="carousel-controls">
    <button class="carousel-btn prev" aria-label="Anterior">←</button>
    <div class="carousel-dots">
      <button class="dot active" aria-label="Slide 1"></button>
      <button class="dot" aria-label="Slide 2"></button>
    </div>
    <button class="carousel-btn next" aria-label="Próximo">→</button>
  </div>
</div>
```

---

### Modal / Dialog

#### Structure

```
Backdrop:
├── Position: fixed
├── Inset: 0 (cover full viewport)
├── Background: rgba(0, 0, 0, 0.5)
├── Z-index: modalBackdrop (40)
└── Animation: fade-in (200ms)

Modal Content:
├── Position: fixed, centered
├── Background: white
├── Border-radius: lg
├── Padding: 40px
├── Width: 90% max-width 500px (mobile)
├── Width: 100% max-width 600px (desktop)
├── Box-shadow: xl
├── Z-index: modal (50)
├── Animation: fade-in + scale-up (300ms)

Close Button:
├── Position: absolute top-4 right-4
├── Icon: X (20x20px)
├── Tap target: 44x44px
└── Hover: gray-600

Interactions:
├── Close on backdrop click (optional)
├── Close on ESC key
├── Focus trap (tab within modal)
└── No body scroll (overflow: hidden)
```

#### HTML

```html
<!-- Modal Backdrop -->
<div class="modal-backdrop fixed inset-0 bg-black/50 z-40" onclick="closeModal()">
  <!-- Modal Content (click doesn't close) -->
  <div class="modal fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-8 max-w-md z-50" onclick="event.stopPropagation()">
    <button class="modal-close absolute top-4 right-4 text-gray-500 hover:text-gray-700">
      ✕
    </button>

    <h2 class="text-2xl font-bold mb-4">Comece Agora</h2>

    <!-- Form content -->
    <form class="space-y-4">
      <div class="form-group">
        <label class="form-label">Nome</label>
        <input type="text" class="form-input" />
      </div>

      <button type="submit" class="btn btn-primary w-full">
        Enviar
      </button>
    </form>
  </div>
</div>
```

---

### Footer

#### Structure

```
Footer Container:
├── Background: gray-800
├── Color: white
├── Padding: 64px 30px 32px (desktop)
├── Padding: 40px 20px (mobile)

Layout (Desktop):
├── 3-column grid
│   ├── Col 1: Logo + Tagline
│   ├── Col 2: Links section
│   └── Col 3: Social icons
├── Divider: 1px gray-700 (top of copyright)
└── Copyright: centered below

Layout (Mobile):
├── Full-width vertical stack
├── All sections stacked
└── Centered alignment

Links:
├── Font: 14px, gray-300
├── Hover: blue-400
├── Spacing: 12px vertical
└── Cursor: pointer
```

#### HTML

```html
<footer class="bg-gray-800 text-white py-16">
  <div class="container mx-auto px-6">
    <!-- Logo Section -->
    <div class="mb-12 md:mb-0">
      <img src="logo-white.svg" alt="SPFP" class="h-6 mb-3" />
      <p class="text-sm text-gray-300">
        Feito com ❤️ para transformar vidas financeiras
      </p>
    </div>

    <!-- Links Section -->
    <div class="space-y-3 mb-8 md:mb-0">
      <h4 class="text-sm font-semibold text-white mb-4">Produto</h4>
      <a href="#" class="text-sm text-gray-300 hover:text-blue-400 block">Home</a>
      <a href="#" class="text-sm text-gray-300 hover:text-blue-400 block">Privacy</a>
      <a href="#" class="text-sm text-gray-300 hover:text-blue-400 block">Terms</a>
    </div>

    <!-- Social Icons -->
    <div class="flex gap-4">
      <a href="#" class="text-gray-300 hover:text-blue-400">
        <LinkedInIcon class="icon icon-sm" />
      </a>
      <a href="#" class="text-gray-300 hover:text-blue-400">
        <InstagramIcon class="icon icon-sm" />
      </a>
    </div>

    <!-- Copyright -->
    <div class="border-t border-gray-700 mt-8 pt-8 text-center text-xs text-gray-500">
      © 2026 SPFP. Todos direitos reservados.
    </div>
  </div>
</footer>
```

---

## 4. PATTERNS & BEHAVIORS

### Forms

```
Best Practices:
├── Label explicitly associated with input
├── Validation on blur (not change)
├── Error message below field
├── Success checkmark after validation
├── Helper text in gray-500
├── Disabled state for processing

Form Group:
├── Margin: xl (24px) between groups
├── Label: 14px 600 weight, gray-800
├── Helper text: 12px, gray-500
├── Error text: 12px, error-600
└── Input: 44px height, consistent padding

Validation:
├── Required field: asterisk (*)
├── Email format validation
├── Password strength indicator
├── Confirm password match
└── Real-time feedback (no annoying red)
```

### Loading States

```
Spinner:
├── Animation: rotate 360° (2s infinite linear)
├── Color: primary-500
├── Size: 20x20px (default), 16x16px (compact)
└── Stroke: 2px

Loading Button:
├── Text: hidden or "Loading..."
├── Spinner: inside button, left side
├── Pointer-events: none
├── Opacity: 0.8
└── Cursor: wait

Loading Skeleton:
├── Color: gray-200
├── Animation: shimmer (1.5s infinite)
├── Border-radius: match actual component
└── Exact shape of loaded content
```

### Error Handling

```
Inline Errors:
├── Color: error-500
├── Icon: ⚠ (12px)
├── Font: 12px, 400 weight
├── Position: below input
└── Animation: shake (300ms)

Toast Notifications:
├── Position: bottom-right (desktop), bottom-center (mobile)
├── Z-index: notification (80)
├── Auto-dismiss: 5 seconds
├── Colors: success (green), error (red), info (blue)
├── Icon: ✓, ✕, ℹ
└── Animation: slide-in + fade-out
```

---

## 5. RESPONSIVE GUIDELINES

### Breakpoint System

```
Mobile-first approach:
├── Base (375px): default styles
├── Tablet (768px): 2 columns, larger spacing
├── Desktop (1024px): full layout, multiple columns
└── Large (1440px+): expanded widths

Common changes per breakpoint:

376px → 768px:
├── Font: +2px headings
├── Padding: +4px
├── Grid: 1 col → 2 col (features)
└── Sidebar: appears

769px → 1024px:
├── Font: +4px headings
├── Grid: 2 col → 3 col
├── Hero buttons: side-by-side
└── Full navigation: visible

1025px → 1440px+:
├── Font: desktop sizes
├── Grid: full layout (4+ columns)
├── Spacing: full scale
└── Container max-width: 1320px
```

### Responsive Images

```
Hero Background:
├── Desktop: 1920x1080 @2x
├── Tablet: 1280x720 @2x
├── Mobile: 750x1334 (portrait)
├── Format: WebP + JPEG fallback
└── Sizes: (min-width: 1024px) 100vw, 100vw

Feature Icons:
├── Desktop: 48x48px SVG
├── Mobile: 40x40px SVG
└── Format: inline SVG

Avatars:
├── Desktop: 56x56px
├── Mobile: 40x40px
└── Format: WebP/PNG
```

---

## 6. ACCESSIBILITY STANDARDS

### WCAG 2.1 AA Compliance

```
Color Contrast:
├── Normal text (14px+): 4.5:1 ratio
├── Large text (18px+ 600wt): 3:1 ratio
├── UI components (borders, outlines): 3:1
└── Graphical objects: 3:1

Focus & Navigation:
├── Focus ring: visible (2px+)
├── Focus order: logical (left-to-right, top-to-bottom)
├── Tab index: avoid (use semantic HTML)
├── Keyboard: accessible without mouse
└── Skip links: "Skip to content"

Semantics:
├── Heading hierarchy: h1 → h2 → h3 (no gaps)
├── Buttons: <button> (not <div> styled as button)
├── Links: <a href> (not onclick)
├── Forms: <label> associated with input
└── Lists: <ul>/<ol> for item lists

Motion & Animation:
├── Respect: prefers-reduced-motion
├── No auto-play: videos, carousels
├── No flashing: < 3 per second
└── Pause controls: on animations

Text Alternatives:
├── Images: alt text (descriptive)
├── Icons: aria-label or title
├── SVG: <title> or aria-labelledby
└── Videos: captions + transcript

Mobile Accessibility:
├── Touch targets: 44x44px minimum
├── Spacing: 8px between targets
├── Text: >= 13px (minimum readable)
├── Labels: visible, not placeholder
└── Error handling: clear, helpful messages
```

### Implementation

```html
<!-- Semantic Header -->
<header role="banner">
  <h1>SPFP Landing Page</h1>
  <nav aria-label="Main navigation">
    <a href="#" aria-current="page">Home</a>
    <a href="#">Features</a>
  </nav>
</header>

<!-- Accessible Button -->
<button type="button" class="btn btn-primary" aria-pressed="false">
  Começar Agora
</button>

<!-- Accessible Form -->
<form>
  <div class="form-group">
    <label for="email">Email <span aria-label="required">*</span></label>
    <input
      id="email"
      type="email"
      required
      aria-describedby="email-help"
    />
    <small id="email-help">Nós nunca compartilhamos seu email.</small>
  </div>
</form>

<!-- Accessible Carousel -->
<div role="region" aria-label="Testimonials" aria-live="polite">
  <div class="carousel-slide"><!-- ... --></div>
  <button aria-label="Previous testimonial">←</button>
  <button aria-label="Next testimonial">→</button>
</div>

<!-- Accessible Modal -->
<div role="dialog" aria-labelledby="modal-title" aria-modal="true">
  <h2 id="modal-title">Comece Agora</h2>
  <!-- Content -->
</div>
```

---

## 7. IMPLEMENTATION GUIDE

### CSS Architecture

```css
/* Design tokens (CSS variables) */
:root {
  --color-primary: #1A90FF;
  --color-primary-600: #0070CC;
  --color-gray-800: #202428;

  --spacing-lg: 1rem;
  --spacing-xl: 1.5rem;

  --transition-base: 300ms cubic-bezier(0.4, 0, 0.2, 1);

  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);
}

/* Component classes */
.btn { /* button base styles */ }
.btn-primary { /* primary variant */ }
.btn-lg { /* large size */ }

.card { /* card base */ }
.card-title { /* title in card */ }

.form-group { /* form field wrapper */ }
.form-input { /* input styling */ }
.form-input-error { /* error state */ }

/* Utilities (minimal) */
.gap-4 { gap: 1rem; }
.p-6 { padding: 1.5rem; }
.w-full { width: 100%; }
.text-center { text-align: center; }
```

### React Component Structure

```typescript
// Button Component
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'w-full' : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner />}
      {!isLoading && props.children}
    </button>
  );
}
```

### Tailwind Configuration

```javascript
// tailwind.config.ts
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0F6FF',
          500: '#1A90FF',
          600: '#0070CC',
        },
      },
      spacing: {
        'section': '80px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
};
```

---

## 8. COMPONENT INVENTORY

### Atomic (20+)

```
✓ Button (4 variants × 3 sizes = 12)
✓ Input / Text Field
✓ Select / Dropdown
✓ Checkbox
✓ Radio Button
✓ Badge / Pill (5 colors)
✓ Icon (20+ icons)
✓ Loading Spinner
✓ Progress Bar
✓ Divider
```

### Composite (15+)

```
✓ Card (5 variants)
✓ Header / Navigation
✓ Hero Section
✓ Features Grid
✓ Pricing Cards
✓ Testimonial Carousel
✓ Accordion / Collapsible
✓ Footer
✓ Modal / Dialog
✓ Toast Notification
✓ Form Group
✓ Feature List
✓ Timeline / Steps
✓ Stats Block
```

---

## 9. HANDOFF CHECKLIST

```
[ ] Design tokens exported (colors, typography, spacing)
[ ] Figma file organized and shared
[ ] Component library documented (20+ components)
[ ] Accessibility guidelines clear (WCAG 2.1 AA)
[ ] Responsive breakpoints defined
[ ] Animation specifications detailed
[ ] Color contrast verified (WebAIM)
[ ] Icons all in SVG format
[ ] Fonts loaded and tested
[ ] Mobile device testing (iOS + Android)
[ ] Lighthouse audit passed (90+)
[ ] CSS architecture documented
[ ] React component patterns defined
[ ] Tailwind config prepared
```

---

**Design System Complete & Ready for Implementation! 🎨**

Next: Frontend Implementation (React + Tailwind)
