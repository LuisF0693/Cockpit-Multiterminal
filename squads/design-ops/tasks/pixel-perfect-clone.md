# Pixel-Perfect Clone Task

> Task ID: pixel-perfect-clone
> Owner: `design-chief`
> Version: 1.0.0
> v4.0-compatible: true
> Command: `*pixel-perfect-clone {url} {route}`
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[fetch_website, browser_screenshot]` · enables: `[design-compare, validate-design-fidelity]` · workflow: `clone-fidelity-loop`

## Description

Clones an external page (e.g. `anthropic.com/learn`) into a local route with verified pixel fidelity. Forces a Generator-Critic visual loop instead of self-reported "matches the original" claims.

**Use case:** When user asks to clone/replicate a public web page and the output must be pixel-perfect against the live source. Replaces the failure mode of generating from "brand memory" → user complaint → patch cycle.

**Source heuristics:**
- `AN_KE_011` Compare Antes de Construir (visual instance: read official screenshot before generating TSX)
- `AN_KE_045` Subtraction First Strategy (visual instance: zero invented decorative elements)
- `AN_KE_160` Byte-Diff as Source-of-Truth (visual instance: screenshot diff > self-report)
- `AN_KE_177` Lock Semantic Anchor Before Filling Slots (visual instance: lock screenshot reference before TSX)
- `AN_KE_204` Component-Property Override Detection (per-selector ground truth beats global token inference)
- `AN_KE_211` Page-Wide Reverification After Local Fix (planned — fix gutter section → grep same pattern across page)
- `AN_KE_212` Single Source of Layout Constraint (planned — one container utility, all sections)

## Why a Dedicated Task (vs `*design-compare`)

| Existing task | Scope | What it doesn't enforce |
|---------------|-------|------------------------|
| `*design-compare` | Compare static design reference vs local code, post-hoc | Doesn't FORCE pre-generation fetch + post-edit screenshot loop |
| `*validate-tokens` | Quality gate for hardcoded values | Visual fidelity not in scope |
| `*ds-critical-eye-compare` | Critical-eye review on live components | Same blind spot — no forced visual diff |

`*pixel-perfect-clone` adds the **closed-loop discipline**: Generator (writes TSX) → Critic (compares two screenshots) → Orchestrator (loops until visual delta < threshold or max 3 iterations). The user only sees the final result + side-by-side proof.

## SINKRA Contract

Domain: Tactical
atomic_layer: Molecule
executor: design-chief
Input:
- official_url
- local_route
- viewport_set (default: 1440x900 + 390x844)
- max_iterations (default: 3)
Output:
- pixel_perfect_clone_artifact (TSX + side-by-side proof)
- fidelity_report (per-dimension score)
pre_condition:
- official URL is reachable AND local route is buildable
- screenshot tool available (fetch_website OR browser_screenshot)
post_condition:
- side-by-side proof attached to handoff
- zero CRITICAL fidelity issues OR escalated to user with explicit deltas
- DESIGN.md (if app has one) was consulted before generation
performance:
- iteration cap respected; loop never exceeds max_iterations
Completion Criteria:
- side-by-side proof saved to outputs/design-ops/pixel-perfect/{slug}/
- fidelity_score >= threshold (default 90%) OR documented exception
- zero invented decorative elements (Subtraction gate)
- single container utility across all sections (Singleton gate)

---

## Input Parameters

### `url` (required)
Canonical URL of the page to clone. Must be publicly reachable.

Examples:
- `https://www.anthropic.com/learn`
- `https://www.anthropic.com/news`
- `https://docs.claude.com/api`

### `route` (required)
Local route path where the clone will be rendered.

Examples:
- `/learn`
- `/news`
- `/research`

### `viewport_set` (optional, default: `desktop+mobile`)
Comma-separated viewports to validate.

| Preset | Viewports |
|--------|-----------|
| `desktop+mobile` (default) | 1440×900, 390×844 |
| `desktop-only` | 1440×900 |
| `full` | 1920×1080, 1440×900, 1024×768, 390×844 |

### `max_iterations` (optional, default: 3)
Hard cap on Generator → Critic → Generator loop. After N iterations without convergence, escalate to user with explicit delta report.

### `fidelity_threshold` (optional, default: 0.90)
Minimum fidelity score (weighted across dimensions) for the loop to terminate as PASS. Below this, loop continues OR escalates if `max_iterations` reached.

---

## Workflow

### Phase 0: Anchor Lock (AN_KE_177 visual instance)

**Goal:** Lock the visual reference BEFORE writing any TSX.

**Style fingerprint pre-step:** before fetching screenshots, run extract-from-url
on the same URL to obtain `style-fingerprint.json` (per `data/style-fingerprints.yaml`).
The detected archetype primes the agent's expectations:

- shadcn-neutral target → expect minimal shadows, near-mono palette, system font
- apple-glass target → expect backdrop-filter, hairline borders, SF Pro
- carbon-enterprise target → expect square corners, 8px-grid, IBM Plex
- marketing-gradient target → expect gradients, hero typography, large vertical sections

Without the fingerprint, the agent can render shadcn-neutral when target is
apple-glass and only catch it after pixel diff. With the fingerprint, the agent
self-corrects archetype before the first TSX line.

1. **Fetch official screenshots** for every viewport in `viewport_set`:
   ```bash
   fetch_website {url} --format=screenshot --viewport={w}x{h}
   ```
   Save to: `outputs/design-ops/pixel-perfect/{slug}/ref-{viewport}.png`

2. **Inventory blocks** in the official screenshot. Output structured list:
   ```yaml
   official_inventory:
     hero:
       headline: "..."
       subhead: "..."
       cta: "..." (if any)
     sections:
       - id: "section-1"
         type: "card-grid"
         columns: 3
         items: 6
       - id: "section-2"
         type: "list"
         items: 12
       - id: "footer"
   ```
   This inventory is the **anti-invention contract** (AN_KE_045): nothing not in this list ships.

3. **Consult DESIGN.md** if the app has one (`apps/{name}/DESIGN.md`). DESIGN.md is SOT for tokens. Map official inventory items to existing tokens before code gen.

4. **Save anchor manifest** to `outputs/design-ops/pixel-perfect/{slug}/anchor.yaml`:
   ```yaml
   url: "{url}"
   route: "{route}"
   captured_at: "{ISO-8601}"
   viewports: [...]
   inventory: {...}
   design_md_consulted: true|false
   ```

**Gate G0 (anchor lock):** abort if any viewport screenshot fails or inventory is empty.

### Phase 1: Token Extraction (Measure-Don't-Guess — AN_KE_204)

**Goal:** Extract numerical tokens from the official source, not from "brand memory".

1. **Fetch official source** as markdown + computed CSS where possible:
   ```bash
   fetch_website {url} --format=markdown --include-css
   ```

2. **Per-component extraction** (AN_KE_204):
   - Parse CSS rules per component selector (`.btn`, `.card`, `.input`, `header`, `footer`)
   - For each (component × property), aggregate `most_common` value
   - Emit `outputs/design-ops/pixel-perfect/{slug}/tokens-extracted.yaml`:
     ```yaml
     extracted:
       typography:
         hero_h1:
           font_size: "80px"          # measured, not guessed
           font_weight: 500
           line_height: 1.1
       layout:
         container:
           max_width: "1280px"
           padding_x: "24px"
       components:
         button:
           border_radius: "0px"        # ground truth (per-selector), even if --radius-md=8
           padding: "12px 24px"
     ```

3. **Resolution rule (AN_KE_204):** if extracted per-selector value diverges from `:root` declaration, **per-selector wins**. Document divergence in tokens-extracted.yaml.

**Gate G1 (token extraction):** if extraction yields < N tokens (heuristic: hero font-size + container max-width + 1+ component border-radius), abort and escalate — source is too dynamic to extract mechanically.

### Phase 2: Generator (writes/edits TSX)

**Goal:** Generate TSX matching the anchor + extracted tokens.

1. **Read anchor.yaml + tokens-extracted.yaml + DESIGN.md** as required context.

2. **Singleton container check (AN_KE_212):**
   - Decide ONE container utility for the page (`container-edge` or equivalent).
   - All sections MUST use the same utility — no per-section `max-w-*` mixing.
   - Exception: full-bleed sections explicitly declare `w-screen` + center inner content with same utility.

3. **Generate TSX** for the route. Constraints:
   - ZERO invented decorative elements (AN_KE_045): no SVG illustrations, newsletter cards, gradients not in source
   - Missing assets → neutral placeholder (`bg-muted` with correct aspect-ratio + `aria-label="placeholder"`)
   - Use semantic tokens from DESIGN.md or extracted tokens; no arbitrary `text-[120px]` chutes

4. **Single `<h1>` per page** (a11y baseline).

**Gate G2 (generation):** lint passes, build succeeds, route renders without runtime errors.

### Phase 3: Critic (visual diff)

**Goal:** Mechanical comparison instead of self-report (AN_KE_160 visual instance).

For each viewport:

1. **Screenshot local route:**
   ```bash
   navigate_to_sandbox {route} --viewport={w}x{h}
   screenshot --output=outputs/design-ops/pixel-perfect/{slug}/ours-{viewport}.png
   ```

