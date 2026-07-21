# Glass Effects Guide — Glassmorphism e Liquid Glass

> Guia prático de implementação de efeitos glass em CSS.
> Cobre desde glassmorphism básico até Liquid Glass (Apple WWDC 2025).
> Todos os agentes do design squad consultam este guia ao gerar componentes com surface "glass".

## Quando Usar

| Contexto | Nível Recomendado | Motivo |
|----------|-------------------|--------|
| Landing page comercial | Básico ou Premium | Cross-browser, performance |
| Dashboard/app interno | Premium | Visual premium, browsers controlados |
| Portfolio/experimental | Liquid Glass | Efeito WOW, Chrome-first OK |
| E-commerce | Básico | Performance crítica, acessibilidade |
| Mobile-first | Básico | GPU limitada em devices antigos |

## Níveis de Implementação

### Nível 1: Glassmorphism Básico

4 propriedades essenciais. Suporte ~97% browsers.

```css
.glass {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.2);
}
```

**Tailwind equivalente:**
```html
<div class="backdrop-blur-lg bg-white/15 border border-white/20 rounded-xl shadow-lg">
```

### Nível 2: Glass Premium (com luz e profundidade)

Adiciona saturação, inset shadow e gradiente de luz no topo.

```css
.glass-premium {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(31, 38, 135, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  position: relative;
}

/* Gradiente de luz no topo */
.glass-premium::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.2) 0%,
    rgba(255, 255, 255, 0) 50%
  );
  pointer-events: none;
}
```

**Tailwind equivalente:**
```html
<div class="relative backdrop-blur-xl backdrop-saturate-150 bg-white/15
            border border-white/30 rounded-2xl
            shadow-[0_8px_32px_rgba(31,38,135,0.2),inset_0_1px_0_rgba(255,255,255,0.4)]">
  <!-- pseudo-elemento via before: plugin ou classe customizada -->
</div>
```

### Nível 3: Liquid Glass (Apple WWDC 2025)

Adiciona refração (distorção do fundo) e reflexo interno via pseudo-elementos.

```css
.liquid-glass {
  position: relative;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(2px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 2rem;
  box-shadow:
    0 8px 32px rgba(31, 38, 135, 0.2),
    inset 0 4px 20px rgba(255, 255, 255, 0.3);
}

/* Reflexo/shine interno */
.liquid-glass::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2rem;
  backdrop-filter: blur(1px);
  box-shadow:
    inset -10px -8px 0px -11px rgba(255, 255, 255, 1),
    inset 0px -9px 0px -8px rgba(255, 255, 255, 1);
  opacity: 0.6;
  z-index: -1;
  filter: blur(1px) drop-shadow(10px 4px 6px black) brightness(115%);
}
```

### Nível 3b: Refração com SVG Filters (Chrome only)

Para distorção real tipo lente. Usar apenas em projetos onde Chrome é o browser principal.

```html
<svg style="position:absolute; width:0; height:0;">
  <filter id="liquidGlass">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.05"
      numOctaves="3"
      result="noise"
    />
    <feDisplacementMap
      in="SourceGraphic"
      in2="noise"
      scale="5"
      xChannelSelector="R"
      yChannelSelector="G"
    />
  </filter>
</svg>
```

```css
.liquid-refraction {
  backdrop-filter: url(#liquidGlass) blur(10px);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
}
```

**Limitação:** `backdrop-filter` com SVG filters funciona **apenas no Chrome**. Sempre fornecer fallback.

## Técnicas Avançadas de Borda

A borda é o elemento que mais diferencia um glass genérico de um glass premium.
As 4 técnicas abaixo simulam como luz real interage com bordas de vidro.

### Técnica 1: Gradient Border (light catch)

Borda que brilha no canto superior-esquerdo e desvanece no inferior-direito,
simulando uma fonte de luz incidindo sobre a borda do vidro.
Usa pseudo-elemento com `background` gradiente + `mask` para recortar o interior.

