# Design Specification — Landing Page Desktop

**Data:** 2026-02-23
**Projeto:** SPFP - Landing Page `/transforme`
**Estilo:** Moderno & Minimalista
**Cor Primária:** Azul (Confiança, Segurança)
**Breakpoint Base:** 1440px (Desktop)
**Status:** 🎨 Pronto para Prototipagem em Figma

---

## 1. SYSTEM & GRID

### Viewport & Canvas

```
Desktop Breakpoints:
├── Large Desktop: 1920px
├── Desktop: 1440px (BASE - target principal)
├── Medium Desktop: 1280px
└── Tablet: 1024px
```

### Grid System

```
12-column grid with 20px gutter
Container max-width: 1320px (1440 - 60px padding)

Column width: (1320 - 220px gutters) / 12 = 91.67px
Gutter: 20px

Margins:
├── Horizontal: 30px (desktop), 20px (tablet)
└── Vertical: Segue spacing scale
```

---

## 2. COLOR PALETTE

### Primary Colors

```
Brand Blue (Confiança, Segurança):
├── Blue-50:   #F0F6FF (backgrounds, hover states)
├── Blue-100:  #E0ECFF
├── Blue-200:  #B3D9FF
├── Blue-300:  #80C1FF
├── Blue-400:  #4DA8FF
├── Blue-500:  #1A90FF (PRIMARY - main brand color)
├── Blue-600:  #0070CC (hover, darker state)
├── Blue-700:  #004399 (active, pressed)
└── Blue-800:  #002E66 (darkest, rarely used)

Usage:
├── Buttons (primary): Blue-500
├── Links: Blue-500
├── Hover state: Blue-600
├── Focus ring: Blue-400 (20% opacity)
└── Backgrounds: Blue-50 (for sections)
```

### Neutral Colors

```
Grays (Clean, Minimalist):
├── Gray-0:    #FFFFFF (pure white)
├── Gray-50:   #F8F9FA (backgrounds, borders)
├── Gray-100:  #F1F3F5 (light backgrounds)
├── Gray-200:  #E8EAED (borders)
├── Gray-300:  #D7DADD (dividers)
├── Gray-400:  #B9BDC3 (disabled text)
├── Gray-500:  #868B94 (secondary text)
├── Gray-600:  #5A5F66 (body text)
├── Gray-700:  #3E4248 (headings)
├── Gray-800:  #202428 (dark headings)
└── Gray-900:  #000000 (pure black)

Usage:
├── Body text: Gray-600
├── Headings: Gray-800
├── Secondary text: Gray-500
├── Borders: Gray-200
├── Backgrounds: Gray-50
└── Disabled state: Gray-400
```

### Semantic Colors

```
Success (Confirmation, Positive):
├── Success-50:   #E8F5E8
├── Success-500:  #27AE60 (checkmarks)
└── Success-700:  #1E8449

Warning (Alert, Attention):
├── Warning-50:   #FFF3E0
├── Warning-500:  #F39C12
└── Warning-700:  #D68910

Error (Destructive, Danger):
├── Error-50:    #FFEBEE
├── Error-500:   #E74C3C (delete buttons)
└── Error-700:   #C0392B

Info (Helper, Additional):
├── Info-50:     #E3F2FD
├── Info-500:    #2196F3
└── Info-700:    #1565C0
```

### Gradients

```
Primary Gradient (Hero, CTA backgrounds):
├── From: Blue-500 (top-left)
├── To: Blue-600 (bottom-right)
└── Angle: 135°

Background Gradient (Subtle sections):
├── From: Gray-0 (top)
├── To: Blue-50 (bottom)
└── Angle: 180°

Text Gradient (Headlines optional):
├── From: Blue-700
├── To: Blue-500
└── Angle: 90°
```

---

## 3. TYPOGRAPHY

### Font Stack

```
Headings: Inter, -apple-system, BlinkMacSystemFont, sans-serif
Body: Inter, -apple-system, BlinkMacSystemFont, sans-serif
Monospace: 'JetBrains Mono', 'Courier New', monospace

Fallback: System fonts (optimal performance)
```

### Type Scales

