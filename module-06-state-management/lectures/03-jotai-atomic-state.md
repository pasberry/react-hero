# Lecture 3: Jotai Atomic State

## Introduction

Jotai provides atomic state management with a bottom-up approach. Instead of creating a large store, you define small atomic pieces of state that can be composed. This lecture covers Jotai's atom model, derived state, and advanced patterns.

## Core Concepts

### Basic Atoms

```typescript
import { atom, useAtom } from 'jotai'

// Primitive atom
const countAtom = atom(0)

// Usage in components
function Counter() {
  const [count, setCount] = useAtom(countAtom)

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  )
}
```

**Key Differences from useState**:
- State lives outside components
- Can be shared across components
- No Provider needed (optional)
- Supports derived atoms

### Read-Only Atoms

```typescript
const countAtom = atom(0)

// Derived atom (read-only)
const doubledAtom = atom(get => get(countAtom) * 2)

function Display() {
  const [doubled] = useAtom(doubledAtom)
  // Can't set doubled directly
  return <div>Doubled: {doubled}</div>
}
```

### Write-Only Atoms

```typescript
const countAtom = atom(0)

// Write-only atom
const incrementAtom = atom(
  null, // No read value
  (get, set) => {
    set(countAtom, get(countAtom) + 1)
  }
)

function IncrementButton() {
  const [, increment] = useAtom(incrementAtom)

  return <button onClick={increment}>+1</button>
}
```

### Read-Write Atoms

```typescript
const countAtom = atom(0)

// Read-write derived atom
const doubledAtom = atom(
  get => get(countAtom) * 2, // Read
  (get, set, newValue: number) => {
    set(countAtom, newValue / 2) // Write
  }
)

function DoubledControl() {
  const [doubled, setDoubled] = useAtom(doubledAtom)

  return (
    <div>
      <p>Doubled: {doubled}</p>
      <button onClick={() => setDoubled(doubled + 2)}>
        +2 (adds 1 to original)
      </button>
    </div>
  )
}
```

## Async Atoms

### Async Read

```typescript
const userIdAtom = atom('123')

// Async derived atom
const userAtom = atom(async get => {
  const userId = get(userIdAtom)
  const response = await fetch(`/api/users/${userId}`)
  return response.json()
})

function UserProfile() {
  const [user] = useAtom(userAtom)

  // Suspends until loaded
  return <div>{user.name}</div>
}

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile />
    </Suspense>
  )
}
```

### Async Write

```typescript
const todosAtom = atom<Todo[]>([])

const addTodoAtom = atom(
  null,
  async (get, set, text: string) => {
    // Optimistic update
    const tempTodo = { id: 'temp', text, completed: false }
    set(todosAtom, [...get(todosAtom), tempTodo])

    try {
      const newTodo = await api.createTodo(text)
      set(todosAtom, todos =>
        todos.map(t => (t.id === 'temp' ? newTodo : t))
      )
    } catch (error) {
      // Rollback on error
      set(todosAtom, todos => todos.filter(t => t.id !== 'temp'))
      throw error
    }
  }
)

function AddTodoForm() {
  const [, addTodo] = useAtom(addTodoAtom)
  const [text, setText] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await addTodo(text)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={text} onChange={e => setText(e.target.value)} />
      <button>Add</button>
    </form>
  )
}
```

## Atom Families

### Dynamic Atoms

```typescript
import { atomFamily } from 'jotai/utils'

// Create atoms dynamically by ID
const todoAtomFamily = atomFamily((id: string) =>
  atom(async () => {
    const response = await fetch(`/api/todos/${id}`)
    return response.json()
  })
)

function TodoItem({ id }: { id: string }) {
  const [todo] = useAtom(todoAtomFamily(id))

  return <div>{todo.text}</div>
}

function TodoList({ ids }: { ids: string[] }) {
  return (
    <Suspense fallback={<div>Loading todos...</div>}>
      {ids.map(id => (
        <TodoItem key={id} id={id} />
      ))}
    </Suspense>
  )
}
```

### Parameterized Atoms

```typescript
import { atomFamily } from 'jotai/utils'

interface TodoFilter {
  status: 'all' | 'active' | 'completed'
  search: string
}

const filteredTodosFamily = atomFamily((filter: TodoFilter) =>
  atom(get => {
    const todos = get(todosAtom)

    let filtered = todos

    if (filter.status !== 'all') {
      filtered = filtered.filter(t =>
        filter.status === 'completed' ? t.completed : !t.completed
      )
    }

    if (filter.search) {
      filtered = filtered.filter(t =>
        t.text.toLowerCase().includes(filter.search.toLowerCase())
      )
    }

    return filtered
  })
)

function FilteredTodoList({ filter }: { filter: TodoFilter }) {
  const [todos] = useAtom(filteredTodosFamily(filter))

  return <>{todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}</>
}
```

## Advanced Patterns

### Computed Atoms

