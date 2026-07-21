# Atomic Design Taxonomy — Falsifiable Classification Rule

> Authority: ADR-052 (ACCEPTED-WITH-CONDITIONS, 2026-05-06)
> Consumer mirror (machine-readable): `squads/design-ops/data/atomic-classification-signals.yaml`
> Origin: `docs/research/2026-05-06-atomic-design-definition/06-organism-template-page-decision-tree.md`

## When to Load

Load this rule when you are about to:

- Classify any UI component into Atom / Molecule / Organism / Layout / Page / Pattern
- Review a DS deliverable inside an epic (`epic-ds-review`)
- Extract a design system from a URL (`/design-md`, `extract-from-url`)
- Audit brownfield components for Storybook migration (`storybook-brownfield-migration`)
- Add a story to the Storybook sidebar (decide which category folder)
- Triage a design request (`design-triage`)
- Build, audit, or rename component artifacts in any DS-bearing codebase
- Decide whether something belongs in `Foundations`, `Components`, `Patterns`, `Layouts`, or `Pages`

Do NOT load this rule for: pure copy work, pure brand work (logo/positioning), pure backend tasks, or design ops that do not classify components.

## Rule (NON-NEGOTIABLE)

**Every UI artifact MUST be classified using the 5-question falsifiable rule below, in order. The first question that returns YES defines the layer.** Patterns are a separate axis, not a level.

### The 5-Question Protocol

```
1. STRUCTURE INDIVISIBLE?
   → Splitting it would lose function?
     YES → ATOM (button, input, icon, label, avatar, tag, text style)
     NO → continue ↓

2. ONE ACTION, FEW PIECES?
   → Clear single intent, 2-4 atoms, reusable as a unit?
     YES → MOLECULE (search field, account trigger, label+icon chip,
                     button group, breadcrumb, form row)
     NO → continue ↓

3. REUSABLE SECTION OF UI?
   → Section responsibility (topbar, inbox list, message reader,
     compose dialog, product grid), can appear in more than one screen,
     not the entire screen yet?
     YES → ORGANISM (top bar, inbox cluster, message surface,
                     compose dialog, quick settings panel,
                     mobile bottom nav)
     NO → continue ↓

4. LAYOUT CONTRACT WITH SLOTS?
   → Defines WHERE other things go (named slots: header, rail, main,
     aside, actions), declares responsiveness and structure, but content
     inside is placeholder or structural variation?
     YES → LAYOUT (workspace layout, article layout, PDP layout,
                   list-detail canonical layout)
                   ↳ this is what Brad Frost called "Template"
     NO → continue ↓

5. CONCRETE INSTANCE WITH REPRESENTATIVE CONTENT?
   → Final screen with realistic content, composes multiple organisms
     within a layout, a user would recognize it as "a real screen of
     the product"?
     YES → PAGE (full Gmail workspace, Medium home,
                 Amazon PDP, full mobile compose screen)
     NO → revise. Probably mis-classified organism.

6. CROSS-CUTTING GUIDANCE? (separate axis, NOT a level)
   → Empty state, error state, loading, onboarding flow, date picking?
     YES → PATTERN (recipes, not concrete pieces; doc on its own with
                    pattern_id + ≥2 canonical uses + description)
```

### Order is part of the contract

Asking these out of order produces inconsistent classifications. The order forces ascending concreteness: primitive → composition → section → structure → instance. Skipping ahead to question 5 misclassifies shells as Pages when they are actually Layouts; skipping to question 3 misclassifies Pages as Organisms (the canonical regression this rule prevents).

### Foundations are not a level in this rule

Foundations live in tokens (color, typography, spacing, motion, grid, breakpoints, icons, elevation). If the request is "extract tokens" or "audit foundations", the artifact has `atomic_layer: foundations` and the 5-question protocol does not apply.

### Patterns acceptance criteria

A Pattern is admissible only if it carries:

- `pattern_id` (kebab-case, unique)
- `description` (1-2 sentences explaining WHEN the pattern applies)
- `canonical_uses: [≥2]` (concrete references in real artifacts)

Patterns without ≥2 canonical uses after a 60-day grace period MUST be archived. This prevents the layer from becoming a dumping ground.

## NO FALLBACKS in classification

When the 5-question protocol cannot resolve to a single layer (exotic markup, ambiguous structure, insufficient signals), emit:

```yaml
atomic_layer: null  # extraction_gap(reason)
```

**Never default to "organism" when uncertain.** Falsifying the rule with fallbacks invalidates downstream consumers and reproduces the original Gmail shell-as-organism error. This rule inherits the spirit of `.claude/rules/extraction-no-fallbacks.md`: false coverage = false positives.

## Anti-Patterns (BLOCK or WARN)