```
h1 (Display Heading)
├── Font size: 56px (48px tablet)
├── Font weight: 700 (bold)
├── Line height: 1.2 (67px)
├── Letter spacing: -1px
├── Color: Gray-800
├── Margin: 0 0 24px 0
├── Usage: Hero main headline

h2 (Section Heading)
├── Font size: 40px (32px tablet)
├── Font weight: 700
├── Line height: 1.3 (52px)
├── Letter spacing: -0.5px
├── Color: Gray-800
├── Margin: 0 0 16px 0
├── Usage: Main section titles

h3 (Subsection Heading)
├── Font size: 28px (24px tablet)
├── Font weight: 600
├── Line height: 1.4 (39px)
├── Letter spacing: 0px
├── Color: Gray-700
├── Margin: 0 0 12px 0
├── Usage: Feature titles, card titles

h4 (Small Heading)
├── Font size: 20px (18px tablet)
├── Font weight: 600
├── Line height: 1.4 (28px)
├── Letter spacing: 0px
├── Color: Gray-700
├── Margin: 0 0 8px 0
├── Usage: Form labels, badge titles

Body Large (Lead text)
├── Font size: 18px (16px tablet)
├── Font weight: 400
├── Line height: 1.6 (29px)
├── Letter spacing: 0px
├── Color: Gray-600
├── Usage: Subheadings, hero subtitle, feature descriptions

Body Regular (Default)
├── Font size: 16px (14px tablet)
├── Font weight: 400
├── Line height: 1.6 (26px)
├── Letter spacing: 0px
├── Color: Gray-600
├── Usage: Body paragraphs, list items

Body Small (Helper text)
├── Font size: 14px
├── Font weight: 400
├── Line height: 1.5 (21px)
├── Letter spacing: 0px
├── Color: Gray-500
├── Usage: Captions, helper text, metadata

Caption
├── Font size: 12px
├── Font weight: 500
├── Line height: 1.4 (17px)
├── Letter spacing: 0.5px
├── Color: Gray-500
├── Usage: Labels, badges, timestamps

Button Text
├── Font size: 16px
├── Font weight: 600
├── Line height: 1.5 (24px)
├── Letter spacing: 0.5px
├── Color: White (for dark buttons)
├── Usage: CTA buttons, form submit
```

---

## 4. SPACING SCALE

### Base Unit: 4px

```
Spacing tokens (multiples of 4px):
├── xs:   4px  (minimal spacing)
├── sm:   8px  (small gaps)
├── md:   12px (medium gaps)
├── lg:   16px (standard)
├── xl:   24px (large)
├── 2xl:  32px (extra large)
├── 3xl:  48px (heading spacing)
├── 4xl:  64px (section spacing)
├── 5xl:  80px (major sections)
└── 6xl:  96px (full-screen sections)

Usage:
├── Component padding: lg (16px)
├── Component margin: xl (24px)
├── Section padding: 4xl-5xl (64px-80px)
├── Heading margin: 3xl (48px)
├── Text line spacing: lg-xl (16px-24px)
└── Gap between items: lg (16px)
```

---

## 5. LAYOUT STRUCTURE

### Full Page Layout

```
┌─────────────────────────────────────────┐
│ HEADER (sticky)                         │
├─────────────────────────────────────────┤
│ HERO (min-height: 100vh)                │
├─────────────────────────────────────────┤
│ VALUE PROP (section)                    │
├─────────────────────────────────────────┤
│ FEATURES (grid 4 cols)                  │
├─────────────────────────────────────────┤
│ HOW IT WORKS (3 steps)                  │
├─────────────────────────────────────────┤
│ TESTIMONIALS (carousel)                 │
├─────────────────────────────────────────┤
│ PRICING (2 cards)                       │
├─────────────────────────────────────────┤
│ FAQ (accordion)                         │
├─────────────────────────────────────────┤
│ FINAL CTA (high contrast)               │
├─────────────────────────────────────────┤
│ FOOTER                                  │
└─────────────────────────────────────────┘
```

---

## 6. COMPONENT SPECIFICATIONS

### Header Component

