---
title: Explicit Variants over Boolean Props
impact: medium
tags: [react, api-design, components, typescript]
sinkra_source: v0-react-best-practices
---

# Explicit Variants over Boolean Props

Use a single `variant` prop with string union instead of multiple boolean flags.

## Incorrect

```tsx
<Button primary large outlined />
// What wins? primary + outlined is contradictory.
// Boolean combinations create 2^n states, most invalid.
```

## Correct

```tsx
<Button variant="primary" size="lg" />
// Uses CVA (class-variance-authority) pattern from @sinkra/ds-core
// Each variant dimension is a single enum, not booleans
```

## Why

- Boolean props create exponential combinations, most invalid
- String union makes valid states explicit and exhaustive
- CVA pattern (used by @sinkra/ds-core) maps variants to classes cleanly
- TypeScript catches invalid combinations at compile time
- Follows buttonVariants, badgeVariants, toggleVariants patterns in ds-core
