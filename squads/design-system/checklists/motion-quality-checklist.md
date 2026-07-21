# Motion Quality Checklist

**Purpose:** QA gate para motion artifacts antes de promover ao workspace
**Agent:** Brad Frost (Design System Architect)
**Standard:** WCAG 2.2 AA + Kinetic Design System v1 + Val Head 5-Purpose Framework
**Applies to:** Motion tokens, primitives, compositions, choreographies, page choreography

---

## TOKEN COMPLIANCE

- [ ] **TC-01:** Todas as animacoes referenciam motion tokens via `var(--motion-*)` -- zero valores hardcoded
  - Como verificar: `grep -rn "animation-duration:\|transition-duration:" | grep -v "var(--motion"` deve retornar vazio
  - Severidade: **BLOCK**

- [ ] **TC-02:** Durations seguem formato DTCG string (`$value: "200ms"`) -- sem formato `{value, unit}`
  - Como verificar: Validar `motion-tokens-schema.yaml` com Style Dictionary v4 dry-run
  - Severidade: **BLOCK**

- [ ] **TC-03:** Tokens semanticos mapeiam corretamente para tokens primitivos (enter -> moderate + ease-out, exit -> base + ease-in)
  - Como verificar: Inspecionar camada semantica do schema, confirmar que cada token semantico referencia um token primitivo existente
  - Severidade: **WARN**

- [ ] **TC-04:** CSS Layers declarados na ordem correta: `@layer motion-tokens, motion-primitives, motion-compositions`
  - Como verificar: Inspecionar output CSS gerado, validar que `@layer` esta presente e na ordem correta
  - Severidade: **WARN**

---

## ACCESSIBILITY

- [ ] **A11Y-01:** Toda animacao tem fallback `prefers-reduced-motion: reduce` -- estrategia "reduced, not removed"
  - Como verificar: Para cada `@keyframes`, confirmar que existe correspondente `@media (prefers-reduced-motion: reduce)` com duracoes reduzidas (100-300ms) ou remocao
  - Severidade: **BLOCK**

- [ ] **A11Y-02:** Flash safety WCAG 2.3.1 -- nenhuma animacao produz mais de 3 flashes por segundo
  - Como verificar: Nenhum token permite `duration < 334ms` combinado com animacao que alterna entre dois estados visuais de alto contraste em loop
  - Severidade: **BLOCK**

- [ ] **A11Y-03:** Primitivos decorativos (parallax, rotate) tem `reduced_motion: "remove"` -- desabilitados completamente
  - Como verificar: Inspecionar `motion-primitives-registry.yaml`, confirmar que parallax e rotate tem `reduced_motion: "Remove"`
  - Severidade: **BLOCK**

- [ ] **A11Y-04:** Primitivos funcionais (fadeIn, slideIn para navegacao) tem `reduced_motion: "reduce"` com 100ms ease-out
  - Como verificar: Inspecionar registry, confirmar que fadeIn/slideIn tem `reduced_motion: "Keep"` ou `"Reduce"` com valores explicitados
  - Severidade: **WARN**

- [ ] **A11Y-05:** Composicoes scroll-driven (scrollTimeline, scrollProgress) degradam para reveal por viewport entry sem scrub
  - Como verificar: Confirmar que `@supports (animation-timeline: scroll())` e usado com fallback estatico fora do `@supports`
  - Severidade: **WARN**

---

## PERFORMANCE

- [ ] **PERF-01:** Somente propriedades compositor-friendly animadas: `transform`, `opacity`, `filter` -- nunca `width`, `height`, `top`, `left`, `margin`, `padding`
  - Como verificar: Inspecionar `@keyframes` e `transition` properties. Nenhuma propriedade de layout deve ser animada
  - Severidade: **BLOCK**

- [ ] **PERF-02:** Budget de performance: < 16ms por frame (60fps target), < 5KB CSS adicional de motion
  - Como verificar: DevTools Performance tab, verificar que nenhum frame excede 16ms durante animacoes. Medir tamanho do CSS de motion gerado
  - Severidade: **WARN**

- [ ] **PERF-03:** CLS < 0.1 -- animacoes nao causam layout shifts mensuráveis
  - Como verificar: Lighthouse audit ou Web Vitals extension, verificar CLS antes e depois de aplicar motion layer
  - Severidade: **WARN**

- [ ] **PERF-04:** TBT < 200ms -- motion JS nao bloqueia main thread
  - Como verificar: Lighthouse audit, verificar TBT. Confirmar que GSAP usa dynamic import e Motion 12 usa `motion/mini`
  - Severidade: **WARN**

---

## PRIMITIVE COVERAGE

- [ ] **PRIM-01:** Cada primitivo no registry tem `css_pattern` e `framer_pattern` definidos (dual implementation)
  - Como verificar: Inspecionar `motion-primitives-registry.yaml`, confirmar que os 10 primitivos tem ambos patterns
  - Severidade: **WARN**