```
Dimensions:
├── Height: 64px
├── Width: 100% (full)
├── Max-width: 1440px
├── Padding: 12px 30px (horizontal)
└── Position: Sticky to top

Layout (12-col grid):
├── Logo (col 1-2): 32x32px SVG, clickable
├── Nav Links (col 4-10):
│   ├── Home (text link)
│   ├── Plataforma (text link)
│   ├── FAQ (text link)
│   └── Contato (text link)
├── CTA Button (col 11-12):
│   ├── Text: "Começar Agora"
│   ├── Style: primary blue
│   ├── Size: medium (40px height)
│   └── Icon: optional arrow

Visual:
├── Background: White (Gray-0)
├── Border-bottom: 1px Gray-200
├── Logo color: Blue-600
├── Nav text color: Gray-700
├── Nav hover: Blue-500
├── Shadow: none (minimal)

Interactions:
├── On scroll > 10px: Subtle shadow appears
├── Nav link underline: 2px Blue-500 (active)
├── Button hover: Blue-600 bg
├── Button focus: Blue-400 ring (2px, 4px offset)
```

### Hero Section

```
Dimensions:
├── Min-height: 100vh (viewport height)
├── Width: 100%
├── Padding: 120px 30px (vertical 120px, horizontal 30px)
└── Position: relative

Layout:
├── Container: centered, max-width 800px
├── Content alignment: center

Background:
├── Video: /landing/hero-video.mp4 (background-size: cover)
├── Fallback image: /landing/hero-fallback.jpg
├── Overlay: Black 60% (top) to 40% (bottom) gradient
│   ├── Color: rgba(0, 0, 0, 0.6) to rgba(0, 0, 0, 0.4)
│   └── Angle: 180deg

Content (centered column):
├── H1 (main headline)
│   ├── Text: "Planeje suas finanças em minutos"
│   ├── Font: 56px, Bold, White
│   ├── Line: 1.2
│   ├── Margin: 0 0 16px 0
│   └── Animation: fade-in + 10px slide up (800ms)
│
├── P (subheadline)
│   ├── Text: "Com inteligência artificial que entende VOCÊ"
│   ├── Font: 18px, Regular, Gray-100 (light gray on dark)
│   ├── Line: 1.6
│   ├── Margin: 0 0 32px 0
│   └── Animation: fade-in + 10px slide up (1000ms, 200ms delay)
│
├── CTA Buttons (flex row, gap 16px, centered)
│   ├── Primary Button
│   │   ├── Text: "Começar com Plataforma"
│   │   ├── Style: Blue-500 bg, white text, rounded 8px
│   │   ├── Size: large (50px height, 220px width)
│   │   ├── Font: 16px bold
│   │   ├── Padding: 14px 32px
│   │   ├── Hover: Blue-600 bg, scale 1.05
│   │   ├── Active: Blue-700 bg, scale 0.98
│   │   └── Shadow: 0 4px 12px rgba(26, 144, 255, 0.3)
│   │
│   └── Secondary Button
│       ├── Text: "Agendar Demo"
│       ├── Style: transparent bg, white border (2px), white text
│       ├── Size: large (50px height, 200px width)
│       ├── Hover: white/10% bg, scale 1.05
│       └── Active: white/20% bg
│
└── Scroll Indicator (bottom center)
    ├── Icon: ChevronDown (24px, white)
    ├── Animation: bounce up-down infinitely (2s loop)
    ├── Position: absolute bottom 40px
    └── Opacity: 0.7

Animations:
├── Headline: fade-in 0.8s ease-out
├── Subheadline: fade-in 0.8s ease-out 0.2s delay
├── Buttons: fade-in 0.8s ease-out 0.4s delay
├── Scroll indicator: keyframe bounce (0.5s cycle, infinite)
```

### Value Prop Section

```
Dimensions:
├── Padding: 80px 30px
├── Background: linear-gradient(180deg, White, Blue-50)
└── Max-width: 1200px

Layout (2 columns):
├── Left column (col 1-5, gap 40px)
│   ├── Title: "O Problema"
│   ├── Icon list (4 items)
│   │   ├── Icon: ✗ (red, 24px)
│   │   ├── Text: "Não sabe para onde vai o dinheiro"
│   │   ├── Color: Gray-600
│   │   ├── Margin: 0 0 16px 0
│   │   └── Icon + text horizontal alignment
│   └── List spacing: 20px gap
│
└── Right column (col 8-12, gap 40px)
    ├── Title: "A Solução"
    ├── Icon list (4 items)
    │   ├── Icon: ✓ (green, 24px)
    │   ├── Text: "Dashboard que qualquer um entende"
    │   ├── Color: Gray-600
    │   └── Icon + text horizontal alignment
    └── List spacing: 20px gap

Typography:
├── Section titles (h2): Gray-800, margin 0 0 48px 0
├── List text: Gray-600, 16px
└── Divider line: 1px Gray-300, vertical between columns

Interactive:
├── Icons fade-in on scroll
├── Stagger animation (100ms between items)
└── Hover: text color → Blue-600
```

