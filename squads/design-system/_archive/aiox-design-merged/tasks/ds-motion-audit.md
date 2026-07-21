# Audit Animations, Transitions & Motion Tokens -- 7 Dimensions

> Task ID: brad-motion-audit
> Agent: Brad (Design System Architect)
> Version: 2.0.0
> v4.0-compatible: true
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[]` · enables: `[ds-motion-tokens]` · workflow: `motion`

## Description

Audit completo do motion layer de um codebase, cobrindo as 7 dimensoes do Kinetic Design System conforme pesquisa tecnica (2026-03-21). Cada dimensao produz um score independente (0-100), e o score final determina maturidade do motion system do projeto.

**v2.0:** Reestruturado para 7 dimensoes da pesquisa Kinetic DS. Integrado com `motion-quality-checklist.md` como gate de validacao.

**Dimensoes auditadas:**
1. Motion Design Tokens (DTCG compliance)
2. CSS Scroll-driven Animations
3. Animation Extraction Pipeline
4. Motion Primitives Coverage
5. Interaction States Recording
6. Effect Catalog Documentation
7. View Transitions API

## Prerequisites

- Codebase com UI components
- Read `data/motion-tokens-schema.yaml` para token standards
- Read `data/motion-primitives-registry.yaml` para primitivos de referencia
- Val Head DNA: Apply 5-purpose test to every animation found

## Workflow

### Interactive Elicitation

1. **Gather Parameters**
   - Scan path (codebase root or specific UI directory)
   - Animation libraries in use (framer-motion, GSAP, CSS only, etc.)
   - Output directory
   - Reference site URL (optional -- para comparacao de extraction capability)
   - Target framework (Next.js, React, vanilla, etc.)

### Steps

#### Dimension 1: DTCG Token Compliance

**Goal:** Verificar se motion tokens seguem o W3C DTCG 2025.10 spec.

1. **Scan motion token files**
   - Localizar arquivos de tokens de motion (CSS custom properties, JSON tokens, YAML schemas)
   - Verificar presenca de `$type` fields: `duration`, `cubicBezier`, `number`
   - Verificar formato `$value` para durations: deve ser string `"200ms"` (nao objeto `{value, unit}`)
   - Check: todos duration tokens usam formato string -> score += 25

2. **Validate token architecture**
   - Verificar existencia das 3 camadas: primitive -> semantic -> component
   - Verificar que tokens semanticos referenciam tokens primitivos (nao valores hardcoded)
   - Verificar que CSS output usa `var(--motion-*)` pattern
   - Check: 3 camadas presentes e referenciais corretas -> score += 25

3. **Check CSS Layers**
   - Verificar se `@layer motion-tokens, motion-primitives, motion-compositions` esta declarado
   - Verificar ordem correta dos layers
   - Check: layers declarados e ordenados -> score += 25

4. **Audit hardcoded values**
   - Grep todas as `animation-duration`, `transition-duration`, `animation-timing-function` hardcoded
   - Contar quantas usam tokens vs valores literais
   - Calcular percentual de token adoption: `(tokenized / total) * 100`
   - Check: token adoption >= 80% -> score += 25

**Dimension 1 Score:** 0-100 (sum of checks above)

---

#### Dimension 2: CSS Scroll-driven Animations

**Goal:** Verificar uso de `scroll()`, `view()`, `animation-timeline` e degradacao.

1. **Detect scroll-driven usage**
   - Grep por `animation-timeline: scroll()` e `animation-timeline: view()`
   - Grep por `animation-range`, `animation-range-start`, `animation-range-end`
   - Grep por named timelines: `scroll-timeline`, `view-timeline`
   - Check: uso detectado -> score += 30

2. **Verify compositor-friendly properties**
   - Para cada scroll-driven animation, verificar que anima `transform` e/ou `opacity` (off main thread)
   - Flag animacoes scroll-driven que animam propriedades de layout (width, height, top, left)
   - Check: 100% compositor-friendly -> score += 30

3. **Check browser fallbacks**
   - Verificar presenca de `@supports (animation-timeline: scroll())`
   - Verificar fallback para browsers sem suporte (Firefox flag): IntersectionObserver ou static
   - Check: fallbacks presentes -> score += 20

4. **Evaluate scroll patterns**
   - Classificar scroll patterns encontrados: progress bar, parallax, reveal, scrub
   - Verificar se GSAP ScrollTrigger e usado para complexidade alem de CSS puro (pin, timeline scrub)
   - Verificar integracao Lenis se smooth scroll esta presente
   - Check: patterns classificados e documentados -> score += 20

**Dimension 2 Score:** 0-100

---

#### Dimension 3: Animation Extraction Pipeline

**Goal:** Verificar se extraction pipeline esta configurado (Playwright + CDP).

1. **Check extraction infrastructure**
   - Verificar existencia de extraction script em `infrastructure/services/etl/extractors/`
   - Verificar se Playwright esta como dependency (package.json)
   - Verificar se CDP Animation Domain esta configurado (`Animation.enable`)
   - Check: script + dependency existem -> score += 25

2. **Validate extraction techniques**
   - Verificar se script extrai CSS `@keyframes` via CSSOM
   - Verificar se script extrai `transition` properties via getComputedStyle
   - Verificar se script usa CDP `Animation.animationStarted` para runtime capture
   - Verificar se script faz timeline sampling via requestAnimationFrame
   - Check: >= 3 tecnicas implementadas -> score += 25

3. **Check interaction recording**
   - Verificar se extraction captura before/after CSS diff para hover states
   - Verificar se extraction captura :active state (mouse.down pattern)
   - Check: interaction recording presente -> score += 25

4. **Validate output format**
   - Verificar se extraction gera `motion-map.json` seguindo schema formal
   - Verificar se motion-map inclui: selector, animation_type, source, properties, classification
   - Check: output segue schema -> score += 25

**Dimension 3 Score:** 0-100

---

#### Dimension 4: Motion Primitives Coverage

**Goal:** Verificar coverage dos 10 primitivos do registry no codebase.

1. **Inventory animation patterns in codebase**
   - Grep CSS transition/animation/keyframes declarations com file:line references
   - Grep framer-motion usage (animate, variants, transition props)
   - Grep GSAP usage (gsap.to, gsap.from, timeline)
   - Grep Web Animations API usage
   - Check: inventory completo com file:line -> score += 20

2. **Map to primitives**
   - Classificar cada animacao encontrada contra os 10 primitivos: fadeIn, slideIn, scaleIn, blur, clipReveal, rotate, parallax, colorShift, fadeOut, slideOut
   - Calcular: `coverage = (primitivos usados / 10) * 100`
   - Identificar animacoes que nao mapeiam para nenhum primitivo ("unclassified")
   - Check: coverage >= 60% -> score += 30

3. **Check dual implementation**
   - Para cada primitivo usado, verificar se tem `css_pattern` E `framer_pattern` implementados
   - Flag primitivos com apenas uma implementacao
   - Check: >= 70% dual implementation -> score += 25

4. **Cluster and normalize values**
   - Cluster similar duration values (e.g., 180ms, 200ms, 220ms -> normalize to token)
   - Cluster similar easing curves
   - Calcular token candidacy: quantos raw values poderiam ser substituidos por tokens
   - Check: token candidates reduzem redundancia em >= 60% -> score += 25

**Dimension 4 Score:** 0-100

---

#### Dimension 5: Interaction States

**Goal:** Verificar interaction states (hover, active, focus) e suas animacoes.

1. **Audit hover animations**
   - Grep por `:hover` com transition/animation properties
   - Verificar que hover transitions usam `ease-out` easing (best practice para enters)
   - Verificar que hover durations estao no range 100-300ms
   - Check: hover animations consistentes -> score += 25

2. **Audit active/press animations**
   - Grep por `:active` states com transform (scale, translateY para "press" effect)
   - Verificar presenca de whileTap (framer-motion) patterns
   - Check: active states presentes em interactive elements -> score += 25

3. **Audit focus animations**
   - Grep por `:focus`, `:focus-visible`, `:focus-within` com transition
   - Verificar que focus rings/outlines tem animacao (nao instant)
   - Verificar acessibilidade: focus indicators sempre visiveis
   - Check: focus animations presentes e acessiveis -> score += 25

4. **Interaction coherence**
   - Avaliar se interaction animations formam familia coerente ("siblings" vs "strangers")
   - Verificar se durations/easings sao consistentes entre hover/active/focus
   - Check: familia coerente de interactions -> score += 25

**Dimension 5 Score:** 0-100

---

#### Dimension 6: Effect Catalog Documentation (Val Head 5-Purpose)

**Goal:** Verificar catalog documentation usando Val Head 5-purpose framework.

1. **Val Head 5-Purpose tagging**
   - Para cada animacao encontrada, verificar se tem purpose tag:
     - **Orient** -- ajuda usuario a entender relacoes espaciais
     - **Direct Attention** -- guia foco para mudancas importantes
     - **Show Causality** -- mostra causa-e-efeito
     - **Provide Feedback** -- confirma acoes do usuario
     - **Express Brand** -- comunica personalidade da marca
   - Animacoes sem NENHUM dos 5 propositos: flag para remocao
   - Check: >= 80% animacoes tem purpose tag -> score += 30

2. **Easing audit**
   - Flag uso de CSS defaults (ease, ease-in-out, linear) -- recomendar custom curves
   - Verificar se custom easing curves refletem brand personality
   - Verificar match easing/interaction: ease-out para enters, ease-in para exits
   - Check: >= 70% custom easings -> score += 20

3. **Catalog completeness**
   - Verificar existencia de demo visual (Storybook story, GIF, ou video) para cada primitivo
   - Verificar descricao de uso e tokens utilizados por primitivo
   - Verificar que catalog inclui: quando usar, quando NAO usar, tokens associados
   - Check: catalog >= 50% completo -> score += 25

4. **UI Choreography coherence**
   - Avaliar se animacoes funcionam como "siblings" (familia coerente)
   - Verificar consistencia de motion character across components
   - Verificar cognitive load guards: max 3 simultaneas, max 1 hero, brand <= 20%
   - Check: choreography coerente e dentro dos guards -> score += 25

**Dimension 6 Score:** 0-100

---

#### Dimension 7: View Transitions API

**Goal:** Verificar uso de View Transitions API e fallbacks.

1. **Detect View Transitions usage**
   - Grep por `startViewTransition`, `document.startViewTransition`
   - Grep por CSS `@view-transition { navigation: auto; }`
   - Grep por `::view-transition-group`, `::view-transition-old`, `::view-transition-new`
   - Grep por React `<ViewTransition>` (canary)
   - Check: algum uso detectado -> score += 30

2. **Validate implementation patterns**
   - Verificar se cross-document transitions usam CSS-only approach (`@view-transition`)
   - Verificar se same-document transitions usam `startViewTransition()`
   - Verificar presenca de `view-transition-name` em elementos compartilhados
   - Check: patterns corretos -> score += 25

3. **Check fallbacks**
   - Verificar fallback para browsers sem suporte (crossfade CSS basico)
   - Verificar `@supports (view-transition-name: test)` feature detection
   - Verificar que React `<ViewTransition>` esta marcado como progressive enhancement (nao required)
   - Check: fallbacks presentes -> score += 25

4. **Evaluate transition types**
   - Classificar transitions encontradas: crossFade, sharedElement, listToDetail, routeSlide
   - Verificar customizacao de `::view-transition-group` (animation-duration, timing-function)
   - Check: tipos classificados e customizados -> score += 20

**Dimension 7 Score:** 0-100

---

### Final Step: Generate Comprehensive Audit Report

1. **Compile dimension scores**
   - Calcular score por dimensao (0-100)
   - Calcular score total: media ponderada das 7 dimensoes
   - Determinar maturity level baseado no score

2. **Run motion-quality-checklist gate**
   - Executar `motion-quality-checklist.md` como gate de validacao
   - Registrar BLOCK/WARN/INFO findings
   - Qualquer BLOCK failure deve ser reportado como critical finding

3. **Generate outputs**
   - `motion-audit-report.md` com score por dimensao e findings
   - `motion-token-candidates.json` com proposed token values
   - `reduced-motion-gaps.md` com components missing reduced-motion
   - `.state.yaml` atualizado

## Output

### Primary Output: `motion-audit-report.md`

```markdown
# Motion Audit Report -- [Project Name]

