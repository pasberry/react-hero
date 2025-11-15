# Lecture 2: Zustand Architecture

## Introduction

Zustand is a small, fast, and scalable state management solution for React. Unlike Context or Redux, it uses a subscription model that prevents unnecessary rerenders. This lecture covers Zustand's architecture, patterns, and best practices for production applications.

## Core Concepts

### Basic Store

```typescript
import create from 'zustand'

interface Store {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

const useStore = create<Store>(set => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
  decrement: () => set(state => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}))

// Usage
function Counter() {
  const count = useStore(state => state.count)
  const increment = useStore(state => state.increment)

  return (
    <div>
      <p>{count}</p>
      <button onClick={increment}>+1</button>
    </div>
  )
}
```

**Key Advantages**:
- No Provider needed
- Minimal boilerplate
- Automatic optimization through selectors
- TypeScript-first

### Selective Subscriptions

```typescript
// Only rerenders when count changes
function Count() {
  const count = useStore(state => state.count)
  return <div>{count}</div>
}

// Only rerenders when user changes
function UserName() {
  const userName = useStore(state => state.user?.name)
  return <div>{userName}</div>
}

// Rerenders on any state change (avoid this!)
function BadExample() {
  const state = useStore()
  return <div>{state.count}</div>
}
```

### Computed Values

```typescript
interface Store {
  items: Item[]
  filter: string
  // Computed
  filteredItems: () => Item[]
  itemCount: () => number
}

const useStore = create<Store>((set, get) => ({
  items: [],
  filter: '',

  // Computed values as functions
  filteredItems: () => {
    const { items, filter } = get()
    return items.filter(item =>
      item.name.toLowerCase().includes(filter.toLowerCase())
    )
  },

  itemCount: () => get().items.length,
}))

// Usage
function FilteredList() {
  const filteredItems = useStore(state => state.filteredItems())
  // Only rerenders when filteredItems result changes
  return <>{filteredItems.map(item => <Item key={item.id} {...item} />)}</>
}
```

## Async Actions

### Basic Async

```typescript
interface Store {
  user: User | null
  isLoading: boolean
  error: Error | null
  fetchUser: (id: string) => Promise<void>
}

const useStore = create<Store>(set => ({
  user: null,
  isLoading: false,
  error: null,

  fetchUser: async (id: string) => {
    set({ isLoading: true, error: null })

    try {
      const user = await api.getUser(id)
      set({ user, isLoading: false })
    } catch (error) {
      set({ error: error as Error, isLoading: false })
    }
  },
}))
```

### Request Deduplication

```typescript
interface Store {
  users: Map<string, User>
  loadingIds: Set<string>
  fetchUser: (id: string) => Promise<User>
}

const useStore = create<Store>((set, get) => ({
  users: new Map(),
  loadingIds: new Set(),

  fetchUser: async (id: string) => {
    // Return if already loaded
    const existing = get().users.get(id)
    if (existing) return existing

    // Return if already loading
    if (get().loadingIds.has(id)) {
      // Wait for existing request
      return new Promise(resolve => {
        const interval = setInterval(() => {
          const user = get().users.get(id)
          if (user) {
            clearInterval(interval)
            resolve(user)
          }
        }, 100)
      })
    }

    // Mark as loading
    set(state => ({
      loadingIds: new Set(state.loadingIds).add(id),
    }))

    try {
      const user = await api.getUser(id)

      set(state => {
        const users = new Map(state.users).set(id, user)
        const loadingIds = new Set(state.loadingIds)
        loadingIds.delete(id)
        return { users, loadingIds }
      })

      return user
    } catch (error) {
      set(state => {
        const loadingIds = new Set(state.loadingIds)
        loadingIds.delete(id)
        return { loadingIds }
      })
      throw error
    }
  },
}))
```

## Slices Pattern

### Splitting Store into Slices

```typescript
// auth.slice.ts
export interface AuthSlice {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const createAuthSlice: StateCreator<Store, [], [], AuthSlice> = set => ({
  user: null,

  login: async (email, password) => {
    const user = await api.login(email, password)
    set({ user })
  },

  logout: () => set({ user: null }),
})

// cart.slice.ts
export interface CartSlice {
  items: CartItem[]
  addItem: (item: Product) => void
  removeItem: (id: string) => void
  clear: () => void
}

export const createCartSlice: StateCreator<Store, [], [], CartSlice> = set => ({
  items: [],

  addItem: product => set(state => ({
    items: [...state.items, { ...product, quantity: 1 }],
  })),

  removeItem: id => set(state => ({
    items: state.items.filter(item => item.id !== id),
  })),

  clear: () => set({ items: [] }),
})

// store.ts
import { createAuthSlice } from './auth.slice'
import { createCartSlice } from './cart.slice'

type Store = AuthSlice & CartSlice

export const useStore = create<Store>()((...a) => ({
  ...createAuthSlice(...a),
  ...createCartSlice(...a),
}))
```

