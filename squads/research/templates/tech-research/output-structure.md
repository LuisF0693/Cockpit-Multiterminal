# Output Structure Templates

Templates para os arquivos gerados em cada research.

---

## Estrutura de Pasta

```
docs/research/{YYYY-MM-DD}-{slug}/
├── README.md                    # Índice e TL;DR
├── 00-query-original.md         # Pergunta + contexto
├── 01-deep-research-prompt.md   # Prompt gerado
├── 02-research-report.md        # Findings completos
├── 03-recommendations.md        # Recomendações e próximos passos
├── quick-wins.md                # Quick Wins (alto valor + baixo esforço)
├── curiosity_queue.yaml         # Perguntas abertas e lacunas
├── evolving_report.md           # Estado operacional Markoviano
├── execution-log.jsonl          # Log mínimo por fase
├── research-contract.json       # Contrato local: tipo, taxonomia, rubrica, evidência e stop rules
└── 04-*.md, 05-*.md, ...        # Follow-up research (numerados)
```

---

## README.md

```markdown
# Research: {TITLE}

> **Data:** {DATE}
> **Tópico:** {TOPIC}  <!-- Frase humana clara descrevendo o assunto. NÃO inclua códigos de tracking (TR-D7, TR-7:, Research:, Pesquisa:, Tech Research —). Esses códigos pertencem ao slug do diretório, não ao tópico. Quando o autor escorrega, research_kb_index.py.clean_title_prefixes() limpa o display, mas o ideal é evitar na origem. ✅ "Real-Time Agent Streaming" / ❌ "TR-D7 — Real-Time Agent Streaming". -->
> **Tópico curto:** {SHORT_TITLE}  <!-- opcional; ≤ 60 chars, sem pontuação final; usado em listagens/dashboards. Quando ausente, `research_kb_index.py` deriva via heurística (corte na 1ª vírgula/dois-pontos, fallback truncate em palavra). -->
> **Categoria:** {CATEGORY}  <!-- opcional; one of: ai-agents | ai-tools | ux-ui | harness | content | devops | database | business | frontend | knowledge. Quando ausente, derivado por heurística em research_kb_index.py CATEGORY_RULES. -->
> **Status:** {STATUS}

---

## TL;DR

{SUMMARY_3_SENTENCES}

---

## Research Metadata

```yaml
workflow_version: "{WORKFLOW_VERSION}"
runtime_contract:
  workflow_version: "{WORKFLOW_VERSION}"
  schema_version: "research-output.v2"
  skill_version: "{SKILL_VERSION}"
  tool_contract_version: "{TOOL_CONTRACT_VERSION}"
coverage_score: {TOTAL_0_100}
coverage_breakdown:
  fundamentals: {SCORE_0_100}    # Core concepts, definitions
  implementation: {SCORE_0_100}  # How-to, code examples
  comparison: {SCORE_0_100}      # Alternatives, trade-offs
  best_practices: {SCORE_0_100}  # Patterns, anti-patterns
  real_world: {SCORE_0_100}      # Case studies, production
  current_state: {SCORE_0_100}   # 2025/2026 latest info
integrity_score: {SCORE_0_100}   # Citation verification score
stop_reason: "{EXPLICIT_REASON}"
citation_verified: {true|skipped_with_reason}
rubrics:
  information_recall:
    passed: {COUNT}
    total: {COUNT}
  analysis:
    passed: {COUNT}
    total: {COUNT}
  presentation:
    passed: {COUNT}
    total: {COUNT}
sources:
  total: {COUNT}
  high_credibility: {COUNT}
  medium_credibility: {COUNT}
  with_dates: {COUNT}
  freshness_ratio: {PCT}         # % of sources with pub date
waves: {COUNT}
```

---

## Índice

| # | Arquivo | Descrição |
|---|---------|-----------|
| 00 | [query-original.md](./00-query-original.md) | Pergunta inicial e contexto |
| 01 | [deep-research-prompt.md](./01-deep-research-prompt.md) | Prompt estruturado |
| 02 | [research-report.md](./02-research-report.md) | Relatório completo |
| 03 | [recommendations.md](./03-recommendations.md) | Recomendações finais |
| - | [quick-wins.md](./quick-wins.md) | Quick Wins ROI-first (alto valor + S/XS effort + ttv ≤ 1 semana) |
| - | [curiosity_queue.yaml](./curiosity_queue.yaml) | Perguntas abertas e lacunas |
| - | [evolving_report.md](./evolving_report.md) | Estado operacional |
| - | [execution-log.jsonl](./execution-log.jsonl) | Log de execução |
| - | [research-contract.json](./research-contract.json) | Contrato local de inteligência da pesquisa |

---

## Referências Principais

{TOP_5_REFERENCES}
```