- [ ] **PRIM-02:** Cada primitivo tem `reduced_motion` strategy explicitada (Keep, Reduce, ou Remove)
  - Como verificar: Inspecionar registry, confirmar que nenhum primitivo tem `reduced_motion` vazio ou ausente
  - Severidade: **BLOCK**

- [ ] **PRIM-03:** Dependency chain sem dead-ends -- toda task de motion tem `enables` preenchido (exceto terminal)
  - Como verificar: Verificar que `enables: []` so existe na task terminal (ds-visual-regression). Chain: audit -> tokens -> primitives -> extraction -> replication -> visual-regression
  - Severidade: **WARN**

---

## COMPOSITION QUALITY

- [ ] **COMP-01:** Cada composicao referencia apenas primitivos existentes no registry
  - Como verificar: Listar primitivos usados em cada composicao, confirmar que todos existem na secao `primitives` do registry
  - Severidade: **BLOCK**

- [ ] **COMP-02:** Cada composicao e coreografia tem campo `reduced_motion` explicito com strategy e fallback values
  - Como verificar: Inspecionar `compositions` e `choreographies` no registry, confirmar que `reduced_motion` esta presente em cada entry
  - Severidade: **WARN**

- [ ] **COMP-03:** Coreografias scroll-driven usam `@supports (animation-timeline: scroll())` com fallback para browsers sem suporte
  - Como verificar: Verificar que CSS pattern das coreografias scroll inclui feature detection e fallback via IntersectionObserver ou conteudo estatico
  - Severidade: **WARN**

---

## COGNITIVE LOAD

- [ ] **COG-01:** Max 3 animacoes simultaneas no viewport -- nao mais de 3 elementos animando ao mesmo tempo
  - Como verificar: Inspecionar pagina com DevTools Animations panel, contar elementos animando simultaneamente em qualquer momento. Stagger patterns devem manter <= 3 itens em movimento
  - Severidade: **WARN**

- [ ] **COG-02:** Max 1 hero animation por viewport -- apenas 1 animacao com dramatic duration + spring easing por tela
  - Como verificar: Verificar que nao ha duas animacoes usando tokens `duration.dramatic` ou `duration.glacial` + `easing.spring` visíveis simultaneamente
  - Severidade: **WARN**

- [ ] **COG-03:** Brand animations <= 20% da pagina -- animacoes classificadas como "brand/delight" (Val Head) nao excedem 20% das transicoes totais
  - Como verificar: Contar total de animacoes na pagina. Animacoes tagadas como `purpose: brand` ou `purpose: delight` devem ser <= 20% do total. Caminhos criticos (checkout, forms, error states) usam apenas `feedback` e `orient`
  - Severidade: **WARN**

- [ ] **COG-04:** Val Head 5-purpose tagging presente -- cada primitivo e composicao esta tagado com pelo menos 1 proposito (orient, direct-attention, feedback, brand, delight)
  - Como verificar: Inspecionar registry, confirmar que `purpose` ou `val_head_purpose` esta preenchido em cada entry
  - Severidade: **INFO**

- [ ] **COG-05:** Catalog documentation completa -- cada primitivo tem demo visual (Storybook story ou GIF), descricao de uso e tokens utilizados
  - Como verificar: Verificar existencia de stories ou catalogo markdown para cada primitivo
  - Severidade: **INFO**

---

**Reviewer:** ________ **Date:** ________
**Quality Gate:** [ ] PASS [ ] FAIL

---

## Scoring

### Point System
Each checkbox item = 1 point.

| Category | Items | Weight |
|----------|-------|--------|
| Token Compliance | 4 | 4pts |
| Accessibility | 5 | 5pts |
| Performance | 4 | 4pts |
| Primitive Coverage | 3 | 3pts |
| Composition Quality | 3 | 3pts |
| Cognitive Load | 5 | 5pts |
| **Total** | **24** | **24pts** |

### Severity Summary

| Severity | Count | Items |
|----------|-------|-------|
| **BLOCK** | 7 | TC-01, TC-02, A11Y-01, A11Y-02, A11Y-03, PERF-01, PRIM-02, COMP-01 |
| **WARN** | 12 | TC-03, TC-04, A11Y-04, A11Y-05, PERF-02, PERF-03, PERF-04, PRIM-01, PRIM-03, COMP-02, COMP-03, COG-01, COG-02, COG-03 |
| **INFO** | 2 | COG-04, COG-05 |

### Pass/Fail Thresholds

| Grade | Score | Condition |
|-------|-------|-----------|
| PASS | >= 80% (20+) AND zero BLOCK failures | Proceed to workspace promotion |
| CONDITIONAL | >= 60% (15-19) OR BLOCK failures pending | Fix BLOCK items, re-check |
| FAIL | < 60% (14-) | Major rework required |

### Auto-Correction
If items fail:
- BLOCK items must be resolved before any promotion
- WARN items should be resolved; may proceed with documented tech debt
- INFO items are advisory; resolve when bandwidth allows
- Run `*execute-checklist motion-quality-checklist` for guided validation
