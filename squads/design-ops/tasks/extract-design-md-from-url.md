# Task: extract-design-md-from-url

**Squad:** design-ops
**Owner:** `@design-chief`
**Mode:** CLI first
**Skill invocation:** `/design-md`
**Canonical implementation:** `squads/design-ops/scripts/extract-from-url/`

## Purpose

Extract a Google-spec `DESIGN.md` from any public URL using static HTML/CSS analysis plus a provider-agnostic LLM step. This task produces the evidence contract consumed by downstream UI generation, drift checks, design-gallery materialization, and Tailwind/gold-standard transformation workflows.

The `.claude/skills/design-md/run.cjs` file is only a launcher. It delegates to the canonical runner in `squads/design-ops/scripts/extract-from-url/run.cjs` so `/design-md` cannot drift from `design-ops`.

## Inputs

| Param | Required | Notes |
|---|---|---|
| `--url <url>` | yes | Public `http(s)` URL |
| `--out <dir>` | no | Overrides default `outputs/design-ops/url-extracts/{slug}/` |
| `--prompt <path>` | no | Overrides `squads/design-ops/data/url-extract-prompt.txt` |
| `--compare <path>` | no | Emits `drift-report.json` against a local `DESIGN.md` |
| `--provider <id>` | no | `claude-cli`, `codex-cli`, `openrouter`, `openai`, `anthropic-api`, `generic-http` |
| `--model <id>` | no | Provider-specific model override |
| `--budget <tier>` | no | `cheap`, `standard`, `premium` profile |
| `--scaffold` | no | Emits v2.2 scaffold from extracted sidecars |
| `--gallery` / `--bundle-force` | no | Opts into derived `apps/design` materialization |

## Pipeline

1. Fetch HTML and response diagnostics.
2. Collect external CSS, preload CSS, `@import`, inline `<style>`, and inline `style=""`.
3. Run static detectors for tokens, CSS vars, `@font-face`, token usage graph, components, breakpoints, dark mode, shadows, motion, stack, style archetype, gradients, opacity, focus rings, container width, default theme, and meta assets.
4. Convert HTML to markdown and derive page copy, hero block, voice heuristic, hero variant, and CTA variants.
5. Fill the prompt from extracted sidecar paths and default-theme/archetype signals.
6. Invoke the selected LLM provider, normalize `DESIGN.md`, lint it, and retry on incomplete sections when allowed.
7. Deterministically enrich `tokens.json`, emit `tokens-extended.json`, `render-contract.json`, extraction log, quality score, drift report, embedded font inventory, and agent prompt.
8. Render `preview.html`.
9. Optionally scaffold a v2.2 `DESIGN.md` or materialize a design-gallery bundle.

## Outputs

```text
outputs/design-ops/url-extracts/{slug}/
├── DESIGN.md
├── tokens.json
├── tokens-extended.json
├── render-contract.json
├── extraction-log.yaml
├── lint-report.json
├── quality-score.json
├── drift-report.json              # only when --compare is provided
├── ai-fingerprint-report.json     # NEW 2026-05-19 — AI-slop score 0-100 + 7 detectors (cross-fit bench)
├── dial-inference.yaml            # NEW 2026-05-19 — DESIGN_VARIANCE/MOTION_INTENSITY/VISUAL_DENSITY 1-10 (cross-fit bench)
├── agent-prompt.txt
├── meta-defaults.json
├── preview.html
└── inputs/
    ├── page.html
    ├── page.md
    ├── page-copy.json
    ├── css-collected.css
    ├── css-meta.json
    ├── css-for-llm.css
    ├── tokens-detected.json
    ├── css-vars-detected.json
    ├── font-faces.json
    ├── embedded-fonts.json
    ├── token-usage-graph.json
    ├── component-properties.json
    ├── breakpoints.json
    ├── dark-mode.json
    ├── shadows.json
    ├── motion.json
    ├── theme-default.json
    ├── hero-block.json
    ├── cta-variants.json
    ├── stack.json
    ├── stack-summary.json
    └── prompt.txt
```

