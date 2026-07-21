# Composition Rules Knowledge Base

Component composition patterns absorbed from v0 vercel-agent-skills.
These rules define HOW to compose React components correctly --
complementing the react-rules/ which define individual component patterns.

## Source
- v0 Design Pipeline (Repo B), `composition-patterns/` directory
- Absorbed via B02-03 ABSORB verdict (COMPARE pipeline, 2026-04-16)

## Format (SINKRA-adapted frontmatter)
```yaml
---
title: Pattern Name
impact: high|medium|low
tags: [composition, patterns, ...]
sinkra_source: v0-composition-patterns
---
```

## Files
- slot-pattern.md -- Render-as pattern (asSlot from ds-core)
- controlled-uncontrolled.md -- Controlled vs uncontrolled component design
- composition-over-configuration.md -- Prefer composable APIs over config objects
