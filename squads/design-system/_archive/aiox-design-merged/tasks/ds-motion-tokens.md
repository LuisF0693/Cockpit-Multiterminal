# Define & Extract Motion Token System

> Task ID: ds-motion-tokens
> Agent: Brad Frost (Design System Architect)
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[ds-motion-audit]` . enables: `[ds-motion-primitives]` . workflow: `motion`

## Description

Define a complete motion token system following the DTCG W3C 2025.10 spec.
Three layers: primitive tokens (duration, easing, stagger), semantic tokens
(enter, exit, feedback, expand, hero, page), and component tokens (per-component
overrides). Output as JSON, CSS custom properties, and TypeScript exports.

If an existing codebase is provided, extract and normalize existing animation
values into the token system (cluster similar values, map to scale).

## Prerequisites

- Read `data/motion-tokens-schema.yaml` for the 3-layer architecture
- Read `data/motion-tokens-guide.md` for accessibility rules
- Optional: motion audit report from `ds-motion-audit` (if extraction mode)

## Workflow

### Interactive Elicitation

1. **Mode Selection**
   - **Greenfield:** Define motion tokens from scratch using the standard schema
   - **Extraction:** Extract from existing codebase and normalize to schema
   - **Hybrid:** Start from schema, overlay with extracted values

2. **Gather Parameters**
   - Target project path (for extraction mode)
   - Brand motion personality: "playful" (spring/bounce) | "professional" (ease-in-out) | "minimal" (quick/linear) | "dramatic" (slow/emphasized)
   - Supported animation libraries: CSS-only | Framer Motion | GSAP | mixed
   - Theme modes: default | dark | brand-A | brand-B

### Steps

1. **Load Schema Reference**
   - Read `data/motion-tokens-schema.yaml`
   - Validate schema version compatibility
   - Check: schema loaded AND version == "1.0.0" -- log "Schema loaded"

2. **Define or Extract Primitive Tokens**
   - **Greenfield:** Use standard scale from schema, adjust for brand personality
   - **Extraction:** Grep all duration/easing values, cluster, map to scale
   - Output: primitive token set (duration x8, easing x7, stagger x4)
   - Check: all 3 primitive categories populated -- log "Primitive tokens: {N} duration, {N} easing, {N} stagger"

3. **Define Semantic Tokens**
   - Map primitives to semantic intents: enter, exit, feedback, expand, collapse, hero, page, scroll-reveal
   - Each semantic token references exactly one primitive (no literal values)
   - Check: all 8 semantic tokens defined AND each references a primitive -- log "Semantic tokens defined"

4. **Define Component Tokens (Optional)**
   - For each interactive component, check if default semantics suffice
   - Override only where component behavior differs from semantic default
   - Check: component overrides reference only semantic tokens -- log "{N} component overrides defined"

5. **Generate CSS Custom Properties**
   - Emit `:root {}` block with all tokens as CSS custom properties
   - Emit `@media (prefers-reduced-motion: reduce)` block zeroing durations and staggers
   - Check: CSS output is valid AND reduced-motion block present -- log "CSS output generated"

6. **Generate JSON (DTCG Format)**
   - Emit `motion-tokens.json` following DTCG 2025.10 format
   - Include `$type`, `$value`, `$description` for every token
   - Check: JSON is valid AND all tokens have required fields -- log "DTCG JSON generated"

7. **Generate TypeScript Export**
   - Emit `motion-tokens.ts` with typed token object
   - No runtime dependencies
   - Check: TS export is valid -- log "TypeScript export generated"

8. **Accessibility Gate**
   - Verify all durations have reduced-motion override
   - Verify no flash risk (no token enables >3 flashes/second)
   - Verify semantic token hierarchy is acyclic
   - Check: all a11y checks pass -- log "Accessibility gate PASSED"

## Output

- `motion-tokens.json` -- DTCG-compliant token definition
- `motion-tokens.css` -- CSS custom properties (default + reduced-motion)
- `motion-tokens.ts` -- TypeScript typed export
- `.state.yaml` updated

## Failure Handling

- **No existing animations found (extraction mode):** Fall back to greenfield mode with standard schema
- **Brand personality not specified:** Default to "professional" (ease-in-out dominant)
- **Conflicting extracted values:** Present clusters to user for resolution

## Success Criteria

- All 3 layers defined (primitive, semantic, component)
- DTCG format validated
- CSS output has `prefers-reduced-motion` block
- Zero hardcoded values in semantic/component layers (aliases only)
- TypeScript export is parseable
- Accessibility gate passed

## Related Data

- `squads/aiox-design/data/motion-tokens-schema.yaml`
- `squads/aiox-design/data/motion-tokens-guide.md`
- `squads/aiox-design/data/w3c-dtcg-spec-reference.md`

## Related Checklists

- `squads/aiox-design/checklists/motion-quality-checklist.md`
- `squads/aiox-design/checklists/ds-a11y-release-gate-checklist.md`

## Process Guards
- **On Fail:** Stop execution, capture evidence, and return remediation steps before proceeding.
