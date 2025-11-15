# Lecture 2: Memoization Deep Dive

## Introduction

Memoization is React's primary optimization technique for preventing unnecessary work. This lecture covers when and how to use React.memo, useMemo, and useCallback effectively, and more importantly, when NOT to use them.

## React.memo

### Basic Memoization

```typescript
// Without memo: Rerenders every time parent updates
function ExpensiveComponent({ data }: { data: string }) {
  console.log('ExpensiveComponent render')
  return <div>{data}</div>
}

// With memo: Only rerenders when props change
const MemoizedComponent = memo(function ExpensiveComponent({
  data
}: {
  data: string
}) {
  console.log('MemoizedComponent render')
  return <div>{data}</div>
})

function Parent() {
  const [count, setCount] = useState(0)
  const [data] = useState('static data')

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <MemoizedComponent data={data} />
      {/* Only rerenders when data changes, not when count changes */}
    </>
  )
}
```

### Custom Comparison Function

```typescript
interface User {
  id: string
  name: string
  email: string
  lastLogin: Date
}

// ❌ Problem: Rerenders even when only lastLogin changes
const UserCard = memo(function UserCard({ user }: { user: User }) {
  return (
    <div>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  )
})

// ✅ Solution: Custom comparison
const UserCard = memo(
  function UserCard({ user }: { user: User }) {
    return (
      <div>
        <h3>{user.name}</h3>
        <p>{user.email}</p>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip rerender)
    return (
      prevProps.user.id === nextProps.user.id &&
      prevProps.user.name === nextProps.user.name &&
      prevProps.user.email === nextProps.user.email
      // Ignore lastLogin changes
    )
  }
)
```

### When memo Doesn't Help

```typescript
// ❌ Problem: memo is useless here
const BadExample = memo(function BadExample() {
  const [count, setCount] = useState(0)

  // Component has its own state - will rerender anyway
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
})

// ❌ Problem: New object reference every time
function Parent() {
  const data = { value: 'hello' } // New object every render

  return <MemoizedChild data={data} />
  // memo doesn't help - data reference changes every time
}

// ✅ Solution: Stable reference
function Parent() {
  const data = useMemo(() => ({ value: 'hello' }), [])

  return <MemoizedChild data={data} />
}
```

## useMemo

### Expensive Calculations

```typescript
function DataTable({ items }: { items: Item[] }) {
  // ❌ Without useMemo: Recalculates every render
  const sortedAndFiltered = items
    .filter(item => item.active)
    .sort((a, b) => b.score - a.score)
    .slice(0, 100)

  // ✅ With useMemo: Only recalculates when items change
  const sortedAndFiltered = useMemo(() => {
    return items
      .filter(item => item.active)
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
  }, [items])

  return <Table data={sortedAndFiltered} />
}
```

### Reference Equality for Props

```typescript
function SearchResults({ query }: { query: string }) {
  // ❌ New array every render, even if query unchanged
  const filters = [
    { type: 'date', value: 'recent' },
    { type: 'relevance', value: 'high' },
  ]

  // ✅ Stable reference
  const filters = useMemo(
    () => [
      { type: 'date', value: 'recent' },
      { type: 'relevance', value: 'high' },
    ],
    []
  )

  // This child only rerenders when filters actually change
  return <FilteredList query={query} filters={filters} />
}
```

### Complex Derived State

```typescript
interface Transaction {
  id: string
  amount: number
  category: string
  date: Date
}

function FinancialDashboard({ transactions }: { transactions: Transaction[] }) {
  const analytics = useMemo(() => {
    const byCategory = transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)

    const total = transactions.reduce((sum, t) => sum + t.amount, 0)

    const avgPerDay = (() => {
      const days = new Set(transactions.map(t => t.date.toDateString())).size
      return total / days
    })()

    const topCategory = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)[0]

    return {
      byCategory,
      total,
      avgPerDay,
      topCategory,
    }
  }, [transactions])

  return (
    <div>
      <StatCard label="Total" value={analytics.total} />
      <StatCard label="Avg/Day" value={analytics.avgPerDay} />
      <CategoryChart data={analytics.byCategory} />
    </div>
  )
}
```

### When NOT to Use useMemo

```typescript
// ❌ Useless: Calculation is trivial
const doubled = useMemo(() => count * 2, [count])

// ✅ Just compute it
const doubled = count * 2

// ❌ Useless: Dependencies change every render anyway
const [user, setUser] = useState({ name: 'John', age: 30 })

const greeting = useMemo(
  () => `Hello, ${user.name}!`,
  [user] // User object changes every time
)

// ✅ Just compute it or fix the real problem (stabilize user)
const greeting = `Hello, ${user.name}!`
```