```css
.glass-gradient-border {
  position: relative;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: none; /* borda controlada pelo pseudo-elemento */
}

.glass-gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1px; /* espessura da borda */
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 255, 255, 0.15) 40%,
    rgba(255, 255, 255, 0.05) 100%
  );
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
  pointer-events: none;
}
```

**Tailwind equivalente (via classe customizada):**
```html
<div class="relative backdrop-blur-xl bg-white/[0.08] rounded-2xl glass-gradient-border">
```

**Quando usar:** Cards, modais, painéis sobre fundo escuro. Efeito mais sofisticado que borda uniforme.

### Técnica 2: Borda Parcial / Seletiva

Borda visível apenas em certos cantos ou segmentos, criando um efeito de
"moldura incompleta" que sugere vidro sem delimitar totalmente o container.

```css
.glass-partial-border {
  position: relative;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  border: none;
}

/* Canto superior-esquerdo */
.glass-partial-border::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 60%;
  height: 60%;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  border-left: 1px solid rgba(255, 255, 255, 0.3);
  border-top-left-radius: 16px;
  mask-image: linear-gradient(135deg, white 50%, transparent 100%);
  -webkit-mask-image: linear-gradient(135deg, white 50%, transparent 100%);
  pointer-events: none;
}

/* Canto inferior-direito */
.glass-partial-border::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 60%;
  height: 60%;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  border-bottom-right-radius: 16px;
  mask-image: linear-gradient(315deg, white 50%, transparent 100%);
  -webkit-mask-image: linear-gradient(315deg, white 50%, transparent 100%);
  pointer-events: none;
}
```

**Quando usar:** Hero sections, cards grandes, containers editoriais. Transmite elegância e leveza.

### Técnica 3: Top-Edge Highlight (refração de luz no topo)

Borda uniforme fina com brilho concentrado no topo, simulando luz refratada
na aresta superior do vidro. O efeito mais comum em glassmorphism de alta qualidade.

```css
.glass-top-highlight {
  position: relative;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-top-highlight::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.08) 30%,
    rgba(255, 255, 255, 0.05) 100%
  );
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
  pointer-events: none;
}
```

**Variante com inset shadow (mais simples, sem pseudo-elemento):**
```css
.glass-top-highlight-simple {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
    0 8px 32px rgba(0, 0, 0, 0.3);
}
```

**Tailwind (variante simples):**
```html
<div class="backdrop-blur-xl bg-white/[0.08] rounded-2xl
            border border-white/[0.08]
            shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_8px_32px_rgba(0,0,0,0.3)]">
```

**Quando usar:** Qualquer card glass sobre fundo escuro. É o efeito mais versátil e seguro.

### Técnica 4: Border Glow (borda luminosa)

Borda com glow colorido que emana para fora, criando uma aura ao redor do container.
Funciona melhor com a cor de accent da marca.

```css
.glass-border-glow {
  position: relative;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow:
    0 0 15px rgba(255, 255, 255, 0.05),
    0 0 30px rgba(255, 255, 255, 0.03);
}

/* Variante com cor de accent (ex: verde) */
.glass-border-glow-accent {
  border: 1px solid rgba(52, 211, 153, 0.3);
  box-shadow:
    0 0 15px rgba(52, 211, 153, 0.1),
    0 0 30px rgba(52, 211, 153, 0.05);
}
```

**Tailwind:**
```html
<div class="backdrop-blur-xl bg-white/[0.06] rounded-2xl
            border border-white/15
            shadow-[0_0_15px_rgba(255,255,255,0.05),0_0_30px_rgba(255,255,255,0.03)]">
```

**Quando usar:** CTAs, cards em destaque, elementos com cor de marca. Usar com moderação (1 por viewport).

### Guia de Seleção de Borda

