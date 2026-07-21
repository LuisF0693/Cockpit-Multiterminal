---
title: No forwardRef (React 19+)
impact: high
tags: [react, react-19, ref, migration]
sinkra_source: v0-react-best-practices
---

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
