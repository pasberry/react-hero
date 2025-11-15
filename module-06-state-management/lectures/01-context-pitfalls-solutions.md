# Lecture 1: Context Pitfalls and Solutions

## Introduction

React Context is often misused for state management, leading to performance problems and unnecessary complexity. This lecture covers common Context pitfalls and practical solutions for managing global state effectively.

## Common Context Pitfalls

### Pitfall 1: The Monolithic Context

```typescript
// ❌ Problem: Everything in one context
interface AppContextValue {
  user: User | null
  theme: 'light' | 'dark'
  language: string
  notifications: Notification[]
  settings: Settings
  cart: CartItem[]
  favorites: string[]
}

const AppContext = createContext<AppContextValue | null>(null)

function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [language, setLanguage] = useState('en')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [settings, setSettings] = useState<Settings>({})
  const [cart, setCart] = useState<CartItem[]>([])
  const [favorites, setFavorites] = useState<string[]>([])

  // New object every render!
  const value = {
    user,
    theme,
    language,
    notifications,
    settings,
    cart,
    favorites,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Problem: Every component using context rerenders on ANY change
function UserProfile() {
  const context = useContext(AppContext)
  // Rerenders when theme, cart, notifications, etc. change
  return <div>{context?.user?.name}</div>
}
```

**Issues**:
1. All consumers rerender on any value change
2. Impossible to optimize
3. Poor code organization
4. Difficult to test

### Solution: Split Contexts

```typescript
// ✅ Separate contexts by domain
const UserContext = createContext<User | null>(null)
const ThemeContext = createContext<'light' | 'dark'>('light')
const LanguageContext = createContext<string>('en')
const NotificationsContext = createContext<Notification[]>([])
const SettingsContext = createContext<Settings>({})
const CartContext = createContext<CartItem[]>([])

function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <ThemeProvider>
        <LanguageProvider>
          <NotificationsProvider>
            <SettingsProvider>
              <CartProvider>
                {children}
              </CartProvider>
            </SettingsProvider>
          </NotificationsProvider>
        </LanguageProvider>
      </ThemeProvider>
    </UserProvider>
  )
}

// Now components only rerender when their specific context changes
function UserProfile() {
  const user = useContext(UserContext)
  // Only rerenders when user changes
  return <div>{user?.name}</div>
}

function ThemeToggle() {
  const theme = useContext(ThemeContext)
  // Only rerenders when theme changes
  return <button>{theme}</button>
}
```

### Pitfall 2: Unstable Context Values

```typescript
// ❌ Problem: New object every render
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('light')

  // New object reference every render!
  const value = { theme, setTheme }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// All consumers rerender even when theme hasn't changed
```

### Solution: Memoize Context Values

```typescript
// ✅ Stable reference
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('light')

  // Only creates new object when theme changes
  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
```

### Pitfall 3: Context with Frequently Changing Values

```typescript
// ❌ Problem: Mouse position in context
const MouseContext = createContext({ x: 0, y: 0 })

function MouseProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  return (
    <MouseContext.Provider value={position}>
      {children}
    </MouseContext.Provider>
  )
}

// Problem: Every consumer rerenders on EVERY mouse move
function App() {
  const mouse = useContext(MouseContext)
  // Rerenders constantly!
  return <div>{/* ... */}</div>
}
```

### Solution: Use State Management Library or Subscriptions

```typescript
// ✅ Use Zustand for frequently changing state
import create from 'zustand'

const useMouseStore = create<{ x: number; y: number }>(() => ({
  x: 0,
  y: 0,
}))

// Setup listener
window.addEventListener('mousemove', e => {
  useMouseStore.setState({ x: e.clientX, y: e.clientY })
})

// Components only rerender when they subscribe
function MouseFollower() {
  // Only subscribes to what it needs
  const x = useMouseStore(state => state.x)
  return <div style={{ left: x }}>Follower</div>
}

function MouseDisplay() {
  const position = useMouseStore()
  return <div>Mouse: {position.x}, {position.y}</div>
}
```

## Optimizing Context

