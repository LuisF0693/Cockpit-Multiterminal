# Audit Video Backgrounds — HTML, Performance & Accessibility

> Task ID: brad-video-bg-audit
> Owner: `design-chief`
> Version: 1.0.0
> v4.0-compatible: true
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[]` · enables: `[]` · workflow: `motion`

## Description

Scan the codebase for all `<video>` elements used as backgrounds. Validate HTML attributes, overlay legibility, mobile fallbacks, accessibility compliance, file sizes, and lazy loading. Reference: `data/video-backgrounds-guide.md`.

## Prerequisites

- Codebase with UI components
- Read `data/video-backgrounds-guide.md` for implementation standards

## Workflow

### Interactive Elicitation

1. **Gather Parameters**
   - Scan path (default: `src/` or `app/`)
   - Output directory
   - Performance budget (default: 15MB total per page)

### Steps

1. **Find All Video Elements**
   - Grep for `<video` tags across .tsx, .jsx, .html files
   - Grep for video-related React components (VideoBackground, VideoHero, MuxBackgroundVideo, etc.)
   - Grep for `<source` tags with video MIME types
   - Check: video element count >= 0 — log "Found {N} video elements across {F} files"

2. **Validate HTML Attributes (5 obrigatorios)**
   - For each `<video>` element, check presence of:
     - `autoplay` — required for background video
     - `muted` — required for autoplay to work cross-browser
     - `loop` — required for continuous playback
     - `playsInline` / `playsinline` — required to prevent iOS fullscreen
     - `preload="none"` — required for lazy loading
   - Also check for `poster` attribute (recommended)
   - Flag any missing attributes with file:line reference
   - Check: compliance = (elements with all 5 / total elements) * 100 — log "HTML attribute compliance: {pct}%"

3. **Validate Source Format Order**
   - Check that WebM source appears before MP4 source
   - Flag videos with only MP4 (missing WebM alternative)
   - Flag videos with no `<source>` children (inline `src` only)
   - Check: WebM-first count — log "{N}/{total} videos have correct WebM-first source order"

4. **Check Overlay for Text Legibility**
   - For each video container, check for overlay element (div with bg-black/*, gradient, rgba background)
   - Estimate contrast ratio of text over overlay
   - Flag video sections with text but no overlay
   - Check: overlay coverage = (videos with overlay / videos with text) * 100 — log "Overlay coverage: {pct}%"

5. **Check Mobile Fallback**
   - Search for `@media (max-width: 768px)` or responsive classes hiding video on mobile
   - Search for `hidden md:block` pattern (Tailwind) or equivalent
   - Search for poster/image fallback on mobile
   - Flag videos visible on mobile without fallback
   - Check: mobile fallback count — log "{N}/{total} videos have mobile fallback"

6. **Check prefers-reduced-motion Compliance**
   - Search for `prefers-reduced-motion` media queries affecting video elements
   - Search for JS-based reduced motion detection (matchMedia pattern)
   - Flag videos without reduced-motion handling
   - Check: coverage = (handled / total) * 100 — log "prefers-reduced-motion coverage: {pct}%"

7. **Check Intersection Observer (Lazy Play/Pause)**
   - Search for IntersectionObserver usage linked to video elements
   - Search for play()/pause() calls triggered by visibility
   - Flag videos that autoplay without visibility check
   - Check: lazy count — log "{N}/{total} videos use Intersection Observer"

8. **Audit Video File Sizes**
   - List all video files referenced in the codebase
   - Check file sizes against targets:
     - Hero: < 10MB
     - Section: < 3MB
     - Micro-loop: < 500KB
   - Calculate total video weight per page
   - Flag any file exceeding its target
   - Check: total weight — log "Total video weight: {size}MB (target: < 15MB/page)"

9. **Generate Video Background Audit Report**
   - Summary: total videos, compliance scores per check
   - HTML attribute compliance table
   - Source format order issues
   - Overlay coverage gaps
   - Mobile fallback gaps
   - Accessibility gaps (reduced-motion)
   - Performance gaps (file sizes, lazy loading)
   - Recommendations prioritized by severity

## Output

- `video-bg-audit-report.md` — Full audit with findings and recommendations
- `video-bg-gaps.md` — Prioritized list of issues to fix
- `.state.yaml` updated

## Severity Classification

| Issue | Severity |
|-------|----------|
| Missing `muted` (autoplay breaks) | CRITICAL |
| Missing `prefers-reduced-motion` | CRITICAL |
| Missing mobile fallback (video on 3G) | HIGH |
| Missing overlay (text illegible) | HIGH |
| Missing `preload="none"` (unnecessary download) | HIGH |
| Missing WebM source (larger files) | MEDIUM |
| No Intersection Observer (CPU waste) | MEDIUM |
| Missing `playsinline` (iOS fullscreen) | MEDIUM |
| Missing `poster` attribute | LOW |
| File size over target | LOW-HIGH (depends on delta) |

## Success Criteria

- All video elements catalogued with source references
- HTML attribute compliance >= 100% (all 5 required)
- prefers-reduced-motion coverage = 100%
- Mobile fallback coverage = 100%
- Overlay coverage = 100% (for videos with text overlay)
- Total video weight per page < 15MB
- Zero CRITICAL issues remaining

## Related Data

- `squads/design-system/data/video-backgrounds-guide.md`
- `squads/design-system/tasks/ds-motion-audit.md`

## Related Checklists

- `squads/design-system/checklists/ds-a11y-release-gate-checklist.md`
- `squads/design-system/checklists/motion-quality-checklist.md`

## Process Guards
- **On Fail:** Stop execution, capture evidence, and return remediation steps before proceeding.

## SINKRA Contract

Domain: Tactical
atomic_layer: Atom
executor: design-chief
Input:
- project_context
- design_system_context
Output:
- ds_video_background_audit_artifact
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
