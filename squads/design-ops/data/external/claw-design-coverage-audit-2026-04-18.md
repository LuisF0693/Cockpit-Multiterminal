# Coverage Audit — claw-design system prompt vs absorbed governance

> Source: `claw-design-system-prompt-2026-04-18.txt` (422 lines, external prompt)
> Auditor: session 2026-04-18 (re-read of full source after Wave C.1 Task 5 commit)
> Purpose: document what was absorbed, what was missed, and what was diverged by decision — input for Wave C.2 scoping.

## Status summary

| Dimension | Count |
|---|---|
| Source lines reviewed | 422 |
| Items already absorbed (Wave B-B.5) | ~70 heuristics + 7 explicit rejections |
| Items missed (this audit surfaces) | 7 |
| Items diverged by founder decision | 2 |
| Corrections to prior session claims | 1 |

---

## Items already absorbed (confirmed from source)

These map 1:1 to existing governance and need no action.

| Source area (lines) | Absorbed into |
|---|---|
| Dependency pinning + SRI (L60-65) | `rules/self-contained-artifact-security.md` |
| React/Babel script scope rules (L69-83) | `rules/self-contained-artifact-security.md` + `data/design-heuristics-from-external-prompts.yaml` (HEUR-CLAW-*) |
| Speaker notes contract (L95-107) | `data/deck-contracts-spec.yaml` + `dops-post-build-verification.yaml#speaker_notes_compliance` |
| Tweaks Protocol (L218-254) | `data/tweak-protocol-spec.yaml` + `tasks/artifact-tweak-protocol.md` + `apps/aiox-design-starter/src/lib/tweak/` |
| Fixed-size deck contract (L266-269) | `data/deck-contracts-spec.yaml#deck_shell` |
| Starter components catalog (L271-281) | `data/starter-components-catalog.yaml` |
| AI-trope content guidelines (L305-312) | `rules/ai-trope-guardrails.md` + `checklists/dops-ai-trope-guardrails.yaml` |
| Scale minimums (24px slides / 12pt print / 44px mobile) (L303-304) | `rules/ai-trope-guardrails.md` (absorbed as `sizing_minimums`) |
| GitHub "tree is a menu, not the meal" (L289-293) | Not absorbed as rule (our `/design-system` doesn't fetch GitHub repos yet — defer to need) |
| `<data-screen-label>` slide labeling (L54-57) | `data/deck-contracts-spec.yaml` (references but not enforced yet) |

---

## Items MISSED in absorption (Wave B-B.5 oversight)

Seven source items were not mirrored into governance. Each may be Wave C.2 work, Wave D, or explicit defer-forever.

### 1. Skill catalog — 13 named skills vs our 2

**Source (L316-332):** 13 named skills explicitly enumerated:
Animated video · Interactive prototype · Make a deck · Make tweakable · Frontend design · Wireframe · **Export as PPTX (editable)** · **Export as PPTX (screenshots)** · Create design system · **Save as PDF** · **Save as standalone HTML** · **Send to Canva** · **Handoff to Claude Code**

**Absorbed:** only 2 user-facing skills (`/design-system`, `/design-artifact-cycle`).

**Gap:** the 13 skills are sub-modes of `/design-artifact-cycle`, selected by `kind` and by explicit export requests. Today our pipeline resolves only ~4 kinds (component, html_prototype, deck, page). Missing as first-class: animated_video, wireframe, send_to_canva, handoff_to_claude_code.

**Decision needed (Wave C.2 scoping):**
- Do we need separate skill surfaces for animated_video + wireframe? Or stay as `kind` values inside `/design-system`?
- Is `send_to_canva` a real requirement for any BU today? (If no → defer forever; not every claw feature maps to our needs.)
- `handoff_to_claude_code` is interesting: it's their path OUT to dev environment. Ours is the inverse (we ARE claude code). N/A.

**Recommended action:** register each as an entry in `deliverable-kinds-registry.yaml` with `task_reference: planned: ...` for the ones we want (wireframe, animated_video likely); mark the rest as REJECTED with rationale.

---

### 2. `super_inline_html` bundler tool

**Source (L381):** tool that bundles HTML + all referenced assets (images, CSS, JS, fonts, `<ext-resource-dependency>` meta tags) into a single self-contained `.html` file that works offline. Requires `<template id="__bundler_thumbnail">` with a small SVG preview.

**Absorbed:** nothing. Our Wave C.1 `artifact-create-html.md` produces self-contained HTML but assumes the author writes all tokens inline — it does NOT pull in external assets.

**Gap:** if a designer writes an HTML file referencing `images/hero.png` + `fonts/brand.woff2`, Wave C.1 does not bundle them. The artifact breaks when shared.

**Decision needed:** is this Wave C.2 scope? Or a separate capability ("post-process: bundle to single file")?

**Recommended action:** add to Wave C.2 backlog as `scripts/bundle-html-artifact.cjs` (standalone post-processor, invoked optionally by `artifact-create-html.md` when brief has `standalone: true`).

---

### 3. `fork_verifier_agent` runtime

**Source (L212-216, L392):** sub-agent spawned with its own iframe to do thorough checks (screenshots, layout, JS probing). Silent on pass, wakes parent only on failure. Can receive directed tasks (`task: "screenshot and check spacing"`).

**Absorbed:** reconciled as `dops-post-build-verification.yaml#render_policy` ("verifier renders, agent does NOT"). But the CHECKLIST-BASED model we landed on is a Wave C.1 compromise — we don't actually fork an agent. Checks are documented as manual + scriptable, not auto-executed.

**Gap:** Wave C.1 `artifact-verify-postbuild.md` expects the agent (design-chief) to invoke scripts per dimension. There's no "fork and wait silently" pattern.

**Decision needed:** is this Wave C.2 or Wave D?

**Recommended action:** Wave D candidate — `dops-post-build-verification.yaml` already says "future Wave D may promote to forked subagent" (line 28). No action now.

---

### 4. `<mentioned-element>` live DOM chain

**Source (L47-57):** when user comments on, inline-edits, or drags an element in the preview, the attachment includes `<mentioned-element>` with:
- `react:` — outer→inner React component chain from dev-mode fibers
- `dom:` — DOM ancestry
- `id:` — transient runtime handle (`data-cc-id="cc-N"` in comment mode, `data-dm-ref="N"` in design mode)

**Absorbed:** nothing. Our pipeline has no concept of inline-comment targeting.

**Gap:** huge UX gap — in claw-design, the user points at a DOM element in the preview and the agent edits the SOURCE that produced it. We require textual brief + iterative verbal tweak.

**Decision needed:** do we need this channel? Answer depends on whether we have a preview pane UX at all. Today we don't — CLI first. When/if a preview pane emerges, this becomes critical.

**Recommended action:** NO action now. Flag as "pre-requisite: preview pane with iframe + event capture". Wave E or later.

---

### 5. Napkin sketches (.napkin files)

**Source (L263-264):** user attaches a hand-drawn sketch as `.napkin` — thumbnail stored at `scraps/.{filename}.thumbnail.png`.

**Absorbed:** nothing.

**Gap:** input modality. If user wants to start from a sketch, today's pipeline has no ingestion path.

**Decision needed:** business value per BU?
- AIOX / AllFluence / Bilhon likely don't use this regularly
- Academia Lendária might benefit (course materials often start as sketches)

**Recommended action:** defer; add to backlog as `/design-system/ingest-napkin` optional input path. Low priority.

---

### 6. `questions_v2` protocol — OPPOSITE to our one-per-turn

**Source (L184-206):** "ask 10+ questions in a single structured form", "always confirm starting point and product context", "ask about variations, divergence, flows vs copy vs visuals vs tweaks". Batched form, user answers then end turn.

**Absorbed as DIVERGED:** our `/design-system` skill prescribes "one question per turn" (line 118 of SKILL.md) — the OPPOSITE.

**Rationale for divergence:** founder-approved conversational UX pace for PT-BR. Rapid-fire 10-question forms feel hostile in chat. One-per-turn feels like a real designer conversation.

**Trade-off acknowledged:** we lose the "ask before any work starts" structure of questions_v2 — a founder who DOES know what they want gets no fast-path to dump everything at once.

**Recommended action:** make `/design-system` accept a batch mode (`*batch-questions` or YAML brief input) for power users. Keep one-per-turn as default.

---

### 7. "1000 no's for every yes" — data-slop content guideline

**Source (L297-299):** "Do not add filler content. Never pad a design with placeholder text, dummy sections, or informational material just to fill space. Every element should earn its place. If a section feels empty, that's a design problem to solve with layout and composition — not by inventing content. One thousand no's for every yes. Avoid 'data slop' — unnecessary numbers or icons or stats that are not useful. Less is more."

**Absorbed:** partial — `ai-trope-guardrails.md` covers "avoid AI slop tropes (gradients, emoji, overused fonts)" but does NOT enforce "no filler sections" or "less is more" explicitly.

**Gap:** a common failure mode in agent-generated designs is over-populating sections with plausible-but-unnecessary content. The guardrail against this is a direct cultural rule — not a technical check.

**Decision needed:** promote to a first-class rule?

**Recommended action:** add to `rules/ai-trope-guardrails.md` as section "Content Discipline" with the verbatim "1000 no's for every yes" + "ask before adding material" + "empty is a layout problem, not a content problem". Low cost, high signal. Wave C.2 candidate.

---

## Items DIVERGED by decision (not gaps — by design)

### D1. One question per turn (vs claw-design's 10+ batched)
See item 6 above. Founder-approved.

### D2. Checklist-based verifier (vs claw-design's forked sub-agent)
See item 3 above. ADR-018 D2 decision.

---

## Corrections to prior session claims

### C1. "PDF export via headless Chromium"

**Prior claim (my earlier chat response):** `artifact-export-pdf.md` uses headless Chromium.

**Source reality (L382):** tool `open_for_print` opens HTML in a new browser tab; user presses Cmd+P (Mac) / Ctrl+P (Windows) to save as PDF. No headless Chromium; browser print dialog.

**Status:** nothing committed to code yet — `artifact-export-pdf.md` is Wave C.2 (not written). When writing it, use the correct model: "browser print dialog" not "headless Chromium".

**Handoff action:** if Wave C.2 planning session reads the Wave C.2 section of the handoff, they should know: `open_for_print-equivalent via headless Chromium` (L137 of handoff) is slightly imprecise — the claw model is browser-tab-print, not headless Chromium. Both are viable runtimes; pick per founder decision.

---

## Actionable backlog for Wave C.2

Prioritized:

1. **P1 — Register missing kinds in `deliverable-kinds-registry.yaml`** for animated_video, wireframe (per item 1). Cost: ~30min. Value: ensures `/design-system` can route to them when implemented.
2. **P1 — Add "Content Discipline" section to `rules/ai-trope-guardrails.md`** (per item 7). Cost: ~20min. Value: catches a very common failure class.
3. **P2 — Design `scripts/bundle-html-artifact.cjs`** for `super_inline_html` equivalent (per item 2). Cost: ~2-3h. Value: self-contained artifacts with external assets work offline.
4. **P2 — Add batch-mode brief path to `/design-system`** (per item 6). Cost: ~1h. Value: power-user fast path.
5. **P3 — Defer** fork_verifier_agent runtime (Wave D pre-req, per item 3).
6. **P3 — Defer** `<mentioned-element>` pipeline (requires preview pane UX, per item 4).
7. **P4 — Defer** napkin ingestion (low BU value, per item 5).

---

## Re-audit trigger

Re-run this audit when:
- claw-design source is updated (hash `claw-design-system-prompt-2026-04-18.txt` changes)
- Wave C.2 scoping begins (use this doc as input)
- A new BU requests a skill not in our current catalog

---

## References

- Source file: `squads/design-ops/data/external/claw-design-system-prompt-2026-04-18.txt`
- README: `squads/design-ops/data/external/README.md`
- Heuristics ledger: `squads/design-ops/data/design-heuristics-from-external-prompts.yaml`
- Explicit rejections: same file, `explicit_rejections:` section
- Wave C.2 scope (handoff): `docs/sessions/2026-04/2026-04-18-claw-design-absorption-handoff.md` lines 134-142
- ADR: `docs/adrs/ADR-018-design-ops-artifact-creation-capability.md`