## Post-conditions (Cross-fit bench absorption 2026-05-19)

Authority: `.claude/rules/design-absolute-bans.md` + artifact contracts `ai-fingerprint-report` / `dial-inference` in `squads/design-ops/config.yaml`.

After the standard pipeline emits, the runtime appends two sidecars and exposes their summary in DESIGN.md frontmatter:

### ai-fingerprint-report.json
- **Emitted by:** `scripts/extract-from-url/lib/ai-fingerprint-detector.cjs`
- **Schema root:** `{ ai_slop_score: 0-100, recommendation, detected_fingerprints[], summary }`
- **Block threshold:** when `ai_slop_score > 60`, downstream `ds-critical-eye-score.md` REJECTS the variant.
- **DESIGN.md frontmatter mirror:**
  ```yaml
  ai_fingerprint:
    score: 73
    recommendation: rebrief-recommended
    p0_hits: 1
    p1_hits: 4
  ```

### dial-inference.yaml
- **Emitted by:** `scripts/extract-from-url/lib/dial-inference.cjs`
- **Schema root:** `{ dials: { DESIGN_VARIANCE 1-10, MOTION_INTENSITY 1-10, VISUAL_DENSITY 1-10 }, overall_confidence 0.0-1.0 }`
- **DESIGN.md frontmatter mirror:**
  ```yaml
  tasteskill_dials:
    DESIGN_VARIANCE: 7
    MOTION_INTENSITY: 5
    VISUAL_DENSITY: 3
    confidence: 0.78
  ```
- **Consumed by:** slide-creator render-lock (style replication), apps/design materializer (composition variance).

### register inference
- **Source:** `squads/design-ops/data/register-inference.yaml` (heuristics) consumed inline by `run.cjs`
- **DESIGN.md frontmatter mirror:**
  ```yaml
  register: brand   # OR product
  register_confidence: 0.82
  register_authority: inferred   # OR workspace_policy
  ```

## Downstream Contract

Downstream generators should not scrape the target site again. Consume the `/design-md` output in this order:

1. `render-contract.json` — canonical theme mode, renderable component props, warnings.
2. `tokens.json.preview_tokens` — concrete live-preview values.
3. `tokens-extended.json` — deeper extracted component states, shadows, motion, spacing, dark slots, and layout hints.
4. Raw evidence sidecars — `component-properties.json`, `motion.json`, `font-faces.json`, `css-collected.css`, `token-usage-graph.json`.
5. `DESIGN.md` — design intent, rules, and prompt context.

Tailwind v4 consumers must preserve four lessons from the gold-standard mapping:

- `@theme` values must be literal; do not emit `var()` alias chains.
- Arbitrary values must preserve commas in gradients, `rgba()`, and shadows.
- Component classes should use plain scoped CSS when `@apply` depends on custom theme tokens.
- Preflight resets must be restored deliberately for headings, lists, margins, and form controls.

Quality gates must treat lint infrastructure failures and accessibility failures as blockers. A non-zero lint exit with no structured findings is an execution failure, not a clean lint pass. An accessibility F caps promotion readiness even when the average score is high.

## DESIGN.md Comment & Log Hygiene (NON-NEGOTIABLE)

`DESIGN.md` is the consumer contract for downstream LLM code generation. It is **not** a changelog, **not** an extraction audit, **not** a provenance log. Every byte must earn its place by changing what the AI does.

**Forbidden in DESIGN.md (any run, any reason):**

- Frontmatter keys: `fidelity_audit`, `changelog`, `history`, `revisions`, `extracted_at`, `extraction_run`, `removed_fallbacks`, `added_extracted`, `provenance`, `source_files`.
- Inline comments matching `# count=`, `# matches `, `# was `, `# renamed `, `# Removed `, `# See review`, `# derived from `, `# extracted verbatim`.
- Block comments narrating what changed between versions or what was removed.

