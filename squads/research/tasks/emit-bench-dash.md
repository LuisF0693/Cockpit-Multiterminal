# Task: Emit Bench Output Dash

## Contrato SINKRA

Domain: `Operational`

task: emitBenchOutputDash()
responsavel: bench-analyst
responsavel_type: Agent
atomic_layer: Atom

Entrada:
- `metadata.json` (canonical schema — `squads/research/data/bench-metadata-canonical.yaml`)
- `scorecard.json`
- `comparison-matrix.json`
- `gap-analysis.json`
- `inventory-{subject}.json` (one per subject, optional)
- folder slug = bench id

Saida:
- `docs/bench/{slug}/bench-output-dash.json` (validated against `bench-output-dash.schema.json`)

Inputs: ver bloco `Entrada`
Outputs: ver bloco `Saida`
Pre-conditions: ver `pre_condition`
Post-conditions: ver `post_condition`
Performance: ver `performance`
Error Handling: ver `error_handling`

pre_condition: |
  Phase anteriores do bench-comparison-pipeline concluiram com metadata.json canonico,
  scorecard.json, comparison-matrix.json e gap-analysis.json presentes em docs/bench/{slug}/.
post_condition: |
  bench-output-dash.json escrito em docs/bench/{slug}/, valido contra
  squads/research/data/bench-output-dash.schema.json, com inferred:{} vazio
  (todos os campos saem de artefatos canonicos, sem fallback).
performance: |
  Falha alto na primeira violacao de schema. Nao tenta inferir campos faltantes —
  exige que phase anterior tenha emitido artefato correto.
error_handling: "on_fail: BLOCK pipeline, return schema validation errors, request artifact fix"

---

## GOLD ABSORPTION REFERENCE

Quando `metadata.profile = gold_absorption`, existem duas referências
operacionais complementares:

- `docs/bench/slides-creator-open-source-absorption/` para profundidade de
  matriz, personas, score transparente e pacote de apresentação.
- `docs/bench/deepresearch-absorption-benchmark/` para inteligência de decisão:
  scenario winners, evidence ledger, readiness gate, adoption map, battle card
  com anti-decisões e gaps com resolução.

O contrato executável fica em:

`squads/research/data/bench-gold-absorption-contract.json`

O desenho específico de cada benchmark deve ficar em:

`docs/bench/{slug}/bench-contract.json`

Esse contrato local declara taxonomia, categorias, unidade de linha da matriz,
modelo de players, fórmula, normalização, política de pesos e critérios de
desempate. Não assumir que todo bench usa as mesmas categorias ou a mesma
fórmula do exemplo `slides-creator-open-source-absorption`.

Esse perfil exige que `bench-output-dash.json` seja a projeção de um pacote
profundo, não um resumo preenchido por fallback. O dashboard deve conseguir
renderizar, no mínimo:

- matriz com 6+ players, 72+ micro rows e células com `score/confidence/notes/source`;
- `matrix.scoring_guide` e `summary.score_semantics`;
- personas ponderadas com pesos, totais, vencedor, runner-up e veredito;
- gaps priorizados com ação recomendada;
- `dashboard-intelligence.json/md` com KPIs, top players, vencedores por cenário
  ou persona e gaps críticos;
- sources e artifacts completos;
- `readiness` consistente com os sidecars;
- `inferred: {}` vazio, salvo justificativa explícita.

O score 100 nesse perfil significa **bench completo para decisão e apresentação
no dashboard**, não produto implementado. `implementation-readiness-gate.*`
é o artefato que separa qualidade do bench de prontidão de implementação.

Sidecars esperados para Gold Absorption:

```yaml
required_sidecars:
  - deep/micro-capability-matrix.json
  - deep/macro-comparison-matrix.json
  - deep/scoring-transparency.md
  - deep/persona-weight-methodology.json
  - deep/evidence-strength-map.json
  - deep/intelligence-graph.json
  - deep/absorption-decision-table.json
  - dashboard-intelligence.md
  - bench-completeness-rubric.json
  - implementation-readiness-gate.json
  - presentation-brief.json
```

Falhe alto se o bench declara `gold_absorption` mas entrega apenas o contrato
`full` tradicional.

---

## SCOPE

Consolida os artefatos canonicos da phase anterior em **um unico JSON validado** que sera consumido pelo Bench Dashboard (`apps/aiox-brandbook/src/components/bench-dashboard`).

Esta task NAO inventa dados. Ela apenas:
1. Le os artefatos JSON da pasta `docs/bench/{slug}/`
2. Mapeia para o schema `bench-output-dash`
3. Valida contra `squads/research/data/bench-output-dash.schema.json`
4. Escreve o output

