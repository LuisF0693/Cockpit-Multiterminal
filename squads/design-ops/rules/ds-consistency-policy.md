# DS Consistency Policy — Reference vs Copy Model Split

Applies to every artifact produced under the `design-ops` provider, including downstream consumption by `design-pages`, `design-app`, `slides-creator`, and `aiox-design-starter`.

Absorbed from `agenmod/claw-design` consistency analysis (2026-04-18). Reconciles our layered stack (shadcn/ui base + `@sinkra/ds-core` package + Tailwind v4 CSS variables + workspace-first tokens) with the copy-first mandates observed in external artifact-creation prompts.

## The Layered Reality

Our stack is simultaneously copy-first and reference-first, at different layers:

```
Layer           Model         Implementation
────────────────────────────────────────────────────────────────
App tier        reference     import { Button } from "@sinkra/ds-core"
Package tier    copy          shadcn source lives inside @sinkra/ds-core (owned, editable)
Token tier      reference     CSS variables via @theme inline (Tailwind v4)
Business tier   override      :root { --primary: ... } per business in workspace
Artifact tier   variable      depends on deliverable_kind — see policy below
```

No layer conflicts with another. The apparent tension between shadcn "copy" and `@sinkra/ds-core` "reference" is resolved by recognizing they operate at different tiers.

## Consistency Model by Deliverable Kind

| Deliverable Kind | Model | Bundler | Token Strategy | Enforcement |
|------------------|-------|---------|----------------|-------------|
| `component` | **reference-first** via `@sinkra/ds-core` | SWC / Next.js | CSS vars via `@theme inline` | TypeScript + ESLint + token validator |
| `page` | **reference-first** via `@sinkra/ds-core` | SWC / Next.js | CSS vars | TypeScript + ESLint |
| `email` | **reference-first** + email-safe subset | SWC / MJML | inline styles (email constraint) | email client matrix + MJML validator |
| `dashboard` | **reference-first** via `@sinkra/ds-core` | SWC / Next.js | CSS vars | TypeScript + ESLint + RLS tests |
| `html_prototype` | **copy-first** with exact values | none (self-contained) | precompiled Tailwind CSS inlined | SRI + `validate-artifact-security.cjs` (Wave C) |
| `deck` | **copy-first** with exact values | none (self-contained) | precompiled Tailwind CSS inlined | SRI + deck contract validator |
| `pdf` | **copy-first** from print stylesheet | headless browser | print-media CSS | manifest-level |
| `pptx` | **runtime export** (native shapes preferred) | none | slide manifest + native shape API | manifest-level |

### Rationale

- **Bundler-backed kinds** inherit the `@sinkra/ds-core` package and Tailwind v4's CSS variable cascade. Single source of truth for tokens; single source of truth for component behavior. No duplication.
- **Self-contained kinds** cannot import a package. They must inline tokens and component code. The consistency is enforced by **exact-value copying** from `@sinkra/tokens-base` / workspace tokens, not by memory or harmonic generation.
- **Export kinds** (PDF, PPTX) derive from an authored source (HTML or deck) — consistency is inherited from the source, not re-established at export time.

## Self-Contained Artifact Bundling Strategy

Three paths for shipping Tailwind styles into a self-contained HTML artifact:

### Path 1 — Precompile Tailwind (DEFAULT)
- Run a Tailwind build on the artifact source, inline the compiled CSS.
- Pros: full fidelity; matches production apps; CSS variables intact.
- Cons: CSS bundle size (~30-80KB); build step required at creation time.
- **This is the default strategy. Wave C provides the script.**

### Path 2 — Tailwind Play CDN
- `<script src="https://cdn.tailwindcss.com">` at runtime.
- Pros: no build step.
- Cons: CDN dependency contradicts `self-contained-artifact-security.md` SRI mandate; runtime JIT inconsistent with production.
- **Rejected as default.** Permitted only for throwaway exploratory prototypes with explicit user acknowledgement.

### Path 3 — Manual CSS with exact token values
- Hand-authored CSS inlined with exact values from `@sinkra/tokens-base`.
- Pros: smallest bundle; aligns with claw-design copy model.
- Cons: labor; divergence risk if tokens evolve after artifact is frozen.
- **Fallback for small artifacts where bundle size matters or Path 1 build is unavailable.**

## The Oklch Harmonic Fallback — Gate Policy

Claw-design permits: *"If [palette] is too restrictive, use oklch to define harmonious colors that match the existing palette."*

This is a **divergence pressure valve** that bypasses the DS. Over time, it erodes the business's canonical palette. We therefore gate it tightly.

### When Oklch Harmonic Generation is PERMITTED

1. **Greenfield bootstrap** — `workspace/businesses/{biz}/L2-tactical/design/tokens.yaml` does not exist and is being drafted. Oklch can generate the initial harmonic palette, which then becomes the workspace SOT.
2. **Brownfield audit** — during `wf-brandbook-workspace-extraction`, if the source brandbook has only a primary color, oklch can propose complementary neutrals + accents as a **proposal** requiring owner approval.
3. **Explicit brief request** — `brief.known_constraints` includes "needs palette extension" AND the business owner has approved the extension via a `design-routing-decision` artifact with `state: approved`.

### When Oklch Harmonic Generation is PROHIBITED