## Middleware

### Persist Middleware

```typescript
import { persist } from 'zustand/middleware'

const useStore = create(
  persist<Store>(
    set => ({
      user: null,
      theme: 'light',
      login: async (credentials) => {
        const user = await api.login(credentials)
        set({ user })
      },
    }),
    {
      name: 'app-storage', // localStorage key
      partialize: state => ({
        theme: state.theme, // Only persist theme
        // Don't persist user (security)
      }),
    }
  )
)
```

### Immer Middleware

```typescript
import { immer } from 'zustand/middleware/immer'

interface Store {
  nested: {
    deep: {
      value: number
    }
  }
  updateDeep: (value: number) => void
}

const useStore = create(
  immer<Store>(set => ({
    nested: { deep: { value: 0 } },

    updateDeep: value =>
      set(state => {
        // Mutate directly with Immer
        state.nested.deep.value = value
      }),
  }))
)
```

### DevTools Middleware

```typescript
import { devtools } from 'zustand/middleware'

const useStore = create(
  devtools<Store>(
    set => ({
      count: 0,
      increment: () => set(state => ({ count: state.count + 1 }), false, 'increment'),
      decrement: () => set(state => ({ count: state.count - 1 }), false, 'decrement'),
    }),
    { name: 'CounterStore' }
  )
)
```

### Custom Middleware

```typescript
// Logger middleware
const logger = <T extends State>(config: StateCreator<T>): StateCreator<T> => (
  set,
  get,
  api
) =>
  config(
    (...args) => {
      console.log('  previous state', get())
      set(...args)
      console.log('  new state', get())
    },
    get,
    api
  )

// Usage
const useStore = create(
  logger<Store>(set => ({
    count: 0,
    increment: () => set(state => ({ count: state.count + 1 })),
  }))
)
```

## Advanced Patterns

### Computed Selectors

```typescript
interface Store {
  items: Product[]
  cart: CartItem[]
}

// Reusable selectors
export const selectors = {
  cartTotal: (state: Store) =>
    state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),

  cartCount: (state: Store) =>
    state.cart.reduce((sum, item) => sum + item.quantity, 0),

  isInCart: (state: Store, productId: string) =>
    state.cart.some(item => item.id === productId),
}

// Usage with automatic memoization
function CartTotal() {
  const total = useStore(selectors.cartTotal)
  return <div>${total.toFixed(2)}</div>
}

function AddToCartButton({ productId }: { productId: string }) {
  const isInCart = useStore(state => selectors.isInCart(state, productId))
  return <button disabled={isInCart}>Add to Cart</button>
}
```

### Transient Updates

```typescript
// For frequently changing values that don't need rerenders
const useStore = create<Store>(set => ({
  x: 0,
  y: 0,

  // Use subscribeWithSelector for fine control
  setPosition: (x: number, y: number) => {
    set({ x, y }, true) // true = replace instead of merge
  },
}))

// Subscribe to changes without causing rerenders
useEffect(() => {
  const unsubscribe = useStore.subscribe(
    state => [state.x, state.y],
    ([x, y]) => {
      // Handle position change
      console.log('Position:', x, y)
    }
  )

  return unsubscribe
}, [])
```

### Optimistic Updates

```typescript
interface Store {
  todos: Todo[]
  optimisticTodos: Todo[]
  addTodo: (text: string) => Promise<void>
}

const useStore = create<Store>((set, get) => ({
  todos: [],
  optimisticTodos: [],

  addTodo: async (text: string) => {
    const tempId = `temp-${Date.now()}`
    const tempTodo = { id: tempId, text, completed: false }

    // Optimistic update
    set(state => ({
      optimisticTodos: [...state.optimisticTodos, tempTodo],
    }))

    try {
      const todo = await api.createTodo(text)

      set(state => ({
        todos: [...state.todos, todo],
        optimisticTodos: state.optimisticTodos.filter(t => t.id !== tempId),
      }))
    } catch (error) {
      // Rollback on error
      set(state => ({
        optimisticTodos: state.optimisticTodos.filter(t => t.id !== tempId),
      }))
    }
  },
}))

function TodoList() {
  const todos = useStore(state => [...state.todos, ...state.optimisticTodos])

  return <>{todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}</>
}
```