```typescript
const cartAtom = atom<CartItem[]>([])

// Derived values
const cartTotalAtom = atom(get => {
  const cart = get(cartAtom)
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
})

const cartCountAtom = atom(get => {
  const cart = get(cartAtom)
  return cart.reduce((sum, item) => sum + item.quantity, 0)
})

const isCartEmptyAtom = atom(get => get(cartAtom).length === 0)

// Usage
function CartSummary() {
  const [total] = useAtom(cartTotalAtom)
  const [count] = useAtom(cartCountAtom)
  const [isEmpty] = useAtom(isCartEmptyAtom)

  if (isEmpty) return <div>Cart is empty</div>

  return (
    <div>
      <p>{count} items</p>
      <p>Total: ${total.toFixed(2)}</p>
    </div>
  )
}
```

### Atom with Storage

```typescript
import { atomWithStorage } from 'jotai/utils'

// Persists to localStorage
const themeAtom = atomWithStorage<'light' | 'dark'>('theme', 'light')

// Custom storage
const customStorageAtom = atomWithStorage(
  'user-prefs',
  { fontSize: 16, language: 'en' },
  {
    getItem: (key: string) => {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : null
    },
    setItem: (key: string, value: any) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key)
    },
  }
)
```

### Atom with Reducers

```typescript
import { atomWithReducer } from 'jotai/utils'

type CounterState = { count: number }
type CounterAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET'; value: number }

function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 }
    case 'DECREMENT':
      return { count: state.count - 1 }
    case 'SET':
      return { count: action.value }
    default:
      return state
  }
}

const counterAtom = atomWithReducer({ count: 0 }, counterReducer)

function Counter() {
  const [state, dispatch] = useAtom(counterAtom)

  return (
    <div>
      <p>{state.count}</p>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>-</button>
    </div>
  )
}
```

### Resettable Atoms

```typescript
import { atomWithReset, useResetAtom } from 'jotai/utils'

const filterAtom = atomWithReset({ search: '', status: 'all' })

function FilterControls() {
  const [filter, setFilter] = useAtom(filterAtom)
  const resetFilter = useResetAtom(filterAtom)

  return (
    <div>
      <input
        value={filter.search}
        onChange={e => setFilter({ ...filter, search: e.target.value })}
      />
      <button onClick={resetFilter}>Reset</button>
    </div>
  )
}
```

## Optimization Patterns

### Splitting Atoms

```typescript
import { splitAtom } from 'jotai/utils'

const todosAtom = atom<Todo[]>([])

// Split array into individual atoms
const todoAtomsAtom = splitAtom(todosAtom)

function TodoList() {
  const [todoAtoms] = useAtom(todoAtomsAtom)

  return (
    <>
      {todoAtoms.map(todoAtom => (
        <TodoItem key={`${todoAtom}`} todoAtom={todoAtom} />
      ))}
    </>
  )
}

function TodoItem({ todoAtom }: { todoAtom: PrimitiveAtom<Todo> }) {
  const [todo, setTodo] = useAtom(todoAtom)

  return (
    <div>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={e => setTodo({ ...todo, completed: e.target.checked })}
      />
      {todo.text}
    </div>
  )
}
```

### Select Atoms

```typescript
import { selectAtom } from 'jotai/utils'

const userAtom = atom({ name: 'John', email: 'john@example.com', age: 30 })

// Only rerenders when name changes
const userNameAtom = selectAtom(userAtom, user => user.name)

// Custom equality
const userAgeAtom = selectAtom(
  userAtom,
  user => user.age,
  (a, b) => Math.floor(a / 10) === Math.floor(b / 10) // Only rerender on decade change
)
```

### Loadable Atoms

```typescript
import { loadable } from 'jotai/utils'

const userAtom = atom(async () => {
  const response = await fetch('/api/user')
  return response.json()
})

// Wrap async atom to handle loading/error states
const loadableUserAtom = loadable(userAtom)

function UserProfile() {
  const [user] = useAtom(loadableUserAtom)

  if (user.state === 'loading') {
    return <div>Loading...</div>
  }

  if (user.state === 'hasError') {
    return <div>Error: {user.error.message}</div>
  }

  return <div>{user.data.name}</div>
}
```

## Provider and Scoping

### Using Provider

```typescript
import { Provider } from 'jotai'

// Atoms with default values
const countAtom = atom(0)

function App() {
  return (
    <div>
      {/* Global scope */}
      <Counter />

      {/* Isolated scope */}
      <Provider>
        <Counter />
      </Provider>

      {/* Another isolated scope */}
      <Provider>
        <Counter />
      </Provider>
    </div>
  )
}

// Each Provider creates an isolated store
```

### Initial Values

```typescript
function App() {
  return (
    <Provider initialValues={[[countAtom, 10]]}>
      <Counter /> {/* Starts at 10 */}
    </Provider>
  )
}
```

## Integration Patterns

