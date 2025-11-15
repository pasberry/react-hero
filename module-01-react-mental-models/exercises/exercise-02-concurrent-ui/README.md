# Exercise 2: Concurrent UI with Transitions

## 🎯 Goal

Build a real-world search interface that demonstrates the power of React's concurrent features using `useTransition` and `useDeferredValue`.

## 📚 Prerequisites

- Complete Lecture 3 (Concurrent Rendering)
- Understanding of hooks
- Basic async JavaScript

## 🎓 Learning Objectives

✅ Master `useTransition` for marking low-priority updates
✅ Use `useDeferredValue` for deferred expensive computations
✅ Understand when UI stays responsive vs becomes janky
✅ Build intuition for concurrent rendering benefits

## 📝 Task Description

Build a product search interface with:

1. **Instant input** - Text input that never lags
2. **Expensive filtering** - Filter 10,000+ products (simulated heavy work)
3. **Smooth UX** - Loading states without blocking input
4. **Comparison** - Show with/without concurrent features

## 🏗️ Starter Code

```tsx
// ./starter/App.tsx
import { useState } from 'react';
import { generateProducts, filterProducts } from './data';

const products = generateProducts(10000);  // 10k products

export function App() {
  const [query, setQuery] = useState('');

  // TODO: Add useTransition for concurrent rendering

  const handleChange = (e) => {
    setQuery(e.target.value);
    // TODO: Mark results update as transition
  };

  // This is SLOW - filters 10k items
  const results = filterProducts(products, query);

  return (
    <div>
      <h1>Product Search</h1>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search products..."
      />
      {/* TODO: Show pending state */}
      <ProductList products={results} />
    </div>
  );
}
```

## ✅ Acceptance Criteria

1. **Input never lags** - Should type smoothly even with heavy filtering
2. **Results update** - Eventually show filtered products
3. **Loading state** - Show spinner while filtering
4. **Comparison mode** - Toggle between concurrent and non-concurrent

## 💡 Implementation Steps

### Step 1: Add useTransition

```tsx
const [isPending, startTransition] = useTransition();

const handleChange = (e) => {
  setQuery(e.target.value);  // High priority

  startTransition(() => {
    // Low priority - can be interrupted
    setFilteredResults(filterProducts(products, query));
  });
};
```

### Step 2: Show Loading State

```tsx
{isPending && <Spinner />}
<ProductList products={results} />
```

### Step 3: useDeferredValue Alternative

```tsx
const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);

// Uses deferred value - lags behind during transitions
const results = filterProducts(products, deferredQuery);
```

### Step 4: Comparison Component

Build side-by-side comparison:
- Left: Without concurrent features (blocking)
- Right: With concurrent features (smooth)

## 🎯 Stretch Goals

1. **Debounce comparison** - Compare against traditional debouncing
2. **Heavy component** - Make ProductList itself expensive to render
3. **Multiple filters** - Add category, price range filters
4. **Abort on keypress** - Show how transitions abort previous work

## 📖 Solution

See `./solution` for complete implementation with commentary on:
- When to use useTransition vs useDeferredValue
- Performance characteristics
- Tradeoffs and limitations

## ⏱️ Time Estimate

- Basic implementation: 1-2 hours
- With comparison: 2-3 hours
- Stretch goals: +1-2 hours

## 🎓 Key Learnings

This exercise demonstrates:
- How concurrent features keep UI responsive
- Difference between urgent and non-urgent updates
- Why transitions are better than debouncing
- Real-world performance impact of concurrent React

---

**Module 1 Complete!** You now understand React's mental models. Proceed to [Module 2](../../module-02-typescript-architecture).