### Context Selector Pattern

```typescript
// Create a context selector
function createContextSelector<T>() {
  const Context = createContext<T | null>(null)
  const subscribers = new Set<(value: T) => void>()

  function Provider({ value, children }: {
    value: T
    children: ReactNode
  }) {
    const valueRef = useRef(value)

    useEffect(() => {
      valueRef.current = value
      subscribers.forEach(subscriber => subscriber(value))
    }, [value])

    return <Context.Provider value={value}>{children}</Context.Provider>
  }

  function useSelector<S>(selector: (value: T) => S): S {
    const context = useContext(Context)
    if (!context) throw new Error('useSelector used outside Provider')

    const [selected, setSelected] = useState(() => selector(context))
    const selectorRef = useRef(selector)
    selectorRef.current = selector

    useEffect(() => {
      const subscriber = (value: T) => {
        const newValue = selectorRef.current(value)
        setSelected(prev => (Object.is(prev, newValue) ? prev : newValue))
      }

      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    }, [])

    return selected
  }

  return { Provider, useSelector }
}

// Usage
interface Store {
  user: User | null
  theme: string
  count: number
}

const { Provider, useSelector } = createContextSelector<Store>()

function App() {
  const [store, setStore] = useState<Store>({
    user: null,
    theme: 'light',
    count: 0,
  })

  return (
    <Provider value={store}>
      <UserName />
      <ThemeButton />
      <Counter />
    </Provider>
  )
}

function UserName() {
  // Only rerenders when user.name changes
  const userName = useSelector(state => state.user?.name)
  return <div>{userName}</div>
}

function ThemeButton() {
  // Only rerenders when theme changes
  const theme = useSelector(state => state.theme)
  return <button>{theme}</button>
}
```

### Split Providers Strategy

```typescript
// Separate read and write contexts
const StateContext = createContext<State | null>(null)
const DispatchContext = createContext<Dispatch | null>(null)

function Provider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // dispatch never changes - no memoization needed
  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>
        {children}
      </StateContext.Provider>
    </DispatchContext.Provider>
  )
}

// Separate hooks
function useState() {
  const state = useContext(StateContext)
  if (!state) throw new Error('useState used outside Provider')
  return state
}

function useDispatch() {
  const dispatch = useContext(DispatchContext)
  if (!dispatch) throw new Error('useDispatch used outside Provider')
  return dispatch
}

// Components that only dispatch don't rerender on state changes
function AddButton() {
  const dispatch = useDispatch()
  // Never rerenders!
  return <button onClick={() => dispatch({ type: 'ADD' })}>Add</button>
}

function Counter() {
  const state = useState()
  // Rerenders on state changes
  return <div>{state.count}</div>
}
```

## Context vs State Management Libraries

### When to Use Context

```typescript
// ✅ Good use of Context: Infrequent updates
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// ✅ Good: Configuration data
function ConfigProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => ({
    apiUrl: process.env.API_URL,
    features: {
      darkMode: true,
      analytics: true,
    },
  }), [])

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}

// ✅ Good: Dependency injection
function ApiProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => createApiClient(), [])

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
}
```

### When to Use State Management

```typescript
// ❌ Bad for Context: Frequent updates
// Use Zustand/Jotai instead
import create from 'zustand'

const useStore = create<{
  messages: Message[]
  addMessage: (message: Message) => void
}>(set => ({
  messages: [],
  addMessage: message =>
    set(state => ({ messages: [...state.messages, message] })),
}))

// ❌ Bad for Context: Complex state logic
// Use reducer or state machine
const useAuthStore = create<AuthState>(set => ({
  status: 'idle',
  user: null,
  login: async (credentials) => {
    set({ status: 'loading' })
    try {
      const user = await api.login(credentials)
      set({ status: 'authenticated', user })
    } catch (error) {
      set({ status: 'error' })
    }
  },
}))

// ❌ Bad for Context: Needs granular subscriptions
// Use Jotai atoms
import { atom, useAtom } from 'jotai'

const userAtom = atom<User | null>(null)
const themeAtom = atom<string>('light')
const cartAtom = atom<CartItem[]>([])

// Each component subscribes to specific atom
function UserProfile() {
  const [user] = useAtom(userAtom)
  // Only rerenders when userAtom changes
  return <div>{user?.name}</div>
}
```

