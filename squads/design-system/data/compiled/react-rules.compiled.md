# Compiled React best-practice rules for agent consumption

> Compiled from 6 rules in react-rules/
> Generated: 2026-04-17
> Compiler: compile-rules.cjs (SINKRA rule-compiler)

---

## React Rule 1: Compound Components Pattern

**Impact:** high
**Tags:** react, architecture, composition, patterns

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

---

## React Rule 2: Context with Interface Pattern

**Impact:** high
**Tags:** react, state, context, typescript

# Context with Interface Pattern

Define explicit TypeScript interfaces for all Context values.

## Incorrect

```tsx
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});
```

## Correct

```tsx
interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
```

## Why

- Default value `{}` hides missing providers at runtime
- TypeScript cannot narrow the type without explicit interface
- Null default + guard hook catches missing providers immediately
- Follows @sinkra/ds-core ThemeProvider pattern

---

## React Rule 3: No forwardRef (React 19+)

**Impact:** high
**Tags:** react, react-19, ref, migration

# No forwardRef (React 19+)

React 19 supports `ref` as a regular prop. Stop using `forwardRef`.

## Incorrect

```tsx
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} {...props} />;
});
Input.displayName = 'Input';
```

## Correct

```tsx
function Input({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

## Why

- React 19 passes `ref` as a regular prop (no wrapper needed)
- forwardRef adds component wrapper overhead and obscures displayName
- Simpler TypeScript types (no generic wrapper)
- @sinkra/ds-core targets React 19 -- all new components should use ref-as-prop
- Existing forwardRef components work but should be migrated incrementally

---

## React Rule 4: Children over Render Props

**Impact:** medium
**Tags:** react, composition, patterns

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

---

## React Rule 5: Explicit Variants over Boolean Props

**Impact:** medium
**Tags:** react, api-design, components, typescript

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

---

## React Rule 6: Lift State Up

**Impact:** medium
**Tags:** react, state, patterns

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

---
