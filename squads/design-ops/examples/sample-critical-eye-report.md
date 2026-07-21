# Critical Eye — Cycle Report #1

**Date:** 2026-02-18T12:00:00.000Z
**Scoring Rules Version:** 1.0.0
**Catalog Version:** 1.0.0

---

## Executive Summary

- **Variants evaluated:** 6
- **New variants this cycle:** 0 (all from seed data)
- **Transitions executed:** 6 (across 5 variants)
- **Proposals pending review:** 0
- **Average score:** 46.8/100
- **Highest score:** 61 (button-shared-v1)
- **Lowest score (non-REJECT):** 53 (textarea-shared-v1, badge-shared-v1)

---

## Lifecycle Distribution

| State | Count | Change |
|-------|-------|--------|
| CANDIDATE | 1 | -5 |
| EXPERIMENTAL | 4 | +4 |
| STABLE | 1 | +1 |
| CANONICAL | 0 | — |
| DEPRECATED | 0 | — |
| REJECT | 0 | — |

---

## Transitions Executed

### Auto-Transitions

| Variant | From | To | Score | Reason | Authority |
|---------|------|----|-------|--------|-----------|
| button-shared-v1 | CANDIDATE | EXPERIMENTAL | 61 | breadth_score = 10 (2 sources) | Nathan Curtis / EightShapes |
| button-shared-v1 | EXPERIMENTAL | STABLE | 61 | total_score = 61 >= 60 threshold | USWDS Component Lifecycle |
| input-shared-v1 | CANDIDATE | EXPERIMENTAL | 57 | breadth_score = 10 (2 sources) | Nathan Curtis / EightShapes |
| form-field-shared-v1 | CANDIDATE | EXPERIMENTAL | 57 | breadth_score = 10 (2 sources) | Nathan Curtis / EightShapes |
| textarea-shared-v1 | CANDIDATE | EXPERIMENTAL | 53 | breadth_score = 10 (2 sources) | Nathan Curtis / EightShapes |
| badge-shared-v1 | CANDIDATE | EXPERIMENTAL | 53 | breadth_score = 10 (2 sources) | Nathan Curtis / EightShapes |

### Proposals Awaiting Review

_Nenhuma proposta neste ciclo. Nenhum variante atingiu score >= 80 para CANONICAL._

---

## Category Breakdown

### base (4 variants)

**Leader:** button-shared-v1 — 61/100
**Health:** avg=56, spread=8, has_canonical=false

| Rank | Variant | Score | Lifecycle | Breadth | Quality | Consistency | Maturity | Simplicity |
|------|---------|-------|-----------|---------|---------|-------------|----------|------------|
| 1 | button-shared-v1 | 61 | STABLE | 10/25 | 22/30 | 18/20 | 3/15 | 8/10 |
| 2 | input-shared-v1 | 57 | EXPERIMENTAL | 10/25 | 19/30 | 16/20 | 2/15 | 10/10 |
| 3 | textarea-shared-v1 | 53 | EXPERIMENTAL | 10/25 | 16/30 | 16/20 | 1/15 | 10/10 |
| 3 | badge-shared-v1 | 53 | EXPERIMENTAL | 10/25 | 15/30 | 17/20 | 1/15 | 10/10 |

**Dimension Winners (head-to-head):**
- Breadth: TIE (all = 10)
- Quality: button-shared-v1 (22)
- Consistency: button-shared-v1 (18)
- Maturity: button-shared-v1 (3)
- Simplicity: input / textarea / badge (10 each, button = 8)

**Recommendation:** Button e o lider claro da categoria. Input esta a 3 pontos de STABLE — melhorias de a11y e states o colocam la. Textarea e Badge empatados em 53 — precisam de melhorias de quality e maturity significativas.

---

### core (2 variants)

**Leader:** form-field-shared-v1 — 57/100
**Health:** avg=28.5, spread=57, has_canonical=false

