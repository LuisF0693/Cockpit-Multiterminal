# AI-Trope Guardrails — Design Ops Provider

Applies when generating, reviewing, or validating any visual artifact produced by the `design-ops` provider or consumed by downstream squads (`design-pages`, `design-app`, `slides-creator`).

Complements `squads/design-ops/rules/v0-frontend-quality.md` and `squads/design-ops/rules/design-system-generation.md`. Absorbs anti-trope constraints distilled from external design-artifact system prompts.

## Non-Negotiable Constraints

### Colors

- Use exactly **3-5 colors total** per surface: 1 primary brand + 2-3 neutrals + 1-2 accents.
- **NEVER** use purple/violet as a prominent color unless the business tokens explicitly demand it.
- **NEVER** mix opposing temperatures in gradients (pink↔green, orange↔blue). Gradients must be analogous (blue↔teal, purple↔pink) when present, and absent by default.
- When overriding a background color, **always** override the paired foreground to preserve contrast (WCAG AA, ≥ 4.5:1 for body text).
- No aggressive neon gradients as a "modern" signal. Flat + semantic tokens first.

### Typography

- Maximum **2 font families** per surface (heading + body, or body + mono).
- Line height for body: `1.4–1.6` (`leading-relaxed` / `leading-6`).
- **NEVER** use decorative/script fonts for body text.
- **NEVER** set body text below **14px** on screen.
- **Overused AI-generator defaults** — permitted only with explicit business rationale, never as fallback: **Inter, Roboto, Arial, Fraunces, system font stacks** (`system-ui`, `-apple-system`, etc. used as primary choice). These are the "I asked AI for a font" signals. If the workspace tokens specify one of these, that is the rationale. Otherwise, choose intentionally or ask.
- Use `next/font/google` or the equivalent loader; apply via `font-sans` / `font-serif` / `font-mono` Tailwind classes.

### Minimum Sizing

| Surface | Rule | Rationale |
|---------|------|-----------|
| Slide deck text | ≥ 24px | Readable from the back of the room |
| Mobile touch targets | ≥ 44px | iOS/Android HIG |
| Text input (iOS Safari) | ≥ 16px | Prevents zoom-on-focus |
| Print body text | ≥ 12pt | Print legibility |
| Any interactive element | ≥ 44×44px hit area | Coarse-pointer accessibility |

### Iconography

- **Emoji policy:** permitted **only if the design system explicitly uses emoji**. The default position is "no emoji" — with DS-level opt-in as the only override. Never add emoji "for friendliness" without DS authorization.
- When used as functional icons (status, action buttons, navigation): emoji are narrative; icons are system. If the DS does not permit emoji, use an icon.
- Icon sizing is one of: **16px, 20px, 24px**. No arbitrary sizes.
- Prefer icon libraries already registered in the DS (e.g. `lucide-react`). Never hand-draw SVG illustrations where a library icon exists.

### Imagery

- Use **real images**, never abstract shapes or blobs as filler.
- **NEVER** generate complex SVG illustrations as placeholders.
- Geographic maps: use a map library (`react-simple-maps`, Leaflet, Mapbox). Never hand-roll SVG maps.

### Motion & Interaction

- **NEVER** use `element.scrollIntoView()` — breaks embedded webviews and preview panes.
- Motion durations: `fast 100ms / normal 200ms / slow 300ms / slower 500ms`. No arbitrary `1.2s` flourishes.
- Reduced-motion preference must be honored (`prefers-reduced-motion: reduce` → disable non-essential animation).

### Layout

- Flexbox first; CSS Grid for 2D layouts; **never** floats.
- **NEVER** mix `margin`/`padding` with `gap` on the same element.
- **NEVER** use `space-*` Tailwind classes; use `gap-*`.
- Prefer the Tailwind spacing scale (`p-4`, `gap-2`) over arbitrary values (`p-[16px]`).
- Wrap long titles in `text-balance` or `text-pretty` for typographic quality.
- **NEVER** add a title screen to a prototype. Prototypes open directly to content; title screens are for pitch decks (`deliverable-kinds-registry.yaml#deck`), not prototypes (`deliverable-kinds-registry.yaml#html_prototype`). *"Resist the urge to add TITLES to the actual html page."*
- **NEVER** use filler content — no lorem ipsum, no placeholder copy, no decorative shapes to occupy space, no random emoji clusters. *"Never pad a design with placeholder text, dummy sections, or informational material just to fill space. Every element should earn its place. Ask before adding material."* If you think additional sections or copy would improve the design, **ask the user first** rather than unilaterally adding them.
- **NEVER** generate proactive screenshots of the artifact unless the screenshot is verifying a specific, stated claim. Screenshots cost tokens and are a checkpoint ritual, not a deliverable.
- **NEVER** use the "rounded corners with a left-border accent color" container pattern — it is an AI-default card trope that signals "I let a generator choose my UI." If the DS has a card pattern, use it; if not, design one intentionally or ask.

### Fixed-Size Content (decks, videos, embedded artifacts)

- Fixed-size content must scale via `transform: scale()` with letterboxing when the viewport differs from the native aspect ratio.
- Never lock a deck to a hard pixel dimension without a responsive scaler.
- See `squads/design-ops/checklists/dops-component-quality.yaml` → `responsive_scaling` for the validator.

### Copyright

- Do not recreate copyrighted third-party UI (Apple, Google, Netflix) unless the artifact is explicitly for the user's own-domain usage.
- Exception: the user's business domain is always permitted to self-reference its own published UI.

## Enforcement

- **Checklist (machine-readable):** `squads/design-ops/checklists/dops-ai-trope-guardrails.yaml`
- **Validator:** `squads/design-ops/scripts/validate-checklists-gate.cjs` (checks the above checklist when wired)
- **Workflow gate:** `squads/design-ops/workflows/wf-provider-enrichment-from-external.yaml` (phase `ai-trope-gate`)
- **Component quality link:** `squads/design-ops/checklists/dops-component-quality.yaml` references this rule under `ai_trope_compliance`

## Violations

A violation is **blocking** for component publish and **advisory** for upstream exploration artifacts (wireframes, moodboards). The default expectation is that every violation is corrected before the component reaches `POPULATED` state in the manifest.

## Reference

- `squads/design-ops/rules/v0-frontend-quality.md` (v0 composite model baseline)
- `squads/design-ops/rules/design-system-generation.md` (@sinkra/ds-core registry)
- External ingestion: `agenmod/claw-design` system prompt (design artifact creation tool) — knowledge extracted 2026-04-18
- Canonical squad scope: `squads/design-ops/ARCHITECTURE.md` (`provider_scope.owns`)
