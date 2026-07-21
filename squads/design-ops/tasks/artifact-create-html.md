# Create HTML Artifact (Phase 04 — BUILD runtime for html_prototype)

> Task ID: artifact-create-html
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[dops-materialize-brief, dops-resolve-ds-context, dops-capture-assumptions]` · enables: `[dops-show-early-feedback, artifact-verify-postbuild]` · workflow: `wf-artifact-creation-loop`

## Description

HTML-specific runtime for Phase 04 BUILD when `kind = html_prototype`. Produces a single self-contained HTML file that honors `self-contained-artifact-security.md` (SRI + no-eval + CSP-compatible), inlines exact token values from the resolved DS context (copy-first per `ds-consistency-policy.md`), and optionally instruments the Tweak Protocol per `tweak-protocol-spec.yaml`. Invoked once per variant by `dops-generate-variants.md` when the kind matches.

This is the **minimum viable HTML runtime** for Wave C.1. Starter-component usage (`deck_stage`, `design_canvas`, device frames) remains forward-declared per `starter-components-catalog.yaml`; this task produces the contract-compliant shell and marks starters as deferred when requested.

## Output Schema

- **produces:**
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/variants/variant-{N}/index.html`
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/variants/variant-{N}/asset-manifest.yaml`
  - `outputs/design-ops/{business}/artifacts/{artifact_slug}/variants/variant-{N}/README.md`
- **consumed_by:** `dops-show-early-feedback`, `dops-iterate-artifact`, `artifact-verify-postbuild`

## Prerequisites

- `brief.yaml` materialized and kind resolved to `html_prototype`
- `ds-context.yaml` resolved (tokens + foundations + brandbook loaded)
- `assumptions.yaml` has zero remaining `guess`-classified entries
- Consistency model resolved to `copy-first` per `ds-consistency-policy.md`

## Workflow

### Steps

1. **Resolve Inputs**
   - Load `brief.yaml`, `ds-context.yaml`, `assumptions.yaml` from `{output_dir}/`
   - Extract: `surface_name`, `success_criteria[]`, `audience.device_mix`, `tokens`, `foundations`
   - Determine tweak-protocol opt-in: `brief.tweak_protocol.enabled` (default `false`)
   - Determine requested starters: `brief.starters_requested[]` (may be empty)

2. **Select Tailwind Delivery Path**
   - **Path 1 (default):** precompiled Tailwind CSS inlined. Pin version, compute SRI hash.
   - **Path 3 (fallback):** manual exact CSS with token values hardcoded. No Tailwind at all.
   - **Path 2 (REJECTED):** Tailwind Play CDN. Never use. See `REJECT-CLAW-004` in `design-heuristics-from-external-prompts.yaml`.
   - Record choice in `asset-manifest.yaml#tailwind_path`.

3. **Resolve Dependencies + SRI**
   - For every CDN-delivered `<script>` or `<link>`: pin to exact version (no `@latest`, no `^`, no major-only)
   - Compute `sha384` integrity hash per `self-contained-artifact-security.md`
   - Record: `url`, `version`, `integrity`, `crossorigin: anonymous` in `asset-manifest.yaml#dependencies[]`
   - If no CDN deps → record empty array + `self_contained: true`

4. **Inline Token Values from DS Context**
   - Extract exact hex/rem/px values from `ds-context.yaml` at creation time
   - Embed as CSS custom properties in `<style>` block
   - **Never** reference a token by name alone — always inline the resolved value
   - Record source provenance in `asset-manifest.yaml#token_provenance` (ds-context path + commit sha)

5. **Compose HTML Shell**
   - Template base: `squads/design-ops/templates/html-artifact-tmpl.html` (Wave C.1 Task 5)
   - Until template lands: follow `artifact-file-governance.yaml#naming#html_artifact` + enforce inline sections:
     - `<meta charset>`, `<meta viewport>`, `<meta description>`
     - `<style>` with inlined tokens + exact-value CSS
     - `<body>` with artifact markup
     - `<script>` block(s) for interaction; NO `eval`, `new Function`, `document.write`
   - Size: target ≤ 1000 lines per `artifact-file-governance.yaml#size_limits.by_kind.html_prototype`
   - Filename: `{kebab-case-name}.html` per naming convention

