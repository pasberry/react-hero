# Lecture 2: Memoization Strategies

## React.memo

```typescript
// ❌ Rerenders on every parent render
function ExpensiveChild({ data }) {
  return <div>{/* Complex rendering */}</div>
}

// ✅ Only rerenders when data changes
const ExpensiveChild = React.memo(({ data }) => {
  return <div>{/* Complex rendering */}</div>
})
```

## useMemo

```typescript
function Component({ items }) {
  // ❌ Recomputes every render
  const sorted = items.sort((a, b) => b.score - a.score)

  // ✅ Only recomputes when items change
  const sorted = useMemo(
    () => items.sort((a, b) => b.score - a.score),
    [items]
  )
  
  return <List items={sorted} />
}
```

## useCallback

```typescript
function Parent() {
  // ❌ New function every render
  const handleClick = () => console.log('clicked')

  // ✅ Stable function reference
  const handleClick = useCallback(
    () => console.log('clicked'),
    []
  )
  
  return <MemoizedChild onClick={handleClick} />
}
```

## When NOT to Memoize

```typescript
// ❌ Over-optimization - simple component
const Button = React.memo(({ children }) => (
  <button>{children}</button>
))

// ✅ No memoization needed - already fast
function Button({ children }) {
  return <button>{children}</button>
}
```

## Decision Tree

```
Should I memoize?
├─ Is component expensive? (>16ms)
│  ├─ YES → Consider React.memo
│  └─ NO → Skip memoization
├─ Do props change rarely?
│  ├─ YES → Good candidate for memo
│  └─ NO → Memoization might hurt
└─ Are props referentially stable?
   ├─ YES → memo will work
   └─ NO → Use useMemo/useCallback first
```

## Summary

Memoization is powerful but has costs. Profile first, optimize second.