## Executive Summary
- Overall Score: XX/100
- Maturity Level: [Nascent | Developing | Established | Advanced]
- Critical Findings: N
- Recommendations: N

## Dimension Scores

| # | Dimension | Score | Grade | Critical Issues |
|---|-----------|-------|-------|-----------------|
| 1 | DTCG Token Compliance | XX/100 | A/B/C/D/F | ... |
| 2 | CSS Scroll-driven Animations | XX/100 | A/B/C/D/F | ... |
| 3 | Animation Extraction Pipeline | XX/100 | A/B/C/D/F | ... |
| 4 | Motion Primitives Coverage | XX/100 | A/B/C/D/F | ... |
| 5 | Interaction States | XX/100 | A/B/C/D/F | ... |
| 6 | Effect Catalog Documentation | XX/100 | A/B/C/D/F | ... |
| 7 | View Transitions API | XX/100 | A/B/C/D/F | ... |

## Grading Scale
- A: 90-100 (Advanced)
- B: 75-89 (Established)
- C: 60-74 (Developing)
- D: 40-59 (Nascent)
- F: 0-39 (Not started)

## Maturity Levels
- **Nascent** (0-39): Motion exists but is ad-hoc, no tokens, no system
- **Developing** (40-59): Some token usage, partial coverage, gaps in a11y
- **Established** (60-79): Token system in place, good coverage, minor gaps
- **Advanced** (80-100): Full DTCG compliance, all dimensions covered, catalog complete