---

## 00-query-original.md

```markdown
# Query Original

> **Data:** {DATE}

## Pergunta Original

> "{ORIGINAL_QUERY}"

## Contexto Inferido

- **Foco:** {FOCUS}
- **Tecnologias:** {TECHNOLOGIES}
- **Temporal:** {TEMPORAL}

## Clarificações (se houver)

{CLARIFICATIONS}
```

---

## 01-deep-research-prompt.md

```markdown
# Deep Research Prompt

> **Gerado em:** {DATE}

## Prompt Utilizado

```
{GENERATED_PROMPT}
```

## Sub-Queries Decompostas

{SUB_QUERIES_LIST}
```

---

## 02-research-report.md

```markdown
# {TITLE}

> **Relatório de Pesquisa** | {DATE}

---

## Executive Summary

{EXECUTIVE_SUMMARY}

---

## Stop Reason

{STOP_REASON_WITH_CATEGORY_AND_CAVEATS}

---

## 1. Implementações Existentes

{SECTION_1}

---

## 2. Técnicas e Padrões

{SECTION_2}

---

## 3. Comparativos

{SECTION_3}

---

## 4. Riscos e Limitações

{SECTION_4}

---

## 5. Métricas e Benchmarks

{SECTION_5}

---

## Referências

{REFERENCES_WITH_URLS}
```

---

## 03-recommendations.md

**REGRAS:**
- Este arquivo é PRESCRITIVO, não descritivo. Não repetir findings de 02-research-report.md.
- Overlap com 02-research-report.md deve ser <= 20%.
- Toda ação recomendada DEVE incluir effort estimate (S/M/L/XL ou horas).
- Código que já aparece no report NÃO deve ser duplicado aqui.

```markdown
# Recomendações

> **Data:** {DATE}
> **Baseado em:** [02-research-report.md](./02-research-report.md)

---

## Decisão Recomendada

{ONE_PARAGRAPH_CLEAR_RECOMMENDATION_WITH_CONFIDENCE_LEVEL}

---

## Ranking de Alternativas

| # | Solução | Score | Effort | Quando Usar | Justificativa |
|---|---------|-------|--------|-------------|---------------|
{RANKED_SOLUTIONS_TABLE_WITH_EFFORT}

---

## Implementation Roadmap

| Fase | Ação | Effort | Owner | Timeline |
|------|------|--------|-------|----------|
| 1 | {ACTION_1} | {S/M/L/XL ou Xh} | @{owner} | {timeline} |
| 2 | {ACTION_2} | {S/M/L/XL ou Xh} | @{owner} | {timeline} |
| 3 | {ACTION_3} | {S/M/L/XL ou Xh} | @{owner} | {timeline} |

---

## Anti-Patterns

| O que NÃO fazer | Por quê | Consequência |
|------------------|---------|--------------|
{ANTI_PATTERNS_TABLE}

---

## Mapping para o Projeto

> **Seção condicional:** Incluir APENAS quando a query referencia um projeto, squad ou sistema específico.
> Mapeia findings → entidades do domínio do usuário (agentes, componentes, módulos).

| Componente do Projeto | Finding Relevante | Ação Recomendada | Effort |
|----------------------|-------------------|------------------|--------|
| {COMPONENT_1} | {FINDING} | {ACTION} | {S/M/L/XL} |
| {COMPONENT_2} | {FINDING} | {ACTION} | {S/M/L/XL} |

---

## Próximos Passos

> **IMPORTANTE:** Este documento é apenas pesquisa. Para implementação:
> - **@pm** para priorização e criação de stories
> - **@dev** para execução técnica

1. {SPECIFIC_ACTION_WITH_EFFORT} — @{owner}
2. {SPECIFIC_ACTION_WITH_EFFORT} — @{owner}
3. {SPECIFIC_ACTION_WITH_EFFORT} — @{owner}
```

---

## quick-wins.md

**REGRAS:**
- Documento DEDICADO ao subconjunto ROI-first dos findings: alto valor + baixo esforço + curto prazo.
- Critério de admissibilidade (TODOS obrigatórios): `value=high` ∧ `effort ∈ {XS, S}` ∧ `time_to_value ≤ 1 semana`.
- Mínimo de 3 itens. Se findings legítimos não atingirem 3, registrar `## Quick Wins Não Encontrados` com justificativa explícita citando seções do report — NUNCA inventar QW para cumprir quota.
- Cada QW DEVE citar evidência (§ ou subseção de `02-research-report.md`) e mapear a um target do hub: `squad | app | skill | agent | runner | rule | workflow | adr | doc`.
- Não duplicar `Implementation Roadmap` (que cobre todas as fases): QW é o filtro ROI-first do mesmo conjunto.

