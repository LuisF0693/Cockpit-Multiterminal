# Task: DesignOps Audit (Cross-App)

> Command: `*ops-audit {app_path}`
> Purpose: Full DesignOps audit with cross-app token drift scan, component reuse analysis, Three Lenses assessment, and automatic epic generation
> **Execution Type:** `Workflow`
> **Workflow:** `ops-audit.yaml`
> **Dependencies:** depends_on: `[]` . enables: `[ds-health-metrics, token-drift-scan]`

## Output Schema
- **produces:** `outputs/design/ops-audit/{date}/`
- **format:** Markdown reports + JSON metrics + Epic draft
- **consumed_by:** design-chief (routing), pm (epic execution)

## Overview

This task orchestrates a full DesignOps audit across the DS source and all consumer apps. It combines:
- **Brad Frost's** DS health metrics (internal quality)
- **Dave Malouf's** Three Lenses assessment (organizational maturity)
- **Cross-app scanning** for token drift and component reuse
- **Automatic epic generation** with prioritized remediation stories

Unlike `*audit` (pattern redundancy for one app) or `*ds-health` (health metrics for one app), this task measures **adoption across the ecosystem**.

## Prerequisites

- DS source app exists at `{app_path}` with bb-* components
- At least 1 consumer app exists in `apps/`

## Execution Steps

### Phase 1: Resolve DS Source and Consumer Apps

Identify all apps that consume the DS. Two strategies:

**Strategy A: Consumer contracts exist**
```
apps/aiox-design-system/docs/consumer-contracts.md
```
If this file exists, read the declared consumers.

**Strategy B: Auto-discovery (fallback)**
Scan all `apps/*/` directories for:
```bash
# Token consumption (--bb-* CSS vars)
grep -rl "var(--bb-" apps/*/src/ --include="*.tsx" --include="*.css"

# Component consumption (bb-* imports)
grep -rl "from.*brandbook\|from.*bb-" apps/*/src/ --include="*.tsx"

# Parallel token systems (competing with --bb-*)
grep -rl "var(--aiox-\|var(--brand-\|var(--ds-" apps/*/src/ --include="*.css"
```

**Output:** List of consumer apps with consumption type (tokens-only, components, none).

### Phase 2: DS Source Health Scan

Run `ds-health-metrics` task on the DS source app.

**Delegate to:** `@brad-frost *ds-health {app_path}`

**Captures:**
- Health score (0-100)
- Token coverage %
- Component count (atoms/molecules/organisms)
- Story coverage %
- Test coverage %

### Phase 3: Cross-App Token Drift Scan

For EACH consumer app, run grep-based scans:

```bash
# Hardcoded hex colors (excluding token definition files)
grep -rn --include="*.tsx" --include="*.css" \
  "#[0-9A-Fa-f]\{3,8\}" {consumer_path}/src/ \
  --exclude="*tokens*" --exclude="*theme*" | wc -l

# Token references (--bb-* vars + bb-* Tailwind classes)
grep -rn --include="*.tsx" --include="*.css" \
  "var(--bb-\|bb-[a-z]" {consumer_path}/src/ | wc -l

# Parallel token systems
grep -rn --include="*.css" \
  "var(--aiox-\|var(--brand-\|var(--ds-" {consumer_path}/src/
```

**Metrics per app:**
| Metric | Formula |
|--------|---------|
| Hardcoded count | grep hex count |
| Token ref count | grep --bb-* count |
| Token drift % | hardcoded / (hardcoded + token refs) * 100 |
| Parallel systems | List of competing token prefixes |
| Top 10 hardcoded | Most common hex values |

### Phase 4: Cross-App Component Reuse Scan

**Available components:** List all `bb-*.tsx` in DS source (excluding .stories.tsx).

For EACH consumer app:
```bash
# Which bb-* components are imported
grep -rn "from.*bb-\|import.*Bb" {consumer_path}/src/ --include="*.tsx"

# shadcn/ui imports (alternative strategy)
grep -rn "from.*components/ui" {consumer_path}/src/ --include="*.tsx"

# Custom components that duplicate bb-* functionality
grep -rn "Button\|Badge\|Card\|Input\|Select" {consumer_path}/src/components/ \
  --include="*.tsx" -l
```

**Metrics per app:**
| Metric | Formula |
|--------|---------|
| Components used | Count of distinct bb-* imports |
| Reuse rate | used / available * 100 |
| Import strategy | bb-* / shadcn / custom / mixed |
| Duplicates | Custom components that shadow bb-* |

### Phase 5: Three Lenses Assessment

**Delegate to:** `@dave-malouf` with data from phases 2-4.

