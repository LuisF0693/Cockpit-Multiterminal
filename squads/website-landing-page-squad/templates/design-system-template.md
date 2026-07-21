# Template: Design System

**Template ID:** design-system-template
**Version:** 1.0
**Purpose:** Standardized design system documentation for landing pages and web properties

## Design System Overview

A design system is a comprehensive set of reusable components, patterns, and guidelines that ensure visual consistency across all landing pages and digital products.

---

## 1. Color System

### Primary Colors
```json
{
  "primary_brand": {
    "hex": "#0052CC",
    "rgb": "rgb(0, 82, 204)",
    "hsl": "hsl(217, 100%, 40%)",
    "usage": "Main brand color, primary CTAs, key headlines"
  },
  "primary_light": {
    "hex": "#E8F0FE",
    "rgb": "rgb(232, 240, 254)",
    "hsl": "hsl(217, 100%, 95%)",
    "usage": "Backgrounds, light accents, disabled states"
  },
  "primary_dark": {
    "hex": "#001B3D",
    "rgb": "rgb(0, 27, 61)",
    "hsl": "hsl(217, 100%, 12%)",
    "usage": "Dark mode, high contrast text"
  }
}
```

### Secondary Colors
```json
{
  "secondary": {
    "hex": "#00B4D8",
    "rgb": "rgb(0, 180, 216)",
    "hsl": "hsl(190, 100%, 42%)",
    "usage": "Secondary actions, accents, hover states"
  }
}
```

### Neutral Colors
```json
{
  "neutral": {
    "gray_100": "#F9FAFB",
    "gray_200": "#F3F4F6",
    "gray_300": "#E5E7EB",
    "gray_400": "#D1D5DB",
    "gray_500": "#9CA3AF",
    "gray_600": "#6B7280",
    "gray_700": "#374151",
    "gray_800": "#1F2937",
    "gray_900": "#111827"
  }
}
```

### Semantic Colors
```json
{
  "success": {
    "hex": "#10B981",
    "usage": "Success states, confirmations, positive actions"
  },
  "warning": {
    "hex": "#F59E0B",
    "usage": "Warnings, cautions, important notices"
  },
  "error": {
    "hex": "#EF4444",
    "usage": "Errors, validation failures, dangerous actions"
  },
  "info": {
    "hex": "#3B82F6",
    "usage": "Information, help text, additional context"
  }
}
```

---

## 2. Typography System

### Font Families
```json
{
  "brand_font": {
    "family": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "fallback": "System fonts",
    "usage": "Headlines, body text, UI elements",
    "weight_support": [400, 500, 600, 700]
  },
  "code_font": {
    "family": "'Courier New', monospace",
    "usage": "Code snippets, technical documentation"
  }
}
```

### Font Sizes & Scales
```json
{
  "scale": {
    "h1": {
      "size": "48px",
      "line_height": "1.2",
      "weight": 700,
      "letter_spacing": "-0.5px",
      "usage": "Hero section headlines"
    },
    "h2": {
      "size": "36px",
      "line_height": "1.25",
      "weight": 700,
      "letter_spacing": "-0.25px",
      "usage": "Section headlines"
    },
    "h3": {
      "size": "24px",
      "line_height": "1.3",
      "weight": 600,
      "usage": "Card titles, feature headers"
    },
    "h4": {
      "size": "18px",
      "line_height": "1.4",
      "weight": 600,
      "usage": "Subsection titles"
    },
    "body_lg": {
      "size": "18px",
      "line_height": "1.6",
      "weight": 400,
      "usage": "Large body text, introductions"
    },
    "body": {
      "size": "16px",
      "line_height": "1.6",
      "weight": 400,
      "usage": "Standard body text, paragraphs"
    },
    "body_sm": {
      "size": "14px",
      "line_height": "1.5",
      "weight": 400,
      "usage": "Small text, captions, metadata"
    },
    "caption": {
      "size": "12px",
      "line_height": "1.4",
      "weight": 500,
      "usage": "Image captions, labels, footnotes"
    }
  }
}
```

---

## 3. Spacing System