### Features Section

```
Dimensions:
├── Padding: 80px 30px
├── Background: Gray-0 (white)
└── Max-width: 1320px

Layout (4-column grid):
├── Grid: 12 columns, 20px gap
├── Feature cards: 3 columns width each (+ gutter = 4 effective)
└── Total: 4 cards in 1 row

Feature Card Spec:
├── Background: Gray-0 (white)
├── Border: 1px Gray-200
├── Padding: 32px
├── Border-radius: 12px
├── Height: auto (content-based)
├── Box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) (subtle)
│
├── Content:
│   ├── Icon (48x48px, Blue-500)
│   │   ├── Margin: 0 0 16px 0
│   │   └── Icons: Chart, Brain, Users, Document
│   │
│   ├── Title (h3)
│   │   ├── Text: "Veja tudo de uma olhada"
│   │   ├── Font: 20px Bold, Gray-800
│   │   └── Margin: 0 0 12px 0
│   │
│   ├── Description (body)
│   │   ├── Text: "Dashboard visual que qualquer um entende..."
│   │   ├── Font: 16px Regular, Gray-600
│   │   ├── Line-height: 1.6
│   │   └── Margin: 0 0 16px 0
│   │
│   └── Link
│       ├── Text: "Explorar →"
│       ├── Color: Blue-500
│       ├── Font: 14px, 600 weight
│       └── Hover: Blue-600, underline
│
├── Hover effect:
│   ├── Transform: translateY(-4px)
│   ├── Box-shadow: 0 12px 24px rgba(26, 144, 255, 0.12)
│   ├── Transition: 300ms ease-out
│   └── Icon color: Blue-600
│
└── Animations:
    ├── Cards fade-in on scroll
    ├── Stagger: 100ms between cards
    └── Duration: 600ms

Section Header:
├── Title (h2): "Tudo Que Você Precisa"
├── Subtitle (body): "Todos os recursos para transformar suas finanças"
├── Title margin: 0 0 48px 0
├── Subtitle margin: 0 0 32px 0
└── Text-align: center
```

### Pricing Section

```
Dimensions:
├── Padding: 80px 30px
├── Background: Blue-50 (light blue)
└── Max-width: 1200px

Layout (2-column grid):
├── Grid: 2 equal columns
├── Gap: 32px
└── Each card takes 50% width

Pricing Card Spec:
├── Background: White
├── Border: 2px solid (Gray-200 for left, Blue-500 for right = "Popular")
├── Padding: 48px
├── Border-radius: 16px
├── Box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08)
│
├── Content:
│   ├── Badge ("POPULAR" on right card)
│   │   ├── Text: "POPULAR"
│   │   ├── Font: 12px, 600 weight, uppercase
│   │   ├── Background: Blue-500
│   │   ├── Color: White
│   │   ├── Padding: 6px 12px
│   │   ├── Border-radius: 20px
│   │   └── Position: absolute top-8, right-8
│   │
│   ├── Plan name (h3)
│   │   ├── Text: "Plataforma + IA" or "Consultoria"
│   │   ├── Font: 28px, 600, Gray-800
│   │   └── Margin: 0 0 16px 0
│   │
│   ├── Price (display)
│   │   ├── Text: "R$99,90" or "R$349,90"
│   │   ├── Font: 48px, 700, Blue-600 (or Gray-800 for non-popular)
│   │   ├── Margin: 0 0 8px 0
│   │   └── Per month: "12px, Gray-500 /mês"
│   │
│   ├── Feature list
│   │   ├── Items: 5 features max
│   │   ├── Format: ✓ Text
│   │   ├── Icon: 16px checkmark, Green-500
│   │   ├── Text: 16px, Gray-600
│   │   ├── Line-height: 1.6
│   │   ├── Margin: 0 0 12px 0
│   │   └── List margin: 0 0 32px 0
│   │
│   └── CTA Button
│       ├── Width: 100%
│       ├── Height: 50px
│       ├── Font: 16px, 600
│       ├── Left card: secondary (outline Blue-500)
│       ├── Right card: primary (Blue-500 bg)
│       ├── Border-radius: 8px
│       ├── Hover: darker color, scale 1.02
│       └── Active: scale 0.98
│
└── Right card (Popular):
    ├── Transform: scale(1.05) or translateY(-8px)
    ├── Box-shadow: 0 20px 40px rgba(26, 144, 255, 0.2)
    └── Border color: Blue-500

Section Header:
├── Title (h2): "Escolha Seu Plano"
├── Subtitle: "Sem contrato. Cancele quando quiser."
├── Margin: 0 0 48px 0
└── Text-align: center

Trust message (below cards):
├── Text: "⚡ Sem contrato | Cancelamento fácil | Garantia 7 dias"
├── Font: 14px, Gray-600
├── Text-align: center
└── Margin: 32px 0 0 0
```