## useCallback

### Preventing Child Rerenders

```typescript
function Parent() {
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<string[]>([])

  // ❌ Without useCallback: New function every render
  const handleAddItem = (item: string) => {
    setItems(prev => [...prev, item])
  }

  // ✅ With useCallback: Stable function reference
  const handleAddItem = useCallback((item: string) => {
    setItems(prev => [...prev, item])
  }, [])

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <MemoizedForm onSubmit={handleAddItem} />
      {/* Form doesn't rerender when count changes */}
    </>
  )
}

const MemoizedForm = memo(function Form({
  onSubmit
}: {
  onSubmit: (item: string) => void
}) {
  console.log('Form render')
  const [value, setValue] = useState('')

  return (
    <form onSubmit={() => onSubmit(value)}>
      <input value={value} onChange={e => setValue(e.target.value)} />
      <button>Add</button>
    </form>
  )
})
```

### With useEffect Dependencies

```typescript
function DataFetcher({ userId }: { userId: string }) {
  const [data, setData] = useState(null)

  // ❌ Without useCallback: Effect runs every render
  const fetchData = async () => {
    const response = await fetch(`/api/users/${userId}`)
    setData(await response.json())
  }

  useEffect(() => {
    fetchData()
  }, [fetchData]) // fetchData changes every render!

  // ✅ With useCallback: Effect only runs when userId changes
  const fetchData = useCallback(async () => {
    const response = await fetch(`/api/users/${userId}`)
    setData(await response.json())
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return <div>{/* render data */}</div>
}
```

### Event Handlers with Stable Identity

```typescript
function InfiniteScroll({ onLoadMore }: { onLoadMore: () => void }) {
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        onLoadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [onLoadMore]) // Needs stable reference

  return <div>...</div>
}

function Parent() {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Item[]>([])

  const loadMore = useCallback(() => {
    setPage(p => p + 1)
  }, [])

  return <InfiniteScroll onLoadMore={loadMore} />
}
```

## Advanced Memoization Patterns

### Memoization with Multiple Dependencies

```typescript
function ProductFilter({
  products,
  category,
  priceRange,
  searchQuery,
}: {
  products: Product[]
  category: string
  priceRange: [number, number]
  searchQuery: string
}) {
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.category === category)
      .filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [products, category, priceRange, searchQuery])

  return <ProductList products={filteredProducts} />
}
```

### Partial Memoization

```typescript
function Dashboard({ data }: { data: RawData }) {
  // Memoize intermediate steps separately
  const processed = useMemo(() => {
    return processData(data) // Expensive
  }, [data])

  const filtered = useMemo(() => {
    return filterData(processed) // Depends on processed
  }, [processed])

  const sorted = useMemo(() => {
    return sortData(filtered) // Depends on filtered
  }, [filtered])

  return <Chart data={sorted} />
}
```

### Factory Functions with useCallback

```typescript
function useEventHandler() {
  const [state, setState] = useState(0)

  // ❌ Creates new function every time called
  const makeHandler = (id: string) => {
    return () => setState(prev => prev + 1)
  }

  // ✅ Memoized factory
  const makeHandler = useCallback((id: string) => {
    return () => setState(prev => prev + 1)
  }, [])

  return makeHandler
}
```

### Memoized Context Value

```typescript
// ❌ Problem: Context value changes every render
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('light')

  const value = { theme, setTheme } // New object every render!

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// ✅ Solution: Memoize context value
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('light')

  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
```

## Memoization with TypeScript

### Generic Memoized Components

```typescript
interface ListProps<T> {
  items: T[]
  renderItem: (item: T) => ReactNode
  keyExtractor: (item: T) => string
}

function ListInner<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <>
      {items.map(item => (
        <div key={keyExtractor(item)}>{renderItem(item)}</div>
      ))}
    </>
  )
}

// Preserve generics with memo
export const List = memo(ListInner) as typeof ListInner
```

### Typed Comparison Functions

```typescript
type MemoProps<T> = {
  data: T
  onUpdate: (data: T) => void
}

const areEqual = <T,>(
  prevProps: Readonly<MemoProps<T>>,
  nextProps: Readonly<MemoProps<T>>
): boolean => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.onUpdate === nextProps.onUpdate
  )
}

const MemoizedComponent = memo(
  function Component<T>({ data, onUpdate }: MemoProps<T>) {
    return <div>{/* render */}</div>
  },
  areEqual
) as <T>(props: MemoProps<T>) => JSX.Element
```

## Performance Measurement

### Measuring Memoization Impact

