# Benchmark Skeleton (Spy)

Canonical scaffold for universal benchmark output structure.
Use this as the reference when comparing any two subjects.

## 1) Universal Output Root

`docs/bench/{subject_a}-vs-{subject_b}/`

## 2) Universal Artifact Set

```
docs/bench/{subject_a}-vs-{subject_b}/
  ├── metadata.json                    # type, dimensions, date, profile
  ├── inventory-{subject_a}.json
  ├── inventory-{subject_a}.md
  ├── inventory-{subject_b}.json
  ├── inventory-{subject_b}.md
  ├── comparison-matrix.json
  ├── comparison-matrix.md
  ├── scorecard.json
  ├── scorecard.md
  ├── gap-analysis.json
  ├── gap-analysis.md
  ├── battle-card.md
  ├── executive-report.md
  └── deep/
      ├── {type-specific-1}.md
      └── {type-specific-2}.md
```

## 2.1) Gold Absorption Artifact Set

Use `profile: gold_absorption` when the benchmark must combine the matrix depth
of `docs/bench/slides-creator-open-source-absorption/` with the decision
intelligence of `docs/bench/deepresearch-absorption-benchmark/`. This is not a
larger duel; it is a decision-intelligence package for build-vs-buy,
open-source absorption, market stack selection, or roadmap derivation.

Machine-readable contract:

`squads/research/data/bench-gold-absorption-contract.json`

Every Gold benchmark may and should add a local contract when the request needs
a custom matrix, taxonomy, category system, or scoring formula:

`docs/bench/{slug}/bench-contract.json`

Minimal local contract:

```json
{
  "schema": "sinkra.bench-local-contract.v1",
  "benchmark_kind": "custom_market_landscape | product_benchmark | code_absorption | tco_model | risk_model | ...",
  "objective": "Decision this benchmark exists to support.",
  "taxonomy": {
    "categories": ["Request-specific category A", "Request-specific category B"],
    "row_unit": "capability | scenario | criterion | risk | journey_step | cost_driver | custom",
    "player_model": "what counts as a player in this benchmark",
    "dimension_source": "how dimensions/categories were derived from the request"
  },
  "scoring_model": {
    "method_family": "weighted_sum | scenario_weighted | risk_adjusted | tco_model | pairwise_duel | custom",
    "formula": "human-readable formula",
    "scale": "0-100 or custom disclosed scale",
    "weight_policy": "how weights are assigned",
    "normalization": "how scores remain comparable",
    "tie_break_policy": "how close calls are decided"
  }
}
```

The base contract is intentionally agnostic. It enforces that the benchmark is
transparent and decision-ready; it does not force all benchmarks to use the same
categories, row count, personas, or formula.

Gold Absorption keeps the universal set above, then adds:

```
docs/bench/{slug}/
  ├── INDEX.md
  ├── README.md
  ├── MANIFEST.json
  ├── metadata.canonical.json
  ├── bench-output-dash.json
  ├── dashboard-intelligence.json
  ├── dashboard-intelligence.md
  ├── scenario-scorecards.json
  ├── scenario-scorecards.md
  ├── segmented-comparisons.json
  ├── segmented-comparisons.md
  ├── evidence-ledger.json
  ├── evidence-ledger.md
  ├── bench-completeness-rubric.json
  ├── bench-completeness-rubric.md
  ├── implementation-readiness-gate.json
  ├── implementation-readiness-gate.md
  ├── presentation-brief.json
  ├── presentation-brief.md
  ├── risk-register.json
  ├── risk-register.md
  ├── story-ready-backlog.md
  ├── deep/
  │   ├── micro-capability-matrix.json
  │   ├── micro-capability-matrix.md
  │   ├── macro-comparison-matrix.json
  │   ├── macro-comparison-matrix.md
  │   ├── matrix-methodology.md
  │   ├── scoring-transparency.md
  │   ├── evidence-by-dimension.md
  │   ├── evidence-strength-map.json
  │   ├── evidence-strength-map.md
  │   ├── persona-weight-methodology.json
  │   ├── persona-weight-methodology.md
  │   ├── micro-leaderboard-by-group.md
  │   ├── segmented-methodology.md
  │   ├── segment-deep-analysis.md
  │   ├── intelligence-graph.json
  │   ├── intelligence-graph.md
  │   ├── absorption-decision-table.json
  │   ├── absorption-decision-table.md
  │   ├── implementation-playbook.md
  │   └── acceptance-test-plan.md
  └── contracts/
      ├── api-contract.md
      ├── mcp-contract.md
      ├── native-ir-contract.md
      ├── qa-rubric.json
      └── qa-rubric.md
```

