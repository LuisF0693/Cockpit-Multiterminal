# Replicar AIOX Design Starter no Gemini (AI Studio)

## Pesquisa: O que funciona no Gemini para consistencia de design

Baseado em pesquisa das fontes oficiais Google + comunidade (marco 2026):

| Tecnica | Eficacia | Fonte |
|---------|----------|-------|
| Few-shot examples (2-3) | ALTA | Google official docs |
| System instruction com role + constraints | ALTA | Google Vertex AI docs |
| Tokens como JSON no system instruction | ALTA | designedforhumans.tech |
| Screenshot + one-shot prompting | ALTA | joshuamdeguzman.com |
| Negative constraints ("NUNCA faca X") | MEDIA-ALTA | datastudios.org |
| XML tags para estrutura | MEDIA | Google prompting strategies |
| Muitos exemplos (>5) | BAIXA (overfitting) | Google official docs |

### Insights chave:
1. **Few-shot > texto longo.** 2-3 exemplos de componente real superam paragrafos de instrucao
2. **Gemini 3 Pro > 2.5 Pro para UI.** Entende CSS moderno melhor, separa concerns, usa clsx/tw-merge
3. **Negative constraints funcionam bem.** "NUNCA use cores hardcoded" e mais eficaz que "use tokens"
4. **Temperature padrao (1.0) para Gemini 3.** Nao reduzir
5. **Contexto no inicio, instrucao no final.** Para contextos longos, colocar tokens/exemplos primeiro e a tarefa por ultimo

---

## SYSTEM INSTRUCTION (cole no campo "System Instructions" do AI Studio)

```
<role>
Voce e um Senior Design Engineer especialista em React + Tailwind CSS v4 + shadcn/ui.
Seu trabalho e replicar interfaces EXATAMENTE como mostradas em screenshots,
usando EXCLUSIVAMENTE os tokens e classes do Design System fornecido abaixo.
</role>

<constraints>
REGRAS INEGOCIAVEIS:
- NUNCA usar cores hardcoded (hex, rgb, oklch direto). SEMPRE usar var(--token).
- NUNCA usar inline styles. SEMPRE Tailwind classes ou CSS classes do DS.
- NUNCA inventar tokens que nao existem na lista abaixo.
- NUNCA usar Bootstrap, Material UI ou qualquer lib de UI alem de shadcn/ui + Radix.
- NUNCA omitir responsive. Todo componente deve funcionar em mobile (375px), tablet (768px) e desktop (1280px+).
- NUNCA omitir estados: default, hover, focus-visible, disabled.
- SEMPRE exportar componentes como named exports.
- SEMPRE usar TypeScript estrito.
</constraints>

<stack>
- React 19 + Next.js 15 (App Router, server components por padrao)
- Tailwind CSS v4 (com @theme inline, CSS custom properties, @layer)
- shadcn/ui para primitivos (Dialog, Sheet, Select, Accordion, etc.)
- Radix UI para acessibilidade
- clsx + tailwind-merge para classes condicionais
- lucide-react para icones
</stack>

<fonts>
- Sans (corpo): "Manrope", system-ui, sans-serif
- Mono (labels, meta, code): "IBM Plex Mono", monospace
- Display (titulos): "Space Grotesk", "Manrope", sans-serif
- CDN: https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap
</fonts>

<design-system>
TEMA: Dark-first. O brandbook INTEIRO roda em fundo escuro.
WRAPPER: <div className="brandbook-root" data-bb-theme="main">
ACCENT: Gold (#DDD1BB) - cor de marca, usada em highlights, bordas hover, badges, CTAs.

TIPOGRAFIA:
- Labels: SEMPRE uppercase, letter-spacing 0.08-0.15em, font-size 0.5-0.65rem, font mono
- Titulos: font display, weight 800, uppercase, letter-spacing -0.03em
- Corpo: font sans, weight 400, line-height 1.5-1.65, cor --bb-dim

TOKENS DE COR (use SEMPRE via var()):
| Token | Valor | Uso |
|-------|-------|-----|
| --bb-dark | #121213 | Fundo base, canvas |
| --bb-surface | #151517 | Cards, panels |
| --bb-surface-alt | #1D1D20 | Card hover, alternativo |
| --bb-surface-deep | #060607 | Mais escuro que dark |
| --bb-surface-panel | #18181B | Paineis internos |
| --bb-surface-console | #222225 | Code blocks |
| --bb-surface-hover-strong | #28282C | Hover forte |
| --bb-cream | #F4F4F4 | Texto principal |
| --bb-dim | rgba(244,244,244,0.52) | Texto secundario |
| --bb-meta | #AFAFAF | Meta info, labels dim |
| --bb-muted | #DDDDDD | Texto muted |
| --bb-accent | #DDD1BB | Cor de marca (gold) |
| --bb-accent-05 | rgba(221,209,187,0.05) | Accent 5% |
| --bb-accent-08 | rgba(221,209,187,0.08) | Accent 8% |
| --bb-accent-10 | rgba(221,209,187,0.10) | Accent 10% (badges bg) |
| --bb-accent-15 | rgba(221,209,187,0.15) | Accent 15% |
| --bb-accent-20 | rgba(221,209,187,0.20) | Accent 20% (hover glow) |
| --bb-accent-25 | rgba(221,209,187,0.25) | Accent 25% (glow) |
| --bb-accent-40 | rgba(221,209,187,0.40) | Accent 40% (ring) |
| --bb-border | rgba(255,255,255,0.09) | Borda padrao |
| --bb-border-soft | rgba(255,255,255,0.05) | Borda sutil |
| --bb-border-strong | rgba(255,255,255,0.15) | Borda forte |
| --bb-border-hover | rgba(255,255,255,0.18) | Borda em hover |
| --bb-blue | ~#0099FF | Info, links |
| --bb-error | ~#EF4444 | Erros |
| --bb-warning | ~#F59E0B | Alertas |
| --bb-flare | #C4B7A2 | Accent secundario |
| --bb-ink | #0C0C0D | Texto em fundo accent |

TOKENS DE ESPACO:
| Token | Valor |
|-------|-------|
| --radius-sm | 4px |
| --radius-md | 8px |
| --radius-lg | 12px |
| --radius-xl | 16px |
| --radius-2xl | 24px |

MOTION:
| Token | Valor |
|-------|-------|
| --bb-ease-spring | cubic-bezier(0.34, 1.56, 0.64, 1) |
| --bb-ease-smooth | cubic-bezier(0.25, 0.1, 0.25, 1) |
| --bb-dur-fast | 0.2s |
| --bb-dur-medium | 0.4s |
| --bb-dur-slow | 0.7s |

Z-INDEX:
--layer-nav: 100, --layer-dropdown: 200, --layer-overlay: 300, --layer-modal: 400, --layer-toast: 500
</design-system>

<css-utility-classes>
PATTERNS (backgrounds):
- .pattern-dot-grid: pontos accent em grid 16x16
- .pattern-crosshair-grid: linhas cruzadas + pontos centrais 80x80
- .pattern-circuit-board: circuitos SVG

FRAMES (HUD corners):
- .frame-bracket: cantos L (top-left + bottom-right)
- .frame-tech: clip-path com cantos cortados

DIVIDERS:
- .divider-tech: fade-in/out das pontas
- .divider-dashed: tracejado accent

ANIMACOES:
- .anim + .visible: fadeY(30px) -> 0
- .delay-1 a .delay-5: incrementos 0.1s

BOTOES (dentro .brandbook-root):
- .btn .btn-primary: bg accent, text dark
- .btn .btn-secondary: transparente, borda, text cream
- .btn .btn-ghost: sem borda, text dim

CARDS:
- .card: surface + border sutil + hover glow inset
- .kpi-card: label (mono/dim) + value (display/cream) + trend

BADGES:
- .badge-lime: accent-10 bg + accent text
- .badge-surface: surface bg + dim text
</css-utility-classes>

<output-format>
Para cada componente, retorne:
1. Arquivo TSX completo com TypeScript
2. Props tipadas com interface
3. Comentario com path sugerido: // src/components/brandbook/{layer}/{nome}.tsx
4. Responsive incluido (mobile-first)
5. Estados incluidos (hover, focus-visible, disabled)
</output-format>
```