### Spacing Scale (Based on 4px unit)
```json
{
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px",
    "2xl": "48px",
    "3xl": "64px",
    "4xl": "80px"
  },
  "usage": {
    "padding_small": "8px 16px (buttons, small elements)",
    "padding_medium": "16px 24px (cards, containers)",
    "padding_large": "24px 32px (sections, panels)",
    "margin_between_sections": "64px - 80px (vertical spacing)",
    "margin_between_elements": "16px - 24px (horizontal spacing)"
  }
}
```

---

## 4. Component Library

### Button Component

**Variants:**
```json
{
  "button": {
    "primary": {
      "background": "#0052CC",
      "text_color": "#FFFFFF",
      "padding": "12px 24px",
      "border_radius": "6px",
      "font_size": "16px",
      "font_weight": 600,
      "min_height": "44px",
      "states": {
        "default": "background: #0052CC",
        "hover": "background: #003DA5, box-shadow: 0 4px 12px rgba(0, 82, 204, 0.15)",
        "active": "background: #0039A6",
        "disabled": "background: #D1D5DB, color: #6B7280, cursor: not-allowed"
      }
    },
    "secondary": {
      "background": "transparent",
      "border": "2px solid #0052CC",
      "text_color": "#0052CC",
      "padding": "10px 22px",
      "states": {
        "hover": "background: #E8F0FE"
      }
    },
    "tertiary": {
      "background": "transparent",
      "text_color": "#0052CC",
      "padding": "12px 24px",
      "states": {
        "hover": "background: #E8F0FE, text-decoration: underline"
      }
    }
  }
}
```

### Card Component

```json
{
  "card": {
    "background": "#FFFFFF",
    "border": "1px solid #E5E7EB",
    "border_radius": "8px",
    "padding": "24px",
    "box_shadow": "0 1px 3px rgba(0, 0, 0, 0.1)",
    "states": {
      "hover": "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), transform: translateY(-2px)",
      "focus": "border: 2px solid #0052CC, outline: none"
    }
  }
}
```

### Input Component

```json
{
  "input": {
    "background": "#FFFFFF",
    "border": "1px solid #D1D5DB",
    "border_radius": "6px",
    "padding": "12px 16px",
    "font_size": "16px",
    "min_height": "44px",
    "states": {
      "focus": "border-color: #0052CC, box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.1)",
      "error": "border-color: #EF4444",
      "disabled": "background: #F9FAFB, color: #9CA3AF, cursor: not-allowed"
    },
    "label": {
      "font_size": "14px",
      "font_weight": 600,
      "color": "#1F2937",
      "margin_bottom": "8px"
    },
    "placeholder": {
      "color": "#9CA3AF",
      "font_style": "normal"
    }
  }
}
```

---

## 5. Layout Patterns

### Container
```json
{
  "container": {
    "desktop": {
      "max_width": "1280px",
      "horizontal_padding": "40px"
    },
    "tablet": {
      "max_width": "100%",
      "horizontal_padding": "24px"
    },
    "mobile": {
      "max_width": "100%",
      "horizontal_padding": "16px"
    }
  }
}
```

### Grid System
```json
{
  "grid": {
    "columns": 12,
    "gap": "24px",
    "breakpoints": {
      "desktop": "12 columns",
      "tablet": "6 columns",
      "mobile": "1 column"
    }
  }
}
```

---

## 6. Shadow System

```json
{
  "shadows": {
    "sm": "0 1px 2px rgba(0, 0, 0, 0.05)",
    "md": "0 4px 6px rgba(0, 0, 0, 0.1)",
    "lg": "0 10px 15px rgba(0, 0, 0, 0.1)",
    "xl": "0 20px 25px rgba(0, 0, 0, 0.15)",
    "inner": "inset 0 2px 4px rgba(0, 0, 0, 0.05)"
  }
}
```

---

## 7. Border Radius

```json
{
  "border_radius": {
    "none": "0px",
    "sm": "4px",
    "md": "6px",
    "lg": "8px",
    "xl": "12px",
    "full": "9999px"
  }
}
```

---

## 8. Animations & Transitions

