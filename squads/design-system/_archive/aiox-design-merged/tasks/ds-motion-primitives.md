# Build Motion Primitives Library

> Task ID: ds-motion-primitives
> Agent: Brad Frost (Design System Architect)
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[ds-motion-tokens]` . enables: `[ds-motion-extraction]` . workflow: `motion`

## Description

Build the motion primitives library: 10 atomic animation effects, 7 compositions,
and 5 choreography patterns. Each primitive has dual implementation (CSS native +
Framer Motion). Compositions combine primitives. Choreographies orchestrate
multi-element sequences using GSAP ScrollTrigger and CSS scroll-driven animations.

## Prerequisites

- Motion tokens must be defined (output of `ds-motion-tokens`)
- Read `data/motion-primitives-registry.yaml` for the complete catalog
- Read `data/motion-tokens-schema.yaml` for token references

## Workflow

### Interactive Elicitation

1. **Scope Selection**
   - **Full:** Build all 10 primitives + 7 compositions + 5 choreographies
   - **Primitives Only:** Build 10 primitives (phase 1)
   - **Compositions:** Build compositions (requires primitives)
   - **Choreographies:** Build choreographies (requires compositions)

2. **Implementation Target**
   - CSS-only (no JS dependency)
   - CSS + Framer Motion (React)
   - CSS + Framer Motion + GSAP (full stack)

3. **Gather Parameters**
   - Target project path
   - Component library style: utility classes | CSS modules | styled-components
   - Motion tokens CSS path (where to import tokens from)

### Steps

1. **Load Registry and Tokens**
   - Read `data/motion-primitives-registry.yaml`
   - Read motion tokens output (CSS custom properties)
   - Validate all token references resolve
   - Check: registry loaded AND tokens available -- log "Registry: {N} primitives, {N} compositions, {N} choreographies"

2. **Build CSS Primitives (10)**
   For each primitive in registry:
   - Generate `@keyframes` rule using token CSS variables
   - Generate utility class with `animation-timeline: view()` for scroll-driven variant
   - Generate standard class with explicit `animation` shorthand
   - Ensure all durations/easings reference CSS custom properties (zero hardcoded values)
   - Check: 10 @keyframes generated AND each uses CSS vars -- log "CSS primitives built"

3. **Build Framer Motion Primitives (10)**
   For each primitive:
   - Generate variant object: `{ initial, animate, exit }` using token values
   - Generate `transition` config referencing token durations/easings
   - Export as named constant
   - Check: 10 Framer variants generated -- log "Framer Motion primitives built"

4. **Build Compositions (7)**
   For each composition:
   - Combine the listed primitives in sequence or parallel
   - CSS: chain `@keyframes` with `animation` shorthand (comma-separated)
   - Framer: compose variants using `AnimatePresence` and orchestration
   - Check: 7 compositions built -- log "Compositions built"

5. **Build Choreographies (5)**
   For choreographies requiring GSAP:
   - Generate GSAP ScrollTrigger configuration
   - Generate Lenis integration pattern
   - For CSS scroll-driven choreographies: use `animation-timeline` and `animation-range`
   - Check: 5 choreography patterns documented -- log "Choreographies built"

6. **Page Choreography**
   - MOVED to dedicated task: `ds-page-choreography`
   - View Transitions API complexity warrants separate scope (D4 — SRP)
   - See: `squads/aiox-design/tasks/ds-page-choreography.md`

7. **Accessibility Pass**
   - Every primitive has `reduced_motion` strategy documented
   - Generate `@media (prefers-reduced-motion: reduce)` overrides for each
   - Verify compositions degrade gracefully
   - Check: all primitives have reduced-motion fallback -- log "A11y pass complete"

8. **Generate Catalog Documentation**
   - Visual catalog: each primitive with description, params, code, a11y notes
   - Composition recipes: which primitives combine and how
   - Usage guidelines per Val Head 5-purpose framework
   - Check: catalog markdown generated -- log "Catalog generated"

## Output

- `motion-primitives.css` -- All CSS primitives, compositions, scroll-driven variants
- `motion-primitives.tsx` -- Framer Motion variants and compositions
- `motion-choreography.ts` -- GSAP choreography configurations
- `motion-catalog.md` -- Visual catalog with usage guide
- `.state.yaml` updated

## Failure Handling

- **Framer Motion not in project:** Skip Framer variants, CSS-only output
- **GSAP not in project:** Skip choreographies requiring GSAP, document as future
- **Token CSS not found:** Prompt user for token file path or generate inline

## Success Criteria

- 10 CSS primitives with @keyframes and utility classes
- 10 Framer Motion variants (if React project)
- 7 compositions combining primitives
- 5 choreography patterns documented
- All use CSS custom property tokens (zero hardcoded values)
- All have reduced-motion fallbacks
- Catalog with Val Head 5-purpose tagging

## Related Data

- `squads/aiox-design/data/motion-primitives-registry.yaml`
- `squads/aiox-design/data/motion-tokens-schema.yaml`
- `squads/aiox-design/data/motion-tokens-guide.md`

## Related Checklists

- `squads/aiox-design/checklists/motion-quality-checklist.md`
- `squads/aiox-design/checklists/ds-a11y-release-gate-checklist.md`

## Process Guards
- **On Fail:** Stop execution, capture evidence, and return remediation steps before proceeding.