2. **Run multimodal Critic** comparing `ref-{viewport}.png` vs `ours-{viewport}.png`. Output JSON:
   ```json
   {
     "viewport": "1440x900",
     "approved": false,
     "fidelity_score": 0.78,
     "issues": [
       {
         "dimension": "typography",
         "severity": "high",
         "description": "Hero h1 is ~120px in ours, ~80px in ref",
         "fix_hint": "Replace text-[120px] with text-[80px] or clamp(60px, 8vw, 84px)",
         "file_hint": "src/pages/Learn.tsx"
       },
       {
         "dimension": "content",
         "severity": "high",
         "description": "Newsletter card present in ours, absent in ref (Subtraction violation)",
         "fix_hint": "Remove <NewsletterCard /> block",
         "file_hint": "src/pages/Learn.tsx:142"
       },
       {
         "dimension": "layout",
         "severity": "medium",
         "description": "Section 2 uses max-w-7xl px-4 while sections 1, 3 use container-edge (Singleton violation)",
         "fix_hint": "Replace with container-edge"
       }
     ]
   }
   ```

3. **Save side-by-side proof:** compose `ref-{viewport}.png` and `ours-{viewport}.png` into a 2-up image: `outputs/design-ops/pixel-perfect/{slug}/diff-iter{n}-{viewport}.png`

**Critic dimensions (weighted):**

| Dimension | Weight | What is measured |
|-----------|-------:|------------------|
| Typography (font-size, weight, line-height) | 25% | Per-element comparison |
| Color & background (no "white islands", paleta correta) | 20% | Pixel sampling at known regions |
| Layout (container, gutters, grid singleton) | 20% | Container utility consistency + max-width + padding |
| Vertical spacing (section gaps, padding) | 15% | Inter-section pixel measurement |
| Content inventory (no invented blocks, all ref blocks present) | 15% | Block-by-block diff against `anchor.yaml#inventory` |
| Effects (shadow, radius, border) | 5% | Per-component computed |

`fidelity_score = Σ (dimension_score × weight)`

### Phase 4: Page-Wide Reverification (AN_KE_211 — abductive sweep)

**Goal:** When Critic flags an issue in section X, sweep the full page for the same pattern.

For every issue in Critic output:
1. Extract the offending pattern (e.g. `pb-32`, `text-[120px]`, `max-w-7xl px-4`)
2. Grep across the page file for the same pattern
3. If found in N other locations → batch-fix all in same iteration

**Anti-pattern blocked:** "fixed hero spacing → assume rest is fine". The sweep is mechanical, not optional.

### Phase 5: Loop or Terminate

```text
IF fidelity_score >= fidelity_threshold (default 0.90)
   → terminate PASS
   → emit fidelity-report.md + side-by-side proof
   → return control to user

ELSE IF iteration < max_iterations
   → apply Critic.fix_hints + Phase 4 sweep
   → return to Phase 3 (re-screenshot, re-critic)

ELSE (max iterations reached, still below threshold)
   → terminate ESCALATE
   → emit fidelity-report.md with explicit unresolved deltas
   → escalate to user: "Iteration cap reached. Unresolved: [...]"
```

---

## Output Structure

```
outputs/design-ops/pixel-perfect/{slug}/
├── anchor.yaml                          # Phase 0 anchor lock
├── tokens-extracted.yaml                # Phase 1 extraction
├── ref-{viewport}.png                   # Phase 0 official screenshots (per viewport)
├── ours-iter{n}-{viewport}.png          # Phase 3 local screenshots
├── diff-iter{n}-{viewport}.png          # Phase 3 side-by-side proof
├── critic-iter{n}.json                  # Phase 3 raw Critic output
├── fidelity-report.md                   # Final aggregated report
└── handoff.md                           # SINKRA-compliant handoff
```

`{slug}` = derived from URL path (e.g. `anthropic-learn`, `claude-docs-api`).

---

## Failure Handling

- **`fetch_website` blocked / rate-limited:** abort Phase 0; escalate "anchor lock failed: cannot capture official reference. Pause until source reachable." Do NOT generate from memory.
- **`navigate_to_sandbox` unavailable:** abort Phase 3; escalate "visual diff loop unavailable: switching to manual mode. User must paste local screenshot."
- **Token extraction yields zero values:** abort Phase 1; escalate "source CSS too dynamic for mechanical extraction. Recommend manual `*design-compare` with user-provided design tokens."
- **Iteration cap reached without convergence:** terminate with ESCALATE verdict; emit explicit unresolved deltas + recommend either (a) increase `max_iterations`, (b) split route into smaller chunks, (c) accept current fidelity with documented exception.
- **DESIGN.md absent for app:** WARN only (Phase 0 step 3); recommend running `*emit-design-md` task before re-running `*pixel-perfect-clone`. Do NOT block.

