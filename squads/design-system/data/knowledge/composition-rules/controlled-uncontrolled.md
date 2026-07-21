---
title: Controlled vs Uncontrolled Components
impact: high
tags: [composition, state, forms, patterns]
sinkra_source: v0-composition-patterns
---

# Controlled vs Uncontrolled Components

Design components to work in BOTH controlled and uncontrolled modes.

## Incorrect

```tsx
// Only controlled -- forces every consumer to manage state
function Select({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} />;
}
```

## Correct

```tsx
// Supports both modes via defaultValue + value
function Select({
  value,
  defaultValue,
  onValueChange,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internal;

  const handleChange = (newValue: string) => {
    if (!isControlled) setInternal(newValue);
    onValueChange?.(newValue);
  };

  return <select value={currentValue} onChange={(e) => handleChange(e.target.value)} />;
}
```

## Why

- Uncontrolled mode reduces boilerplate for simple forms
- Controlled mode enables complex form logic (validation, dependent fields)
- @sinkra/ds-core Select, Input, Tabs all follow this dual-mode pattern
- Radix UI primitives use this exact pattern internally
