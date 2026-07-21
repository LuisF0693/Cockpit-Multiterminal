---
title: Composition over Configuration
impact: high
tags: [composition, api-design, patterns]
sinkra_source: v0-composition-patterns
---

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