---

## Success Criteria

- [ ] Anchor locked: official screenshots captured for all viewports BEFORE any TSX written
- [ ] Inventory documented: block-by-block list of what exists in source
- [ ] Tokens extracted: typography + container + per-component values measured (not guessed)
- [ ] DESIGN.md consulted (if app has one)
- [ ] Generator produced TSX with zero invented blocks (passes Subtraction gate)
- [ ] Singleton container check passes (one utility, all sections)
- [ ] Critic loop ran ≥ 1 iteration with side-by-side proof per viewport
- [ ] Final fidelity_score ≥ fidelity_threshold OR explicit ESCALATE with deltas
- [ ] Side-by-side proof saved + referenced in handoff

---

## Anti-Patterns Blocked by This Task

| Anti-pattern | Source heuristic | Phase that blocks |
|--------------|------------------|-------------------|
| Generate TSX from "brand memory" without re-fetching | AN_KE_177 (anchor lock) | Phase 0 (G0 gate) |
| Chute `text-[120px]` based on "feeling" | AN_KE_204 (measure, not guess) | Phase 1 (G1 gate) |
| Invent newsletter card / decorative SVG to fill space | AN_KE_045 (Subtraction) | Phase 2 + Phase 3 (Critic content dim) |
| Self-report "matches the original" without screenshot | AN_KE_160 (mechanical diff) | Phase 3 (Critic required) |
| Fix one section, ignore same pattern elsewhere | AN_KE_211 (abductive sweep) | Phase 4 (mandatory grep) |
| Mix `max-w-7xl` + `container-edge` + `max-w-[1280px]` | AN_KE_212 (Singleton) | Phase 2 (Singleton check) + Critic layout dim |
| Skip iteration loop because "I'm confident" | AN_KE_160 + AN_KE_011 | Phase 5 (loop is unconditional) |

---

## Example Usage

```bash
# Clone Anthropic Learn page
*pixel-perfect-clone https://www.anthropic.com/learn /learn

# Clone with desktop-only validation
*pixel-perfect-clone https://www.anthropic.com/news /news --viewport-set=desktop-only

# Tighter convergence
*pixel-perfect-clone https://www.anthropic.com/research /research --fidelity-threshold=0.95 --max-iterations=5
```

---

## Integration with Other Tasks

| Before `*pixel-perfect-clone` | Use Case |
|--------------------------------|----------|
| `*emit-design-md` | App lacks DESIGN.md — emit one from existing tokens before clone |
| `*ds-extract-tokens` | Build token baseline if app is greenfield |

| After `*pixel-perfect-clone` | Use Case |
|-------------------------------|----------|
| `*validate-tokens` | Ensure final TSX uses semantic tokens, not hardcoded hex |
| `*contrast-matrix` | Validate accessibility of final color choices |
| `*ds-visual-regression` | Lock current state as visual regression baseline |

---

## Quality Gate

> **GATE: Pixel-Perfect Acceptance** — Required before declaring clone "shipped"

| Metric | Threshold | Action if FAIL |
|--------|-----------|----------------|
| Fidelity score (weighted) | ≥ 0.90 | Iterate (Phase 5 loop) OR escalate |
| Invented blocks | = 0 | Remove invented blocks; re-screenshot |
| Container utility consistency | 100% (1 utility, N sections) | Replace per-section utilities with singleton |
| Zero "white islands" between sections | Visual sweep | Apply background to `<body>` or `<html>` (not just section) |
| `<h1>` count per page | = 1 | Demote duplicate h1s to h2/h3 |

---

## Related

- **Skill:** `.claude/skills/design-system/SKILL.md` (consumer)
- **Rule:** `squads/design-ops/rules/design-system-fidelity.md`
- **Heuristics:** AN_KE_011, AN_KE_045, AN_KE_160, AN_KE_177, AN_KE_204, AN_KE_211 (planned), AN_KE_212 (planned)
- **Related task:** `squads/design-ops/tasks/design-compare.md` (post-hoc design vs code comparison)
- **Related task:** `squads/design-ops/tasks/validate-design-fidelity.md` (token usage validation)
- **Related task:** `squads/design-ops/tasks/emit-design-md.md` (prerequisite if DESIGN.md missing)

## Process Guards

- **On Fail:** Stop execution, capture evidence (anchor.yaml + last critic-iter*.json + side-by-side proof), and return remediation steps before proceeding.
- **Iteration cap:** Hard limit at `max_iterations`. Loop NEVER exceeds, even if "almost there". Escalate instead.
- **Anchor immutability:** anchor.yaml is captured ONCE per `{slug}`. Re-running `*pixel-perfect-clone` re-uses the existing anchor unless `--re-anchor` flag is passed.
