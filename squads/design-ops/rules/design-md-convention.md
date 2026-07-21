---
paths:
  - "apps/**"
  - "workspace/businesses/**/L2-tactical/design/**"
  - "workspace/businesses/**/L4-operational/campaigns/**"
  - "workspace/shared-products/**"
  - "**/DESIGN.md"
  - "squads/design-ops/**"
  - "squads/design-system/**"
  - "squads/aiox-design/**"
---

# DESIGN.md Convention — Per-App Design System Artifact

Applies when working on any app/surface under `apps/**` that has a visual interface, or any `workspace/businesses/{biz}/L2-tactical/design/` directory, or any `workspace/businesses/{biz}/L4-operational/campaigns/{slug}/` with visual identity.

## Rule (NON-NEGOTIABLE)

**Every UI-bearing app MUST carry a `DESIGN.md` at its root** conforming to the Google DESIGN.md spec (`@google/design.md`, alpha). Business DS lives at `workspace/businesses/{biz}/L2-tactical/design/DESIGN.md`. App DS lives at `apps/{name}/DESIGN.md`. Campaigns may carry one at `workspace/businesses/{biz}/L4-operational/campaigns/{slug}/DESIGN.md`.

**Code generation for a surface MUST consult that surface's DESIGN.md FIRST** and treat its tokens as authoritative. Hand-rolling `globals.css`, picking arbitrary hex values, or guessing font stacks is forbidden when a DESIGN.md exists.

## Why

1. **Self-contained portability** — clone the app folder, get the DS with it. No cross-repo token hunt.
2. **Mechanical validation** — `npx @google/design.md lint DESIGN.md` catches broken token refs + WCAG contrast regressions as JSON findings agents can act on.
3. **Mechanical regression detection** — `npx @google/design.md diff old.md new.md` surfaces token-level drift between versions.
4. **Dual-layer artifact** — YAML front matter (machine-readable tokens) + Markdown prose (why those tokens exist). Agents consume both; humans author the prose.
5. **Converts cleanly** to `tokens.json` / Figma variables / Tailwind `@theme` config / `@sinkra/tokens-base` overlays — no lossy transforms required.

## Where (canonical paths)

| Layer | Location | Who owns | Scope |
|---|---|---|---|
| Business DS (SOT) | `workspace/businesses/{biz}/L2-tactical/design/DESIGN.md` | Business owner + `@design-chief` | Tokens + rationale for the whole business |
| App DS (self-contained snapshot + extensions) | `apps/{name}/DESIGN.md` | App owner + `@design-chief` | App-scoped; self-contained so app remains portable |
| Campaign DS (optional) | `workspace/businesses/{biz}/L4-operational/campaigns/{slug}/DESIGN.md` | Campaign owner + `@brand-chief` | Campaign visual identity (hero, CTA, social specimens) |
| Shared products | `workspace/shared-products/{product}/DESIGN.md` | All founders + `@design-chief` | Cross-business shared product |

Skip DESIGN.md when:
- App is server-only (no UI) — e.g. `webhook-handler`, `squad-engine` (if headless)
- App is a test fixture or throwaway scaffolding
- Surface inherits 100% from a parent and has zero extension

## Inheritance strategy

**Current default: Option A — self-contained.** Each app DESIGN.md copies the business DS tokens verbatim and layers app-specific extensions. Portability wins; drift detection runs via CI `design.md diff` between app and business DS.

(Option B / C — `extends:` field or build-time sync — deferred. Revisit if drift pain materializes within 30 days of adoption.)

## What (required structure)

Every DESIGN.md MUST have:

1. **YAML front matter** with: `version`, `name`, `description`, `colors` (with `primary`/`secondary`/`tertiary`/`neutral` slots minimum), `typography`, `spacing`, `rounded`, `components` (REQUIRED — at minimum the 8 spec atoms: `button-primary`, `button-primary-hover`, `button-secondary`, `button-ghost`, `card`, `input-text`, `badge-default`, `nav-header`).
2. **Nine numbered canonical sections** (in order — omit only if irrelevant):
   `## 1. Visual Theme & Atmosphere` → `## 2. Color Palette & Roles` → `## 3. Typography Rules` → `## 4. Components` → `## 5. Layout Principles` → `## 6. Depth & Elevation` → `## 7. Do's and Don'ts` → `## 8. Responsive Behavior` → `## 9. Agent Prompt Guide`.
   Numbering is part of the contract — it aids navigation for both humans and LLM consumers (VoltAgent pattern, validated on 59 brands / 67k stars).
3. **`## Implementation` section (Sinkra-Hub extension)** — unknown-but-preserved section carrying stack metadata that the spec omits. Required fields:
   - Stack (framework + major versions)
   - Tailwind config path + version
   - shadcn `components.json` snapshot (aliases, baseColor, cssVariables)
   - Token → utility mapping table
   - Component source root path
   - Regenerate command (if tokens have a build step)
