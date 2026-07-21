# Context-Gathering Protocol — Design Ops

Applies when investigating, modifying, or extending any design artifact, component, or token under `design-ops` or consuming squads.

Layered on top of `squads/design-ops/rules/v0-frontend-quality.md` (section "Context Gathering Before Changes"). This rule adds design-specific depth and makes the protocol a hard prerequisite for `@design-chief` routing decisions.

## Protocol (Mandatory Before Any Change)

### 1. Read ALL Matches, Not the First

- When a search returns N > 1 matches for a component name, token, or pattern — read all of them. Not "a few." Not "the first two."
- The first match is rarely the canonical one. The canonical one is usually the one most referenced by other files.
- Use `Glob` with `head_limit: 0` for exhaustive enumeration when the search space is bounded.

### 2. Inspect Parents Before Editing Children

- A layout bug in a component is, more often than not, a layout bug in its parent. Read the parent's CSS/className stack before editing the child.
- Global styles (`globals.css`, `tailwind.config.ts`, design tokens, theme providers) override component-local intent silently. Check these second.
- Wrapping containers with `overflow: hidden`, `display: grid`, or `position: relative` create invisible constraints — surface them.

### 3. Find Existing Similar Implementations First

- Before creating a new component, search for components with overlapping functionality. IDS gate: REUSE > ADAPT > CREATE.
- Search order:
  1. `@sinkra/ds-core` component registry (`squads/design-ops/rules/design-system-generation.md`)
  2. `squads/design-ops/data/ds-core-catalog.yaml`
  3. `outputs/design-ops/{business}/components/`
  4. `apps/aiox-design-starter/src/`
- A near-duplicate exists for most "new" components. Finding it saves integration debt.

### 4. Trace State Before Modifying State

- If a state change is the intended fix, trace the full lifecycle: where state is created → where it flows → where it is consumed → where it is mutated.
- A fix that mutates state in a new place usually adds a second bug rather than removing the first.

### 5. Check Theme, Variant, and Token Systems Before Inline Styling

- If the surface already participates in a theme system, new styling belongs in the theme, not the component.
- Inline styling with hardcoded values for "just this one case" is technical debt by definition. The design system exists to absorb the pressure.

### 6. Use Parallel Tool Calls for Independent Reads

- When the next N reads do not depend on each other, issue them in a single tool-call batch. Sequential reads waste budget.
- Dependency structure: if read B needs the output of read A, run A first; otherwise, parallel.

### 7. Check Whether a Utility Already Exists Before Adding a Dependency

- A new npm dependency for a two-line helper is a code smell. Search `packages/` and `@sinkra/*` for existing helpers.
- `cn()`, `useIsMobile()`, `asSlot`, `ThemeProvider` all exist in `@sinkra/ds-core` — do not re-implement.

## Anti-Patterns

- **"I searched once and found something."** — Insufficient. Read all matches.
- **"The child is broken."** — Usually the parent is. Check up.
- **"This is a new component."** — Usually it's a variant of an existing one. Check the catalog.
- **"I'll just inline this."** — The design system rejects the framing. Extend the system or file a gap report.
- **"It fetches data in `useEffect`, I'll just add another one."** — Two wrongs. Use SWR or push fetching to RSC.

## Enforcement

Advisory by default. `@design-chief` surfaces a context-gathering violation when routing a task: "This task proposes creating `X` but `X-like` already exists at `squads/design-ops/data/ds-core-catalog.yaml#X`. Proceed with REUSE > ADAPT > CREATE evaluation."

## Reference

- Baseline: `squads/design-ops/rules/v0-frontend-quality.md` — "Context Gathering Before Changes"
- Component registry: `squads/design-ops/rules/design-system-generation.md` + `squads/design-ops/data/ds-core-catalog.yaml`
- External source: `agenmod/claw-design` — claude-design-sys-prompt.txt (2026-04-18)