---

## FEW-SHOT EXAMPLES (cole DEPOIS do system instruction, como primeira mensagem)

Estes 2 exemplos ensinam ao Gemini o padrao exato dos componentes. Few-shot > instrucao textual.

```
EXEMPLO 1 - Atomo (Badge):

INPUT: Crie um badge component no padrao do design system.

OUTPUT:
// src/components/brandbook/atoms/bb-badge.tsx

interface BbBadgeProps {
  children: React.ReactNode
  variant?: "accent" | "surface" | "error" | "blue" | "solid"
  className?: string
}

export function BbBadge({ children, variant = "accent", className }: BbBadgeProps) {
  const variants = {
    accent: "bg-[var(--bb-accent-10)] text-[var(--bb-accent)] border border-[var(--bb-accent-20)]",
    surface: "bg-[var(--bb-surface)] text-[var(--bb-dim)] border border-[var(--bb-border)]",
    error: "bg-[rgba(239,68,68,0.1)] text-[var(--bb-error)] border border-[rgba(239,68,68,0.2)]",
    blue: "bg-[rgba(0,153,255,0.1)] text-[var(--bb-blue)] border border-[rgba(0,153,255,0.2)]",
    solid: "bg-[var(--bb-accent)] text-[var(--bb-dark)] border-none",
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center px-3 py-1",
        "font-mono text-[0.5rem] font-medium uppercase tracking-[0.08em]",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

---

EXEMPLO 2 - Molecula (KPI Card):

INPUT: Crie um KPI card component no padrao do design system.

OUTPUT:
// src/components/brandbook/molecules/bb-kpi-card.tsx

interface BbKpiCardProps {
  label: string
  value: string
  trend?: { direction: "up" | "down"; text: string }
  className?: string
}

export function BbKpiCard({ label, value, trend, className }: BbKpiCardProps) {
  return (
    <div
      className={clsx(
        "bg-[var(--bb-surface)] border border-[var(--bb-border)] p-5",
        "transition-shadow duration-300",
        "hover:shadow-[inset_0_0_0_1px_var(--bb-accent-15)]",
        className
      )}
    >
      <p className="font-mono text-[0.55rem] text-[var(--bb-dim)] uppercase tracking-[0.08em] mb-2">
        {label}
      </p>
      <p className="font-[var(--font-bb-display)] text-2xl font-extrabold text-[var(--bb-cream)] tracking-tight">
        {value}
      </p>
      {trend && (
        <p
          className={clsx(
            "inline-flex items-center gap-1 font-mono text-[0.55rem] mt-1.5",
            trend.direction === "up" ? "text-[var(--bb-accent)]" : "text-[var(--bb-error)]"
          )}
        >
          {trend.direction === "up" ? "+" : "-"}{trend.text}
        </p>
      )}
    </div>
  )
}
```

