# Page Choreography (View Transitions API)

> Task ID: ds-page-choreography
> Agent: Brad Frost (Design System Architect)
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[ds-motion-primitives]` . enables: `[ds-kinetic-replication]` . workflow: `motion`

## Description

Define and implement Page Choreography patterns using the View Transitions API.
This task was separated from `ds-motion-primitives` (D4 — SRP) because View
Transitions API has sufficient complexity to warrant its own scope: cross-document
transitions (`@view-transition`), same-document transitions (React canary),
`::view-transition-group` customization, and fallback strategy for unsupported
browsers.

**Scope v1:** CSS-first approach. `@view-transition { navigation: auto; }` as
primary technique (zero JS). React `<ViewTransition>` documented as canary-only
progressive enhancement — not a dependency.

## Prerequisites

- Motion primitives must be defined (output of `ds-motion-primitives`)
- Read `data/motion-primitives-registry.yaml` for the 4 page choreography entries
- Read `data/motion-tokens-schema.yaml` for token references
- Review research report Section 7 (View Transitions API) for browser support data

## Workflow

### Interactive Elicitation

1. **Target Framework**
   - CSS-only (cross-document, zero JS)
   - CSS + React `<ViewTransition>` (canary, progressive enhancement)
   - CSS + Next.js experimental `viewTransition: true`

2. **Transition Scope**
   - Full page transitions (all 4 types)
   - Subset (select which types to implement)

3. **Gather Parameters**
   - Target project path
   - Router type: MPA (cross-document) or SPA (same-document)
   - Whether to include React canary patterns as progressive enhancement

### Steps

1. **Load Registry and Tokens**
   - Read `data/motion-primitives-registry.yaml` — locate `page_choreographies` section
   - Read motion tokens output (CSS custom properties)
   - Validate all token references resolve
   - Check: 4 page choreographies loaded (crossFade, sharedElement, listToDetail, routeSlide) -- log "Registry: 4 page choreographies loaded"

2. **Build Cross-Document Transitions (CSS-only, Primary Approach)**
   - Generate the global opt-in rule:
     ```css
     @view-transition { navigation: auto; }
     ```
   - For each of the 4 page choreography types, generate CSS patterns:
     - **crossFade:** Default View Transitions behavior. Customize duration/easing via `::view-transition-group(root)`.
     - **sharedElement:** Assign `view-transition-name` to shared elements. Customize morph via `::view-transition-group({name})`.
     - **listToDetail:** Assign `view-transition-name` dynamically per item. Use `::view-transition-group` for the expanding element.
     - **routeSlide:** Use `::view-transition-old(root)` and `::view-transition-new(root)` with directional slide @keyframes.
   - All durations/easings MUST reference CSS custom property tokens (zero hardcoded values)
   - Check: 4 CSS patterns generated -- log "Cross-document transitions built"

3. **Customize View Transition Pseudo-Elements**
   - Document and generate patterns for all 4 pseudo-elements:
     - `::view-transition` — the root overlay
     - `::view-transition-group({name})` — positions, sizes, animates between old/new
     - `::view-transition-old({name})` — outgoing snapshot (replaced content)
     - `::view-transition-new({name})` — incoming snapshot (replacement content)
   - Generate customization examples:
     ```css
     ::view-transition-group(hero) {
       animation-duration: var(--motion-duration-moderate);
       animation-timing-function: var(--motion-easing-ease-in-out);
     }

     ::view-transition-old(hero) {
       animation: var(--motion-duration-base) var(--motion-easing-ease-in) fadeOut;
     }

     ::view-transition-new(hero) {
       animation: var(--motion-duration-base) var(--motion-easing-ease-out) fadeIn;
     }
     ```
   - Check: pseudo-element patterns documented -- log "Pseudo-element customization complete"

4. **Document React `<ViewTransition>` (Canary, Progressive Enhancement)**
   - Document the React canary API as progressive enhancement ONLY:
     ```jsx
     import { ViewTransition, startTransition } from 'react';

     // Shared element morph
     <ViewTransition name="hero-image">
       <img src={hero} />
     </ViewTransition>

     // Trigger navigation
     startTransition(() => setRoute('/detail'));
     ```
   - Document the 4 React triggers: `enter`, `exit`, `update`, `share`
   - Document Next.js 16.2+ experimental config:
     ```js
     // next.config.js
     module.exports = { experimental: { viewTransition: true } };
     ```
   - Clearly mark: "CANARY — Do not use in production without feature detection"
   - Check: React patterns documented -- log "React ViewTransition documented (canary)"

5. **Build Fallback Strategy (Browsers Without Support)**
   - Generate feature detection pattern:
     ```css
     @supports (view-transition-name: none) {
       /* View Transitions API available */
     }
     ```
   - Generate JavaScript feature detection:
     ```javascript
     if (!document.startViewTransition) {
       // Fallback: basic CSS crossfade
     }
     ```
   - For each choreography type, define fallback behavior:
     - **crossFade:** CSS `opacity` transition on page swap (basic fade)
     - **sharedElement:** No morph, instant swap with `fadeIn` primitive
     - **listToDetail:** No morph, standard navigation with `slideIn` primitive
     - **routeSlide:** CSS `transform: translateX()` transition
   - All fallbacks use existing motion primitives from the registry
   - Check: fallbacks generated for 4 types -- log "Fallbacks: 4 types with graceful degradation"

6. **Accessibility Pass**
   - Generate `@media (prefers-reduced-motion: reduce)` overrides:
     - crossFade: reduce duration to 100ms, remove any scale/blur effects
     - sharedElement: instant swap (no morph animation), maintain layout continuity
     - listToDetail: instant expand, no animation
     - routeSlide: instant swap, no slide
   - Strategy follows D8: "reduced, not removed" for crossFade (functional), "remove" for decorative transitions
   - Check: all 4 choreographies have reduced-motion strategy -- log "A11y pass complete"

7. **Generate Catalog Documentation**
   - For each page choreography type:
     - Description and use case
     - CSS pattern (primary)
     - React pattern (progressive enhancement, canary)
     - Reduced-motion behavior
     - Fallback behavior
     - Browser support table
   - Browser support summary:
     - Same-document: 90.54% (Chrome 111+, Safari 18+, Firefox 144+)
     - Cross-document: ~75-80% (Chrome 126+, Safari 18.1+, Firefox: not supported)
     - `match-element`: ~70% (Chrome 137+, Safari 18.4+, Firefox 144+)
   - Check: catalog generated -- log "Catalog: 4 page choreographies documented"

## Output

- `page-choreography.css` -- Cross-document transition rules, pseudo-element customizations, fallbacks, reduced-motion overrides
- `page-choreography-catalog.md` -- Visual catalog with usage guide, browser support, fallback matrix
- `.state.yaml` updated

## Failure Handling

- **Motion primitives not built:** Halt with error "Run ds-motion-primitives first (primitives required for fallback patterns)"
- **Motion tokens not found:** Prompt user for token file path or generate inline values with `/* TODO: map to token */`
- **Browser does not support View Transitions:** Fallback patterns activate automatically (step 5)
- **React `<ViewTransition>` not available:** Skip React patterns, CSS-only output (this is the default and preferred approach)

## Success Criteria

- 4 page choreography types implemented: crossFade, sharedElement, listToDetail, routeSlide
- CSS `@view-transition { navigation: auto; }` as primary approach (zero JS required)
- All `::view-transition-group`, `::view-transition-old`, `::view-transition-new` customization patterns documented
- React `<ViewTransition>` documented as canary progressive enhancement (not a dependency)
- Fallback for all 4 types using existing motion primitives
- All durations/easings reference CSS custom property tokens (zero hardcoded values)
- All have reduced-motion strategy following D8 ("reduced, not removed")
- Browser support table included

## Related Data

- `squads/aiox-design/data/motion-primitives-registry.yaml`
- `squads/aiox-design/data/motion-tokens-schema.yaml`
- `squads/aiox-design/data/motion-tokens-guide.md`
- `docs/research/2026-03-21-kinetic-design-system/02-research-report.md` (Section 7)

## Related Checklists

- `squads/aiox-design/checklists/motion-quality-checklist.md`
- `squads/aiox-design/checklists/ds-a11y-release-gate-checklist.md`

## Process Guards
- **On Fail:** Stop execution, capture evidence, and return remediation steps before proceeding.