## Performance Optimization

### Shallow Equality

```typescript
import shallow from 'zustand/shallow'

// Prevents rerender if array contents are the same
function TodoList() {
  const todos = useStore(state => state.todos, shallow)
  return <>{todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}</>
}

// Pick multiple values with shallow comparison
function UserInfo() {
  const { name, email } = useStore(
    state => ({ name: state.user.name, email: state.user.email }),
    shallow
  )

  return (
    <div>
      <p>{name}</p>
      <p>{email}</p>
    </div>
  )
}
```

### Manual Subscriptions

```typescript
// Subscribe without causing rerenders
function Component() {
  const counterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubscribe = useStore.subscribe(
      state => state.count,
      count => {
        if (counterRef.current) {
          counterRef.current.textContent = String(count)
        }
      }
    )

    return unsubscribe
  }, [])

  return <div ref={counterRef}>0</div>
}
```

## Testing

### Testing Stores

```typescript
import { renderHook, act } from '@testing-library/react'

describe('useStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useStore.setState({ count: 0 })
  })

  test('increments count', () => {
    const { result } = renderHook(() => useStore())

    expect(result.current.count).toBe(0)

    act(() => {
      result.current.increment()
    })

    expect(result.current.count).toBe(1)
  })

  test('handles async actions', async () => {
    const { result } = renderHook(() => useStore())

    await act(async () => {
      await result.current.fetchUser('123')
    })

    expect(result.current.user).toEqual({ id: '123', name: 'John' })
  })
})
```

### Testing with Components

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('updates cart', async () => {
  const user = userEvent.setup()

  useStore.setState({
    cart: [],
    addItem: product => useStore.setState({ cart: [product] }),
  })

  render(<ProductCard product={{ id: '1', name: 'Test' }} />)

  await user.click(screen.getByText('Add to Cart'))

  expect(useStore.getState().cart).toHaveLength(1)
})
```

## Real-World Examples

### E-commerce Store

```typescript
interface EcommerceStore {
  // Products
  products: Product[]
  fetchProducts: () => Promise<void>

  // Cart
  cart: CartItem[]
  addToCart: (product: Product) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void

  // Computed
  cartTotal: () => number
  cartCount: () => number

  // Checkout
  checkout: () => Promise<void>
}

const useEcommerceStore = create<EcommerceStore>((set, get) => ({
  products: [],
  cart: [],

  fetchProducts: async () => {
    const products = await api.getProducts()
    set({ products })
  },

  addToCart: product => {
    const existing = get().cart.find(item => item.id === product.id)

    if (existing) {
      set(state => ({
        cart: state.cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      }))
    } else {
      set(state => ({
        cart: [...state.cart, { ...product, quantity: 1 }],
      }))
    }
  },

  removeFromCart: id =>
    set(state => ({
      cart: state.cart.filter(item => item.id !== id),
    })),

  updateQuantity: (id, quantity) =>
    set(state => ({
      cart: state.cart.map(item =>
        item.id === id ? { ...item, quantity } : item
      ),
    })),

  cartTotal: () =>
    get().cart.reduce((sum, item) => sum + item.price * item.quantity, 0),

  cartCount: () => get().cart.reduce((sum, item) => sum + item.quantity, 0),

  checkout: async () => {
    await api.checkout(get().cart)
    set({ cart: [] })
  },
}))
```

## Summary

**Key Benefits**:
- Minimal API surface
- No Provider boilerplate
- Automatic optimization
- TypeScript-first
- DevTools support
- Middleware ecosystem

**Best Practices**:
1. Use selective subscriptions
2. Split large stores into slices
3. Leverage middleware (persist, immer, devtools)
4. Create reusable selectors
5. Use shallow equality for objects/arrays
6. Test stores independently

**When to Use Zustand**:
- Global state management
- Shared state across components
- Async state
- Computed values
- State that changes frequently
- Want minimal boilerplate

**Performance**:
- Only subscribed components rerender
- No Context overhead
- Efficient updates
- Works great with large states

**Next**: Lecture 3 covers Jotai for atomic state management.
