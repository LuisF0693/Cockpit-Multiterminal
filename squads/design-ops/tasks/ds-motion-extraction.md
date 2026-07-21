# Motion Extraction Pipeline (CDP + Playwright)

> Task ID: ds-motion-extraction
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[ds-motion-tokens, ds-motion-primitives]` . enables: `[ds-kinetic-replication]` . workflow: `motion`

## Description

Extract ALL animations from any live URL using Playwright + Chrome DevTools
Protocol (CDP) Animation Domain. The pipeline captures CSS animations, CSS
transitions, Web Animations API (including Framer Motion compiled output),
hover/active state diffs, and scroll-triggered effects. Output is a motion
map classifying each animation into the primitives registry.

This is the "game-changer" capability identified in the Kinetic Design System
research: no public tool does complete animation extraction today. The CDP
Animation Domain captures every animation that fires in the browser.

## Prerequisites

- Playwright installed (`npx playwright install chromium`)
- Motion primitives registry loaded (`data/motion-primitives-registry.yaml`)
- Motion tokens schema loaded (`data/motion-tokens-schema.yaml`)
- ETL extraction script available at `services/etl/extractors/motion-extractor.js`

## ETL Integration (D11)

This task defines WHAT to extract. The HOW is implemented by the ETL extraction
script at `services/etl/extractors/motion-extractor.js`.

The script exports `extractMotion(url, options)` which returns a MotionMap
conforming to `data/motion-map-schema.json`. The agent invokes the script;
the script handles Playwright lifecycle, CDP session, and classification.

```javascript
const { extractMotion } = require('services/etl/extractors/motion-extractor');

const motionMap = await extractMotion(targetUrl, {
  scope: 'full',       // 'full' | 'css-only' | 'cdp-only' | 'interactions'
  timeout: 30000       // ms
});
```

## Workflow

### Interactive Elicitation

1. **Target URL**
   - URL to extract animations from (required)
   - Multiple URLs for comparison (optional)

2. **Extraction Scope**
   - **Full:** All 5 phases (CSS + CDP + hover + scroll + classify)
   - **CSS-only:** Extract @keyframes, transitions, animation properties
   - **CDP-only:** Runtime animation capture via Animation Domain
   - **Interactions:** Hover/active state diffs only

3. **Output Format**
   - JSON motion map
   - JSON + recommended token mapping
   - JSON + generated code (CSS/Framer primitives)

### Steps

1. **Phase 1: Static CSS Extraction**
   - Open URL with Playwright
   - Extract all `@keyframes` rules via CSSOM (`CSSKeyframesRule`)
   - Extract all `transition` properties from ALL elements via `getComputedStyle`
   - Extract all `animation` properties (name, duration, timing, delay)
   - Filter elements with non-default transition-duration
   - Check: extraction complete -- log "Phase 1: {N} @keyframes, {N} transitions, {N} animation properties"

2. **Phase 2: CDP Runtime Animation Capture**
   - Create CDP session via `context.newCDPSession(page)`
   - Send `Animation.enable` to activate animation domain
   - Capture `Animation.animationStarted` events for all animations
   - For each animation capture: id, name, type (CSSTransition | CSSAnimation | WebAnimation), duration, delay, iterations, direction, fill, easing, keyframes
   - Wait for page load animations to settle (3s)
   - Check: CDP capture active -- log "Phase 2: {N} runtime animations captured (types: {breakdown})"

3. **Phase 3: Scroll-Triggered Animation Capture**
   - Smooth scroll to bottom of page (trigger scroll-driven animations)
   - Continue CDP capture during scroll
   - Detect IntersectionObserver-triggered elements (class additions, style changes)
   - Sample scroll position vs animation state at intervals
   - Check: scroll complete -- log "Phase 3: {N} scroll-triggered animations detected"

4. **Phase 4: Interaction State Capture**
   - For each interactive element (buttons, links, cards, inputs):
     - Capture `getComputedStyle` BEFORE hover
     - Execute `hover()` via Playwright
     - Capture `getComputedStyle` AFTER hover
     - Compute diff (properties that changed)
   - For buttons: capture `:active` state (mousedown/mouseup)
   - For magnetic elements: capture trajectory (move cursor at decreasing distances)
   - Check: interaction capture complete -- log "Phase 4: {N} hover diffs, {N} active diffs"

5. **Phase 5: Classification & Mapping**
   - For each captured animation:
     - Match to one of 10 primitives from registry based on animated properties
     - Detect compositions (multiple primitives firing together)
     - Detect choreographies (stagger patterns, scroll-bound timelines)
   - Map extracted durations to nearest token in duration scale
   - Map extracted easings to nearest token in easing palette
   - Detect stagger patterns from animation-delay sequences
   - Check: classification complete -- log "Phase 5: {N} primitives, {N} compositions, {N} choreographies identified"

6. **Synthesize Motion Token Recommendations**
   - Cluster all found durations -- propose duration scale
   - Cluster all found easings -- propose easing palette
   - Identify stagger patterns -- propose stagger scale
   - Compare with standard schema -- show delta
   - Check: synthesis complete -- log "Token synthesis: {N} duration clusters, {N} easing clusters"

7. **Generate Motion Map**
   - Compile all findings into `motion-map.json`
   - Include: per-element animation data, classification, token mapping
   - Include: confidence score per classification (ALTA/MEDIA/BAIXA)
   - Validate output against `data/motion-map-schema.json` (JSON Schema 2020-12)
   - Check: motion map generated AND schema-valid -- log "Motion map: {N} total entries (schema: PASS)"

## Output

- `motion-map.json` -- Complete animation catalog with classifications
- `motion-extraction-report.md` -- Human-readable summary
- `motion-token-recommendations.json` -- Proposed token values from extracted data
- `extraction-raw.json` -- Raw CDP + CSS data (debug artifact)
- `.state.yaml` updated

## CDP Animation Domain Reference

```javascript
// Key CDP commands used:
cdp.send('Animation.enable');               // Start capturing
cdp.on('Animation.animationStarted', fn);   // Each animation fires this
cdp.send('Animation.resolveAnimation', { animationId }); // Get RemoteObject

