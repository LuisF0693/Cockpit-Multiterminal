---
title: Lift State Up
impact: medium
tags: [react, state, patterns]
sinkra_source: v0-react-best-practices
---

# Lift State Up

Move shared state to the nearest common ancestor. Do not duplicate state.

## Incorrect

```tsx
function FilterBar() {
  const [query, setQuery] = useState('');
  return <Input value={query} onChange={(e) => setQuery(e.target.value)} />;
}

function ResultsList() {
  const [query, setQuery] = useState(''); // duplicated state
  // ...
}
```

## Correct

```tsx
function SearchPage() {
  const [query, setQuery] = useState('');

  return (
    <>
      <FilterBar query={query} onQueryChange={setQuery} />
      <ResultsList query={query} />
    </>
  );
}
```

## Why

- Single source of truth for shared state
- No synchronization bugs between duplicated states
- Clear data flow: parent owns, children consume
- If state is needed by 3+ components, consider Context (see context-interface.md)