Quando um bloco nao tem fonte canonica, `readiness.{block}: "missing"` — **nunca inferir**.

---

## STEPS

### 1. Coletar inputs

```yaml
inputs_required:
  - docs/bench/{slug}/metadata.json
  - docs/bench/{slug}/scorecard.json
  - docs/bench/{slug}/comparison-matrix.json
  - docs/bench/{slug}/gap-analysis.json
inputs_optional:
  - docs/bench/{slug}/inventory-*.json
  - docs/bench/{slug}/personas.json  # quando bench usar personas
  - docs/bench/{slug}/sources.json   # quando consolidado existir
  - docs/bench/{slug}/dashboard-intelligence.json
  - docs/bench/{slug}/evidence-ledger.json
  - docs/bench/{slug}/implementation-readiness-gate.json
```

Se metadata.json usar qualquer **alias proibido** (`subject_a/b`, `evaluation_axes`, `bench_id`, etc — ver `bench-metadata-canonical.yaml`), HALT e reportar violacao. Nao "auto-corrigir" — exigir que bench-analyst regrave o metadata canonicamente.

### 2. Mapear para schema

Use `squads/research/templates/bench-output-dash-tmpl.json` como base. O schema tem **23 blocos top-level**, divididos em **core** (sempre presentes) e **rich** (presentes quando o bench produz). Preencher:

#### Core blocks (sempre)

| Campo | Origem canonica |
|---|---|
| `schema` | const `"bench-output-dash"` |
| `generated_at` | ISO-8601 do momento da emissao |
| `source_files[]` | listagem real dos arquivos lidos |
| `benchmark.slug` | nome da pasta |
| `benchmark.title` | `metadata.bench.title` ou derivado de `subjects[].name` |
| `benchmark.short_title` | versao curta do title para cards |
| `benchmark.date` | `metadata.bench.created_at` |
| `benchmark.type` | `metadata.bench.type` |
| `benchmark.variant` | `metadata.bench.variant` |
| `benchmark.analyst` | `metadata.bench.analyst` |
| `benchmark.method` | metodologia em 1 sentenca (de `metadata.bench.method`) |
| `benchmark.confidence_breakdown` | breakdown human-readable (e.g. "5/9 High · 3/9 Medium · 1/9 Low") |
| `benchmark.status` | lifecycle (default `completed` quando emite) |
| `players[]` | `metadata.subjects[]` enriquecido com `type/license/origin/anos/tech_score/neutral_score/meta` |
| `summary.winner` | player_key, `mixed`, `tie`, ou null |
| `summary.coverage` | calculado: `complete` (0 missing) / `structured` (≤2) / `partial` (>2) |
| `summary.sources` | `sources[].length` |
| `summary.waves` | numero de waves de scoring (1 se single-wave, N se score_evolution preenchido) |
| `summary.dimensions` | `metadata.scoring.dimensions.length` |
| `summary.narrative` | paragrafo executivo final 1-3 sentencas |
| `summary.file_count` | numero total de arquivos no folder |
| `matrix.players[]` | `players[].key` em ordem |
| `matrix.dimensions[]` | com `id/label/short/weight` |
| `matrix.rows[]` | celulas detalhadas com `player/score/confidence/notes/source/score_evolution/categorical_winner` |
| `matrix.totals[]` | `{player, score}` weighted totals |
| `matrix.method` | default `"weighted_sum"` |
| `duels[]` | 1v1 showdowns com `a/b/verdict/winsA[]/winsB[]/ties[]` |
| `personas[]` | quando bench usa personas: `id/label/sub/weights[]/totals{}/winner/runner/delta/verdict/tiebreaker` |
| `gaps[]` | `gap-analysis.json` |
| `sources[]` | `sources.json` quando existir, senao extraido de cells.source |
| `artifacts[]` | listagem real com `file/role/format/phase/size_kb` |
| `readiness.*` | classificacao por bloco (ver tabela abaixo) |
| `inferred{}` | **deve ficar vazio** — se algum campo inferido, gravar `{"path": true}` |

#### Rich blocks obrigatórios em Gold

Para `profile=gold_absorption`, estes blocos não são opcionais: eles são a
camada que transforma matriz em decisão renderizável. Bench sem eles pode até
ter dados, mas não é Gold para o Observatory.

