---
title: Context with Interface Pattern
impact: high
tags: [react, state, context, typescript]
sinkra_source: v0-react-best-practices
---

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