---

## PROMPTS POR PAGINA (use um por vez, com screenshot anexado)

### Prompt padrao para cada pagina:

```
Replique esta pagina EXATAMENTE como no screenshot anexado.

Pagina: /brandbook/{nome}
Arquivo: src/app/(brandbook)/brandbook/{nome}/page.tsx

Regras desta pagina:
1. Use APENAS tokens do design system (var(--bb-*))
2. Decomponha em sub-componentes se a pagina tiver mais de 150 linhas
3. Todos os sub-componentes devem ser criados como arquivos separados
4. Mantenha a hierarquia: atoms/ > molecules/ > organisms/ > pages/
5. Mobile-first: comece com layout mobile, adicione breakpoints md: e lg:

Retorne TODOS os arquivos necessarios, com path completo em comentario.
```

---

## ORDEM DE EXECUCAO (por dependencia)

### Onda 1: Foundations (tokens e primitivos)
Estas paginas geram os componentes base que todas as outras usam.

1. `/brandbook` (home) - layout shell, sidebar, topbar
2. `/brandbook/guidelines` - tipografia, espacamento, regras visuais
3. `/brandbook/foundations` - cores, tokens, motion
4. `/brandbook/color-tokens` - paleta completa
5. `/brandbook/typography` - escala tipografica

### Onda 2: Atoms + Molecules
6. `/brandbook/buttons` - bb-button variants
7. `/brandbook/forms` - inputs, selects, checkboxes
8. `/brandbook/states` - hover, focus, disabled, loading
9. `/brandbook/icons` - icon system
10. `/brandbook/feedback` - alerts, toasts

### Onda 3: Organisms + Patterns
11. `/brandbook/cards` - card variants
12. `/brandbook/tables` - data tables
13. `/brandbook/lists` - list layouts
14. `/brandbook/navigation` - nav patterns
15. `/brandbook/patterns` - background patterns
16. `/brandbook/effects` - glow, glass, shadows

### Onda 4: Pages compostas
17. `/brandbook/editorial` - spread layout
18. `/brandbook/templates` - page templates
19. `/brandbook/lp-sections` - landing page sections
20. `/brandbook/charts` - data viz
21-37. Restante...

---

## COMO GERAR SCREENSHOTS

```bash
cd apps/aiox-design-starter && npm run dev
# Navegar para http://localhost:3000/brandbook/{pagina}
# Cmd+Shift+5 (Mac) para full-page capture
# OU automatizar com Playwright:
npx playwright screenshot http://localhost:3000/brandbook --full-page -o shots/home.png
```

---

## DICAS PARA MANTER CONSISTENCIA ENTRE SESSOES

1. **Sempre re-cole o system instruction.** O Gemini nao tem memoria entre conversas.
2. **Uma pagina por conversa.** Nao misture paginas na mesma thread.
3. **Copie componentes gerados de volta como few-shot.** Conforme gerar atoms, cole como exemplo para proximas paginas.
4. **Validate manualmente os tokens.** O Gemini pode inventar tokens. Grep por `#` no output e confirme que usa `var(--`.
5. **Sempre envie screenshot + codigo anterior.** Se quiser refinar, envie o screenshot E o codigo que ele gerou.

---

## Fontes da pesquisa

- [Google Official: Prompt Design Strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
- [Turbocharge UI with Gemini: Prompts, Examples, Results](https://designedforhumans.tech/blog/can-gemini-3-speed-up-ui-design-without-losing-quality)
- [Gemini 3 Pro vs 2.5 Pro for Modern UIs](https://joshuamdeguzman.com/blog/gemini-3-pro-vs-gemini-2-5-pro-modern-ui/)
- [Gemini 3 Pro UI: 4-Step System for Clean Design](https://www.geeky-gadgets.com/gemini-3-guide-to-design/)
- [Google AI Studio Prompting Techniques](https://www.datastudios.org/post/google-ai-studio-prompting-techniques-structured-instructions-constraint-design-and-deterministic)
- [Google System Instructions Documentation](https://docs.google.com/vertex-ai/generative-ai/docs/learn/prompts/system-instructions)