| Rank | Variant | Score | Lifecycle | Breadth | Quality | Consistency | Maturity | Simplicity |
|------|---------|-------|-----------|---------|---------|-------------|----------|------------|
| 1 | form-field-shared-v1 | 57 | EXPERIMENTAL | 10/25 | 20/30 | 15/20 | 2/15 | 10/10 |
| 2 | card-planned-v1 | 0 | CANDIDATE | 0/25 | 0/30 | 0/20 | 0/15 | 0/10 |

**Dimension Winners (head-to-head):**
- Todas as dimensoes: form-field-shared-v1 (card nao implementado)

**Recommendation:** Categoria com competicao artificial — Card com score 0 puxa media para 28.5. Form Field precisa de CVA adoption (+3 consistency) para atingir STABLE. Card precisa ser implementado para competicao real.

---

## Tiebreakers Applied

| Variants | Margin | Winner | Reason |
|----------|--------|--------|--------|
| textarea-shared-v1 vs badge-shared-v1 | 0% | TIE | Same score (53) AND same breadth (10). Co-ranked at #3. |

---

## Categories Needing Attention

| Category | Avg Score | Issue | Recommendation |
|----------|-----------|-------|----------------|
| core | 28.5 | Card com score 0 puxa media para baixo. Apenas 1 componente avaliavel. | Implementar Card para ter competicao real na categoria. |

---

## Recommendations for Next Cycle

### Immediate Actions
1. **Button**: Unico STABLE — referencia para todos os outros. Proximo passo: testes + Storybook para subir maturity.
2. **Input**: +3 pontos para STABLE. Adicionar `aria-describedby` e loading state.
3. **Form Field**: +3 pontos para STABLE. Migrar para CVA ao inves de props-only para consistency.

### Source Gaps
- **Card**: 0 sources. Implementar em pelo menos 2 brands (lendario + clickmax).

### Quality Improvements
- **Textarea**: Substituir `min-h-[80px]` hardcoded por token var. Adicionar `@AIOS-RULES` header. Adicionar sizes (sm/md/lg).
- **Badge**: Substituir `rounded-full`, `px-2.5`, `py-0.5` hardcoded por token vars. Adicionar docs detalhado.

### Accessibility Concerns
- **Badge**: `<span>` sem role semantico. Adicionar `aria-label` ou `role=status`.
- **Textarea**: Sem `aria-describedby`. Depende inteiramente do form-field para contexto.
- **Button**: Falta guidance para `aria-label` quando `size=icon`.

---

## Appendix: Full Score Matrix

| Variant | Category | Lifecycle | Total | B | Q.tok | Q.sta | Q.a11y | Q.res | Q.com | Q.rlc | C.nam | C.api | C.vis | M.stb | M.doc | M.tst | S.cpx | S.dep |
|---------|----------|-----------|-------|---|-------|-------|--------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|
| button-shared-v1 | base | STABLE | 61 | 10 | 5 | 4 | 4 | 3 | 4 | 2 | 5 | 5 | 8 | 0 | 3 | 0 | 3 | 5 |
| input-shared-v1 | base | EXPERIMENTAL | 57 | 10 | 4 | 4 | 3 | 3 | 4 | 1 | 4 | 4 | 8 | 0 | 2 | 0 | 5 | 5 |
| form-field-shared-v1 | core | EXPERIMENTAL | 57 | 10 | 3 | 3 | 4 | 3 | 5 | 2 | 5 | 3 | 7 | 0 | 2 | 0 | 5 | 5 |
| textarea-shared-v1 | base | EXPERIMENTAL | 53 | 10 | 3 | 4 | 2 | 3 | 3 | 1 | 5 | 4 | 7 | 0 | 1 | 0 | 5 | 5 |
| badge-shared-v1 | base | EXPERIMENTAL | 53 | 10 | 3 | 2 | 2 | 3 | 4 | 1 | 5 | 5 | 7 | 0 | 1 | 0 | 5 | 5 |
| card-planned-v1 | core | CANDIDATE | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

---

*Generated by Critical Eye v1.0.0 — Cycle #1*
*Scoring Authority: Nathan Curtis, Brad Frost, GOV.UK, USWDS, Adobe Spectrum*
