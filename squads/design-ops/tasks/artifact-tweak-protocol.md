# Instrument Artifact with Tweak Protocol (Phase 06 — ITERATE support)

> Task ID: artifact-tweak-protocol
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[artifact-create-html]` · enables: `[dops-iterate-artifact, artifact-verify-postbuild]` · workflow: `wf-artifact-creation-loop`

## Description

Applies the Tweak Protocol (`tweak-protocol-spec.yaml`) to a self-contained HTML artifact so a host page can live-edit a declared set of parameters (colors, sizes, toggles) and persist changes back to disk. This is the **contract-side** task — it instruments the artifact. The **runtime-side** (host toolbar + file persistence) lives in `apps/aiox-design-starter/src/lib/tweak/` and is invoked by consumers that host the artifact iframe.

Per founder decision (ADR-018 + handoff 2026-04-18): "contract in squad, runtime in starter." This task owns the contract; the starter owns execution.

## Output Schema

- **produces:**
  - updates existing `{output_dir}/variants/variant-{N}/index.html` in-place with Tweak instrumentation
  - updates `{output_dir}/variants/variant-{N}/asset-manifest.yaml#tweak_protocol`
  - creates `{output_dir}/variants/variant-{N}/tweak-keys.yaml` (tweakable key registry)
- **consumed_by:** `artifact-verify-postbuild` (validates conformance via `validate-tweak-protocol-conformance.cjs`)

## Prerequisites

- Variant HTML emitted by `artifact-create-html.md`
- `brief.tweak_protocol.enabled == true`
- `brief.tweak_protocol.tweakable_keys[]` non-empty (at least one key the user can tweak)

## Workflow

### Steps

1. **Resolve Tweakable Keys**
   - Read `brief.tweak_protocol.tweakable_keys[]` — each entry has `{key, type, default, label, group?}`
   - Validate types against `tweak-protocol-spec.yaml#tweak_defauls_block#content_rules` (JSON primitives only)
   - Reject non-primitive types (functions, symbols, expressions) — surface error to user, halt

2. **Inject TWEAK_DEFAULS Block**
   - Insert exactly ONE `<script>` block containing:
     ```js
     const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
       "key1": default1,
       "key2": default2
     }/*EDITMODE-END*/;
     ```
   - Markers are literal — the host parses on them. Do NOT add whitespace inside marker comments.
   - Double-quoted keys, JSON-valid primitives, no trailing commas.
   - Validate the JSON between markers parses via `JSON.parse(...)` before emitting.

3. **Register Message Listener BEFORE Announcing Availability**
   - This is the ordering rule (`tweak-protocol-spec.yaml#event_sequence#ordering_rule`). Violating it is the #1 failure mode.
   - Emit in this exact order inside the inline script:
     ```js
     // (a) Register listener FIRST
     window.addEventListener('message', (e) => {
       if (e.data.type === '__activate_edit_mode') { showTweakPanel(); }
       else if (e.data.type === '__deactivate_edit_mode') { hideTweakPanel(); }
     });
     // (b) THEN announce availability
     window.parent.postMessage({type: '__edit_mode_available'}, '*');
     ```
   - Use event types verbatim — do NOT invent new `__edit_mode_*` variants (namespace collision).

4. **Wire Live Apply + Persist on Change**
   - When the user changes a value in the panel, emit BOTH:
     - Local mutation: apply the change to the DOM/state immediately (live preview)
     - Parent postMessage:
       ```js
       window.parent.postMessage({
         type: '__edit_mode_set_keys',
         edits: { [key]: value }
       }, '*');
       ```
   - Semantics: partial updates — only included keys are merged by the host. Never send the whole TWEAK_DEFAULS back.

5. **Render Minimal Tweak Panel**
   - Default positioning: fixed overlay (corner/edge), hidden until `__activate_edit_mode` fires.
   - Per tweakable: label + control matching `type`:
     - `string` → text input OR select if `options[]` present
     - `number` → range slider (min/max from brief) OR numeric input
     - `boolean` → toggle/switch
     - `color` → color picker (string value, hex preferred)
   - Group controls by `group` field when present (collapsible sections).
   - Accessibility: every control labeled, keyboard-reachable, focus visible, changes announced via `aria-live`.

6. **Namespace Globals**
   - Any state the panel needs on `window` MUST use `window.__sinkra_designops_tweak_*` namespace per `self-contained-artifact-security.md`.
   - No global `fetch` interception, no `XMLHttpRequest.prototype` mutation.

7. **Security Self-Check**
   - Grep emitted HTML for:
     - Exactly ONE `/*EDITMODE-BEGIN*/ ... /*EDITMODE-END*/` block
     - No `eval(`, `new Function(`, `document.write(`
     - Event types match canonical set exactly
     - Listener registered before `__edit_mode_available` postMessage (textual order check)
   - On any violation → halt; fix before continuing.

8. **Emit Tweak Keys Registry**
   - Write `tweak-keys.yaml` alongside `index.html`:
     ```yaml
     artifact_id: {slug}
     variant_id: variant-{N}
     protocol_version: "1.0.0"
     tweakable_keys:
       - key: {name}
         type: {string|number|boolean|color}
         default: {value}
         label: {human-readable}
         group: {optional-grouping}
         options: [...]  # optional
         min: ...        # optional (number)
         max: ...        # optional (number)
     ```
   - This registry is what the host uses to render the panel AND what `validate-tweak-protocol-conformance.cjs` validates against.

