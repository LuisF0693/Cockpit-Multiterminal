---
title: Compound Components Pattern
impact: high
tags: [react, architecture, composition, patterns]
sinkra_source: v0-react-best-practices
---

# Compound Components

Use compound component patterns for complex UI that shares implicit state.

## Incorrect

```tsx
// Monolithic component with too many props
<Select
  options={options}
  label="Country"
  placeholder="Select..."
  onChange={handleChange}
  renderOption={(opt) => <span>{opt.label}</span>}
  renderTrigger={(val) => <button>{val}</button>}
/>
```

## Correct

```tsx
// Compound components with shared context
<Select onValueChange={handleChange}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    {options.map((opt) => (
      <SelectItem key={opt.value} value={opt.value}>
        {opt.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Why

- Each sub-component has a single responsibility
- Consumer controls composition and layout
- Internal state is shared via Context, not prop drilling
- Follows @sinkra/ds-core component API conventions (Select, Dialog, etc.)
