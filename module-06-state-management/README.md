# Module 6: State Management at Scale

## 🎯 Module Overview

Master modern state management patterns for large applications, including Zustand, Jotai, Recoil, and RSC-first architectures.

### Learning Objectives

✅ Understand when global state is actually needed
✅ Master Zustand for simple global state
✅ Use Jotai for atomic state management
✅ Leverage RSC + Server Actions as state layer
✅ Avoid common state management pitfalls

### Time Estimate: 8-10 hours

---

## 📚 Key Topics

### 1. Context Pitfalls and Solutions
- Why Context causes performance issues
- Context composition patterns
- When Context is appropriate

### 2. Zustand Mastery
- Store design
- Slices and modularity
- Middleware (persist, devtools)
- TypeScript integration

### 3. Jotai for Atomic State
- Atoms and derived atoms
- Async atoms
- Atom families
- Debugging with devtools

### 4. RSC as State Management
- Server Components eliminate client state
- Server Actions for mutations
- Optimistic updates pattern
- When to still use client state

### 5. Comparing Solutions
- Context vs Zustand vs Jotai vs Redux
- When to use each
- Migration strategies

---

## 🛠️ Exercises

### Exercise 1: Zustand Store Architecture

Build a complete app state with Zustand:

```tsx
// stores/useAppStore.ts
interface AppState {
  user: User | null;
  setUser: (user: User) => void;
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  // Slices
  cart: CartSlice;
  theme: ThemeSlice;
}

const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        setUser: (user) => set({ user }),
        // ...
      }),
      { name: 'app-storage' }
    )
  )
);
```

**Time**: 3-4 hours

---

### Exercise 2: RSC-First State Pattern

Refactor client-heavy app to use RSC:

```tsx
// Before: Client component with state
'use client';
function ProductList() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);
  return <List items={products} />;
}

// After: Server component (no state!)
async function ProductList() {
  const products = await db.product.findMany();
  return <List items={products} />;
}
```

**Time**: 3-4 hours

---

## 🎯 Key Patterns

### When to Use What

```
Component-local state (useState):
└─ UI state specific to one component
   Example: Modal open/closed, form input values

Server Components + Server Actions:
└─ Data from backend, mutations
   Example: User data, posts, comments

Context:
└─ Truly global, changes infrequently
   Example: Theme, locale, auth user

Zustand:
└─ Client-side global state, frequent updates
   Example: Shopping cart, draft posts, real-time data

Jotai:
└─ Granular state with many consumers
   Example: Form state, collaborative editing

URL state:
└─ Shareable app state
   Example: Filters, search queries, pagination
```

---

## 🔜 Next: [Module 7: React Native Internals + New Architecture](../module-07-react-native-internals)
