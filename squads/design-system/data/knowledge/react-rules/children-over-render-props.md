---
title: Children over Render Props
impact: medium
tags: [react, composition, patterns]
sinkra_source: v0-react-best-practices
---

# Children over Render Props

Prefer `children` prop for composition. Use render props only when the child
needs data from the parent that cannot be passed via Context.

## Incorrect

```tsx
<Card
  renderHeader={() => <h2>Title</h2>}
  renderContent={() => <p>Body text</p>}
  renderFooter={() => <Button>Save</Button>}
/>
```

## Correct

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Body text</p>
  </CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

## Why

- Children composition is the standard React model
- Render props add indirection without compositional benefit here
- JSX reads naturally top-to-bottom with children
- Follows @sinkra/ds-core Card, Dialog, Sheet compound component patterns
- Render props remain valid for headless components that expose state (e.g., Combobox)