6. **Optional: Tweak Protocol Instrumentation**
   - If `brief.tweak_protocol.enabled == true`:
     - Embed `TWEAK_DEFAULS` block exactly as specified in `tweak-protocol-spec.yaml#tweak_defauls_block`
     - Register message listener BEFORE posting `__edit_mode_available` (ordering rule is the #1 failure mode)
     - Use canonical event types verbatim: `__activate_edit_mode`, `__deactivate_edit_mode`, `__edit_mode_available`, `__edit_mode_set_keys`
     - Mark `asset-manifest.yaml#tweak_protocol.instrumented: true` and list tweakable keys
   - If `false` (default): skip; mark `tweak_protocol.instrumented: false`
   - Wave C.1 Task 3 delivers runtime-side persistence; contract side (this task) is complete without it

7. **Optional: Starter Components (forward-declared)**
   - For each `brief.starters_requested[]` entry:
     - Validate against `starter-components-catalog.yaml#starters` — must be a known id
     - Wave C.1: **do not fetch/embed** starter runtime (not implemented yet). Mark in `asset-manifest.yaml#starters_deferred[]`:
       ```yaml
       - starter_id: {id}
         contract: starter-components-catalog.yaml#{id}
         status: forward_declared
         wave_c_runtime_target: Wave C.2
       ```
     - Produce a **stub placeholder** in the HTML (labeled DIV with `data-starter="{id}"`) so the consumer sees where it would go
   - If `brief.starters_requested[]` is empty → skip entirely

8. **Security Gate (inline self-check before emit)**
   - Grep the emitted HTML for violations per `self-contained-artifact-security.md`:
     - No `eval(`, `new Function(`, `document.write(`, `innerHTML =` with unsanitized content
     - No CDN `<script>` without `integrity="sha384-"`
     - No `window.` writes outside `window.__sinkra_designops_*` namespace
     - No `localStorage.setItem(` with un-namespaced key (must start with `design-ops:{artifact_id}:`)
   - If any violation found → halt; fix before continuing
   - This is a cheap self-check; the blocking gate lives in `artifact-verify-postbuild.md` (Wave C.1 Task 5)

9. **Emit Variant Directory**
   - Write `index.html` to `{output_dir}/variants/variant-{N}/`
   - Write `asset-manifest.yaml` alongside with:
     ```yaml
     artifact_id: {slug}
     variant_id: variant-{N}
     kind: html_prototype
     business: {business}
     created_at: {ISO-8601}
     tailwind_path: 1|3
     self_contained: true|false
     dependencies: [...]
     token_provenance: {...}
     tweak_protocol:
       instrumented: true|false
       tweakable_keys: [...]
     starters_deferred: [...]
     size_lines: {count}
     filename: {kebab-name}.html
     ```
   - Write `README.md` with: approach, rationale tying to one `success_criteria[N]`, tradeoffs, ai_trope_risks

10. **Update Convergence Inputs**
    - Append a variant entry to `{output_dir}/convergence.yaml#candidates[]` (file created/maintained by `dops-generate-variants.md`)
    - Do NOT decide convergence here — that's the generate-variants task

## Failure Handling

- **SRI computation fails (CDN unreachable):** halt; require user to unblock network OR switch to Path 3 (no CDN)
- **Token inlining produces empty values:** DS context is missing fields; halt + route to `dops-resolve-ds-context` for re-resolution
- **Emitted HTML exceeds 1000 lines:** apply `artifact-file-governance.yaml#module_splitting` — split into `index.html` + external `assets/{artifact}.js` + `assets/{artifact}.css`, re-compute SRI hashes for split-out files
- **Security self-check (Step 8) catches violation:** halt this variant generation; fix before emitting
- **Starter requested but not in catalog:** reject brief assumption; ask user to pick from `starter-components-catalog.yaml#starters` keys

## Success Criteria

- [ ] `{output_dir}/variants/variant-{N}/index.html` exists, is valid HTML5, parses without errors
- [ ] `asset-manifest.yaml` has all required fields (see Step 9)
- [ ] Every CDN dep has `integrity="sha384-..."` + `crossorigin="anonymous"` OR `self_contained: true`
- [ ] Tokens inlined as exact resolved values (no name-only references)
- [ ] File ≤ 1000 lines OR properly split with governance log
- [ ] Tweak protocol correctly instrumented when opted-in (listener-before-announce ordering)
- [ ] Starters requested are either resolved OR marked `starters_deferred` with Wave C.2 target
- [ ] Security self-check passed (Step 8) — no `eval`, no `document.write`, namespaced keys

## Anti-Patterns

- **"Use Tailwind Play CDN — it's faster."** — REJECTED (REJECT-CLAW-004). Runtime compilation in the browser defeats SRI and pins; use Path 1 or Path 3.
- **"Reference the token by `var(--aiox-primary)` without inlining."** — Breaks copy-first guarantee. The artifact must render correctly even if the workspace tokens change tomorrow.
- **"Post `__edit_mode_available` before registering the listener — it'll work most of the time."** — Single most common failure mode of the Tweak Protocol. Always register first.
- **"Use `@latest` since it's only a prototype."** — Prototype today, client artifact tomorrow. Pinning is non-negotiable from emit time.
- **"Embed a starter-components stub that actually runs."** — Starters are Wave C.2 runtime. Stub is a labeled placeholder, not executable code.
- **"Inline `eval(window.getUserInput())` for the calculator demo."** — Dynamic code execution is a BLOCKER violation. Use explicit switch-cases or a safe expression parser.

## SINKRA Contract

Domain: Tactical
atomic_layer: Molecule (HTML variant of P04 BUILD)
executor: design-chief
Input:
- design_brief_artifact (kind = html_prototype)
- ds_context_artifact
- assumptions_artifact
Output:
- variant_html_artifact (index.html + asset-manifest.yaml + README.md)
pre_condition:
- kind resolved to html_prototype
- copy-first consistency model selected
- DS context fully loaded
post_condition:
- self-contained HTML emitted
- SRI hashes computed for all CDN deps
- tokens inlined as exact values
- tweak protocol instrumented IFF opted-in
- security self-check passed
performance:
- per-variant HTML emission time tracked
- SRI compute time tracked
- output size (lines) tracked

## Related

- Policy: `squads/design-ops/rules/ds-consistency-policy.md` (copy-first selection)
- Rule: `squads/design-ops/rules/self-contained-artifact-security.md` (SRI + no-eval + CSP)
- Rule: `squads/design-ops/rules/ai-trope-guardrails.md` (visual guardrails during emit)
- Contract: `squads/design-ops/data/tweak-protocol-spec.yaml` (opt-in instrumentation)
- Contract: `squads/design-ops/data/starter-components-catalog.yaml` (forward-declared starters)
- Contract: `squads/design-ops/data/artifact-file-governance.yaml` (naming + size limits)
- Contract: `squads/design-ops/data/primitives-interface.yaml` (consumer boundary)
- Checklist: `squads/design-ops/checklists/dops-post-build-verification.yaml` (handoff target, Phase 07)
- Registry: `squads/design-ops/data/deliverable-kinds-registry.yaml#html_prototype`
- Template: `squads/design-ops/templates/html-artifact-tmpl.html` (planned — Wave C.1 Task 5)
- Caller: `squads/design-ops/tasks/dops-generate-variants.md` (dispatches to this task when kind matches)
- Workflow: `squads/design-ops/workflows/wf-artifact-creation-loop.yaml` (planned — Wave C.1 Task 4)
- ADR: `docs/adrs/ADR-018-design-ops-artifact-creation-capability.md`
- Skill: `.claude/skills/design-artifact-cycle/SKILL.md#phase-04-build`
