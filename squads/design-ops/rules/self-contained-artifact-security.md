# Self-Contained Artifact Security — Design Ops Provider

Applies to any self-contained HTML artifact, deck bundle, or embeddable prototype the provider emits (directly or indirectly through `aiox-design-starter`, `slides-creator`, or downstream consumers).

Absorbed from `agenmod/claw-design` (2026-04-18), hardened for public distribution and embedded iframe delivery.

## Why

Self-contained HTML artifacts are shipped to clients, embedded in email, opened in headless browsers for screenshot/PDF export, and sometimes published as public links. They execute arbitrary CDN-delivered code. Without pinning, a single CDN compromise — or a silent version bump — can break every historical artifact or inject malicious code into client-visible surfaces.

## Non-Negotiable Constraints

### Dependency Pinning

- **ALL** CDN-delivered dependencies MUST be pinned to an exact version. No `@latest`, no major-only pins (`@18`), no range pins (`^18.2.0`).
- **ALL** CDN `<script>` tags for libraries (React, React-DOM, Babel, Vue, htmx, Alpine, Chart.js, D3, etc.) MUST include a **subresource integrity** (`integrity="sha384-..."`) attribute and `crossorigin="anonymous"`.
- Integrity hashes are generated at artifact creation time and stored in the artifact manifest. They are not regenerated on read — a missing or mismatched hash is a security event, not a bug.

Example (required form):

```html
<script
  src="https://unpkg.com/react@19.2.0/umd/react.production.min.js"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
></script>
```

### No Dynamic Code Execution

- **NEVER** use `eval()`, `new Function(...)`, `setTimeout("string", ...)`, `setInterval("string", ...)`.
- **NEVER** use `document.write()` — breaks with CSP and is a classic XSS vector.
- **NEVER** build DOM via `innerHTML` with user-controlled content. Use `textContent` + explicit element creation, or a library that escapes by default.

### Input Sanitization

- Any user-controllable string that reaches the DOM MUST pass through an escape/sanitize step.
- Template literals with user data in HTML context are a violation unless paired with an escape helper.
- SVG inline content from user input is a vector — sanitize before inline rendering (`DOMPurify` or an equivalent).

### Image & Asset Loading

- `<img>` rendered onto `<canvas>` MUST set `crossOrigin="anonymous"` BEFORE setting `src`. Otherwise `toDataURL()` and `getImageData()` taint the canvas and silently fail downstream operations.
- External assets (images, fonts, icons) SHOULD have integrity hashes when the artifact is self-contained and intended for archival.
- No remote-fetched scripts added at runtime (`appendChild(script)` with a remote `src` at runtime) without explicit integrity.

### JSX / React in CDN-delivered Artifacts

- Unique `styles` object naming when multiple React components share the same global scope. Collisions cause silent styling drift.
- Global sharing pattern is explicit: `Object.assign(window, { MyComponent, MyHelper });` — never implicit global leakage.
- Babel standalone in the browser is ONLY for prototypes; production artifacts pre-compile.

### Global State Hygiene

- Keys written to `window` MUST be namespaced (`window.__sinkra_designops_*`) to prevent host-page collisions when the artifact is embedded.
- Keys written to `localStorage` / `sessionStorage` MUST be namespaced per artifact (`design-ops:{artifact_id}:{key}`).
- No global `fetch` interception, no `XMLHttpRequest.prototype` mutation.

### CSP Compatibility

- Artifacts MUST remain functional under a strict Content-Security-Policy: `default-src 'self'; script-src 'self' https://<pinned-cdn>` with integrity.
- `unsafe-inline` and `unsafe-eval` MUST NOT be required for the artifact to run.

## Violations

| Violation | Severity | Action |
|-----------|----------|--------|
| Missing integrity hash on CDN `<script>` | BLOCKER | Reject artifact publish |
| `eval`, `new Function`, `document.write` present | BLOCKER | Reject artifact publish |
| Unsanitized user content in DOM | BLOCKER | Reject artifact publish |
| Canvas image without `crossOrigin="anonymous"` | CRITICAL | Block unless archival artifact justifies |
| Unnamespaced `window`/`localStorage` keys | HIGH | Require rename before publish |
| Range/latest CDN pin | HIGH | Require exact pin |
| Missing integrity on CSS/font asset | MEDIUM | Advisory for archival artifacts |

## Enforcement (Future Wiring)

A validator is queued for the artifact-creation capability (Wave C). Until then, this rule is advisory — reviewed manually by `@design-chief` at artifact publish time.

```
# Planned (Wave C)
node squads/design-ops/scripts/validate-artifact-security.cjs \
  --target outputs/design-ops/{business}/artifacts/{slug}/index.html
```

## Reference

- External source: `agenmod/claw-design` — claude-design-sys-prompt.txt (2026-04-18)
- OWASP: Subresource Integrity (SRI), Content Security Policy (CSP)
- Related rule: `squads/design-ops/rules/ai-trope-guardrails.md`
- Related checklist: `squads/design-ops/checklists/dops-component-quality.yaml`
- Companion spec: `squads/design-ops/data/artifact-file-governance.yaml`
