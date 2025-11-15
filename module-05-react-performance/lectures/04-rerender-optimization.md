# Lecture 4: Rerender Optimization

## Introduction

Unnecessary rerenders are the most common React performance issue. This lecture covers strategies to eliminate wasteful renders through proper component architecture, state management, and composition patterns.

## Understanding Rerenders

### What Triggers a Rerender?

```typescript
function Component() {
  // Rerenders when:

  // 1. State changes
  const [count, setCount] = useState(0)
  setCount(1) // ✓ Triggers rerender

  // 2. Parent rerenders (by default)
  // Parent → Child always rerenders

  // 3. Context value changes
  const value = useContext(MyContext) // ✓ Context update

  // 4. Force update (rare)
  const [, forceUpdate] = useReducer(x => x + 1, 0)
  forceUpdate() // ✓ Forces rerender
}
```

### What Doesn't Trigger a Rerender?

```typescript
// ❌ These don't cause rerenders:

// 1. Ref changes
const ref = useRef(0)
ref.current = 1 // No rerender

// 2. Same state value
const [count, setCount] = useState(0)
setCount(0) // No rerender (Object.is equality)

// 3. Props that don't change (with memo)
const MemoChild = memo(Child)
<MemoChild value={stableValue} /> // No rerender

// 4. Local variables
let localVar = 0
localVar = 1 // No rerender
```

## State Colocation

### Problem: State Too High

```typescript
// ❌ Bad: State in parent causes all children to rerender
function Dashboard() {
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [selectedTab, setSelectedTab] = useState('overview')

  return (
    <>
      <Header />
      <Sidebar />
      <Form
        userName={userName}
        onUserNameChange={setUserName}
        userEmail={userEmail}
        onUserEmailChange={setUserEmail}
      />
      <Tabs selected={selectedTab} onChange={setSelectedTab} />
      <Analytics />
      <Footer />
    </>
  )
}

// Every keystroke in the form rerenders EVERYTHING
```

### Solution: Colocate State

```typescript
// ✅ Good: State only where needed
function Dashboard() {
  const [selectedTab, setSelectedTab] = useState('overview')

  return (
    <>
      <Header />
      <Sidebar />
      <UserForm /> {/* State lives here */}
      <Tabs selected={selectedTab} onChange={setSelectedTab} />
      <Analytics />
      <Footer />
    </>
  )
}

function UserForm() {
  // State colocated - only this component rerenders
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  return (
    <form>
      <input
        value={userName}
        onChange={e => setUserName(e.target.value)}
      />
      <input
        value={userEmail}
        onChange={e => setUserEmail(e.target.value)}
      />
    </form>
  )
}
```

### Lifting State Smart

```typescript
// Only lift state when multiple components need it

// ❌ Bad: Lifted unnecessarily
function Parent() {
  const [search, setSearch] = useState('') // Only SearchBar needs this

  return (
    <>
      <SearchBar value={search} onChange={setSearch} />
      <UnrelatedComponent /> {/* Rerenders on every search keystroke! */}
      <AnotherComponent />
    </>
  )
}

// ✅ Good: Keep state local
function Parent() {
  return (
    <>
      <SearchBarContainer /> {/* State inside */}
      <UnrelatedComponent />
      <AnotherComponent />
    </>
  )
}

function SearchBarContainer() {
  const [search, setSearch] = useState('')
  return <SearchBar value={search} onChange={setSearch} />
}
```

## Component Composition

### Children Prop Pattern

```typescript
// ❌ Bad: Expensive children rerender on state change
function Parent() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <ExpensiveChart /> {/* Rerenders every count change */}
      <ExpensiveTable />
      <ExpensiveMap />
    </div>
  )
}

// ✅ Good: Extract state, pass children
function Parent() {
  return (
    <CounterContainer>
      <ExpensiveChart /> {/* Never rerenders */}
      <ExpensiveTable />
      <ExpensiveMap />
    </CounterContainer>
  )
}

function CounterContainer({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0)

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      {children}
    </div>
  )
}
```

### Render Props Optimization

```typescript
// ❌ Bad: New function every render
function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(null)

  return (
    <DataContext.Provider value={{ data, setData }}>
      {children}
    </DataContext.Provider>
  )
}

// ✅ Good: Memoized value
function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(null)

  const value = useMemo(() => ({ data, setData }), [data])

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}
```

## Context Optimization

### Split Contexts

