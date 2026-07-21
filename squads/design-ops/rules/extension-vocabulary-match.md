# Extension Vocabulary Match — Design-Ops Rule

Applies when a user asks to **add** a new surface, primitive, or feature to an existing DS (not a fresh migration). E.g., "adiciona um dashboard ao anthropic-ds", "add a pitch-deck kit to redpine-ds".

## The failure mode this prevents

Greenfield scaffolding has deterministic context (archetype + brand-profile from discovery). Extension of an existing DS has **different** context: the DS already made 100+ decisions (spacing rhythm, hover/click states, density, card patterns, copy tone, shadow elevation, radius conventions, animation easings). If the agent ignores these and writes "generic shadcn quality" new code, the extension will look **visibly grafted** — the same syndrome as badly-photoshopped product shots.

The root cause is not lack of skill; it's skipping observation.

## Rule (MANDATORY)

Before writing any code for an extension, the agent MUST:

1. **Read the target DS top-to-bottom** — not just tokens. Read at least:
   - `src/app/globals.css` (full — not just @theme inline)
   - 3-5 existing primitives in `src/components/ui/` (pick from the categories closest to what you're adding)
   - 1-2 existing kit surfaces in `src/app/kits/` similar to the one being added
   - `README.md` — brand voice section

2. **Articulate the observed vocabulary in writing** before coding. One paragraph minimum, covering:
   - Color palette rhythm (how are feedback colors used? how saturated?)
   - Typography density (line-height defaults, letter-spacing patterns)
   - Card patterns (padding scale, border vs shadow, radius convention)
   - Hover/click/focus states — is it darken, scale, opacity, color shift?
   - Density (compact vs airy)
   - Iconography stroke weight and size
   - Animation easings + durations
   - Copy tone + casing + punctuation patterns

   This articulation becomes the implicit style contract for the extension. Quote **exact** tokens and classes from the source, not adjectives alone.

3. **Propose the extension's approach before implementing** — given the articulated vocabulary, describe in a short plan how the new surface/primitive will inherit each aspect. User confirms or corrects.

4. **Implement following the articulated vocabulary.** If a new primitive would violate an observed pattern (e.g., brand uses only neutral cards but the new primitive needs accent-bg), flag explicitly in the plan BEFORE coding.

5. **Review delta against vocabulary** after implementing. The final file should not introduce:
   - A new spacing value that breaks the scale
   - A new animation easing
   - A new card pattern category
   - Without an explicit rationale + user approval.

## "Think out loud" pattern

Literal output of the articulation step should exist as a comment block in the PR description OR as a file `docs/extensions/{feature-slug}-vocabulary-observed.md`. This is not optional ceremony — it's the receipts. If the reviewer can't trace the extension's style decisions back to observed patterns in the existing DS, the extension is not grounded.

## When to skip

Skip this protocol ONLY when:
- The extension is a single-file isolated utility (e.g., adding a `formatDate` helper) with zero UI surface
- The existing DS has < 3 primitives / kits (trivially small target — observation has no signal)

All other cases: full protocol.

## Invocation

Expected future workflow addition: `workflows/ds-extension.yaml` with:
- Organism 0: Observe & Articulate (consumes target DS, emits `observed-vocabulary.md`)
- Organism 1: Plan extension (consumes vocabulary + user brief)
- Organism 2+: Build per standard primitive/kit patterns (equivalent to migration O3/O4)

---

## Absorb contracts, not runtime (added 2026-04-19 from Redpine session)

When learning from a **reference DS** (e.g., Red Hat Design System, Polaris, Primer, Carbon) to improve the target DS, follow this absorption policy:

### ✅ Absorb — contracts (portable across any stack)

- **Tokens ladder**: spacing scale, radius ladder, type scale, shadow elevation, motion durations/easings
- **Focus spec**: width, offset, color, `transition: none`, `:is(*, :hover):focus-visible` guard, `:focus:not(:focus-visible)` disable
- **A11y patterns**: role conventions, keyboard interaction contracts, ARIA attribute contracts per component class
- **Component catalog**: what primitives exist and what they're called (Button, Card, Tag, Alert, etc.)
- **Naming conventions**: token prefixes (--rh-space-*, --rh-color-*), slot names, data-attribute schemas
- **Status/maturity labels**: planned/in-progress/ready/deprecated taxonomy
- **Governance patterns**: design-code-status tables, component manifest formats, drift-check scripts
- **CSS techniques**: `light-dark()`, `data-palette` inheritance, `::after` border-width for no-layout-shift states
- **DTCG conformance**: $value/$type/$description schema + alias syntax

### ❌ Do NOT absorb — runtime (stack-bound)

- **Framework/library choice**: if reference DS uses lit + web-components and your DS is React + Next.js, do NOT adopt lit. Re-implement the contract in your stack.
- **Build toolchain**: Eleventy vs Next.js vs Gatsby is orthogonal to DS contracts
- **Templating engine**: Nunjucks vs MDX vs JSX
- **Bundler config**: esbuild vs webpack vs turbopack
- **Design tool integration**: if reference has Figma-specific integration but your team uses Penpot, skip
- **i18n mechanism**: adopt the contract (locale detection, number formatting) but use your stack's i18n lib

### The test

Before absorbing a pattern, ask: **"Does this require changing my runtime to implement?"**
- If no → absorb (contract-level)
- If yes → decide whether runtime change is worth it (rarely)

### Rationale

Redpine session absorbed 10+ patterns from RHDS (focus 3px, WCAG 2.2 rule, DTCG tokens, component status badges, agentic manifest, grid breakpoints, palette semantics, motion tokens, a11y metadata, ColorPalette system) **without** adopting lit/web-components. The DS became RHDS-equivalent in scope while staying React/Tailwind/shadcn native. Runtime unity preserved; contract quality upgraded.

---

## Grep before invent (added 2026-04-19 from Redpine session)

Before recommending or inventing any structural convention (folder name, route group name, taxonomy), the agent MUST survey at least 5 mature open-source DSs that publish their docs-app source.

### The failure mode this prevents

Confidently suggesting `(docs)` as a "convention" when in reality only shadcn uses route groups for layout purposes (and they use `(app)`, not `(docs)`). Polaris/Primer/Carbon use flat top-level under Pages Router or Gatsby — conventions that don't even translate to App Router.

**Rough guess > researched answer** is a failure mode in technical advice.

### Minimum survey list

Always grep at least these repos' docs-app structure before recommending:

1. **shadcn/ui** — `apps/www/app/` or `apps/v4/app/` (Next.js App Router reference)
2. **Polaris (Shopify)** — `polaris.shopify.com/pages/` (Pages Router)
3. **Primer (GitHub)** — `primer/design` repo, `content/`
4. **Carbon (IBM)** — `carbon-design-system/carbon-website`
5. **Atlassian Design System** — if public
6. **Radix UI** — `radix-ui/website` repo
7. **Chakra UI** — `chakra-ui/chakra-ui-docs`
8. **RHDS** — `RedHat-UX/red-hat-design-system/docs/`

### Output

Before proposing a structure, produce a **comparison table** of these 5+ repos (route pattern | grouping mechanism | shared layout approach), THEN cite the dominant pattern and name the recommended structure citing 2-3 repos as precedent.

### The test

If the user asks "is X a convention?" and the agent can't name 3+ mature DSs that use X, the answer is "X is not a convention — it's my suggestion." Be honest about this distinction.
- Organism N: Review delta against vocabulary

For now (pre-workflow), @design-chief enforces the protocol interactively when a user requests extension.

## Source

Principle distilled from Claude Design HTML-artifact system prompt (2026-04-19):
> "When adding to an existing UI, try to understand the visual vocabulary of the UI first, and follow it. Match copywriting style, color palette, tone, hover/click states, animation styles, shadow + card + layout patterns, density, etc. It can help to 'think out loud' about what you observe."

Reinforced by our own finding during the anthropic-ds migration: every QA pass that revealed inconsistency (inline SVG vs Lucide, arbitrary values vs scale tokens, dead alias vars) was a case of the agent failing to observe existing patterns before adding new ones. Observation cost is cheap; rework cost is high.

## Related

- `squads/design-ops/data/ds-archetype.yaml` `forbids` — "Guessing token values from training-data memory"
- `squads/design-ops/checklists/dops-ai-trope-guardrails.yaml` — `source_code_read_first_then_screenshots_if_ambiguous`
