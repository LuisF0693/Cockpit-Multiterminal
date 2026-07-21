# Research Squad — Architecture

## Overview

O squad `spy` combina **competitive intelligence** + **evidence-based research**: universal benchmarking, content analysis, PICO/OSINT pipeline, systematic reviews, decision science, e bias detection. Absorveu o squad legado `deep-research` em 2026-04-13.

## Agent Hierarchy

```
spy (Orchestrator — Content Intelligence)
│
├── Research Pipeline (absorbed deep-research)
│   ├── dr-orchestrator       # Deep Research Pipeline Coordinator
│   ├── research-head         # Market Intelligence & Lead
│   └── reference-competitor-clone  # Competitor baseline cloning
│
├── Evidence-Based Research Specialists
│   ├── sackett               # Evidence hierarchy (5 levels)
│   ├── tech-research-agent              # Systematic review methodology
│   ├── bench-analyst               # Risk of bias assessment
│   ├── tech-research-agent             # False positives, replicability
│   └── creswell              # Mixed methods research
│
├── Benchmarking & Analysis
│   ├── bench-analyst         # Universal benchmarking methodology
│   ├── benchmark-runtime     # Runtime benchmark execution
│   └── forsgren              # DORA metrics (DevOps performance)
│
├── Decision Science & Bias
│   ├── klein              # System 1/System 2, biases
│   └── klein                 # Recognition-primed decision, pre-mortem
│
└── OSINT & Collection
    ├── gilad                 # Competitive Intelligence (CI) framework
    └── booth                 # Information retrieval, systematic search
```

## Research Pipelines

### Pipeline 1: Deep Research (Use Case Routing)

```
Research question
       ↓
dr-orchestrator classifies intent
       ↓
    ┌──┴──┐
    ▼     ▼
Market intel       Tech research       Content DNA extraction
   ↓                    ↓                      ↓
research-head     bench-analyst       reference-competitor-clone
   ↓                    ↓                      ↓
Player analysis   Benchmark matrix    Viral pattern swipe file
   ↓                    ↓                      ↓
      ┌─────────────────┴─────────────────┐
      ▼                                   ▼
Systematic review      Decision recommendation
(sackett/tech-research-agent)     (klein/klein)
```

### Pipeline 2: Competitive Intelligence

```
Competitor target
       ↓
gilad (CI framework) + booth (OSINT retrieval)
       ↓
Data collection (public + ethical)
       ↓
Evidence-based analysis
├── sackett: evidence hierarchy
├── bench-analyst: bias detection
└── tech-research-agent: false positive check
       ↓
Insight synthesis
├── klein: bias audit of conclusions
└── klein: pre-mortem of recommendations
       ↓
Actionable intelligence report
```

### Pipeline 3: Universal Benchmarking

```
Subjects to compare (codebases, LLMs, products, companies)
       ↓
bench-analyst designs benchmark methodology
       ↓
benchmark-runtime executes quantitative tests
       ↓
forsgren applies DORA metrics (when DevOps-relevant)
       ↓
Matrix + gap analysis + battle card
```

## Evidence Hierarchy (Sackett)

```
Level 1: Systematic reviews + meta-analyses
Level 2: RCTs (randomized controlled trials)
Level 3: Cohort studies
Level 4: Case-control studies
Level 5: Expert opinion (lowest)
```

Spy always prioritizes Level 1-2 sources; Level 5 tagged as such.

## Bias Mitigation (Kahneman + Higgins + Ioannidis)

| Bias | Mitigation |
|------|-----------|
| Confirmation bias | Pre-register hypothesis before collecting data |
| Availability heuristic | Systematic search (booth) vs. ad-hoc |
| Anchoring | Multiple independent estimates |
| Publication bias | Check Level 1 meta-analyses, not just studies |
| False positives | Ioannidis p-value correction, replication check |

## Outputs Location

Publications go to `docs/{research,bench,audits}/`; ephemeral execution data
(raw API responses, transcripts, inter-skill handoffs) stays in `outputs/research/`.

| Type | Path |
|------|------|
| Research reports (1-player deep-dive) | `docs/research/{YYYY-MM-DD}-{slug}/` |
| Multi-player comparative / GTM synthesis | `docs/bench/{slug}/` |
| Battle cards (A vs B benchmarks) | `docs/bench/{slug}/` |
| Systematic reviews | `docs/research/{YYYY-MM-DD}-review-{topic}/` |
| Framework audits | `docs/audits/{YYYY-MM-DD}-{topic}/` |
| Swipe files (content DNA) | `outputs/research/swipes/{competitor-slug}/` (ephemeral) |
| Raw API payloads | `outputs/research/raw/{platform}/` (ephemeral) |
| Transcripts | `outputs/research/transcripts/{platform}/` (ephemeral) |
| Product-discovery handoff | `outputs/research/product-discovery/{run-slug}/` (ephemeral) |

## Integration Points

| Consumer | Uses spy outputs for |
|----------|---------------------|
| brand-chief | Competitive positioning |
| hormozi-chief | Market analysis before offer design |
| c-level (vision-chief) | Strategic decision support |
| copy-chief | Swipe files → copy frameworks |

## Boundary

- **In scope:** Research (deep, market, tech), competitive intelligence, benchmarking, evidence-based analysis, bias detection, decision support
- **Out of scope:** Creative execution (@copy, @brand), strategic decision making (@c-level consumes spy outputs), product strategy (@hormozi consumes spy outputs)

## Tasks Canônicas (59 total)

Extensive library covering: deep research templates, PICO question formulation, systematic review protocols, benchmark methodologies, competitor clone procedures, swipe file generators, evidence hierarchy checklists, bias assessment frameworks, DORA metric collection, OSINT techniques.