```typescript
// ❌ Bad: Single context with multiple values
const AppContext = createContext({
  user: null,
  theme: 'light',
  settings: {},
  notifications: [],
})

function App() {
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState('light')
  const [settings, setSettings] = useState({})
  const [notifications, setNotifications] = useState([])

  // Every change rerenders all consumers
  const value = { user, theme, settings, notifications }

  return <AppContext.Provider value={value}>...</AppContext.Provider>
}

// ✅ Good: Separate contexts
const UserContext = createContext(null)
const ThemeContext = createContext('light')
const SettingsContext = createContext({})
const NotificationsContext = createContext([])

function App() {
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState('light')
  const [settings, setSettings] = useState({})
  const [notifications, setNotifications] = useState([])

  return (
    <UserContext.Provider value={user}>
      <ThemeContext.Provider value={theme}>
        <SettingsContext.Provider value={settings}>
          <NotificationsContext.Provider value={notifications}>
            ...
          </NotificationsContext.Provider>
        </SettingsContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  )
}

// Now components only rerender when their context changes
function UserProfile() {
  const user = useContext(UserContext) // Only rerenders on user change
  return <div>{user?.name}</div>
}

function ThemeToggle() {
  const theme = useContext(ThemeContext) // Only rerenders on theme change
  return <button>{theme}</button>
}
```

### Context Selector Pattern

```typescript
// Custom hook for selective context consumption
function createContextSelector<T>() {
  const Context = createContext<T | null>(null)

  function Provider({ value, children }: {
    value: T
    children: ReactNode
  }) {
    const valueRef = useRef(value)
    const [, forceUpdate] = useReducer(x => x + 1, 0)

    useEffect(() => {
      valueRef.current = value
      forceUpdate()
    }, [value])

    return <Context.Provider value={value}>{children}</Context.Provider>
  }

  function useContextSelector<S>(selector: (value: T) => S): S {
    const context = useContext(Context)
    if (!context) throw new Error('useContextSelector must be used within Provider')

    const [selectedValue, setSelectedValue] = useState(() => selector(context))
    const selectorRef = useRef(selector)
    selectorRef.current = selector

    useEffect(() => {
      const newValue = selectorRef.current(context)
      setSelectedValue(prev =>
        Object.is(prev, newValue) ? prev : newValue
      )
    }, [context])

    return selectedValue
  }

  return { Provider, useContextSelector }
}

// Usage
interface AppState {
  user: User | null
  theme: string
  count: number
}

const { Provider, useContextSelector } = createContextSelector<AppState>()

function App() {
  const [state, setState] = useState<AppState>({
    user: null,
    theme: 'light',
    count: 0,
  })

  return (
    <Provider value={state}>
      <UserName /> {/* Only rerenders on user.name change */}
      <ThemeButton /> {/* Only rerenders on theme change */}
    </Provider>
  )
}

function UserName() {
  // Only rerenders when user.name changes
  const userName = useContextSelector(state => state.user?.name)
  return <div>{userName}</div>
}

function ThemeButton() {
  // Only rerenders when theme changes
  const theme = useContextSelector(state => state.theme)
  return <button>{theme}</button>
}
```

## Preventing Prop Drilling

### Component Composition

```typescript
// ❌ Bad: Prop drilling
function App() {
  const user = useUser()

  return <Dashboard user={user} />
}

function Dashboard({ user }: { user: User }) {
  return (
    <div>
      <Sidebar user={user} />
      <Content user={user} />
    </div>
  )
}

function Sidebar({ user }: { user: User }) {
  return <UserMenu user={user} />
}

function UserMenu({ user }: { user: User }) {
  return <UserAvatar user={user} /> // Finally used here
}

// ✅ Good: Composition
function App() {
  const user = useUser()

  return (
    <Dashboard>
      <Sidebar>
        <UserMenu>
          <UserAvatar user={user} />
        </UserMenu>
      </Sidebar>
    </Dashboard>
  )
}

function Dashboard({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}

function Sidebar({ children }: { children: ReactNode }) {
  return <aside>{children}</aside>
}

function UserMenu({ children }: { children: ReactNode }) {
  return <nav>{children}</nav>
}
```

## Batching Updates

### Automatic Batching (React 18+)

```typescript
function Component() {
  const [count, setCount] = useState(0)
  const [flag, setFlag] = useState(false)

  // React 18: Both batched automatically
  const handleClick = () => {
    setCount(c => c + 1)
    setFlag(f => !f)
    // Only 1 rerender
  }

  // Even in async code
  const handleAsync = async () => {
    await fetch('/api/data')
    setCount(c => c + 1)
    setFlag(f => !f)
    // Still batched!
  }

  return <button onClick={handleClick}>Update</button>
}
```

### Manual Batching

```typescript
import { unstable_batchedUpdates } from 'react-dom'

function Component() {
  const [count, setCount] = useState(0)
  const [flag, setFlag] = useState(false)

  const handleUpdate = () => {
    unstable_batchedUpdates(() => {
      setCount(c => c + 1)
      setFlag(f => !f)
      // Guaranteed single rerender
    })
  }

  return <button onClick={handleUpdate}>Update</button>
}
```

## Expensive Component Optimization

### Lazy Mounting

```typescript
function Dashboard() {
  const [showChart, setShowChart] = useState(false)

  return (
    <div>
      <button onClick={() => setShowChart(true)}>
        Show Chart
      </button>
      {showChart && <ExpensiveChart />}
      {/* Only mounts when needed */}
    </div>
  )
}
```

### Progressive Enhancement

