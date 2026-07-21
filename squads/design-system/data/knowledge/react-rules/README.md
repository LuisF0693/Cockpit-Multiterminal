# React Rules Knowledge Base

Granular React best-practice rules absorbed from v0 vercel-agent-skills.
Each rule file is a standalone .md with frontmatter (title, impact, tags) and
Incorrect/Correct code examples.

These rules feed the rule-compiler pipeline and are queryable by brad-frost
and page-composer agents for pattern enforcement.

## Source
- v0 Design Pipeline (Repo B), `react-best-practices/` directory
- Absorbed via B02-03 ABSORB verdict (COMPARE pipeline, 2026-04-16)

## Format (SINKRA-adapted frontmatter)
```yaml
---
title: Rule Name
impact: high|medium|low
tags: [react, patterns, ...]
sinkra_source: v0-react-best-practices
---
```

## Files
- compound-components.md -- Compound component pattern
- context-interface.md -- Context with interface pattern
- lift-state-up.md -- State lifting pattern
- explicit-variants.md -- Explicit variant pattern
- children-over-render-props.md -- Prefer children over render props
- no-forward-ref.md -- ForwardRef elimination (React 19)
