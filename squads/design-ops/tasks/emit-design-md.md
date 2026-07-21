# Task: emit-design-md

**Squad:** design-ops
**Owners:** `@design-chief` (orchestration) · `@aiox-ux-designer` (prose)
**Template:** `squads/design-ops/templates/DESIGN.md.tmpl`

## Purpose

Emit a spec-compliant `DESIGN.md` at the target location from real brand/token/component sources. Either scaffolds a new DESIGN.md (greenfield) or extracts one from an existing codebase (brownfield). Output is always a single file that passes `npx @google/design.md lint` with zero errors.

## When to trigger

- `/design-system` Phase 0 detects the target app has no `DESIGN.md` and the user approves extraction.
- Explicit operator request: *"emit a DESIGN.md for apps/{slug}"*.
- New app scaffolding — as the final step after `tokens.json` + `globals.css` + `components.json` are in place.
- Campaign kickoff with declared visual identity — emit at `workspace/businesses/{biz}/L4-operational/campaigns/{slug}/DESIGN.md`.

## Inputs (required)

| Input | Source | Notes |
|---|---|---|
| Target path | Operator or inferred | `apps/{slug}/DESIGN.md` or `workspace/businesses/{biz}/L2-tactical/design/DESIGN.md` |
| Token source | `src/design-system/tokens.json` OR `globals.css` OR `tailwind.config.*` | Primitive colors, spacing, radius, motion, type |
| **Token defaults fallback** | `squads/design-ops/templates/ds-tokens-defaults-tmpl.yaml` | When app has no tokens yet (greenfield), use hydrated defaults (oklch, 5-step spacing, 8-step type) |
| **Token justification reference** | `squads/design-ops/data/tier-1-token-defaults-justification.yaml` | To answer "why this value?" in the DESIGN.md prose |
| Component inventory | `src/components/ui/` + `components.manifest.json` if present | Names, variants, tokens consumed |
| Stack context | `package.json` + `components.json` | Framework, Tailwind version, shadcn baseColor |
| Brand prose | `README.md` + workspace brandbook (if exists) | Overview, tone, casing discipline |

## Inputs (optional)

- Existing DESIGN.md at a related path (business-level) to inherit from.
- Figma variables export.
- Design tokens in DTCG format.

## Outputs

1. `DESIGN.md` at the target path — YAML front matter + 9 sections (the 8 canonical + `## Implementation`).
2. `outputs/design-ops/{app-slug}/emit-design-md/lint-report.json` — the `design.md lint` output captured for provenance.
3. `outputs/design-ops/{app-slug}/emit-design-md/extraction-log.yaml` — what was extracted, what was inferred, what warnings were accepted as known brand decisions.

## Procedure

### Phase 1 — Inventory (Prior-Art Search, per `.claude/rules/prior-art-search.md`)

1. Check target path — is there already a DESIGN.md? If yes, STOP. Use `design.md diff` to propose updates instead of overwriting.
2. Glob the app for token sources (`tokens.json`, `globals.css`, `tailwind.config.*`, `styles/**/*.css`). Report what was found.
3. List `src/components/ui/**/*.tsx` and any `components.manifest.json`. Count atoms / molecules / organisms.
4. Read the app's `README.md` for brand tone / positioning.
5. Read the business brandbook at `workspace/businesses/{biz}/L2-tactical/design/DESIGN.md` if present — use as inheritance base.

### Phase 2 — Token extraction

1. **Colors:** extract every distinct color value. Map to DESIGN.md semantic slots (`primary` / `secondary` / `tertiary` / `neutral` / `surface` + semantic feedback). Preserve brand-specific names (e.g., `clay`, `lime`, `snow`) as additional named tokens — unknown color token names are spec-accepted.
2. **Typography:** extract every `font-size`/`font-family`/`font-weight`/`line-height`/`letter-spacing` combination. Name each with DS convention (`display-*`, `h1`-`h5`, `body-l`/`body`/`body-s`, `caption`, `eyebrow`, `mono`). Resolve fluid clamps to their max value (spec expects fixed dimensions; document the clamp in prose).
3. **Spacing:** extract the spacing scale. Keep the app's native keying (`0`-`12` numeric, or `xs`-`xl` T-shirt).
4. **Rounded:** extract corner radii. Map to `none` / `sm` / `md` / `lg` / `full` when possible; keep app-native if the app uses more granular steps.
5. **Components:** for each UI component read in Phase 1, emit one or more front-matter entries (base + hover + pressed + invalid variants when applicable). Reference colors and typography via `{colors.X}` / `{typography.Y}` / `{rounded.Z}` — never hardcode hex inside component entries.

### Phase 3 — HSL / OKLCH → hex conversion (when needed)

