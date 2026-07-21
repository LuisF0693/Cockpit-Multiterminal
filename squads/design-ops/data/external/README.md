# External Design Prompts — Knowledge Source Registry

This directory preserves raw system prompts from external design systems we study for absorption. Each file is a timestamped snapshot of the source prompt on the date we extracted heuristics from it.

## Governance

- **NEVER** modify these files after download. They are immutable knowledge sources.
- **ALWAYS** re-download with a new timestamp if the source prompt is updated.
- **NEVER** use these files as runtime dependencies. They are references for human-in-the-loop absorption via `/design-system` knowledge curation.

## Naming Convention

```
{source-identifier}-{YYYY-MM-DD}.txt
```

Examples:
- `claw-design-system-prompt-2026-04-18.txt`
- `vercel-v0-system-prompt-2026-03-15.txt` (planned)
- `lovable-dev-prompt-2026-04-01.txt` (planned)

## Re-fetch Protocol

When a source prompt changes:

1. Download the new version with today's date in the filename.
2. Keep BOTH versions — old and new.
3. Run a diff-and-extract pass to identify changed heuristics.
4. Update `squads/design-ops/data/design-heuristics-from-external-prompts.yaml` with new `extraction_event` entry.
5. Mark old version as superseded in the heuristics ledger but do NOT delete.

## Sources

| File | Source | Purpose | Heuristics Absorbed |
|------|--------|---------|---------------------|
| `claw-design-system-prompt-2026-04-18.txt` | `agenmod/claw-design` | Design artifact creation CLI | 50+ heuristics (see heuristics ledger EXT-2026-04-18-CLAW-DESIGN) |

## Why Save the Raw Prompt

- **Provenance** — heuristics in our ledger cite line numbers; the file must exist to resolve citations.
- **Diff-on-update** — when the source prompt evolves, we diff old→new to identify changes that matter.
- **Training data** — future retrospectives and ecosystem-intelligence runs can grep across accumulated sources.
- **Evidence for rejections** — when we explicitly reject a pattern from a source (see `explicit_rejections` in heuristics ledger), the raw source is the cited evidence.

## What Does NOT Go Here

- Runtime code from external projects — those belong in integrations, packages, or are not imported at all.
- Summaries, paraphrases, or AI-processed extractions — those belong in `design-heuristics-from-external-prompts.yaml`.
- Private prompts with NDA or access restrictions — do NOT commit; use `.gitignore`-local only.

## Integration With /design-system

The `/design-system` skill (and its underlying persona `squads/design-ops/data/claude-design-persona.yaml`) consumes the DISTILLED heuristics from `design-heuristics-from-external-prompts.yaml` — NOT these raw files directly.

Raw files serve:
- Human researchers auditing the absorption
- Future re-extraction passes
- Diff comparisons when sources update

## Related

- Heuristics ledger: `../design-heuristics-from-external-prompts.yaml`
- Persona spec: `../claude-design-persona.yaml`
- Skill: `.claude/skills/design-system/SKILL.md`
- Rule: `squads/design-ops/rules/design-system-fidelity.md`
