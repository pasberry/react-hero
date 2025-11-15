# Module 5: React Performance Engineering

## 🎯 Module Overview

Deep dive into React performance optimization, profiling, and building high-performance UIs that scale to thousands of components.

### Learning Objectives

✅ Profile React apps to identify bottlenecks
✅ Master memoization (useMemo, useCallback, React.memo)
✅ Build custom virtualization for large lists
✅ Optimize rerenders and reconciliation
✅ Understand when optimization matters

### Time Estimate: 8-10 hours

---

## 📚 Key Topics

### 1. React Profiler Deep Dive
- Chrome DevTools integration
- React DevTools Profiler
- Flamegraphs and ranked charts
- Identifying expensive components

### 2. Memoization Strategies
- When to use React.memo
- useMemo vs useCallback
- Cost of memoization
- Memoization pitfalls

### 3. Virtualization for Large Lists
- Window-based rendering
- react-window vs react-virtual
- Building custom virtualization
- Dynamic height lists

### 4. Rerender Optimization
- Context splitting
- Component composition patterns
- State colocation
- Lazy initialization

### 5. Concurrent Features for Performance
- useTransition for non-blocking updates
- useDeferredValue for expensive computations
- Suspense for code splitting

---

## 🛠️ Exercises

### Exercise 1: Build react-window from Scratch

Implement virtualization for 100,000-item list:

```tsx
function VirtualList({ items, height, itemHeight }) {
  // Calculate visible range based on scroll position
  // Render only visible items
  // Position with transform for performance
}
```

**Time**: 4-5 hours

---

### Exercise 2: Optimize Heavy Dashboard

Given a slow dashboard, apply optimizations:
- Profile to find bottlenecks
- Apply memoization strategically
- Split expensive components
- Measure improvements

**Time**: 3-4 hours

---

## 🎯 Performance Patterns

### Pattern 1: Context Splitting

```tsx
// ❌ Single context - everything rerenders
const AppContext = createContext({ user, theme, notifications });

// ✅ Split contexts - granular updates
const UserContext = createContext(user);
const ThemeContext = createContext(theme);
const NotificationsContext = createContext(notifications);
```

### Pattern 2: Memoization Decision Tree

```
Should I memoize this component?
├─ Is it expensive to render? (>16ms)
│  ├─ YES → Use React.memo
│  └─ NO → Skip memoization (overhead not worth it)
├─ Does it render often with same props?
│  ├─ YES → Use React.memo
│  └─ NO → Skip memoization
└─ Are props referentially stable?
   ├─ YES → React.memo will work
   └─ NO → Fix prop stability first (useMemo/useCallback)
```

---

## 🔜 Next: [Module 6: State Management at Scale](../module-06-state-management)