| Contexto | Técnica | Motivo |
|----------|---------|--------|
| Card genérico sobre fundo escuro | Top-Edge Highlight | Versátil, cross-browser, sutil |
| Modal premium | Gradient Border | Simula luz real, alto impacto visual |
| Hero/editorial | Borda Parcial | Elegante, não "aprisiona" o conteúdo |
| Card de destaque/CTA | Border Glow | Chama atenção sem agressividade |
| Dashboard/data-dense | Borda simples uniforme | Performance, clareza funcional |

## Parâmetros de Referência

### Blur

| Valor | Efeito | Performance |
|-------|--------|-------------|
| 4-8px | Sutil, quase transparente | Excelente |
| 8-15px | Fosco clássico (recomendado) | Boa |
| 15-20px | Fosco pesado | Aceitável |
| >20px | Muito pesado | Ruim (evitar) |

### Background Alpha

| Tema | Alpha recomendado | Exemplo |
|------|-------------------|---------|
| Claro sobre gradiente | 0.10-0.25 | `rgba(255,255,255,0.15)` |
| Escuro sobre gradiente | 0.15-0.30 | `rgba(0,0,0,0.20)` |
| Escuro sobre imagem | 0.20-0.40 | `rgba(0,0,0,0.30)` |

### Border Alpha

| Nível | Alpha | Visual |
|-------|-------|--------|
| Sutil | 0.10-0.18 | Quase invisível |
| Padrão | 0.18-0.30 | Visível sem dominar |
| Forte | 0.30-0.80 | Liquid Glass style |

Para bordas não-uniformes (gradient, parcial, glow), ver seção "Técnicas Avançadas de Borda" acima.

## Técnica Avançada: Extended Blur

Resolve o problema de blur cortado nas bordas (útil para sticky headers).

```css
.backdrop-extended {
  position: absolute;
  inset: 0;
  height: 200%;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  mask-image: linear-gradient(to bottom, black 0% 50%, transparent 50% 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 0% 50%, transparent 50% 100%);
  pointer-events: none;
}
```

**Como funciona:** `height: 200%` captura pixels além da borda no cálculo do blur. O `mask-image` esconde o overflow.

## Fallback Pattern (Obrigatório)

```css
/* Fallback: fundo sólido para browsers sem suporte */
.glass {
  background: rgba(30, 30, 60, 0.95);
}

/* Enhancement progressivo */
@supports (backdrop-filter: blur(10px)) {
  .glass {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
}
```

## Acessibilidade

| Regra | Valor | Motivo |
|-------|-------|--------|
| Contraste texto normal | >= 4.5:1 | WCAG AA |
| Contraste texto grande | >= 3:1 | WCAG AA |
| Se blur reduz contraste | Aumentar alpha para 0.3-0.4 | Legibilidade |
| Text-shadow de suporte | `0 1px 2px rgba(0,0,0,0.3)` | Melhora leitura sobre glass |
| Limite de elementos glass | 2-3 por viewport | Performance + cognitive load |

## Performance

- `backdrop-filter` é GPU-intensive. Usar `transform: translateZ(0)` para hardware acceleration
- Evitar blur em áreas grandes (>50% do viewport)
- Limitar a 2-3 elementos glass simultâneos
- Testar em dispositivos mobile antigos
- Animações de blur: preferir transição de opacity sobre o elemento glass, não do blur value

## Geradores Online

| Ferramenta | Destaque |
|------------|----------|
| ui.glass/generator | Mais popular, preview real-time |
| glasscss.com | Inclui Liquid Glass |
| css.glass | Foco em code output |
| hype4.academy/tools/glassmorphism-generator | Ajuste fino completo |

## Referência Cruzada (aiox-design)

- **Surface "glass"** em `design-mappings.yaml`: usa este guia como spec de implementação
- **Estilo "premium"** em `page-type-patterns.md`: glassmorphism como componente do estilo
- **Modal glassmorphism** em `design-mappings.yaml`: overlay com glass effect
- **Glass sobre video**: combinar com `video-backgrounds-guide.md` para cards glass sobre video background