If source uses HSL or OKLCH, convert to sRGB hex strictly (no approximation). Spec requires `# + hex sRGB` for `Color` values. Document the conversion source (e.g., "OKLCH `0.934 0.2264 121.95` → `#D1FF00`"). Use `scripts/convert-oklch.mjs` or inline Python if the app ships source in OKLCH.

### Phase 4 — Prose authoring

For each of the 8 canonical sections, write 2–6 paragraphs describing the *why* of the tokens. Rules:

- Overview: brand positioning in 2–3 sentences + tone + what distinguishes this DS from neighboring systems.
- Colors: describe each primary slot's role + ramp semantics + the signature's scarcity discipline.
- Typography: describe faces, weights, register per scale tier, measure discipline.
- Layout: grid + spacing + container strategy + any signature idioms.
- Elevation & Depth: shadow vs hairline vs tonal strategy.
- Shapes: radius hierarchy + icon system + emoji policy.
- Components: group inventory (actions, forms, surfaces, feedback, disclosure, navigation). No need to enumerate every variant — group them by family.
- Do's and Don'ts: 8-12 entries each, concrete + brand-specific.

### Phase 5 — Implementation section (Sinkra-Hub extension)

Write the `## Implementation` section with:

1. Stack line (framework + major versions).
2. Token source of truth + regenerate command.
3. Tailwind config location + version.
4. shadcn `components.json` snapshot.
5. Token → utility mapping table (at least the 4 canonical rows: primary / surface / secondary / tertiary).
6. Layer discipline statement (Layer 1 primitives → Layer 2 semantic → Layer 3 Tailwind/shadcn).
7. Component source path convention.
8. Regeneration protocol for tokens.

### Phase 6 — Lint + QA

1. Run `npx @google/design.md lint DESIGN.md`.
2. Target: 0 errors. Warnings are categorized:
   - **Contrast warnings on brand colors** — accept if the brand explicitly tolerates (document in the extraction-log.yaml with reasoning; reference DS Port Playbook when applicable).
   - **Unreferenced tokens** — expected for spec-canonical slot aliases (`secondary`, `tertiary`, etc.) and extended palette not yet modeled in components. Document; don't auto-remove.
3. Capture the JSON output at `outputs/design-ops/{app-slug}/emit-design-md/lint-report.json`.
4. If errors > 0, stop and escalate — do not commit.

### Phase 7 — Handoff

1. Write the extraction-log.yaml with the full provenance trail (what was found, what was converted, what warnings were accepted).
2. Present the DESIGN.md path + lint summary to the operator.
3. Ask: *"Use this DESIGN.md as the SOT for this app? I can also run `design.md diff` against a reference if one exists."*

## Anti-patterns

- **Over-modeling components.** Don't invent component entries that don't exist in the codebase. Model what's shipped.
- **Under-modeling colors.** Don't drop ramp steps just because they're unreferenced — the front matter should represent the full palette the DS defines, even if not all are component-consumed.
- **Unifying parallel token systems.** If the app carries dual token families (e.g., production `--brand-*` + marketing `--mkt-*` in Claude Perfected), do NOT unify. The DS Port Playbook (AN_KE_011) says parallel systems disagree intentionally — keep them parallel in the DESIGN.md.
- **Silent contrast fixes.** Don't auto-darken brand colors to pass WCAG. If the brand fails AA, document the decision in Do's/Don'ts and accept the warning.
- **Hand-rolling the front matter.** Always use the template at `squads/design-ops/templates/DESIGN.md.tmpl` as the scaffold.

## Validation

- Lint: `npx @google/design.md lint DESIGN.md` → `errors: 0`
- Coverage: `components:` count ≥ 80% of actual UI inventory when brownfield (unless the app has 50+ components, in which case model the top 40).
- Round-trip: changing a token in the DS source (`tokens.json`) and regenerating the DESIGN.md should produce a minimal, semantically-correct diff via `design.md diff`.

## Evidence

Pilot executions:

| App | Components | Colors | Errors | Date |
|---|---|---|---|---|
| `apps/redpine-ds/` | 90 | 39 | 0 | 2026-04-23 |
| `apps/aiox-brandbook/` | 80 | 46 | 0 | 2026-04-23 |
| `apps/anthropic-ds/` | 110 | 78 | 0 | 2026-04-23 |

All three passed structural lint. Contrast warnings documented as brand decisions.

## Related

- **Template:** `squads/design-ops/templates/DESIGN.md.tmpl` (front-matter scaffold)
- **Upstream:** `squads/design-ops/tasks/ds-extract-tokens.md` (token extraction pre-step)
- **Consumer:** `.claude/skills/design-system/SKILL.md` Phase 0 (reads output)
- **Diff:** `npx @google/design.md diff` (regression detection between versions)
