# Extraction Asymmetries Protocol

Applies when consuming `inputs/extraction-asymmetries.json` or `extraction-asymmetries.md` produced by `lib/asymmetry-detector.cjs`.

## What an asymmetry is

An **asymmetry** is a pattern of absence, uniformity, or sparseness in extracted brand tokens that is itself a brand identity signal. It is not a defect.

The medium gold-standard extraction surfaced 8 asymmetries that, together, define medium's "flat aesthetic":
- Only 2 distinct border-radii (50%, 99em) → flat radius philosophy
- Zero box-shadows → no elevation language
- 300ms linear transitions on bg-color and color only → single-curve motion
- Zero `:focus` rules → a11y gap (intentional or oversight)
- Disabled opacities `[0.1, 0.3]` → bi-tier disabled signature

Each one tells the consumer "honor this constraint when generating downstream artifacts."

## Schema

```yaml
asymmetries:
  - id: <stable-slug>           # e.g. radii-flatness, shadow-absence
    category: flatness | absence | uniformity | sparseness | density
    severity: low | medium | high
    title: <human-readable>
    description: <prose>
    evidence: <object — values that justify the asymmetry>
    design_implication: <directive for downstream consumers>
summary:
  total_asymmetries: int
  by_severity: { low, medium, high }
  by_category: { ... }
```

## Detection rules (v1)

| ID | Trigger | Severity |
|----|---------|----------|
| `radii-flatness` | `radii.length <= 3` | high |
| `shadow-absence` | `shadows.length == 0` | high |
| `shadow-monolith` | `shadows.length == 1` | medium |
| `transition-uniformity` | `durations.length <= 1` AND `easings.length <= 1` (with at least one transition) | medium |
| `transition-property-narrow` | distinct transition properties `<= 4` (excluding "all") | medium |
| `easing-linear-only` | all transitions use `linear` AND `easings == []` | medium |
| `focus-state-absence` | both `:focus` and `:focus-visible` absent | high |
| `active-state-absence` | `:hover` present but `:active` absent | low |
| `disabled-opacity-pattern` | 2+ distinct disabled opacities | low |
| `color-palette-narrow` | `<= 8` distinct hex colors | medium |
| `color-palette-extended` | `>= 30` distinct hex colors | low |

## How downstream consumers MUST treat asymmetries

1. **Honor flatness signals.** When `radii-flatness` is present with values `[50%, 99em]`, do NOT generate intermediate radii in component CSS. Use only the extracted values.

2. **Honor absence signals.** When `shadow-absence` is present, do NOT add elevation to generated cards/panels. Use borders or background contrast.

3. **Inject inferred values explicitly.** When `focus-state-absence` is present and the consumer must add focus rings for a11y, mark the inferred values in the output (`/* inferred — not in source */`) so the consumer knows it is not brand-faithful.

4. **Treat disabled-opacity-pattern as the disabled signature.** Reuse the same opacity values when extending disabled state to new components. Do not invent intermediates.

5. **Treat transition-uniformity as a constraint, not a starting point.** If brand uses single 300ms linear, generated motion MUST use 300ms linear (not "design judgment" ease curves).

## Anti-patterns

- **Detecting an asymmetry and ignoring it because the consumer "wants more variety."** The brand chose the constraint; the consumer overriding it produces off-brand output.
- **Adding asymmetries via fallback.** Per `.claude/rules/extraction-no-fallbacks.md`, the detector reports observed signals only. If brand has 6 radii, do not lie to claim flatness.
- **Conflating absence with extraction failure.** If `:focus` is absent, the brand likely either lacks focus styling (a11y gap) OR handles it elsewhere (JS, browser default). Do not assume one without HTML structural evidence.

## Related

- `lib/asymmetry-detector.cjs` — the detector implementation (10 rules in v1)
- `lib/component-state-extractor.cjs` — feeds the focus/active/hover absence detection
- `lib/extractors.cjs` (`detectMotion`) — feeds transition uniformity/property/easing detection

## Evidence

Validation against the medium fixture (`outputs/design-ops/url-extracts/medium/`) returns exactly the 8 brand-identity signals that the original 30-hour transform-html-tailwind-gold-standard session captured by hand. Reproducible for any URL via the standard pipeline.