// Animation event payload:
// {
//   animation: {
//     id, name, pausedState, playState, playbackRate,
//     startTime, currentTime, type,
//     source: { delay, endDelay, duration, iterationStart,
//               iterations, fill, direction, easing,
//               keyframesRule: { name, keyframes: [{ offset, easing, ... }] } }
//   }
// }
```

## Failure Handling

- **Playwright not installed:** Provide install command and halt
- **CORS blocks CSSOM access:** Log blocked stylesheets, continue with CDP-only
- **No animations detected:** Report "Static page -- no motion layer found"
- **CDP session fails:** Fall back to CSS-only extraction (Phase 1 only)
- **Classification confidence < 50%:** Mark as "unclassified" and include raw data

## Success Criteria

- All 5 extraction phases completed (or gracefully degraded)
- motion-map.json generated with per-element entries
- Each animation classified to a primitive with confidence level
- Token recommendations derived from extracted values
- Report includes comparison with standard motion-tokens-schema

## Related Data

- `squads/design-system/data/motion-primitives-registry.yaml`
- `squads/design-system/data/motion-tokens-schema.yaml`
- `squads/design-system/data/motion-map-schema.json` (output schema -- motion-map.json MUST conform to this contract)
- `services/etl/extractors/motion-extractor.js` (ETL extraction script -- D11)
- `docs/research/2026-03-21-kinetic-design-system/02-research-report.md` (CDP reference code)
- `docs/research/2026-03-21-kinetic-design-system/03-recommendations.md` (pipeline architecture)

## Related Checklists

- `squads/design-system/checklists/motion-quality-checklist.md`
- `squads/design-system/checklists/ds-a11y-release-gate-checklist.md`

## Process Guards
- **On Fail:** Stop execution, capture evidence, and return remediation steps before proceeding.

## SINKRA Contract

Domain: Tactical
atomic_layer: Atom
executor: page-composer
Input:
- project_context
- design_system_context
Output:
- ds_motion_extraction_artifact
pre_condition:
- escopo do artefato e caminho alvo definidos
post_condition:
- artefato pronto para handoff e revisão
performance:
- produzir saída auditável com critérios explícitos
Completion Criteria:
- artefato principal gerado
- recomendações ou estrutura documentadas
- pronto para próximo gate
