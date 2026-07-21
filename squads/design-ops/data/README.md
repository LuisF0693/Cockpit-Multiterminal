# Design Squad Data — Indice por Categoria

> 43 arquivos organizados por funcao. Paths sao flat (`data/arquivo.md`)
> para manter compatibilidade com tasks, agents e workflows que referenciam.

## Specs (source of truth)

Arquivos canonicos que definem O QUE o design system e.

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `design-tokens-spec.yaml` | 419 | Tokens canonicos (cores, tipografia, spacing, motion) |
| `component-index.json` | 60K | Registry de componentes com contratos completos |
| `ds-page-types-registry.yaml` | 714 | Registry de tipos de pagina (machine-readable) |
| `design-mappings.yaml` | 523 | Vocabulario canonico (8 tabelas de traducao) |
| `critical-eye-scoring-rules.yaml` | 201 | Regras de scoring do Critical Eye |
| `internal-quality-chain.yaml` | 42 | Pipeline de qualidade interna |

## Guides (documentacao de referencia)

Regras e principios que agentes consultam durante execucao.

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `typography-hierarchy-rules.md` | 350 | Sistema tipografico completo |
| `spacing-rhythm-system.md` | 450 | Sistema de espacamento e ritmo |
| `page-layout-framework.md` | 480 | Framework de layout de paginas |
| `page-type-patterns.md` | 960 | Padroes por tipo de pagina |
| `wcag-compliance-guide.md` | 110 | Guia de compliance WCAG 2.2 |
| `high-retention-reading-guide.md` | 230 | Best practices de leitura/retencao |
| `motion-tokens-guide.md` | 160 | Guia de motion e animacoes |
| `seo-rules.md` | 70 | Regras de SEO para design |
| `anti-ai-look-patterns.md` | 140 | Padroes a evitar para nao parecer "AI" |
| `design-token-best-practices.md` | 50 | Best practices de tokens |
| `fluent2-design-principles.md` | 80 | Principios do Fluent Design 2 |
| `atomic-design-principles.md` | 52 | Referencia de Atomic Design |
| `atomic-refactor-rules.md` | 340 | Regras de refatoracao atomica |
| `agentic-ds-principles.md` | 80 | Principios de DS agentico |
| `agentic-design-systems-guide.md` | 46 | Guia de DS para AI agents |
| `glass-effects-guide.md` | 247 | Glassmorphism e Liquid Glass: código CSS, Tailwind, SVG, parâmetros |
| `video-backgrounds-guide.md` | 307 | Video backgrounds: HTML, CSS, Tailwind, React, FFmpeg, performance |

## Mappings (lookup tables)

Tabelas de traducao e mapeamento entre sistemas.

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `design-mappings.yaml` | 523 | Vocabulario canonico (8 tabelas) |
| `token-mapping-reference.md` | 215 | Referencia de mapeamento de tokens |
| `copy-to-layout-bridge.md` | 530 | Bridge copy-to-visual hierarchy |
| `integration-patterns.md` | 310 | Padroes de integracao entre sistemas |
| `consolidation-algorithms.md` | 100 | Algoritmos de consolidacao de padroes |
| `ds-reference-architectures.md` | 90 | Arquiteturas de referencia |
| `w3c-dtcg-spec-reference.md` | 85 | Referencia da spec W3C DTCG |
| `roi-calculation-guide.md` | 60 | Guia de calculo de ROI |

## Prompting (templates e guias de prompt)

Recursos para geracao de UI via LLM.

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `prompt-templates-library.md` | 180 | 12 templates de prompt por tipo de pagina |
| `prompting-bible.md` | 260 | Guia completo de prompting para design |
| `gemini-logo-guidelines.yaml` | 345 | Guidelines para gerar logos com Gemini |

## Pipeline (inputs e outputs do F1-F3)

Dados brutos e resultados das execucoes do Foundations Pipeline.

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `figma-tokens-raw.md` | 1548 | Template para colar tokens do Figma (input F1) |
| `figma-base-components-raw.md` | 101 | Template para colar specs do Figma (input F2) |
| `base-component-specs.md` | 972 | Specs de componentes extraidos do Figma (output F2) |
| `component-adaptation-changelog.md` | 318 | Log de mudancas visuais (output F2) |
| `f2-qa-report.md` | 168 | Resultado do QA gate F2 |
| `f3-qa-report.md` | 208 | Resultado do QA gate F3 |
| `f3-derived-components-changelog.md` | 100 | Log de componentes derivados (output F3) |

## Research (artifacts de analise)

Outputs de research e analise. Referencia historica.

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `brad-frost-dna.yaml` | 780 | DNA do agente Brad Frost (persona completa) |
| `brad-frost-analysis-extract-implicit.yaml` | 470 | Analise de padroes implicitos |
| `brad-frost-analysis-find-0.8.yaml` | 290 | Deteccao de padroes (threshold 0.8) |
| `brad-frost-analysis-qa-report.yaml` | 200 | QA report da analise |

## Meta

Informacao sobre o proprio squad.

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `capability-tools.yaml` | 124 | Inventario de tools do squad |