| Campo | Origem | Quando preencher |
|---|---|---|
| `source_summary[]` | síntese da cobertura e qualidade de fontes | Sempre em Gold. Mínimo 2 frases: escopo/cobertura + qualidade/limitação das fontes. |
| `categorical{}` | dimensoes onde 1 player vence categoricamente (nao por score margin) | Sempre em Gold. Mínimo 1 dimensão com `{winner, loser?, note}`. |
| `tiebreakers[]` | perguntas de decisao com yes/no | Sempre em Gold. Mínimo 2 entries `{id, q, yes, no}`. |
| `cliffs[]` | pontos de ruptura por player | Sempre em Gold. Mínimo 2 entries `{player, trigger, impact}`. |
| `decision_tree[]` | fluxo top-level de decisao | Sempre em Gold. Mínimo 2 nodes `{q, yes, no}`. |
| `tco{}` | scenarios de Total Cost of Ownership | Apenas para `benchmark.type=product`. Estrutura: `currency, unit, scenarios{smb,mid,scale,...}.rows[]`. |
| `type_specific.codebase{}` | analises codebase-only | Quando `benchmark.type=codebase`. Pode conter `coverage_stack[]`, `three_axis{}`, `knowledge_iceberg[]`. |
| `type_specific.product{}` | analises product-only | Reservado para extensao futura. |
| `type_specific.llm{}` | analises llm-only | Reservado para extensao futura. |
| `editors_note{}` | framing editorial | Quando bench tiver editorial paragraph(s). Estrutura: `{title, byline, date, paragraphs[]}`. Se conteudo > 800 chars, mover para `editors-note.json` sidecar e setar `sidecars.editors_note`. |
| `sidecars{}` | paths para companion files | Quando `bench-cells.json` ou `editors-note.json` existirem ao lado de `bench-output-dash.json`. |
| `player_meta{}` | lookup map para renderers | Mirror de `players[].meta` keyed por player_key. Some renderers preferem map vs scan-array. |
| `dashboard_intelligence{}` | KPIs executivos, top players, scenario/persona winners e gaps críticos | Quando `dashboard-intelligence.json` existir; quando só existir `.md`, apontar em `sidecars.dashboard_intelligence`. |
| `implementation_readiness{}` | Decisão GO/PARTIAL/NO-GO, gates e próxima wave | Quando `implementation-readiness-gate.json` existir; separar qualidade do bench de prontidão de implementação. |

#### Sidecar `bench-cells.json` (opcional)

Quando o bench tiver commentary editorial por celula (cells deep-dive), emitir arquivo separado:

```json
{
  "cells": {
    "{player_key}/{dimension_id}": {
      "commentary": "1-3 sentence editorial analysis",
      "evolution": [W1_score, W2_score, W3_score],
      "sources": ["url1", "url2"],
      "quote": "Optional sharp quote summarizing the cell"
    }
  }
}
```

E em `bench-output-dash.json` setar:
```json
"sidecars": { "cells": "bench-cells.json" },
"readiness": { "cells_sidecar": "complete" }
```

### 3. Classificar readiness por bloco

`readiness.*` aceita 5 valores: `complete | derived | partial | missing | n_a`.

| Bloco | `complete` | `derived` | `partial` | `missing` | `n_a` |
|---|---|---|---|---|---|
| `matrix` | rows[] com cells canonicas + totals | so dimensions + scorecard | dimensions sem cells | nenhum dado | — |
| `duels` | a/b/winsA/winsB/ties preenchidos | rank computado de matrix | parcial | sem matrix | — |
| `personas` | `personas.json` ou block com weights+totals+verdict+tiebreaker | scenarios em scorecard | inicial | ausente | bench nao usa personas |
| `gaps` | `gap-analysis.json` com priority+complexity+rationale+dimension | so titles | parcial | ausente | — |
| `sources` | `sources.json` com credibility | extraido de cells.source | so URLs sem score | ausente | — |
| `tco` | scenarios com rows preenchidas | so 1 scenario ou faixa wide | scenarios incompletos | block ausente | `bench.type != product` |
| `categorical` | block com 2+ dimensoes categoricas | 1 dimensao | esboco | ausente | dimensoes todas score-based |
| `tiebreakers` | 5+ perguntas com yes+no | 3-4 perguntas | 1-2 perguntas | ausente | bench muito pequeno |
| `cliffs` | 1+ cliff por player | parcial | esboco | ausente | bench sem dimensoes de risco |
| `decision_tree` | tree com 3+ levels | tree shallow | esboco | ausente | bench muito pequeno |
| `type_specific` | block keyed por bench.type populado | parcial | esboco | ausente | nao aplicavel ao tipo |
| `cells_sidecar` | `bench-cells.json` presente e cobrindo 50%+ celulas | <50% celulas | poucas celulas | ausente | bench shallow |
| `editors_note` | `editors_note{}` ou sidecar preenchido | so byline | so title | ausente | bench sem framing editorial |
| `dashboard_intelligence` | KPIs + top players + winners + critical gaps | KPIs + top players | resumo textual | ausente | bench shallow |
| `implementation_readiness` | gate com decisão + statuses + próxima wave | gate parcial | texto sem JSON | ausente | bench sem implementação |