```typescript
function ExpensiveList({ items }: { items: Item[] }) {
  const startTime = performance.now()

  const processed = useMemo(() => {
    const memoStart = performance.now()
    const result = expensiveProcessing(items)
    console.log('Memo calculation:', performance.now() - memoStart, 'ms')
    return result
  }, [items])

  console.log('Total render:', performance.now() - startTime, 'ms')

  return <List data={processed} />
}
```

### A/B Testing Memoization

```typescript
function useABMemoization<T>(
  factory: () => T,
  deps: DependencyList,
  variant: 'control' | 'memoized'
): T {
  if (variant === 'memoized') {
    return useMemo(factory, deps)
  }

  return factory()
}

function Component() {
  const variant = useABTest('memoization-test')

  const data = useABMemoization(
    () => expensiveCalculation(),
    [],
    variant
  )

  return <div>{/* render */}</div>
}
```

## Common Memoization Pitfalls

### Pitfall 1: Premature Optimization

```typescript
// ❌ Don't memoize everything
function Counter() {
  const [count, setCount] = useState(0)

  const increment = useCallback(() => {
    setCount(c => c + 1)
  }, []) // Useless - no child depends on this

  const doubled = useMemo(() => count * 2, [count]) // Useless - trivial

  return <button onClick={increment}>{doubled}</button>
}

// ✅ Only memoize when profiling shows it helps
function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(c => c + 1)}>{count * 2}</button>
  )
}
```

### Pitfall 2: Stale Closures

```typescript
function Component() {
  const [count, setCount] = useState(0)

  // ❌ Callback always uses initial count value
  const handleClick = useCallback(() => {
    console.log(count) // Stale!
  }, []) // Missing dependency

  // ✅ Include all dependencies
  const handleClick = useCallback(() => {
    console.log(count)
  }, [count])

  // ✅ Or use functional update
  const increment = useCallback(() => {
    setCount(c => c + 1) // No dependency on count needed
  }, [])

  return <button onClick={handleClick}>Log: {count}</button>
}
```

### Pitfall 3: Memoizing What Shouldn't Be

```typescript
// ❌ Memoizing components that change frequently
const AlwaysChanging = memo(function AlwaysChanging({
  timestamp
}: {
  timestamp: number
}) {
  // timestamp changes every second - memo is useless
  return <div>{timestamp}</div>
})

// ✅ Don't memoize - it changes all the time anyway
function AlwaysChanging({ timestamp }: { timestamp: number }) {
  return <div>{timestamp}</div>
}
```

## Memoization Strategies by Use Case

### Large Lists

```typescript
// Individual items memoized
const ListItem = memo(function ListItem({ item }: { item: Item }) {
  return <div>{item.name}</div>
})

function List({ items }: { items: Item[] }) {
  return (
    <>
      {items.map(item => (
        <ListItem key={item.id} item={item} />
      ))}
    </>
  )
}
```

### Forms

```typescript
function Form() {
  const [formData, setFormData] = useState({ name: '', email: '' })

  // Memoize field update handlers
  const handleNameChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, name: value }))
  }, [])

  const handleEmailChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, email: value }))
  }, [])

  return (
    <>
      <MemoizedInput value={formData.name} onChange={handleNameChange} />
      <MemoizedInput value={formData.email} onChange={handleEmailChange} />
    </>
  )
}
```

### Data Visualization

```typescript
function Chart({ data }: { data: DataPoint[] }) {
  // Memoize expensive transformations
  const chartData = useMemo(() => {
    return data.map(point => ({
      x: scaleX(point.x),
      y: scaleY(point.y),
      color: getColor(point.value),
    }))
  }, [data])

  const axisConfig = useMemo(() => {
    return {
      xAxis: calculateXAxis(data),
      yAxis: calculateYAxis(data),
    }
  }, [data])

  return <SVGChart data={chartData} axes={axisConfig} />
}
```

## Summary

**When to Use Memoization**:
1. **memo**: Prevent rerenders of expensive child components
2. **useMemo**: Cache expensive calculations
3. **useCallback**: Stabilize function references for memoized children or effects

**When NOT to Use**:
1. Cheap calculations (< 1ms)
2. Components that always rerender anyway
3. No child components depend on reference equality
4. Would make code harder to read for no benefit

**Best Practices**:
- Profile first, optimize second
- Start without memoization, add when needed
- Include all dependencies
- Watch for stale closures
- Measure the impact
- Don't over-optimize

**Key Insight**: Memoization itself has a cost. Only use it when the benefit (prevented work) exceeds the cost (comparison + memory).

**Next**: Lecture 3 covers virtualization for rendering large lists efficiently.