### FAQ Section

```
Dimensions:
├── Padding: 80px 30px
├── Background: Gray-0 (white)
└── Max-width: 900px

Accordion Spec:
├── Background: Gray-0
├── Border: 1px Gray-200
├── Border-radius: 8px
├── Margin: 0 0 12px 0 (between items)

Accordion Item:
├── Header (clickable)
│   ├── Padding: 20px 24px
│   ├── Background: Gray-50
│   ├── Border-bottom: 1px Gray-200
│   ├── Cursor: pointer
│   ├── Display: flex justify-between
│   ├── Hover: Gray-100 bg
│   │
│   ├── Left (question)
│   │   ├── Font: 16px, 600, Gray-800
│   │   ├── Flex: 1
│   │   └── Margin: 0
│   │
│   └── Right (chevron icon)
│       ├── Icon: ChevronDown (20px)
│       ├── Color: Gray-600
│       ├── Transition: rotate 300ms
│       ├── Rotate: 0deg (closed)
│       └── Rotate: 180deg (open)
│
├── Content (expandable)
│   ├── Padding: 24px
│   ├── Font: 16px, 400, Gray-600
│   ├── Line-height: 1.6
│   ├── Background: Gray-0
│   ├── Max-height: 0 (closed) → auto (open)
│   ├── Overflow: hidden
│   ├── Transition: max-height 300ms ease-out, opacity 300ms
│   └── Opacity: 0 (closed) → 1 (open)

Questions (6 items total):
├── 1. "Não confio em IA com minhas finanças"
├── 2. "Como funciona o setup inicial?"
├── 3. "E se quiser cancelar?"
├── 4. "Qual é a diferença entre os planos?"
├── 5. "Meus dados são seguros?"
└── 6. "Posso usar sem cartão de crédito?"

Section Header:
├── Title (h2): "Perguntas Frequentes"
├── Margin: 0 0 48px 0
└── Text-align: center

Support CTA (below FAQ):
├── Text: "Ainda tem dúvidas? [Chat ao Vivo →]"
├── Font: 16px, Gray-600
├── Link color: Blue-500, underline on hover
├── Margin: 48px 0 0 0
└── Text-align: center
```

### Footer

```
Dimensions:
├── Padding: 64px 30px 32px
├── Background: Gray-800 (dark)
├── Color: white text
└── Max-width: 1320px

Layout (grid):
├── Top section (3 columns)
│   ├── Col 1: Logo + tagline
│   ├── Col 2: Links section
│   └── Col 3: Social icons
│
└── Bottom section (full width)
    ├── Divider: 1px Gray-700 (top)
    ├── Copyright text
    └── Padding: 32px 0 0 0

Logo & Tagline:
├── Logo: 24x24px white
├── Tagline: "Feito com ❤️ para transformar vidas financeiras"
├── Font: 14px, Gray-300
└── Margin: 12px 0 0 0

Links Section:
├── Title (h4): "Produto"
├── Links:
│   ├── Home (text link, Gray-300, hover Blue-400)
│   ├── Privacy (text link)
│   ├── Terms (text link)
│   └── Contact (text link)
├── Font: 14px, Gray-300
└── Link spacing: 12px between items

Social Icons:
├── LinkedIn (icon, 20x20px)
├── Instagram (icon, 20x20px)
├── Twitter (icon, 20x20px)
├── Gap: 16px
├── Hover: color Blue-400
└── Cursor: pointer

Copyright:
├── Text: "© 2026 SPFP. Todos direitos reservados."
├── Font: 12px, Gray-500
├── Text-align: center
└── Margin: 32px 0 0 0
```

---

## 7. INTERACTIVE STATES

### Button States

