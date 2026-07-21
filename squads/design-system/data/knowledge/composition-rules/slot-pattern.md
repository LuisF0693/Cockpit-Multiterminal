---
title: Slot Pattern (asSlot / Render As)
impact: high
tags: [composition, patterns, polymorphism]
sinkra_source: v0-composition-patterns
---

# Slot Pattern (asSlot)

Use the `asSlot` utility from @sinkra/ds-core to allow a component to render
as a different element while preserving its styles and behavior.

## Incorrect

```tsx
// Custom polymorphic prop -- reinvents the wheel
<Button as="a" href="/dashboard">Go</Button>
// Requires complex generic types and loses type safety
```

## Correct

```tsx
import { Button, asSlot } from '@sinkra/ds-core';
import Link from 'next/link';

// Button renders as Next.js Link, preserving button styles
<Button asChild>
  <Link href="/dashboard">Go</Link>
</Button>
```

## Why

- `asSlot` (Radix pattern) is type-safe without complex generics
- Child element receives all parent styles and behavior
- Works with Next.js Link, React Router Link, or any element
- @sinkra/ds-core exposes `asSlot` as a utility