9. **Update Asset Manifest**
   - Patch `asset-manifest.yaml#tweak_protocol`:
     ```yaml
     tweak_protocol:
       instrumented: true
       protocol_version: "1.0.0"
       tweakable_keys: [...]   # mirror tweak-keys.yaml for quick inspection
       host_runtime_target: apps/aiox-design-starter/src/lib/tweak/
     ```

## Failure Handling

- **User declares a tweakable key that isn't actually in the artifact DOM/state:** halt; ask user to either add the usage or remove the key
- **JSON between EDITMODE markers fails `JSON.parse(...)`:** halt; emit never publishes invalid JSON (host persistence would silently fail)
- **Multiple TWEAK_DEFAULS blocks detected in output:** consolidate into one; emit single canonical block
- **Event listener comes textually after `__edit_mode_available` postMessage:** re-order source; regenerate
- **Host runtime not available in target business:** mark `host_runtime_target` as "pending"; artifact still functions standalone (toggle has no host to talk to); user informed in delivery message

## Success Criteria

- [ ] Exactly one TWEAK_DEFAULS block between canonical markers
- [ ] JSON between markers parses cleanly via `JSON.parse(...)`
- [ ] Listener registered textually before `__edit_mode_available` postMessage
- [ ] All event types match `tweak-protocol-spec.yaml#message_schemas` exactly (no invented types)
- [ ] Panel controls match declared types; all keyboard-reachable with visible focus
- [ ] `tweak-keys.yaml` registry written and consumed-ready
- [ ] Globals namespaced under `window.__sinkra_designops_tweak_*`
- [ ] Asset manifest updated with `tweak_protocol.instrumented: true`

## Anti-Patterns

- **"Invent `__edit_mode_reset` to add a reset button."** — REJECTED. Namespace collision risk. Use standard event types only. Panel-side reset is local state; no new protocol event needed.
- **"Send the whole TWEAK_DEFAULS back on every change."** — Wastes IO and breaks partial-merge semantics. Send only the changed `{key: value}`.
- **"Register listener last, after everything else renders."** — Re-introduces the #1 failure mode. Listener is FIRST.
- **"Skip JSON validation — the default values are always valid."** — False economy. One broken quote ships silent data loss.
- **"Embed the panel HTML directly in the artifact's visible markup."** — Panel is an overlay; it must NOT mutate primary content when toggled off.
- **"Use localStorage to persist tweaks inside the artifact."** — Violates the contract. Persistence is the HOST's job. The artifact only emits `__edit_mode_set_keys`.

## SINKRA Contract

Domain: Tactical
atomic_layer: Molecule (Phase 06 iterate-support when tweak enabled)
executor: design-chief
Input:
- variant_html_artifact (from artifact-create-html)
- brief.tweak_protocol.tweakable_keys[]
Output:
- instrumented_variant_html (TWEAK_DEFAULS + listener + panel)
- tweak_keys_registry
- updated_asset_manifest
pre_condition:
- brief.tweak_protocol.enabled == true
- tweakable_keys declared with JSON-primitive types only
post_condition:
- exactly one TWEAK_DEFAULS block per artifact
- listener registered before announcement (textual order)
- partial-merge semantics on change events
- security self-check passed
performance:
- instrumentation overhead tracked (lines added)
- security self-check time tracked

## Host Runtime (pointer, not owned by this task)

The host-side runtime lives at `apps/aiox-design-starter/src/lib/tweak/` and owns:

- Detecting `__edit_mode_available` from artifact iframes
- Rendering the toolbar "Edit Mode" toggle per host
- Sending `__activate_edit_mode` / `__deactivate_edit_mode` to the artifact
- Receiving `__edit_mode_set_keys` events
- Merging edits into the artifact file's TWEAK_DEFAULS block
- Persisting via file write (server endpoint) or git commit (if configured)

**This task produces artifacts that are runtime-ready. The runtime is a starter-app concern and is scoped in a parallel track per handoff 2026-04-18.** Artifacts instrumented today remain correct when the runtime lands — the contract is frozen at v1.0.0.

## Related

- Contract: `squads/design-ops/data/tweak-protocol-spec.yaml` (authoritative protocol spec)
- Rule: `squads/design-ops/rules/self-contained-artifact-security.md` (namespace + no-eval constraints)
- Task: `squads/design-ops/tasks/artifact-create-html.md` (upstream — produces the variant HTML)
- Task: `squads/design-ops/tasks/artifact-verify-postbuild.md` (downstream — validates conformance, Wave C.1 Task 5)
- Script: `squads/design-ops/scripts/validate-tweak-protocol-conformance.cjs` (Wave C.1 Task 5)
- Checklist: `squads/design-ops/checklists/dops-post-build-verification.yaml#tweak_protocol_conformance`
- Runtime home: `apps/aiox-design-starter/src/lib/tweak/` (host-side, starter-app owned)
- ADR: `docs/adrs/ADR-018-design-ops-artifact-creation-capability.md`
- Handoff: `docs/sessions/2026-04/2026-04-18-claw-design-absorption-handoff.md` (contract/runtime split rationale)