```markdown
# Quick Wins

> **Data:** {DATE}
> **Baseado em:** [02-research-report.md](./02-research-report.md) + [03-recommendations.md](./03-recommendations.md)
> **Critério:** alto valor + S/XS effort (≤8h) + time-to-value ≤ 1 semana

---

## TL;DR

{2-3 frases resumindo os Quick Wins selecionados e o ganho cumulativo esperado}

---

## Quick Wins Selecionados

| # | Quick Win | Target | Tipo | Value | Effort | Time-to-Value | Evidência | Owner |
|---|-----------|--------|------|-------|--------|---------------|-----------|-------|
| QW-1 | {ação concreta e mensurável} | {nome do squad/app/skill/agent/runner/rule/workflow/adr/doc} | squad\|app\|skill\|agent\|runner\|rule\|workflow\|adr\|doc | high | XS (~1h) \| S (~4-8h) | <1d \| <3d \| <1wk | §X.Y de `02-research-report.md` | @pm \| @dev \| @architect \| @qa \| @devops |
| QW-2 | ... | ... | ... | high | XS\|S | <1wk | ... | @... |
| QW-3 | ... | ... | ... | high | XS\|S | <1wk | ... | @... |

---

## Detalhamento por Quick Win

### QW-1 — {nome curto da ação}

- **O quê:** {ação concreta — 1 frase}
- **Onde:** {caminho exato no hub: `squads/{name}/`, `apps/{name}/`, `.claude/skills/{name}/`, `.claude/rules/{name}.md`, etc.}
- **Por que é alto valor:** {benefício observável — preferir métrica: tokens economizados, % coverage, tempo poupado, bug eliminado, etc.}
- **Por que é baixo esforço:** {por que cabe em ≤S/8h — preferir indicadores: edição de N linhas, 1 arquivo, ADAPT de pattern existente, sem dependência cross-squad}
- **Evidência no report:** §{X.Y} — {citação curta do finding}
- **Definition of Done:** {critério verificável e binário — ex: validator passa, hook bloqueia caso negativo, doctor reporta verde}
- **Riscos:** {1-2 riscos honestos — se houver}
- **Owner sugerido:** @{owner}

### QW-2 — {nome curto da ação}

(mesma estrutura)

### QW-3 — {nome curto da ação}

(mesma estrutura)

---

## Quick Wins Não Selecionados (rejeitados)

> Findings que pareciam QW mas falharam o critério.

| Candidato | Razão da rejeição | Reclassificado em |
|-----------|--------------------|--------------------|
| {finding} | effort=L (não cabe em S) | `03-recommendations.md` §Implementation Roadmap |
| {finding} | value=medium (sem métrica clara) | `03-recommendations.md` §Ranking |
| {finding} | ttv > 1 semana | `03-recommendations.md` §Implementation Roadmap |

---

## Quick Wins Não Encontrados (condicional)

> Incluir esta seção APENAS se < 3 candidatos legítimos foram identificados.
> NUNCA preencher a tabela de Quick Wins com itens forçados para cumprir quota.

```yaml
quick_wins_minimum_met: false
candidates_evaluated: {N}
candidates_qualified: {M}  # M < 3
reasoning: |
  {2-4 frases — por que esta pesquisa não gerou 3 QW. Citar seções do report.}
remediation:
  - "Considerar follow-up research em {tópico} para gerar mais candidatos"
  - "Reavaliar após coleta de mais evidência empírica"
```

---

## Próximo Passo

> Para cada QW selecionado:
> - **@pm** prioriza e cria story em `docs/stories/`
> - **@dev** ou owner correspondente executa
```

---

## Follow-up Files (04-*.md, 05-*.md, ...)

Para pesquisas de follow-up no mesmo tópico:

Antes de escrever, resolver o próximo prefixo com:

```bash
python3 squads/research/scripts/tech-research/next_followup_number.py {output_dir}
```

```markdown
# Follow-up: {FOLLOWUP_TITLE}

> **Data:** {DATE}
> **Relacionado a:** [02-research-report.md](./02-research-report.md)

## Pergunta de Follow-up

> "{FOLLOWUP_QUERY}"

## Findings Adicionais

{ADDITIONAL_FINDINGS}

## Atualização das Recomendações

{UPDATED_RECOMMENDATIONS}
```

---

## Regras de Follow-up

1. **NUNCA** criar nova pasta para follow-up do mesmo tópico
2. Numerar sequencialmente: 04-*, 05-*, 06-*
3. Atualizar o README.md com novos arquivos
4. Manter referência ao arquivo original relacionado