**Allowed in DESIGN.md (kept — useful for AI):**

- Semantic role: `primary: "#141413"  # slate-dark — light-mode CTA`
- Usage rule: `border: "#1414131a"  # alpha 10% — adapts to any surface`
- Disambiguation: `card: "#ffffff"  # white, NOT ivory`
- Anti-pattern guard: `accent: "#d97757"  # never use as primary fill in light mode`

**Where logs/provenance/audit go instead:**

| Concern | Canonical home |
|---|---|
| Per-token provenance, source CSS class | `inputs/selector-provenance.json` |
| Fallback flags, coverage metrics | `extraction-class.json` |
| Run telemetry, model/cost/turn data | `telemetry.json` |
| Extraction phase log, retries | `extraction-log.yaml` |
| Bakeoff run metadata | `.bakeoff/{model}.meta.json` |
| Audit findings, comparative analysis | `review-report.md` (companion to the run) |
| What changed between two DESIGN.md versions | git commit message + `design.md diff` |

**Token efficiency targets for URL-extracted DESIGN.md:**

| Metric | Target | Ceiling |
|---|---|---|
| Total bytes | ≤ 30 KB | 40 KB |
| Frontmatter comment density | ≤ 20% of lines | 30% |
| Inline comments without explanatory value | **0** | **0** |

**Pre-save checklist (mandatory for any agent producing or editing a DESIGN.md output):**

1. Grep for `# count=` / `# was ` / `# matches ` / `# Removed ` / `# See ` — strip if found.
2. Grep for `fidelity_audit:` / `changelog:` / `extracted_at:` at frontmatter root — strip.
3. File size ≤ 30 KB target, 40 KB ceiling.
4. Every remaining comment must answer: "what does the AI do differently because of this comment?"

This rule is canonical in `squads/design-ops/rules/design-md-convention.md` § "Comment & Provenance Hygiene". The extractor (`squads/design-ops/scripts/extract-from-url/`) and any downstream surgical edits MUST honor it.

## Run

```bash
node squads/design-ops/scripts/extract-from-url/run.cjs --url https://www.anthropic.com/
```

Equivalent slash-skill launcher:

```bash
node .claude/skills/design-md/run.cjs --url https://www.anthropic.com/
```

Drift mode:

```bash
node .claude/skills/design-md/run.cjs \
  --url https://brand.aioxsquad.ai/brandbook/guidelines \
  --compare apps/aiox-brandbook/DESIGN.md
```

## Validation

```bash
node --test squads/design-ops/scripts/extract-from-url/lib/*.test.cjs \
  squads/design-ops/scripts/extract-from-url/lib/providers/*.test.cjs \
  squads/design-ops/scripts/extract-from-url/run.test.cjs
```

Use `squads/design-ops/data/regression-ds-set.yaml` before changing `lib/design-md.cjs`, `lib/extractors.cjs`, `lib/enrich.cjs`, `lib/render-contract.cjs`, or `data/url-extract-prompt.txt`.

After changing scoring or render-contract logic, rebuild derived artifacts without LLM cost:

```bash
node squads/design-ops/scripts/extract-from-url/scripts/backfill-render-contract.cjs --only=<slug>
node squads/design-ops/scripts/extract-from-url/scripts/backfill-quality-score.cjs --only=<slug>
```

## Anti-Patterns

- Do not add Playwright, Puppeteer, Hyperbrowser, or screenshot diffing to this extractor. Visual validation is downstream.
- Do not maintain duplicate extractor logic under `.claude/skills/design-md/`.
- Do not fabricate fallback tokens. Emit extraction gaps when evidence is missing.
- Do not write canonical business data to `workspace/` from this task.
- Do not bypass the content gate unless the operator explicitly passes `--no-content-gate`.