```typescript
function DataTable({ data }: { data: Item[] }) {
  const [enhanced, setEnhanced] = useState(false)

  useEffect(() => {
    // Show basic table first, enhance after mount
    const timer = setTimeout(() => setEnhanced(true), 100)
    return () => clearTimeout(timer)
  }, [])

  if (!enhanced) {
    return <SimpleTable data={data.slice(0, 10)} />
  }

  return <EnhancedTable data={data} />
}
```

### Split Expensive Components

```typescript
// ❌ Bad: Monolithic component
function ProductCard({ product }: { product: Product }) {
  // All rerender together
  return (
    <div>
      <ProductImage src={product.image} /> {/* Expensive */}
      <ProductTitle>{product.name}</ProductTitle>
      <ProductPrice>{product.price}</ProductPrice>
      <ProductReviews reviews={product.reviews} /> {/* Expensive */}
      <AddToCartButton productId={product.id} />
    </div>
  )
}

// ✅ Good: Split and memoize
const ProductImage = memo(({ src }: { src: string }) => {
  return <img src={src} loading="lazy" />
})

const ProductReviews = memo(({ reviews }: { reviews: Review[] }) => {
  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  return <div>⭐ {average.toFixed(1)}</div>
})

function ProductCard({ product }: { product: Product }) {
  return (
    <div>
      <ProductImage src={product.image} />
      <ProductTitle>{product.name}</ProductTitle>
      <ProductPrice>{product.price}</ProductPrice>
      <ProductReviews reviews={product.reviews} />
      <AddToCartButton productId={product.id} />
    </div>
  )
}
```

## Debugging Rerenders

### Why Did You Render Hook

```typescript
function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
  const previousProps = useRef<Record<string, any>>()

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props })
      const changes: Record<string, any> = {}

      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changes[key] = {
            from: previousProps.current![key],
            to: props[key],
          }
        }
      })

      if (Object.keys(changes).length > 0) {
        console.log('[why-did-you-update]', name, changes)
      }
    }

    previousProps.current = props
  })
}

function ExpensiveComponent({ data, config, theme }: Props) {
  useWhyDidYouUpdate('ExpensiveComponent', { data, config, theme })

  return <div>...</div>
}

// Console output:
// [why-did-you-update] ExpensiveComponent {
//   config: { from: {...}, to: {...} }
// }
```

### Render Count Tracking

```typescript
function useRenderCount() {
  const renderCount = useRef(0)

  useEffect(() => {
    renderCount.current += 1
  })

  return renderCount.current
}

function Component() {
  const renderCount = useRenderCount()

  return <div>Rendered {renderCount} times</div>
}
```

### Profiler Wrapper

```typescript
function ProfiledComponent({ children, id }: {
  children: ReactNode
  id: string
}) {
  const onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration
  ) => {
    console.log(`${id} ${phase} took ${actualDuration}ms`)
  }

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  )
}

// Usage
<ProfiledComponent id="Dashboard">
  <Dashboard />
</ProfiledComponent>
```

## Real-World Patterns

### List Optimization

```typescript
// ❌ Bad: Entire list rerenders
function TodoList({ todos }: { todos: Todo[] }) {
  const [filter, setFilter] = useState('all')

  return (
    <>
      <FilterSelect value={filter} onChange={setFilter} />
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </>
  )
}

// ✅ Good: Memoize items
const TodoItem = memo(function TodoItem({ todo }: { todo: Todo }) {
  return <div>{todo.title}</div>
})

function TodoList({ todos }: { todos: Todo[] }) {
  const [filter, setFilter] = useState('all')

  return (
    <>
      <FilterSelect value={filter} onChange={setFilter} />
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </>
  )
}
```

### Form Optimization

```typescript
// Split form fields into separate components
function UserForm() {
  return (
    <form>
      <NameField />
      <EmailField />
      <AgeField />
      <AddressFields />
    </form>
  )
}

function NameField() {
  const [name, setName] = useState('')
  return (
    <input
      value={name}
      onChange={e => setName(e.target.value)}
    />
  )
}

function EmailField() {
  const [email, setEmail] = useState('')
  return (
    <input
      type="email"
      value={email}
      onChange={e => setEmail(e.target.value)}
    />
  )
}
```

## Summary

**Key Strategies**:

1. **State Colocation** - Keep state as low as possible
2. **Component Composition** - Use children prop pattern
3. **Context Splitting** - Separate contexts by concern
4. **Memoization** - memo, useMemo, useCallback when needed
5. **Batching** - Automatic in React 18
6. **Code Splitting** - Lazy load expensive components

**Common Causes of Rerenders**:
- State too high in tree
- New object/array/function references
- Context value changes
- Parent rerenders

**Optimization Checklist**:
- [ ] State colocated close to where it's used
- [ ] Context split by update frequency
- [ ] Expensive calculations memoized
- [ ] Child components memoized when parent has state
- [ ] Stable references for callbacks and objects
- [ ] Profiler used to measure impact

**Debugging Tools**:
- React DevTools Profiler
- useWhyDidYouUpdate hook
- Render count tracking
- Chrome Performance tab

**Next**: Lecture 5 covers using Concurrent Features for performance.