**Lens 1 — How We Work (score 1-5):**
- Atomic design structure (atoms/molecules/organisms dirs)
- Token pipeline (sync scripts, DTCG compliance)
- Storybook (coverage, addons, interaction tests)
- Handoff design-dev (Figma integration, automation)
- CI quality gates (lint, typecheck, Chromatic blocking)
- Version control (changelogs, semver)

**Lens 2 — How We Grow (score 1-5):**
- Usage documentation (Storybook autodocs, brandbook pages)
- Contribution guide (CONTRIBUTING.md, "how to create bb-*")
- Naming conventions (bb-* prefix, atomic hierarchy)
- Onboarding path (clear for new contributors?)

**Lens 3 — How We Thrive (score 1-5):**
- Adoption across apps (reuse rate from phase 4)
- Governance (quality chain, agent enforcement)
- Multi-tenant support (theme system, tenant runtime)
- Token compliance trend (improving or degrading?)

**Maturity levels:**
| Score | Level | Description |
|-------|-------|-------------|
| 1.0-1.9 | Ad Hoc | No process, individual decisions |
| 2.0-2.9 | Emerging | Some structure, inconsistent adoption |
| 3.0-3.9 | Defined | Documented processes, partial enforcement |
| 4.0-4.5 | Managed | Automated enforcement, measured outcomes |
| 4.6-5.0 | Optimized | Continuous improvement, predictable outcomes |

### Phase 6: Define Metrics Stack

**Delegate to:** `@dave-malouf` with Three Lenses results.

Output three layers:
- **Output metrics:** What we produce (component count, story coverage, test coverage)
- **Outcome metrics:** What changed (reuse rate, token drift, a11y violations, time-to-component)
- **Impact metrics:** Business value (feature velocity, visual consistency, onboarding time)

Each metric includes: baseline (from scan), target, how to measure, frequency.

### Phase 7: Generate Remediation Epic

**Agent:** `@design-chief`

Using all findings, generate an epic in `docs/projects/aiox/epics/epic-ds-{slug}/epic.md`.

**Epic structure (follow existing pattern):**
```markdown
# Epic: {title}
## Epic Metadata (YAML block)
## Stories (ordered by priority)
  - P0 stories first (critical token drift, missing CI gates)
  - P1 stories (contribution guide, test coverage)
  - P2 stories (ESLint rules, advanced governance)
## Execution Plan (waves with dependency map)
## Success Criteria (baselines + targets from metrics stack)
```

**Story generation rules:**
- One story per distinct finding (not one per app)
- Stories are scoped to be completable in 1 session (2-8h)
- Each story has: AC with checkboxes, artefatos, metricas de sucesso
- Dependencies between stories are explicit (depende de: Story N)

### Phase 8: Persist Report

Save ALL outputs to disk (progressive saving rule):

```
outputs/design/ops-audit/{date}/
  health-report.json
  token-drift-report.json
  reuse-report.json
  three-lenses-report.md
  metrics-stack.md
  risk-register.md
  epic-path.txt (pointer to generated epic)
```

## Output Location

```
outputs/design/ops-audit/{date}/         <- scan results
docs/projects/aiox/epics/epic-ds-*/      <- generated epic
```

## Failure Handling

- **DS source not found:** Exit with error. Cannot audit without source.
- **No consumer apps found:** Run phases 2, 5, 6 only (internal health). Skip phases 3, 4. Note in report.
- **Consumer app has no src/:** Skip that app, note in report.
- **Phase fails:** Continue with partial data. Note "Phase N: SKIPPED — {reason}" in final report.
- **Epic generation fails:** Output raw findings. Epic can be created manually.

## Success Criteria

- [ ] DS source health score calculated
- [ ] Token drift measured for all consumer apps
- [ ] Component reuse measured for all consumer apps
- [ ] Three Lenses scored (1-5 per lens)
- [ ] Maturity level assigned
- [ ] Metrics stack defined with baselines and targets
- [ ] Remediation epic generated with prioritized stories
- [ ] All outputs persisted to outputs/design/ops-audit/

## Related Commands

- `*ds-health {path}` — Single-app health metrics (phase 2 standalone)
- `*audit {path}` — Pattern redundancy audit (brownfield focus)
- `*metrics-stack` — Define metrics without full audit (phase 6 standalone)
- `*review-epic-ds {path}` — Review existing epic for DS alignment

## Related Checklists

- `squads/aiox-design/checklists/designops-maturity-checklist.md`
- `squads/aiox-design/checklists/ds-component-quality-checklist.md`
- `squads/aiox-design/checklists/token-mapping-checklist.md`

## Process Guards
- **On Fail:** Continue with partial data. Never block entire audit for one phase failure.
- **Progressive Save:** Each phase MUST persist output before starting next phase.