## Advanced Context Patterns

### Context with Reducer

```typescript
type State = {
  count: number
  items: Item[]
}

type Action =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'ADD_ITEM'; item: Item }
  | { type: 'REMOVE_ITEM'; id: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 }
    case 'DECREMENT':
      return { ...state, count: state.count - 1 }
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.item] }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.id),
      }
    default:
      return state
  }
}

const StateContext = createContext<State | null>(null)
const DispatchContext = createContext<Dispatch<Action> | null>(null)

function Provider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { count: 0, items: [] })

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}
```

### Lazy Context Initialization

```typescript
function ExpensiveProvider({ children }: { children: ReactNode }) {
  const [value] = useState(() => {
    // Expensive initialization - only runs once
    const data = loadFromLocalStorage()
    const processed = processData(data)
    return { data: processed }
  })

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
```

### Context with Middleware

```typescript
type Middleware<S, A> = (
  state: S,
  action: A,
  next: (action: A) => void
) => void

function createStoreWithMiddleware<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
  middlewares: Middleware<S, A>[]
) {
  const [state, baseDispatch] = useReducer(reducer, initialState)

  const dispatch = useCallback(
    (action: A) => {
      let index = 0

      const next = (action: A) => {
        if (index < middlewares.length) {
          const middleware = middlewares[index++]
          middleware(state, action, next)
        } else {
          baseDispatch(action)
        }
      }

      next(action)
    },
    [state, middlewares]
  )

  return [state, dispatch] as const
}

// Logging middleware
const logger: Middleware<State, Action> = (state, action, next) => {
  console.log('Action:', action)
  console.log('State before:', state)
  next(action)
}

// Analytics middleware
const analytics: Middleware<State, Action> = (state, action, next) => {
  track('state-update', { type: action.type })
  next(action)
}

function Provider({ children }: { children: ReactNode }) {
  const [state, dispatch] = createStoreWithMiddleware(
    reducer,
    initialState,
    [logger, analytics]
  )

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}
```

## Testing Context

### Testing Providers

```typescript
import { render, screen } from '@testing-library/react'

function renderWithProviders(
  ui: ReactElement,
  {
    initialState = {},
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider>
        <UserProvider initialUser={initialState.user}>
          <CartProvider>{children}</CartProvider>
        </UserProvider>
      </ThemeProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

test('displays user name', () => {
  renderWithProviders(<UserProfile />, {
    initialState: { user: { name: 'John' } },
  })

  expect(screen.getByText('John')).toBeInTheDocument()
})
```

### Testing Context Updates

```typescript
test('updates theme', async () => {
  const { user } = renderWithProviders(<ThemeToggle />)

  expect(screen.getByText('light')).toBeInTheDocument()

  await user.click(screen.getByRole('button'))

  expect(screen.getByText('dark')).toBeInTheDocument()
})
```

## Summary

**Context Pitfalls**:
1. Monolithic context - too much in one place
2. Unstable values - new objects every render
3. Frequent updates - everything rerenders
4. Wrong abstraction - using Context for global state

**Solutions**:
1. **Split contexts** - Separate by domain and update frequency
2. **Memoize values** - useMemo for context values
3. **Use selectors** - Custom selector pattern
4. **Split read/write** - Separate state and dispatch
5. **Choose right tool** - Context vs state library

**When to Use Context**:
- Theming
- Localization
- Configuration
- Dependency injection
- Infrequent updates

**When NOT to Use Context**:
- Frequently changing state
- Complex state logic
- Need for granular subscriptions
- Performance-critical updates

**Best Practices**:
- Keep context values stable
- Split by update frequency
- Provide TypeScript types
- Test with custom render functions
- Measure performance impact

**Next**: Lecture 2 covers Zustand for scalable state management.