4. **`## 9. Agent Prompt Guide` (Sinkra-Hub extension, REQUIRED for URL-extracted DESIGN.md)** — operational guide for AI consumers. Three subsections:
   - `### Quick Color Reference` — one-line per role with canonical hex (e.g. `Primary CTA: Stripe Purple (#533afd)`)
   - `### Example Component Prompts` — 5+ ready-to-paste LLM prompts (hero, card, badge, navigation, dark/brand section minimum)
   - `### Iteration Guide` — 6-8 numbered tips for iterative UI generation, **brand-specific**
5. **`## Fidelity Notes` (Sinkra-Hub extension, OPTIONAL)** — structured YAML block declaring extraction limits and intentional gaps. Sub-keys:
   - `shadows_detected: true|false` — populated by `lib/extractors.cjs:detectShadows()`
   - `fonts_proprietary: ["FontName1", "FontName2"]` — populated by `detectFontFaces()`
   - `icons_not_captured: true` — always true for static-CSS extraction
   - `photography_not_captured: true` — always true for static-CSS extraction
   - `alpha_lost: ["--token-name (alpha 0.1 dropped)"]` — when 8-digit hex was normalized to 6-digit per Google spec lint
   Use Fidelity Notes to communicate DESIGN INTENT (the brand chose not to use X) rather than extraction failures.

The `## Implementation` section makes DESIGN.md *code-actionable*. The `## 9. Agent Prompt Guide` makes it *prompt-actionable*. Together they fill what the Google spec deliberately leaves agnostic.

**Section name authority:** the canonical section names above are MANDATED. Do NOT introduce parallel sections with similar intent (e.g. `## Tailwind & shadcn Implementation` is FORBIDDEN — populate `## Implementation` instead). Per Phase 5 decision D3 (docs/sessions/2026-04/2026-04-29-roundtable-design-pipeline.md), parallel-named sections are an extraction failure.

**Token reference syntax:** YAML values MUST be literal hex / units / strings. Token-reference interpolation (`{colors.primary}`, `${primary}`, etc.) is FORBIDDEN per Phase 2 decision D1. The picker chain (`component-models.ts:sanitizeCssValue`) only accepts hex/rgb/var() — references render as missing pixels. Validated externally: VoltAgent's 59-brand collection uses hex literals exclusively.

## Comment & Provenance Hygiene (NON-NEGOTIABLE)

DESIGN.md is a **consumer contract for LLM code generation**, not a changelog and not an extraction audit log. Every byte must earn its place by helping the AI build correctly.

### Allowed YAML comments (keep — useful for AI)

A `#` comment is permitted ONLY when it answers one of:

| Purpose | Example | Why it stays |
|---|---|---|
| Semantic role | `primary: "#141413"  # slate-dark — light-mode CTA` | Tells the AI WHEN to apply the token |
| Usage rule | `border: "#1414131a"  # alpha 10% — adapts to any surface` | Tells the AI HOW to apply |
| Distinguish near-duplicates | `card: "#ffffff"  # white, NOT ivory` | Disambiguates two similar tokens |
| Anti-pattern callout | `accent: "#d97757"  # never use as primary fill in light mode` | Prevents predictable misuse |

### Forbidden YAML comments (strip — pure noise)

| Pattern | Why it's forbidden |
|---|---|
| `# count=N` / `# matches source X` | Provenance log — belongs in extraction-log.yaml |
| `# was X, now Y` / `# renamed from Z` | Changelog — belongs in commit history |
| `# Removed (no source evidence)…` | Audit log — belongs in review report |
| `# derived from --swatch--clay` | Provenance — belongs in selector-provenance.json |
| `# extracted verbatim from CSS` | Pipeline metadata — implicit from existing in DESIGN.md |
| `# See review-report.md F-FIDELITY for full audit` | Cross-doc reference clutter |
| Blocks of `#` lines that explain what was changed | Logs do not belong in a consumer contract |

### Forbidden frontmatter metadata blocks

These keys MUST NOT appear in DESIGN.md:

| Forbidden key | Where it belongs |
|---|---|
| `fidelity_audit:` | `outputs/.../review-report.md` |
| `changelog:` / `history:` / `revisions:` | git log + commit messages |
| `extracted_at:` / `extraction_run:` | `extraction-log.yaml` / `telemetry.json` |
| `removed_fallbacks:` / `added_extracted:` | `extraction-class.json` `fallback_suspects` |
| `provenance:` / `source_files:` | `inputs-manifest.json` |

### Token efficiency targets

For URL-extracted DESIGN.md:

| Metric | Target | Hard ceiling |
|---|---|---|
| Total bytes | ≤ 30 KB | 40 KB |
| YAML frontmatter comments | ≤ 20% of frontmatter lines carry comments | 30% |
| Trailing/inline comment density | ≤ 1 per 5 token lines | 1 per 3 |
| `#` lines without explanatory value | **0** | **0** |

If a comment doesn't change downstream rendering behavior, it doesn't ship in DESIGN.md. Push it to:

- `review-report.md` (audit findings, comparative analysis)
- `extraction-log.yaml` (per-token provenance, source CSS class, run timestamps)
- `extraction-class.json` (fallback flags, coverage metrics)
- `outputs/design-ops/url-extracts/{slug}/.bakeoff/{model}.meta.json` (bakeoff run metadata)
- git commit message (what changed in this version)

### Surgical edit checklist (mandatory before saving any DESIGN.md edit)

1. Grep for `# count=` / `# was ` / `# matches ` / `# Removed` / `# See ` — strip if any match
2. Grep for `fidelity_audit:` / `changelog:` / `extracted_at:` at frontmatter root — strip
3. Verify file size ≤ 30 KB (target) or ≤ 40 KB (ceiling)
4. Every remaining comment must answer "what does the AI do differently because of this comment?"

## Template

Canonical template: `squads/design-ops/templates/DESIGN.md.tmpl` (ADR-022). 20 top-level keys + 11 prose sections. Validated by `npm run validate:design-md` against `squads/design-ops/templates/design-md.schema.json`.

Legacy Google-spec-alpha dialect lives at `squads/design-ops/templates/_archived/DESIGN.md.v1-legacy.tmpl` — archived only; never authored against.

Versioning of the template itself is handled by git history. Filenames carry no `v2`/`v3` suffix.

Scaffold via `node squads/design-ops/scripts/build-design-md-scaffold.cjs --slug {SLUG}` (consumes extract sidecars and emits a scaffold with explicit `extraction_gap(...)` metadata for values that were not extracted).
Emit task: `squads/design-ops/tasks/emit-design-md.md` (reads tokens.json + globals.css + components.json + brand docs; emits a compliant DESIGN.md).

## Enforcement

- **Lint gate**: `npm run validate:design-md` validates `apps/design/src/data/designs/*/design.md` against `squads/design-ops/templates/design-md.schema.json`. Exit 1 on structural drift; gap-related warnings are advisory.
- **Google spec lint** (complementary): `npx @google/design.md lint apps/*/DESIGN.md` runs the upstream alpha linter when present.
- **Port audit** (existing): the DS Port Playbook's byte-diff rubric becomes `design.md diff source.md ported.md` — replaces the manual audit table from claude-design SKILL.md.
- **Consumption** (skill): `/design-system` Phase 0 reads the DESIGN.md for the target app before any code gen. If missing, offers to extract via `emit-design-md` task.

## Admissibility

- Hand-rolled `globals.css` with hex values that don't appear in the app's DESIGN.md → **rework**; the DESIGN.md is SOT.
- Components importing colors from a palette not declared in DESIGN.md → **rework**.
- App without DESIGN.md that needs new UI code → **block code gen** until `emit-design-md` produces a draft the user approves.
- `## Implementation` section missing → **warn** (not block) on first run; emit-design-md task backfills.

## Related

- **Google spec:** `https://github.com/google-labs-code/design.md` (alpha; may evolve — pin the version when spec breaks)
- **Skills:** `.claude/skills/design-system/SKILL.md` (consumer) · `.claude/skills/design-artifact-cycle/` (technical pipeline)
- **Squad:** `squads/design-ops/rules/design-system-generation.md` (codegen directive — references DESIGN.md as SOT)
- **Template:** `squads/design-ops/templates/DESIGN.md.tmpl`
- **Task:** `squads/design-ops/tasks/emit-design-md.md`
- **DS Port Playbook:** `.claude/skills/design-system/SKILL.md#ds-port-playbook` (byte-diff rubric + fidelity sign-off)

## Evidence

- [2026-04-23 pilot] Three apps ported to DESIGN.md: `apps/redpine-ds/` (39 colors / 90 components / 0 errors), `apps/aiox-brandbook/` (46 colors / 80 components / 0 errors), `apps/anthropic-ds/` (78 colors / 110 components / 0 errors). All passed `design.md lint` structurally. Contrast warnings documented as known brand decisions.
- Heuristics triangulated: AN_KE_011 (dual-token reality), AN_KE_091 (font extraction exhaustive), AN_KE_160 (delta-transparency in port audits), AN_KE_163 (atomic Write for multi-field YAML).

---

*Rule created 2026-04-23 formalizing the per-app DESIGN.md convention. Pilot proven on 3 brownfield apps. Adoption default for new UI-bearing apps; on-demand migration for existing.*
