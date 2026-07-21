# Squad: Research

Unified research operations: deep technical research, competitive intelligence, marketing deep-dives, product discovery, and A-vs-B benchmarking. Renamed from `spy` 2026-05-16, absorbed `/tech-research` skill v2.0.0.

## Trigger
```
research | /research-chief | @research-chief

# Specialist modes (dispatch from chief or invoke directly):
/research-marketing-deepdive   # 1-player marketing deep dive
/research-bench                # A-vs-B benchmark
/tech-research                 # deep technical research (alias preserved)
```

## Structure

```
squads/research/
├── README.md                          # This file
├── config.yaml                        # Squad configuration
├── agents/
│   ├── spy.md                         # Main agent (orchestrator)
│   ├── research-head.md               # Deep research specialist
│   └── bench-analyst.md               # Framework benchmark specialist
├── tasks/
│   ├── quick-analysis.md              # 8-min player analysis
│   ├── deep-research.md               # Detailed research
│   ├── bench-framework.md             # Full benchmark pipeline
│   ├── bench-quick-compare.md         # Quick framework comparison
│   ├── bench-inventory.md             # AIOX self-inventory baseline
│   └── bench-gap-analysis.md          # Gap/absorption analysis
├── workflows/
│   └── bench-comparison-pipeline.yaml # End-to-end benchmark orchestration
├── data/
│   ├── viral-content-framework.md     # Complete framework
│   ├── knowledge-base.md              # Accumulated insights
│   └── bench-skeleton.md              # Canonical deep benchmark scaffold
├── checklists/
│   └── content-creation-checklist.md  # Content creation checklist
└── templates/
    ├── player-analysis-tmpl.md        # Analysis template
    ├── bench-comparativo-tmpl.md      # Full comparative benchmark template
    └── bench-scores-tmpl.md           # Quantitative score template
```

## Configured APIs

| API | Status | Env Variable |
|-----|--------|--------------|
| YouTube Data v3 | ✅ | `YOUTUBE_API_KEY` |
| Meta Graph (Instagram) | ✅ | `META_ACCESS_TOKEN` |

## Outputs

Publications saved by type:
```
docs/research/{YYYY-MM-DD}-{slug}/   # 1-player deep dives (channel, profile, framework)
docs/bench/{slug}/                    # Multi-player comparatives + A vs B benchmarks
docs/audits/{YYYY-MM-DD}-{topic}/    # Framework audits

outputs/research/                          # Ephemeral execution data only
├── raw/             # API payloads
├── transcripts/     # Annotated transcripts
├── swipes/          # Content DNA fragments
└── product-discovery/  # Inter-skill handoffs (read by validate-product-idea)
```

## Quick Usage

```bash
# Analyze YouTube channel
spy youtube @Fireship

# Analyze Instagram profile
spy instagram @chase.h.ai

# Search for trends
spy search "claude code"

# Compare players
spy compare @Fireship vs @NetworkChuck

# Get current trends
spy trends
```

## Available Frameworks

The `data/viral-content-framework.md` contains:
- 5 proven title formulas
- 4 video structures by format
- 4 types of hooks that work
- Content matrix by platform
- Ready-to-use title templates
- Pre-publish checklist

## Agents

| Agent | Role | Tier |
|-------|------|------|
| `spy` | Main orchestrator, quick analysis | Orchestrator |
| `research-head` | Deep research, strategic insights | Tier 1 |
| `bench-analyst` | Deep benchmark vs other frameworks | Tier 1 |

## Benchmark Mode

For framework-vs-framework benchmark depth (like `docs/bench/*`):

```bash
# Full pipeline (16 artifact pattern)
spy bench bmad
spy bench pai

# Focused modes
spy bench-quick bmad
spy bench-gap bmad
```

Primary output path:
`docs/bench/{competitor}/`

---

*Research Squad v3.0 - 2026-03-27*