### Gold Absorption Depth Gates

| Gate | Minimum | Preferred | Why it matters |
|---|---:|---:|---|
| Players | 6 | 8+ | Prevents a thin duel from pretending to be a landscape. |
| Macro dimensions | 24 | 36 | Preserves strategic coverage before micro-splitting. |
| Micro rows | 72 | 108 | Enables operational decisions, not just category scores. |
| Cells | `rows × players` | `108 × 8+` | Forces every player to be scored against the same lens. |
| Personas | 6 | 10+ | Makes rankings react to job-to-be-done, not a hidden average. |
| Intelligence graph | 40 nodes / 80 edges | 60+ / 120+ | Explains how sources, dimensions, gaps, decisions and artifacts connect. |
| Evidence | every cell | every cell + ledger | Prevents score-only claims. |

### Gold Decision Intelligence Gates

| Gate | Requirement | Why it matters |
|---|---|---|
| Dashboard intelligence | KPIs, top players, scenario/persona winners, critical gaps | Lets the dashboard explain the bench without parsing every sidecar. |
| Scenario winners | Each declared scenario/persona/job has a winner or explicit no-winner rationale | Prevents a single hidden average from pretending to answer every persona. |
| Gap resolution | Every gap has resolution, action, absorption, acceptance, or next step | Turns diagnosis into execution. |
| Evidence ledger | Claims/players/source artifacts link to concrete files, URLs, or local anatomy outputs | Makes the score auditable. |
| Readiness gate | Separates benchmark completeness from implementation readiness | Prevents score 100 from meaning "product done". |
| Battle card | Position/best choice, anti-decisions or objections, and next move | Gives executives a fast usable view. |
| Decision aids | `source_summary`, `categorical`, `tiebreakers`, `cliffs`, `decision_tree` | Makes `/observatory/bench` answer what to do next, not just show a matrix. |

### Gold Absorption Cell Model

Each micro row must have one cell per player. Each cell requires:

- `score`: 0-100.
- `confidence`: `high`, `medium`, or `low`.
- `notes`: concrete explanation of the score.
- `source`: file path, URL, ledger id, or local evidence reference.

Recommended score formula:

```text
score_da_celula = cobertura + profundidade + fidelidade + evidencia + absorvibilidade
```

Each lens is worth 0-20 points. The total player score is:

```text
score_total_player = soma(score_da_celula × peso_da_microdimensao) / soma(pesos)
```

`summary.score_semantics` must explicitly say that score 100 means benchmark
completeness for decision/dashboard presentation, not implementation complete.

### Type-Specific Deep Artifacts

| Type | Deep Artifacts |
|------|---------------|
| codebase | `component-comparison.md`, `hooks-analysis.md`, `absorption-roadmap.md`, `migration-playbook.md` |
| llm | `reasoning-eval.md`, `coding-eval.md`, `cost-analysis.md`, `benchmark-compilation.md` |
| product | `feature-comparison.md`, `ux-analysis.md`, `pricing-analysis.md`, `reviews-sentiment.md` |
| company | `market-position.md`, `swot-analysis.md`, `financial-comparison.md`, `team-analysis.md` |
| technology | `maturity-assessment.md`, `ecosystem-analysis.md`, `dx-comparison.md`, `performance-benchmarks.md` |

## 3) Mandatory Mapping Logic

- Equivalence classes:
  - `Forte` (5/5)
  - `Parcial` (3/5)
  - `Sem equivalente` (1/5)
- Always map:
  - Subject A → Subject B
  - Subject B differentials (reverse mapping)
  - Subject A-only gaps
  - Subject B-only gaps

## 4) Scoring Dimensions

Dimensions are loaded dynamically from `data/bench-dimension-packs.yaml` based on comparison type.

