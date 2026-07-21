# Motion Extraction Policy

Applies when consuming `inputs/motion.json` produced by `lib/extractors.cjs#detectMotion`.

## What `motion.json` captures (post-Wave 1 extension)

```yaml
durations:
  - { value: "300ms", count: 3 }            # frequency-ranked
easings:
  - { value: "ease-out", count: 12 }
  - { value: "cubic-bezier(0.4,0,0.2,1)", count: 3 }
keyframes: [k1, fade, slide-in]              # names only
transitions:                                  # NEW Wave 1 — pairing
  - property: background-color
    duration: 300ms
    timing: linear
    count: 2
  - property: color
    duration: 300ms
    timing: linear
    count: 1
keyframe_bodies:                              # NEW Wave 1 — bodies
  k1: "from{transform:rotate(0deg)}to{transform:rotate(360deg)}"
```

## Why pairing matters

The pre-Wave 1 `detectMotion` returned only durations + easings as separate counts. That hides the **selectivity** of the brand's motion language. Medium's 30-hour gold-standard analysis discovered:

> "All transitions are 300ms linear, but ONLY on `background-color` and `color`. Other properties (transform, opacity, scale) are NOT animated."

Without pairing, a downstream consumer would see `durations: [300ms × 3]` and might generate `transition: all 300ms linear` — which is OFF-BRAND because the source never animates `transform`. The pairing makes the constraint visible.

## Why keyframe bodies matter

The pre-Wave 1 output listed keyframe NAMES only. Names alone are useless for downstream rendering — `k1` could be a fade, a rotate, a slide. The medium gold standard captured that `k1` is a 360° rotation used as a spinner. Without the body, a consumer cannot reproduce the animation.

## Schema invariants

1. `durations`, `easings`, `transitions` are sorted by `count` descending.
2. `transitions` records ALL property/duration/timing combinations found in `transition:` shorthand declarations, including comma-separated multi-property forms.
3. When a `transition:` shorthand omits the property, `transitions[i].property = "all"` per CSS spec.
4. `keyframe_bodies` keys equal `keyframes` entries (1:1).
5. `keyframe_bodies` values are whitespace-collapsed verbatim CSS bodies (no parsing).

## How downstream consumers MUST use this artifact

1. **Use `transitions[]` to reproduce brand motion exactly.** Generate `transition: bg-color 300ms linear, color 300ms linear` — not `transition: all 300ms linear`.

2. **Use `keyframe_bodies[name]` to embed @keyframes verbatim.** Do not re-author from the name. The body is the canonical animation spec.

3. **Treat empty `easings` paired with non-empty `transitions[].timing == linear` as a brand signal.** Per `squads/design-ops/rules/extraction-asymmetries-protocol.md`, this maps to `easing-linear-only`.

4. **Treat single `durations` entry as a brand signal.** Per `transition-uniformity` asymmetry, single-curve motion is a brand identity, not a missing value.

## Anti-patterns

- **Fabricating ease-in-out for hover when source uses linear.** Off-brand. Use what's extracted.
- **Animating transform/opacity when source restricts motion to color-family properties.** Honor the property selectivity in `transitions[].property`.
- **Inventing keyframe bodies based on the name.** `spin` does not necessarily mean a rotation; consult `keyframe_bodies.spin` first.

## Related

- `lib/extractors.cjs#detectMotion` — implementation
- `lib/component-class-emitter.cjs` — consumes `transitions[]` and `keyframe_bodies` when emitting `.brand-transition` and `@keyframes` blocks
- `squads/design-ops/rules/extraction-asymmetries-protocol.md` — `transition-uniformity`, `transition-property-narrow`, `easing-linear-only` rules consume this artifact

## Evidence

Medium fixture validation (2026-05-06):
- `durations: [{value: "300ms", count: 3}]`
- `easings: []` (linear-only — empty by design, not extraction failure)
- `transitions: [{property: "background-color", duration: "300ms", timing: "linear", count: 2}, {property: "color", ...}]`
- `keyframe_bodies.k1: "from{transform:rotate(0deg)}to{transform:rotate(360deg)}"` — the spinner