```
Primary Button (Blue-500):
├── Default: Blue-500 bg, white text
├── Hover: Blue-600 bg, scale 1.02, shadow 0 8px 16px rgba(26,144,255,0.3)
├── Active/Pressed: Blue-700 bg, scale 0.98
├── Focus: Blue-400 ring (2px, 4px offset), Blue-500 bg
├── Disabled: Gray-400 bg, Gray-300 text, opacity 0.5, cursor not-allowed
├── Loading: spinner animation, text hidden
└── Transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1)

Secondary Button (outline):
├── Default: transparent bg, Blue-500 border (2px), Blue-500 text
├── Hover: Blue-50 bg, Blue-600 border, Blue-600 text
├── Active: Blue-100 bg, Blue-700 border
├── Focus: Blue-400 ring
├── Disabled: Gray-300 border, Gray-400 text
└── Transition: all 300ms ease-out

Link (inline):
├── Default: Blue-500 text, no underline
├── Hover: Blue-600 text, underline
├── Active: Blue-700 text
├── Focus: Blue-400 ring around link
└── Visited: Purple-600 (optional)
```

### Form Input States

```
Text Input / Select:
├── Default:
│   ├── Border: 1px Gray-300
│   ├── Background: White
│   ├── Text color: Gray-800
│   └── Padding: 12px 16px
│
├── Focus:
│   ├── Border: 2px Blue-500
│   ├── Background: Blue-50
│   ├── Box-shadow: 0 0 0 3px rgba(26, 144, 255, 0.1)
│   └── Outline: none
│
├── Hover (not focused):
│   ├── Border: 1px Gray-400
│   └── Background: white
│
├── Disabled:
│   ├── Border: 1px Gray-200
│   ├── Background: Gray-50
│   ├── Text: Gray-400
│   └── Cursor: not-allowed
│
├── Error:
│   ├── Border: 2px Error-500
│   ├── Background: white
│   ├── Box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1)
│   └── Helper text: 12px Error-600
│
└── Success:
    ├── Border: 2px Success-500
    ├── Background: white
    └── Helper text: 12px Success-600
```

### Card Hover Effects

```
Feature cards:
├── Transform: translateY(-4px)
├── Box-shadow: 0 12px 24px rgba(26, 144, 255, 0.12)
├── Transition: 300ms cubic-bezier(0.4, 0, 0.2, 1)
└── Icon color: Blue-600

Pricing cards:
├── Transform: none (already scaled)
├── Box-shadow: 0 20px 40px rgba(26, 144, 255, 0.2) (Popular)
└── Transition: 300ms ease-out

Testimonial cards:
├── Transform: none
├── Opacity: subtle increase on hover
└── Border color: Blue-200 (optional highlight)
```

---

## 8. ANIMATIONS & TRANSITIONS

### Page Load Animations

```
Hero section:
├── Headline: fade-in + slide-up (10px) over 800ms
├── Subheadline: fade-in + slide-up (10px) over 800ms, 200ms delay
├── Buttons: fade-in + slide-up (10px) over 800ms, 400ms delay
├── Easing: cubic-bezier(0.4, 0, 0.2, 1) [ease-out]

Scroll animations (trigger at ~20% before viewport):
├── Feature cards: fade-in + slide-up, stagger 100ms
├── Value prop items: fade-in + slide-up, stagger 100ms
├── Testimonial carousel: fade-in
├── Pricing cards: fade-in + scale
├── FAQ items: fade-in (appears when viewport)

All scroll animations:
├── Duration: 600ms
├── Easing: cubic-bezier(0.34, 1.56, 0.64, 1) [ease-out-back]
└── Stagger: 100ms between elements
```

### Interactive Animations

```
Button interactions:
├── Hover transform: scale(1.02) + shadow increase
├── Active transform: scale(0.98) + shadow decrease
├── Click ripple: optional (subtle expand + fade)
├── Transition duration: 300ms cubic-bezier(0.4, 0, 0.2, 1)

Accordion expand/collapse:
├── Max-height: 0 → auto
├── Opacity: 0 → 1
├── Chevron: rotate(0deg) → rotate(180deg)
├── Duration: 300ms ease-out

Carousel transitions:
├── Slides fade + slide (30px offset)
├── Duration: 400ms ease-out
├── Auto-play: 8 seconds
├── Pause on hover

Link hover:
├── Color transition: 200ms ease-out
├── Underline animation: expand from left

Form interactions:
├── Focus ring: appears with 200ms ease-in
├── Error shake: subtle shake animation (300ms)
│   └── keyframes: 0% (0), 25% (-4px), 75% (4px), 100% (0)
├── Success checkmark: scale-in bounce (300ms)
```