```json
{
  "transitions": {
    "fast": "150ms ease-in-out",
    "base": "200ms ease-in-out",
    "slow": "300ms ease-in-out"
  },
  "easing": {
    "ease_in": "cubic-bezier(0.4, 0, 1, 1)",
    "ease_out": "cubic-bezier(0, 0, 0.2, 1)",
    "ease_in_out": "cubic-bezier(0.4, 0, 0.2, 1)"
  }
}
```

**Animation Examples:**
- Fade: opacity 200ms ease-in-out
- Slide: transform translateY 200ms ease-in-out
- Scale: transform scale 200ms ease-in-out
- Bounce: custom keyframes with ease-out easing

---

## 9. Responsive Design

### Breakpoints
```json
{
  "breakpoints": {
    "mobile": "max-width: 767px",
    "tablet": "768px - 1023px",
    "desktop": "min-width: 1024px",
    "large": "min-width: 1280px",
    "xl": "min-width: 1920px"
  }
}
```

### Responsive Guidelines
- **Mobile:** Single column, full-width images, large touch targets (44x44px minimum)
- **Tablet:** 2-column layouts where appropriate, adjusted spacing
- **Desktop:** Full layouts, 3-4 columns, optimized spacing

---

## 10. Accessibility Standards

- **Color Contrast:** 4.5:1 for normal text (WCAG AA)
- **Focus Indicator:** Visible focus state on all interactive elements
- **Touch Targets:** Minimum 44x44px for buttons
- **Alt Text:** All images have descriptive alt attributes
- **Semantic HTML:** Proper heading hierarchy, form labels, etc.
- **Keyboard Navigation:** All functionality accessible via keyboard

---

## 11. Icon System

```json
{
  "icons": {
    "size_sm": "16px",
    "size_md": "24px",
    "size_lg": "32px",
    "size_xl": "48px",
    "color": "inherit from text color or specific color",
    "stroke_width": "2px standard"
  }
}
```

---

## 12. Implementation Example

### CSS Variables (Custom Properties)

```css
:root {
  /* Colors */
  --color-primary: #0052CC;
  --color-primary-light: #E8F0FE;
  --color-primary-dark: #001B3D;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-h1: 48px;
  --font-size-h2: 36px;
  --font-size-body: 16px;

  /* Transitions */
  --transition-base: 200ms ease-in-out;
}
```

### Component Usage

```html
<button class="button button--primary">
  Click Me
</button>

<style>
.button {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: 6px;
  font-family: var(--font-family);
  font-size: var(--font-size-body);
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
  min-height: 44px;
}

.button--primary {
  background-color: var(--color-primary);
  color: white;
}

.button--primary:hover {
  background-color: var(--color-primary-dark);
}
</style>
```

---

## 13. Design System Governance

### Adding New Components
1. Design in Figma (add to master library)
2. Document specifications
3. Implement in code
4. Add to component library/storybook
5. Document usage guidelines
6. Get design team approval

### Modifying Components
1. Document proposed change
2. Identify impact (breaking vs non-breaking)
3. Update in all places
4. Version the design system
5. Communicate changes to team

### Deprecating Components
1. Mark as "deprecated"
2. Suggest replacement
3. Allow 2-4 week transition period
4. Remove in next major version

---

## 14. Maintenance & Updates

- **Quarterly Review:** Design team reviews and updates
- **Version Tracking:** Semantic versioning (1.0.0, 1.1.0, 2.0.0)
- **Component Inventory:** Document all components and variants
- **Usage Guidelines:** Clear documentation for each component
- **Change Log:** Track all updates and breaking changes

---

## 15. Tools & Resources

- **Design Tool:** Figma (for design specifications)
- **Component Library:** Storybook (for code components)
- **Documentation:** This template
- **Token Sync:** Design tokens exported to JSON
- **Version Control:** Git for code components

---

## Usage Instructions

1. Customize colors, fonts, and spacing for your brand
2. Add or remove components as needed
3. Document all custom variations
4. Share with design and development teams
5. Keep in sync with design tool (Figma)
6. Update version number when making changes
7. Maintain changelog for team reference