- Anytime the workspace tokens exist AND the artifact is consuming them — no ad-hoc color generation to fill visual gaps.
- When the artist "feels" the palette is restrictive — that's the brief intake's job, not the creation step's.
- For self-contained artifacts (decks, prototypes) — they inline exact values, not generated ones.

### Enforcement

Advisory in Wave B.2.1. Planned validator in Wave C: `validate-color-usage.cjs` inspects artifact output for colors not in `tokens.yaml` and flags them as `oklch_generated_candidate` for review.

## Divergent Exploration — Kind-Aware Policy

Current rule (Wave B): N ≥ 3 variants mandated unconditionally.

Refined policy (this rule supersedes):

| Deliverable Kind | Variants Required | Rationale |
|------------------|-------------------|-----------|
| `html_prototype` | **N ≥ 3 mandatory** | Exploration is the entire point |
| `deck` | **N ≥ 3 mandatory** | Visual narrative direction matters |
| `page` | **N ≥ 3 mandatory** | Information architecture alternatives |
| `dashboard` | **N ≥ 3 mandatory** | Data presentation choices compound |
| `email` | **N ≥ 2** | Email client constraints narrow the space |
| `component` | **N ≥ 1 (ASK gate)** | Components live inside DS grammar; novelty often erodes consistency |

For `component`: `@design-chief` asks the requester — *"Do you want options using existing DS patterns only, novel variants, or a mix?"* — and records the answer in `brief.exploration.variants_required`. Defaults to `1` (DS-first) when unspecified.

This matches claw-design's user-asked divergence gate and prevents the common failure mode where "exploration" on a button creates three incompatible variants.

## Explicit Rejections from Claw-Design

Not every pattern from the external prompt fits our stack. We consciously reject:

### Rejection 1 — `@babel/standalone` in-browser JSX
- **Claw-design does:** ship CDN-delivered React with Babel standalone for JSX transformation in browser.
- **We reject as default:** contradicts our SWC + TypeScript compile-time pipeline. Permitted ONLY inside self-contained rapid-prototype HTML artifacts under Wave C capability, and even there, preference is to pre-compile.
- **Enforcement:** `validate-artifact-security.cjs` (Wave C) flags `@babel/standalone` presence as requiring explicit justification.

### Rejection 2 — Globally-named inline style objects (`Object.assign(window, {...})`)
- **Claw-design does:** share React components across UMD-delivered HTML via `Object.assign(window, ...)` and uniquely-named style objects to avoid collisions.
- **We reject as default:** irrelevant to ES module apps; Tailwind utility classes eliminate the inline-style collision problem entirely.
- **Enforcement:** this pattern is simply not produced by our stack. Flag as anomaly if present in any `.tsx` under `apps/` or `packages/`.

### Rejection 3 — Unconstrained Oklch harmonic generation
- **Claw-design does:** allow oklch harmonic generation whenever the palette feels restrictive.
- **We reject as default:** see "Oklch Harmonic Fallback Gate Policy" above. Strictly gated by brief/ADR/brownfield context.

### Rejection 4 — Screenshot-based PPTX export as default
- **Claw-design does:** allow screenshot-based PPTX when native shape export is hard.
- **We reject as default:** native shape export produces editable slides; screenshots produce visually frozen slides that clients cannot modify. Screenshot-based export is fallback only, not default.

### Rejection 5 — CDN-only Tailwind Play
- **Claw-design does:** Tailwind Play CDN is acceptable for quick prototypes.
- **We reject as default:** contradicts SRI mandate. See "Self-Contained Artifact Bundling Strategy, Path 2".

## Enforcement Matrix

| Policy | Current Mode | Planned Validator |
|--------|--------------|-------------------|
| Reference-first for bundler kinds | Baseline (lint + typecheck) | — |
| Copy-first for self-contained | Advisory (manual review) | Wave C: `validate-artifact-consistency.cjs` |
| Tailwind bundling Path 1 default | Advisory | Wave C: build script |
| Oklch harmonic gate | Advisory | Wave C: `validate-color-usage.cjs` |
| Kind-aware exploration variants | `@design-chief` routing decision | Tracked in `brief.exploration.variants_required` |
| Rejected claw-design patterns | `@design-chief` review | Flag in `validate-artifact-security.cjs` |

## Related

- Companion rules:
  - `squads/design-ops/rules/design-system-fidelity.md`
  - `squads/design-ops/rules/design-exploration-cycle.md`
  - `squads/design-ops/rules/ai-trope-guardrails.md`
  - `squads/design-ops/rules/self-contained-artifact-security.md`
  - `squads/design-ops/rules/context-gathering-protocol.md`
- Registries:
  - `squads/design-ops/data/deliverable-kinds-registry.yaml`
  - `squads/design-ops/data/ds-discovery-paths.yaml`
  - `squads/design-ops/data/design-heuristics-from-external-prompts.yaml`
- External references:
  - `squads/design-ops/rules/design-system-generation.md` (`@sinkra/ds-core` registry)
  - `squads/design-ops/rules/v0-frontend-quality.md` (Tailwind v4 patterns)
- External source: `agenmod/claw-design` — claude-design-sys-prompt.txt (2026-04-18)
- ADR: `docs/adrs/ADR-018-design-ops-artifact-creation-capability.md` (Wave C precursor)
