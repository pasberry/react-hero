# Lecture 1: Zustand Architecture

## Why Zustand?

Simple, fast, and scalable state management without boilerplate.

## Basic Store

```typescript
import { create } from 'zustand'

interface BearStore {
  bears: number
  increase: () => void
  decrease: () => void
}

const useBearStore = create<BearStore>((set) => ({
  bears: 0,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
  decrease: () => set((state) => ({ bears: state.bears - 1 })),
}))

// Usage
function BearCounter() {
  const bears = useBearStore((state) => state.bears)
  const increase = useBearStore((state) => state.increase)
  
  return (
    <div>
      <h1>{bears} bears</h1>
      <button onClick={increase}>Add bear</button>
    </div>
  )
}
```

## Slices Pattern

```typescript
interface UserSlice {
  user: User | null
  setUser: (user: User) => void
}

interface SettingsSlice {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

const createUserSlice = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
})

const createSettingsSlice = (set) => ({
  theme: 'light' as const,
  setTheme: (theme) => set({ theme }),
})

const useAppStore = create<UserSlice & SettingsSlice>()((...a) => ({
  ...createUserSlice(...a),
  ...createSettingsSlice(...a),
}))
```

## Middleware

```typescript
import { persist, devtools } from 'zustand/middleware'

const useStore = create<Store>()(
  devtools(
    persist(
      (set) => ({
        // store
      }),
      { name: 'app-storage' }
    )
  )
)
```

## Async Actions

```typescript
const useStore = create<Store>((set) => ({
  users: [],
  loading: false,
  
  fetchUsers: async () => {
    set({ loading: true })
    const users = await api.getUsers()
    set({ users, loading: false })
  },
}))
```

## Summary

Zustand provides simple, powerful state management with minimal boilerplate.
