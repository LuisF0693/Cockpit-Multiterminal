# Compiled component composition patterns for agent consumption

> Compiled from 3 rules in composition-rules/
> Generated: 2026-04-17
> Compiler: compile-rules.cjs (SINKRA rule-compiler)

---

## Composition Rule 1: Composition over Configuration

**Impact:** high
**Tags:** composition, api-design, patterns

# Composition over Configuration

Prefer composable sub-components over monolithic config objects.

## Incorrect

```tsx
<DataTable
  columns={columns}
  data={data}
  pagination={{ pageSize: 10, showSizeChanger: true }}
  sorting={{ defaultSort: 'name', direction: 'asc' }}
  selection={{ mode: 'multiple', onSelect: handleSelect }}
  toolbar={{ search: true, filters: filterConfig, actions: actionButtons }}
  emptyState={{ icon: SearchIcon, title: 'No results', description: 'Try again' }}
/>
// Config object grows unbounded. Every feature = more props.
```

## Correct

```tsx
<DataTable data={data}>
  <DataTableToolbar>
    <DataTableSearch />
    <DataTableFilters config={filterConfig} />
    <DataTableActions>{actionButtons}</DataTableActions>
  </DataTableToolbar>
  <DataTableContent columns={columns} />
  <DataTablePagination pageSize={10} />
  <DataTableEmpty>
    <Empty>
      <EmptyMedia><SearchIcon /></EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No results</EmptyTitle>
        <EmptyDescription>Try again</EmptyDescription>
      </EmptyHeader>
    </Empty>
  </DataTableEmpty>
</DataTable>
```

## Why

- Each sub-component is independently testable and replaceable
- Consumer controls which features are included (no dead config)
- Tree-shaking eliminates unused sub-components
- Follows @sinkra/ds-core patterns: Table, Dialog, Sheet all use composition
- Config objects create coupling between unrelated concerns

---

## Composition Rule 2: Controlled vs Uncontrolled Components

**Impact:** high
**Tags:** composition, state, forms, patterns

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

---

## Composition Rule 3: Slot Pattern (asSlot / Render As)

**Impact:** high
**Tags:** composition, patterns, polymorphism

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

---
