---
task:
  name: UI Component Design Task
  id: ui-component-design-task
  description: "Design de componentes UI individuais ou biblioteca completa com especificação de estados, variantes e tokens"
  squad: design-expert
  lead_agent: jessica-walsh
  supporting_agents: [josef-muller-brockmann, jony-ive, don-norman, dieter-rams]
  outputs:
    - component-spec.md
    - design-tokens.css
  elicit: true
---

# UI Component Design Task

Design de componentes UI com especificação completa: estados, variantes, tokens de design e animações.

---

## Inputs Necessários

1. **Componente(s)** a criar: Button, Card, Input, Modal, Nav, Table, etc.
2. **Contexto de uso**: onde e como será usado na interface?
3. **Design System existente**: há tokens ou estilos já definidos?
4. **Tom visual**: formal, moderno, minimalista, vibrante?
5. **Breakpoints alvo**: mobile-first ou desktop-first?

---

## Processo por Componente

### Passo 1 — Don Norman: Mapeamento Funcional

Define o propósito e comportamento esperado:

```
Componente: [Nome]
Propósito: [O que o usuário faz com ele?]
Contextos de uso: [Onde aparece na interface?]
Variantes necessárias: [Primary, Secondary, Ghost, Danger, etc.]
Estados obrigatórios: [Default, Hover, Focus, Active, Loading, Success, Error, Disabled]
Acessibilidade: [ARIA role, keyboard interaction, screen reader text]
```

### Passo 2 — Josef Müller-Brockmann: Tokens de Design

Define os valores base do componente:

```css
/* Exemplo: Button tokens */
:root {
  /* Spacing */
  --btn-padding-x-sm:  12px;
  --btn-padding-x-md:  20px;
  --btn-padding-x-lg:  28px;
  --btn-padding-y-sm:   8px;
  --btn-padding-y-md:  12px;
  --btn-padding-y-lg:  16px;

  /* Typography */
  --btn-font-size-sm:  0.875rem;
  --btn-font-size-md:  1rem;
  --btn-font-size-lg:  1.125rem;
  --btn-font-weight:   600;
  --btn-letter-spacing: 0.01em;

  /* Shape */
  --btn-radius-sm:  6px;
  --btn-radius-md:  8px;
  --btn-radius-lg: 10px;

  /* Color variants */
  --btn-primary-bg:      var(--color-primary-600);
  --btn-primary-color:   #ffffff;
  --btn-primary-hover:   var(--color-primary-700);
  --btn-secondary-bg:    transparent;
  --btn-secondary-border: var(--color-primary-600);
  --btn-ghost-bg:        transparent;
}
```

### Passo 3 — Jessica Walsh: Design Visual

Define aparência e variantes visuais:

```
Variante PRIMARY:
  Background: [cor]
  Text: [cor + peso]
  Border: [sim/não, cor, espessura]
  Shadow: [box-shadow]
  Icon: [posição, tamanho]

Variante SECONDARY:
  ...

Variante GHOST:
  ...

Variante DANGER:
  ...
```

### Passo 4 — Jony Ive: Especificação de Interação

Define TODOS os estados com transições:

```css
/* Exemplo: Button states */
.btn {
  transition:
    background-color 200ms ease-out,
    transform 100ms ease-out,
    box-shadow 200ms ease-out,
    opacity 200ms ease-out;
}

/* State: Hover */
.btn:hover {
  background: var(--btn-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

/* State: Focus */
.btn:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 3px;
  transform: none;
}

/* State: Active */
.btn:active {
  transform: scale(0.97) translateY(0);
  transition-duration: 50ms;
}

/* State: Loading */
.btn[data-loading="true"] {
  cursor: wait;
  opacity: 0.7;
  pointer-events: none;
}

/* State: Disabled */
.btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

### Passo 5 — Dieter Rams: Quality Gate

```
Checklist de aprovação do componente:
[ ] Propósito claro — usuário entende o que faz?
[ ] Todos os estados especificados (mínimo 7)?
[ ] Sem elementos decorativos sem função?
[ ] Consistente com outros componentes do sistema?
[ ] Acessível (ARIA, keyboard, contraste)?
[ ] Score Rams: /10 — [APROVADO / PRECISA MELHORAR]
```

---

## Output: Especificação do Componente

```markdown
# Componente: [Nome]

## Visão Geral
[Propósito e contextos de uso]

## Variantes
| Variante | Uso | Visual |
|----------|-----|--------|
| Primary  | CTA principal | ... |
| Secondary | Ação secundária | ... |

## Estados
| Estado | Trigger | Visual | Transition |
|--------|---------|--------|------------|
| Default | — | ... | — |
| Hover | mouse enter | ... | 200ms ease-out |
| Focus | tab / click | ... | outline 2px |
| Active | mouse down | ... | scale(0.97) 50ms |
| Loading | async action | ... | opacity 0.7 |
| Success | completion | ... | color green 200ms |
| Error | validation fail | ... | color red 200ms |
| Disabled | not available | ... | opacity 0.38 |

## Design Tokens
[CSS variables completas]

## Acessibilidade
- ARIA role: [role]
- Keyboard: [Tab, Enter, Space, Escape]
- Screen reader: [aria-label, aria-describedby]
- Contraste: [ratio verificado — WCAG AA/AAA]

## Código de Referência
[CSS/Tailwind implementation]

## Score Dieter Rams: X/10
[Veredicto e observações]
```