---

## 9. BREAKPOINT-SPECIFIC CHANGES

### Desktop (1440px+) - BASE SPEC ABOVE

### Large Desktop (1920px)

```
Changes from 1440px:
├── Container max-width: 1560px (vs 1320px)
├── Horizontal padding: 40px (vs 30px)
├── Section spacing: 96px (vs 80px)
├── Heading size h1: 64px (vs 56px)
├── Heading size h2: 48px (vs 40px)
├── Feature grid: still 4 columns
└── Card padding: 40px (vs 32px)
```

### Medium Desktop (1280px)

```
Changes from 1440px:
├── Container max-width: 1200px (vs 1320px)
├── Heading size h1: 48px (vs 56px)
├── Heading size h2: 36px (vs 40px)
├── Feature grid: 3 columns (vs 4)
├── Pricing: side-by-side (still 2 cols)
├── Section padding: 64px (vs 80px)
├── Card padding: 28px (vs 32px)
└── Gap between cards: 16px (vs 20px)
```

### Tablet (1024px)

```
Changes from 1440px:
├── Container max-width: 90%
├── Horizontal padding: 24px (vs 30px)
├── Heading size h1: 40px (vs 56px)
├── Heading size h2: 28px (vs 40px)
├── Feature grid: 2 columns (vs 4)
├── Pricing: stack vertically (1 column)
├── Value prop: stack vertically (1 column)
├── Hero buttons: stack vertically
├── Section padding: 48px (vs 80px)
└── All spacing: reduced by ~20%
```

---

## 10. DESIGN TOKENS (JSON Export)

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
      "success": "#27AE60",
      "warning": "#F39C12",
      "error": "#E74C3C",
      "info": "#2196F3"
    }
  },
  "typography": {
    "h1": {
      "fontSize": "56px",
      "fontWeight": 700,
      "lineHeight": 1.2,
      "letterSpacing": "-1px"
    },
    "h2": {
      "fontSize": "40px",
      "fontWeight": 700,
      "lineHeight": 1.3,
      "letterSpacing": "-0.5px"
    },
    "body": {
      "fontSize": "16px",
      "fontWeight": 400,
      "lineHeight": 1.6,
      "letterSpacing": "0px"
    }
  },
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
    "6xl": "96px"
  },
  "shadows": {
    "sm": "0 1px 3px rgba(0, 0, 0, 0.08)",
    "md": "0 4px 12px rgba(0, 0, 0, 0.12)",
    "lg": "0 12px 24px rgba(26, 144, 255, 0.12)",
    "xl": "0 20px 40px rgba(26, 144, 255, 0.2)"
  },
  "borderRadius": {
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "full": "9999px"
  },
  "transitions": {
    "fast": "200ms cubic-bezier(0.4, 0, 0.2, 1)",
    "base": "300ms cubic-bezier(0.4, 0, 0.2, 1)",
    "slow": "400ms cubic-bezier(0.4, 0, 0.2, 1)"
  }
}
```

---

## 11. NEXT STEPS

### For Figma Prototyping:

1. **Create Artboards** for each breakpoint (1920, 1440, 1280, 1024)
2. **Set up Grid/Guides** (12 columns, 20px gutter)
3. **Create Color Styles** with all palette colors
4. **Create Text Styles** for all typography levels
5. **Design Components** (Button, Card, Input, etc.) with variants
6. **Build Sections** following layout specifications
7. **Add Hover/Active states** in separate frames or overlays
8. **Create Animations** prototypes showing transitions
9. **Document** with annotations and specs
10. **Export** component library for developers

### For Frontend Implementation:

- Convert design tokens to CSS variables
- Create component library in React/Tailwind
- Implement responsive breakpoints
- Add interactions with Framer Motion
- Integrate with Stripe & forms
- Deploy and monitor

---

**Especificação pronta para prototipagem em Figma!**

Próxima etapa: Criar protótipos desktop em Figma (fora do escopo deste documento, mas pode-se usar qualquer ferramenta de design: Figma, Adobe XD, Sketch, etc.)