### With React Query

```typescript
import { atomWithQuery } from 'jotai/query'

const userIdAtom = atom('123')

const userQueryAtom = atomWithQuery(get => ({
  queryKey: ['user', get(userIdAtom)],
  queryFn: async ({ queryKey: [, id] }) => {
    const response = await fetch(`/api/users/${id}`)
    return response.json()
  },
}))

function UserProfile() {
  const [{ data, isLoading, error }] = useAtom(userQueryAtom)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error</div>

  return <div>{data.name}</div>
}
```

### With Zustand

```typescript
import { atomWithStore } from 'jotai/zustand'

// Use existing Zustand store
const storeAtom = atomWithStore(useZustandStore)

function Component() {
  const [state] = useAtom(storeAtom)
  return <div>{state.count}</div>
}
```

## Testing

### Testing Atoms

```typescript
import { createStore } from 'jotai'

describe('countAtom', () => {
  test('increments', () => {
    const store = createStore()

    expect(store.get(countAtom)).toBe(0)

    store.set(countAtom, 1)

    expect(store.get(countAtom)).toBe(1)
  })

  test('derived atom', () => {
    const store = createStore()

    store.set(countAtom, 5)

    expect(store.get(doubledAtom)).toBe(10)
  })
})
```

### Testing with Components

```typescript
import { Provider } from 'jotai'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('counter increments', async () => {
  const user = userEvent.setup()

  render(
    <Provider>
      <Counter />
    </Provider>
  )

  expect(screen.getByText('0')).toBeInTheDocument()

  await user.click(screen.getByText('+1'))

  expect(screen.getByText('1')).toBeInTheDocument()
})
```

## Real-World Example

### Todo App with Jotai

```typescript
// Atoms
const todosAtom = atom<Todo[]>([])
const filterAtom = atom<'all' | 'active' | 'completed'>('all')
const searchAtom = atom('')

// Derived atoms
const filteredTodosAtom = atom(get => {
  const todos = get(todosAtom)
  const filter = get(filterAtom)
  const search = get(searchAtom)

  let filtered = todos

  if (filter !== 'all') {
    filtered = filtered.filter(t =>
      filter === 'completed' ? t.completed : !t.completed
    )
  }

  if (search) {
    filtered = filtered.filter(t =>
      t.text.toLowerCase().includes(search.toLowerCase())
    )
  }

  return filtered
})

const statsAtom = atom(get => {
  const todos = get(todosAtom)
  return {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    active: todos.filter(t => !t.completed).length,
  }
})

// Actions
const addTodoAtom = atom(null, (get, set, text: string) => {
  const newTodo = {
    id: crypto.randomUUID(),
    text,
    completed: false,
  }
  set(todosAtom, [...get(todosAtom), newTodo])
})

const toggleTodoAtom = atom(null, (get, set, id: string) => {
  set(todosAtom, todos =>
    todos.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
  )
})

const deleteTodoAtom = atom(null, (get, set, id: string) => {
  set(todosAtom, todos => todos.filter(t => t.id !== id))
})

// Components
function TodoApp() {
  return (
    <div>
      <TodoStats />
      <TodoFilters />
      <TodoInput />
      <TodoList />
    </div>
  )
}

function TodoStats() {
  const [stats] = useAtom(statsAtom)
  return (
    <div>
      Total: {stats.total} | Active: {stats.active} | Completed: {stats.completed}
    </div>
  )
}

function TodoInput() {
  const [, addTodo] = useAtom(addTodoAtom)
  const [text, setText] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      addTodo(text)
      setText('')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={text} onChange={e => setText(e.target.value)} />
      <button>Add</button>
    </form>
  )
}

function TodoList() {
  const [todos] = useAtom(filteredTodosAtom)

  return (
    <ul>
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  )
}

function TodoItem({ todo }: { todo: Todo }) {
  const [, toggleTodo] = useAtom(toggleTodoAtom)
  const [, deleteTodo] = useAtom(deleteTodoAtom)

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleTodo(todo.id)}
      />
      <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
        {todo.text}
      </span>
      <button onClick={() => deleteTodo(todo.id)}>Delete</button>
    </li>
  )
}
```

## Summary

**Key Concepts**:
- Atoms as primitive state units
- Derived atoms for computed values
- Async atoms with Suspense
- Atom families for dynamic state
- Fine-grained subscriptions

**Benefits**:
- Bottom-up architecture
- Minimal boilerplate
- TypeScript-first
- Suspense support
- Great DevTools
- Small bundle size

**When to Use Jotai**:
- Need atomic state
- Want Suspense integration
- Prefer bottom-up approach
- Small to medium apps
- TypeScript projects

**Best Practices**:
- Keep atoms small and focused
- Use derived atoms for computations
- Leverage atom families for dynamic state
- Use Provider for isolation when needed
- Test atoms independently

**Next**: Lecture 4 covers using React Server Components as a state layer.