| Anti-Pattern | Detection | Severity | Why |
|---|---|---|---|
| **shell-as-organism** | Full app shell with regions (header + main + aside) classified as `organism` | BLOCK | Shells are Pages (with realistic content) or Layouts (with empty slots), never Organisms |
| **page-as-organism** | Full screen with multiple organisms classified as `organism` | BLOCK | A full screen is a Page if it has realistic content; a Layout if it has empty slots |
| **button-as-molecule** | Atomic primitive (button, icon, label, input) classified as `molecule` | WARN | Atomic primitives stay atomic regardless of decoration |
| **template-with-real-content** | Layout (slot-skeleton) containing realistic text/data | WARN | Layouts must have placeholder slots; Layout + real content = Page |
| **patterns-dumping-ground** | Pattern with `canonical_uses < 2` after 60d grace period | WARN → archive | Patterns must reference ≥2 real uses to remain admissible |

Validators that enforce these are configured in:

- `squads/design-ops/workflows/audit-only.yaml` v2.1.0
- `squads/design-ops/workflows/storybook-brownfield-migration.yaml` v1.1
- `squads/design-ops/tasks/epic-ds-review.md` v1.4.0
- `squads/design-ops/scripts/validate-extract-from-url.js` (planned, story `STORY-DS-EXTRACT-ATOMIC-LAYER-2026-05-06`)

## Why

Atomic design as Brad Frost wrote it (2013/2016) is sound as a mental model but ambiguous as an operational vocabulary. The molecule/organism boundary and the organism/template/page boundary generate recurring debate. Mature design systems (Material 3, Polaris, Atlassian, Carbon, SLDS) abandoned `atom/molecule/organism` distinctions in favor of `Foundations + Components + Patterns + Layouts`.

ADR-052 chose **Path B (Atomic enriquecido)** to keep the familiar narrative while resolving the operational ambiguity through:

1. The 5-question falsifiable rule (this rule)
2. Renaming Templates → Layouts (slot-contract semantics, alignment with Material 3 canonical layouts, eliminates SINKRA collision with `Template` = process blueprint)
3. Adding Patterns as a separate axis for cross-cutting guidance (empty/error/loading/onboarding) that has no home in canonical atomic design

Without this rule, the original Gmail shell-as-organism regression recurs. With this rule, it is structurally prevented.

## Consumer Reference

**This rule is authoritative.** Programmatic consumers (extractor, validator, ESLint plugin) consume the machine-readable mirror at:

```
squads/design-ops/data/atomic-classification-signals.yaml
```

The YAML mirrors this rule's logic in a structured format consumable by code. **If the YAML and this rule disagree, THIS RULE is the source of truth** and the YAML must be reconciled.

A CI drift check compares the rule's bullet list against the YAML's `signals` and `anti_patterns` sections to flag divergence.

## Related

- **ADR (authoritative decision):** `docs/architecture/adrs/ADR-052-DS-TAXONOMY-LAYERS.md`
- **Roundtable verdict:** `docs/architecture/roundtable-adr-052-2026-05-06.md` (5/5 OPTION_B, 8.0/10)
- **Research:** `docs/research/2026-05-06-atomic-design-definition/`
  - 5-question rule: doc 06
  - Mature DS taxonomy: doc 05
  - Critique and alternatives: doc 07
  - Edge cases applied: doc 08
- **Tasks consuming this rule:**
  - `squads/design-ops/tasks/design-triage.md` v2.1.0
  - `squads/design-ops/tasks/epic-ds-review.md` v1.4.0
  - `squads/design-ops/tasks/ds-parallelization-gate.md` v1.1.0
- **Workflows consuming this rule:**
  - `squads/design-ops/workflows/foundations-pipeline.yaml` v1.1.0
  - `squads/design-ops/workflows/dtcg-tokens-governance.yaml` v1.1.0
  - `squads/design-ops/workflows/storybook-brownfield-migration.yaml` v1.1
  - `squads/design-ops/workflows/storybook-full-setup.yaml` v1.1
  - `squads/design-ops/workflows/audit-only.yaml` v2.1.0
- **Story (delegated `@dev`):** `docs/stories/2026-05-06-ds-extraction-atomic-layer-classification.story.md`

## Validation criteria (CON-7 from roundtable)

This rule is empirically valid when:

- Two reviewers independently classify the same artifact in the same layer ≥90% of the time on a 10+ component sample.
- Zero shells classified as Organism in artifacts produced after rule adoption.
- Each Page validates against ≥1 Layout.
- Patterns layer documents ≥3 cross-cutting concerns within 30 days of adoption.

If any criterion fails persistently after 90 days, trigger a Path C migration evaluation (mature DS taxonomy with flat Components and explicit sub-groups) per ADR-052 §Recommendation point 3.

---

*Rule created 2026-05-07 implementing CON-1 from the ADR-052 roundtable. Status: ACCEPTED-WITH-CONDITIONS. Authority: `@architect` (architectural decisions per `.claude/rules/agent-authority.md`).*