### 3.1 Validar inteligência de decisão Gold

Para `profile=gold_absorption`, além do schema JSON, bloquear quando:

- `gap-analysis.json` tiver gaps sem `resolution`, `recommended_action`,
  `action`, `absorption`, `acceptance` ou `next_step`;
- `evidence-ledger.json` não ligar claims, players ou source artifacts a
  evidências concretas;
- `implementation-readiness-gate.json` não separar decisão de implementação da
  nota/completude do benchmark;
- `battle-card.md` não responder posição/melhor escolha, objeções ou
  anti-decisões, e próxima jogada;
- `bench-output-dash.json` não tiver `source_summary`, `categorical`,
  `tiebreakers`, `cliffs` e `decision_tree` com conteúdo suficiente para
  tomada de decisão;
- `scenario-scorecards.json` declarar cenários, mas não tiver vencedor/top item
  por cenário.

### 4. Validar contra JSON Schema

```bash
node -e "
  const schema = require('./squads/research/data/bench-output-dash.schema.json');
  const data = require('./docs/bench/{slug}/bench-output-dash.json');
  const Ajv = require('ajv');
  const ajv = new Ajv({allErrors: true});
  const validate = ajv.compile(schema);
  if (!validate(data)) { console.error(validate.errors); process.exit(1); }
  console.log('OK');
"
```

Ou equivalente via `scripts/bench-dash-output.cjs --check {slug}` (modo idempotente).

### 5. Smoke-test cross-validation

Rodar o extractor reativo em modo `--check`:

```bash
node scripts/bench-dash-output.cjs --check
```

Se o extractor gerar um output DIFERENTE do que o bench-analyst emitiu, isso significa **drift entre emissao nativa e extracao**. Investigar e reconciliar antes de marcar a task como done.

---

## ANTI-PATTERNS

### AP-1: Auto-corrigir alias legacy
**Symptom:** metadata.json tem `subject_a` e a task converte silenciosamente para `subjects[0]`.
**Consequence:** Schema canonico nunca eh enforced upstream. Bench-analyst continua emitindo legado.
**Prescription:** HALT, reportar violacao, exigir que bench-analyst regrave metadata.json canonico.

### AP-2: Inferir campos faltantes
**Symptom:** `personas.json` nao existe → task gera personas vazias mas marca readiness=derived.
**Consequence:** Dashboard renderiza personas falsas. Dados nao-canonicos virais downstream.
**Prescription:** Quando bloco nao tem fonte, marcar `readiness.{block}: "missing"` e `inferred.{path}: true`. NUNCA inventar.

### AP-3: Reescrever metadata legado em tempo de emissao
**Symptom:** Task vê metadata com schema antigo e regrava o arquivo.
**Consequence:** Perde historico, contamina rastreabilidade.
**Prescription:** Migracao de legados eh task SEPARADA. Esta task SO emite bench-output-dash.json e BLOQUEIA se metadata nao for canonico.

---

## VALIDATION

| Check | Tool | Mode |
|---|---|---|
| Schema validation | `ajv` against `bench-output-dash.schema.json` | BLOCK on fail |
| Metadata canonical | `bench-metadata-canonical.yaml` alias check | BLOCK on error severity |
| Drift vs extractor | `scripts/bench-dash-output.cjs --check` | WARN on diff |
| Gold absorption depth | `npm run bench:gold:validate -- {slug}` | BLOCK when `profile=gold_absorption` |

---

## REFERENCES

- Schema: `squads/research/data/bench-output-dash.schema.json`
- Metadata canonical: `squads/research/data/bench-metadata-canonical.yaml`
- Template: `squads/research/templates/bench-output-dash-tmpl.json`
- Schema doc: `docs/bench/_dash-schema.md`
- Extractor (safety net): `scripts/bench-dash-output.cjs`
- Dashboard consumer: `apps/research/src/lib/bench-dashboard.server.ts`
- Pipeline: `squads/research/workflows/bench-comparison-pipeline.yaml` (phase `emit-dash`)

---

accountability:
  accountable: "Human (Process Owner)"
  responsible: "bench-analyst"
  consulted: [research-chief]
  informed: [research-operator]