| Type | Example Dimensions |
|------|-------------------|
| codebase | Architecture, Testing & QA, Documentation, Automation, Extensibility, Code Quality |
| llm | Reasoning, Coding, Math & Logic, Speed, Cost, Context Window, Tool Use |
| product | Features, UX/Design, Pricing, Integration, Support, Market Fit |
| company | Revenue, Market Share, Team, Funding, Technology, Brand |
| technology | Maturity, Ecosystem, DX, Performance, Scalability, Community |

Each dimension scored 0-100 for both subjects. Weights defined per dimension pack.

## 5) Required Core Sections (comparison-matrix.md)

1. Header: scope, date, comparison type, subjects
2. Sources (official docs/repos/data sources for both subjects)
3. Method (how data was collected and compared)
4. Inventory summary of both subjects
5. Feature/capability matrix with equivalence scores
6. Subject A-only capabilities
7. Subject B-only capabilities
8. Objective reading (strengths/weaknesses)
9. Recommendation or next-depth paths

## 6) Required Core Sections (scorecard.md)

1. Method type and dimension pack used
2. Dimension list with weights
3. Per-dimension score table (Subject A | Subject B | Delta)
4. Weighted totals
5. Confidence levels per dimension
6. Radar chart data reference
7. Objective reading
8. Generated files list

## 7) Minimum JSON Fields

### metadata.json
- `generatedAt`
- `comparison_type`
- `subjects.a` / `subjects.b`
- `dimension_pack`
- `scoring_dimensions[]`
- `profile`
- `pipeline_version`

### scorecard.json
- `generatedAt`
- `comparison_type`
- `subjects`
- `dimensions[]` with:
  - `name`
  - `weight`
  - `scores.subject_a`
  - `scores.subject_b`
  - `delta`
  - `confidence`
- `weighted_totals`
- `radar_chart_data`

### comparison-matrix.json
- `generatedAt`
- `comparison_type`
- `subjects`
- `categories[]` with:
  - `name`
  - `features[]` with:
    - `name`
    - `subject_a_value`
    - `subject_b_value`
    - `equivalence` (1-5)
    - `delta`
- `summary.total_features`
- `summary.a_only_count`
- `summary.b_only_count`

### gap-analysis.json
- `generatedAt`
- `subjects`
- `a_advantages[]`
- `b_advantages[]`
- Each gap: `name`, `severity`, `effort`, `strategic_value`, `description`

## 8) Quality Gate (Before Finish)

- All universal artifacts generated or explicitly marked as intentionally skipped
- All JSON parseable
- No invented claims (every assertion tied to source path/URL/data)
- Scoring method disclosed
- Confidence level disclosed for data quality
- Bidirectional gaps documented
- Sources cited for both subjects

---

## Legacy Codebase Format (Backward Compatible)

Existing benchmarks in `docs/bench/pai/`, `docs/bench/bmad/`, `docs/bench/openclaw/` use the legacy format below. These remain valid and are not affected by the universal upgrade.

### Legacy Output Root

`docs/bench/{competitor}/`

### Legacy Canonical Artifact Set (16 files)

1. `appendix-aiox-agent-command-inventory.json`
2. `appendix-aiox-workflow-sequence-inventory.json`
3. `appendix-exhaustive-agents-workflows-raw.json`
4. `{competitor}-vs-aiox-agents-command-matrix.md`
5. `{competitor}-vs-aiox-workflow-step-matrix.md`
6. `{competitor}-vs-aiox-comparativo-completo.md`
7. `benchmark-aiox-vs-{competitor}-scenarios.json`
8. `benchmark-aiox-vs-{competitor}-scenarios.md`
9. `{competitor}-features-para-aiox.md`
10. `roadmap-{competitor}-features-para-aiox.md`
11. `aiox-gap-closure-backlog-executable.json`
12. `aiox-gap-closure-backlog-executable.md`
13. `aiox-command-task-artifact-traceability-deep.md`
14. `appendix-command-task-artifact-traceability.json`
15. `{competitor}-to-aiox-migration-playbook-deep.md`
16. `comparacao-exaustiva-agentes-workflows-tasks.md`

### Legacy Scoring Axes

1. Delivery Control
2. QA Strength
3. Automation Index
4. Orchestration Depth
5. Drift Risk (lower is better)