## Per-Dimension Findings
[Detailed findings per dimension]

## Motion Quality Checklist Gate
[Results from motion-quality-checklist.md execution]
- BLOCK items: [list]
- WARN items: [list]
- INFO items: [list]
- Gate verdict: PASS / CONDITIONAL / FAIL

## Recommendations
[Prioritized action items]
```

### Secondary Outputs

- `motion-token-candidates.json` -- Proposed token values from clustering
- `reduced-motion-gaps.md` -- Components missing prefers-reduced-motion handling
- `.state.yaml` -- Updated task state

## Quality Gate

Execute `motion-quality-checklist.md` como gate formal de validacao. O checklist cobre 24 items em 6 categorias (Token Compliance, Accessibility, Performance, Primitive Coverage, Composition Quality, Cognitive Load).

**Reference:** `squads/aiox-design/checklists/motion-quality-checklist.md`

**Thresholds:**
- PASS: >= 80% (20+ items) AND zero BLOCK failures
- CONDITIONAL: >= 60% (15-19 items) OR BLOCK failures pending
- FAIL: < 60% (14- items)

## Failure Handling

- **No CSS animations found in codebase:** Verify scan path includes style files (.css, .scss, .tsx). If truly zero, report "No CSS animations detected" and score Dimension 4 as 0
- **Animation library not detected (framer-motion, GSAP):** Skip JS animation scan, note in report. Dimension 3/4 scores adjusted
- **prefers-reduced-motion scan returns zero queries:** Flag as critical gap in Dimension 1 and 5
- **Motion token clustering produces zero candidates:** Lower clustering threshold and retry. If still zero, report raw values without token recommendations
- **Extraction pipeline not found:** Score Dimension 3 as 0, recommend setup in action items
- **No View Transitions usage:** Score Dimension 7 as 0, note as enhancement opportunity (not critical for v1)

## Success Criteria

- All 7 dimensions audited with individual scores
- Motion-quality-checklist gate executed and verdict recorded
- prefers-reduced-motion coverage assessed (Val Head: "reduced motion, not no motion")
- Token candidates reduce value redundancy by >60%
- Zero seizure risk issues (WCAG 2.3.1)
- Every animation has at least one of 5 Val Head purposes identified
- Comprehensive report with per-dimension scoring and maturity level

## Related Data

- `squads/aiox-design/data/motion-tokens-schema.yaml`
- `squads/aiox-design/data/motion-primitives-registry.yaml`
- `squads/aiox-design/data/motion-tokens-guide.md`

## Related Checklists

- `squads/aiox-design/checklists/motion-quality-checklist.md`
- `squads/aiox-design/checklists/ds-component-quality-checklist.md`

## Process Guards
- **On Fail:** Stop execution, capture evidence, and return remediation steps before proceeding.
- **Max research iterations:** 3 per dimension. After 3 passes, declare findings and move to next dimension.
