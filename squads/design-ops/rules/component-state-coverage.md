# Component State Coverage Protocol

Applies when consuming `inputs/component-states.json` produced by `lib/component-state-extractor.cjs`.

## What this artifact captures

For each interaction-state-bearing CSS rule (`:hover`, `:focus`, `:focus-visible`, `:active`, `:disabled`, `[disabled]`, `[aria-disabled]`, `:checked`, `:focus-within`), the extractor records:

1. The full selector (e.g. `.em:hover`)
2. The base form (`.em` after stripping state pseudos)
3. The state(s) classified (single or compound like `disabled:hover`)
4. The CSS declarations applied for that state

It also produces a brand-level **state value palette** aggregating all hover backgrounds, disabled opacities, focus outlines, etc., across the entire stylesheet.

## Schema

```yaml
states_by_selector:
  ".em":
    base_selector: ".em"
    raw_selectors: [".em"]
    states:
      hover: { background: "#156d12" }      # if applicable
      disabled: { opacity: "0.3" }           # if applicable
      "disabled:hover": { background: "rgba(25,25,25,1)" }
state_value_palette:
  hover_backgrounds: ["#156d12", "#000000", ...]
  hover_colors: [...]
  hover_border_colors: [...]
  hover_opacities: [...]
  disabled_opacities: ["0.1", "0.3"]
  disabled_colors: ["#6b6b6b"]
  disabled_backgrounds: [...]
  disabled_cursors: ["not-allowed", "inherit !important"]
  focus_outlines: [...]
  focus_box_shadows: [...]
  focus_border_colors: [...]
  active_backgrounds: [...]
summary:
  total_state_rules: int
  total_base_selectors: int
  states_present: [hover, disabled, ...]
  states_absent: [focus, focus-visible, ...]
```

## Selector pairing limitation (v1)

CSS Modules with hashed classes (medium, vercel, stripe internal) cannot be paired by selector alone. A button's base `.em` and its hover `.ep:hover` are distinct hash classes composed at HTML render time. The extractor does NOT attempt to pair them — it records each state rule independently and aggregates the palette.

If pairing is required (e.g., to produce `<base, hover, disabled>` triples per actual button instance), HTML structural analysis is needed. That is out of scope for v1 and explicitly noted as a known limitation.

## How downstream consumers MUST use this artifact

1. **Use `state_value_palette` for the brand's state vocabulary.** When generating a new button component, use the brand's hover-bg palette (e.g. medium's `#156d12`) rather than computing `darken(primary, 10%)`.

2. **Treat `states_absent` as a brand signal, not a missing value.** Per `squads/design-ops/rules/extraction-asymmetries-protocol.md`, absent focus rules → either a11y gap OR JS-handled focus. Do not silently fabricate focus styling.

3. **Honor compound states.** `disabled:hover` rules exist in real CSS (medium uses them to keep disabled-state immutable on hover). Compound state keys are joined by `:` (e.g. `"disabled:hover"`). Honor the order encoded in `STATE_PSEUDOS`.

4. **Do NOT invent state coverage.** When `:focus` is absent and a11y demands focus rings, mark inferred values explicitly.

## Pseudo handling rules

- Pseudo-elements (`::before`, `::after`) are NOT interaction states. Skipped.
- Pseudos inside `:not()` are guards, not state assertions. `.btn:hover:not(:disabled)` is a hover rule; the `:disabled` inside `:not()` is preserved in the base selector but does NOT classify the rule as disabled.
- `:focus-within` is treated as its own state (DOM-tree-bound), distinct from `:focus`.

## Related

- `lib/component-state-extractor.cjs` — the extractor implementation
- `squads/design-ops/rules/extraction-asymmetries-protocol.md` — uses `states_absent` for asymmetry detection
- `lib/component-class-emitter.cjs` — consumes `state_value_palette` to emit `:hover` and `:disabled` variants

## Evidence

Medium fixture validation (2026-05-06):
- 18 state rules detected
- `states_present: [disabled, hover]`
- `states_absent: [focus, focus-visible, focus-within, active, checked, visited]`
- `disabled_opacities: ["0.1", "0.3"]` — exact match with the gold-standard manual capture
- Compound `.da:disabled:hover` correctly grouped under `"disabled:hover"` key
