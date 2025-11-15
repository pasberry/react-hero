# Lecture 1: React Profiler Mastery

## Introduction

The React DevTools Profiler is the most powerful tool for diagnosing performance issues in React applications. This lecture covers how to use the Profiler effectively, interpret its data, and identify real performance bottlenecks.

## React Profiler API

### Programmatic Profiling

```typescript
import { Profiler, ProfilerOnRenderCallback } from 'react'

const onRenderCallback: ProfilerOnRenderCallback = (
  id, // Profiler tree id
  phase, // "mount" | "update" | "nested-update"
  actualDuration, // Time spent rendering this update
  baseDuration, // Estimated time to render without memoization
  startTime, // When React began rendering
  commitTime, // When React committed this update
  interactions // Set of interactions being traced
) => {
  // Log or send to analytics
  if (actualDuration > 16) {
    // Slower than 60fps
    console.warn(`Slow render in ${id}:`, {
      phase,
      actualDuration,
      baseDuration,
    })

    // Send to monitoring service
    track('slow-render', {
      component: id,
      duration: actualDuration,
      phase,
    })
  }
}

export function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Dashboard />
    </Profiler>
  )
}
```

### Nested Profilers

```typescript
export function Dashboard() {
  return (
    <Profiler id="Dashboard" onRender={onRenderCallback}>
      <Header />
      <Profiler id="Sidebar" onRender={onRenderCallback}>
        <Sidebar />
      </Profiler>
      <Profiler id="MainContent" onRender={onRenderCallback}>
        <MainContent />
      </Profiler>
    </Profiler>
  )
}
```

**Benefits**:
- Isolate performance issues to specific components
- Track render times in production
- A/B test performance improvements
- Monitor performance regressions

## DevTools Profiler

### Flame Graph Analysis

The flame graph shows component hierarchy and render time:

```
App (15ms)
├── Header (2ms)
├── Sidebar (8ms)
│   ├── Navigation (1ms)
│   └── UserMenu (7ms)  ← BOTTLENECK
│       └── Avatar (6ms) ← Real issue
└── Content (5ms)
```

**Reading the Flame Graph**:
- **Width**: How long the component took to render
- **Color**: Yellow = fast, Orange = medium, Red = slow
- **Height**: Component depth in tree
- **Gray bars**: Components that didn't render

### Ranked Chart

Shows components sorted by render time:

```
1. Avatar (6ms) - 40% of total time
2. UserMenu (7ms) - 46% of total time
3. Sidebar (8ms) - 53% of total time
4. Content (5ms) - 33% of total time
5. Header (2ms) - 13% of total time
```

**Use this to**:
- Quickly identify slowest components
- Prioritize optimization efforts
- Compare before/after optimizations

### Timeline

Shows renders over time:

```
|---Mount---|--Update--|--Update--|--Update--|
0ms        100ms      200ms      300ms     400ms

Commit 1: 15ms (Mount)
Commit 2: 8ms (Update - Sidebar)
Commit 3: 12ms (Update - Content)
Commit 4: 3ms (Update - Header)
```

**Patterns to watch for**:
- **Cascading renders**: One update triggers many more
- **Unnecessary renders**: Components rendering without prop changes
- **Expensive mounts**: Slow initial renders

## Real-World Performance Debugging

### Case Study: Slow List Rendering

**Problem**: List of 1000 items renders slowly

```typescript
// ❌ Problem: Every item rerenders on any change
function TodoList({ todos }: { todos: Todo[] }) {
  const [filter, setFilter] = useState('all')

  return (
    <>
      <FilterBar value={filter} onChange={setFilter} />
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </>
  )
}

function TodoItem({ todo }: { todo: Todo }) {
  console.log('TodoItem render:', todo.id)
  return <div>{todo.title}</div>
}
```

**Profiler shows**: All 1000 TodoItems rerender when filter changes

**Solution 1**: Memoize TodoItem

```typescript
const TodoItem = memo(function TodoItem({ todo }: { todo: Todo }) {
  return <div>{todo.title}</div>
})
```

**Profiler shows**: Only FilterBar rerenders now

**Solution 2**: Split state

```typescript
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <>
      <FilterBarContainer />
      <TodoItems todos={todos} />
    </>
  )
}

function FilterBarContainer() {
  const [filter, setFilter] = useState('all')
  return <FilterBar value={filter} onChange={setFilter} />
}

const TodoItems = memo(function TodoItems({ todos }: { todos: Todo[] }) {
  return (
    <>
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </>
  )
})
```

**Result**: FilterBar state doesn't affect TodoItems

### Case Study: Context Performance

**Problem**: Entire app rerenders on theme change

```typescript
// ❌ Problem: Single context with multiple values
const AppContext = createContext({
  theme: 'light',
  user: null,
  settings: {},
})

function App() {
  const [theme, setTheme] = useState('light')
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState({})

  // Every value change creates new object
  const value = { theme, user, settings }

  return (
    <AppContext.Provider value={value}>
      <Dashboard />
    </AppContext.Provider>
  )
}
```

**Profiler shows**: Changing theme rerenders all components using context

**Solution**: Split contexts

```typescript
const ThemeContext = createContext('light')
const UserContext = createContext(null)
const SettingsContext = createContext({})

function App() {
  const [theme, setTheme] = useState('light')
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState({})

  return (
    <ThemeContext.Provider value={theme}>
      <UserContext.Provider value={user}>
        <SettingsContext.Provider value={settings}>
          <Dashboard />
        </SettingsContext.Provider>
      </UserContext.Provider>
    </ThemeContext.Provider>
  )
}

// Components only rerender when their context changes
function Header() {
  const theme = useContext(ThemeContext) // Only rerenders on theme change
  return <header className={theme}>...</header>
}

function UserProfile() {
  const user = useContext(UserContext) // Only rerenders on user change
  return <div>{user?.name}</div>
}
```

### Case Study: Expensive Calculations

**Problem**: Heavy calculations block rendering

```typescript
function DataTable({ data }: { data: Item[] }) {
  // ❌ Runs on every render
  const processedData = data
    .filter(item => item.active)
    .map(item => ({
      ...item,
      computed: expensiveCalculation(item),
    }))
    .sort((a, b) => b.score - a.score)

  return <Table data={processedData} />
}
```

**Profiler shows**: DataTable takes 200ms per render

**Solution**: useMemo

```typescript
function DataTable({ data }: { data: Item[] }) {
  const processedData = useMemo(() => {
    return data
      .filter(item => item.active)
      .map(item => ({
        ...item,
        computed: expensiveCalculation(item),
      }))
      .sort((a, b) => b.score - a.score)
  }, [data])

  return <Table data={processedData} />
}
```

**Profiler shows**: DataTable now renders in <5ms

## Production Performance Monitoring

### Custom Performance Tracking

```typescript
// lib/performance.ts
interface PerformanceMetric {
  component: string
  phase: 'mount' | 'update'
  duration: number
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private threshold = 16 // 60fps

  onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
    const metric: PerformanceMetric = {
      component: id,
      phase,
      duration: actualDuration,
      timestamp: Date.now(),
    }

    this.metrics.push(metric)

    // Alert on slow renders
    if (actualDuration > this.threshold) {
      this.reportSlowRender(metric)
    }

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift()
    }
  }

  private reportSlowRender(metric: PerformanceMetric) {
    // Send to analytics
    track('performance:slow-render', {
      component: metric.component,
      phase: metric.phase,
      duration: metric.duration,
      url: window.location.pathname,
    })

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Slow render detected:', metric)
    }
  }

  getAverageDuration(componentId: string): number {
    const componentMetrics = this.metrics.filter(m => m.component === componentId)
    if (componentMetrics.length === 0) return 0

    const total = componentMetrics.reduce((sum, m) => sum + m.duration, 0)
    return total / componentMetrics.length
  }

  getSlowestComponents(limit = 10): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }
}

export const performanceMonitor = new PerformanceMonitor()
```

### Usage in App

```typescript
import { performanceMonitor } from '@/lib/performance'

export function App() {
  return (
    <Profiler id="App" onRender={performanceMonitor.onRender}>
      <Router />
    </Profiler>
  )
}

// View performance dashboard
function PerformanceDashboard() {
  const slowest = performanceMonitor.getSlowestComponents()

  return (
    <div>
      <h2>Slowest Components</h2>
      {slowest.map((metric, i) => (
        <div key={i}>
          {metric.component}: {metric.duration.toFixed(2)}ms
        </div>
      ))}
    </div>
  )
}
```

## Performance Budgets

### Setting Component Budgets

```typescript
// performance.config.ts
export const PERFORMANCE_BUDGETS = {
  'App': 50, // 50ms max
  'Dashboard': 30,
  'DataTable': 20,
  'Chart': 15,
  'ListItem': 5,
} as const

// lib/performance.ts
export class PerformanceMonitor {
  onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
    const budget = PERFORMANCE_BUDGETS[id as keyof typeof PERFORMANCE_BUDGETS]

    if (budget && actualDuration > budget) {
      this.reportBudgetExceeded({
        component: id,
        budget,
        actual: actualDuration,
        overage: actualDuration - budget,
      })
    }
  }

  private reportBudgetExceeded(data: {
    component: string
    budget: number
    actual: number
    overage: number
  }) {
    console.error(`Performance budget exceeded for ${data.component}`, {
      budget: `${data.budget}ms`,
      actual: `${data.actual.toFixed(2)}ms`,
      overage: `+${data.overage.toFixed(2)}ms`,
    })

    // Send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      track('performance:budget-exceeded', data)
    }
  }
}
```

## Advanced Profiling Techniques

### Interaction Tracking

```typescript
import { unstable_trace as trace } from 'scheduler/tracing'

function SearchBox() {
  const [query, setQuery] = useState('')

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    trace('search-input', performance.now(), () => {
      setQuery(value)
    })
  }

  return <input value={query} onChange={handleSearch} />
}
```

**Profiler shows**: Which updates were caused by this interaction

### Component Render Counts

```typescript
function useRenderCount(componentName: string) {
  const renderCount = useRef(0)

  useEffect(() => {
    renderCount.current += 1
    console.log(`${componentName} rendered ${renderCount.current} times`)
  })

  return renderCount.current
}

function ExpensiveComponent() {
  const renderCount = useRenderCount('ExpensiveComponent')

  return <div>Renders: {renderCount}</div>
}
```

### Why Did You Render

```typescript
function useWhyDidYouUpdate(name: string, props: any) {
  const previousProps = useRef<any>()

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props })
      const changedProps: any = {}

      allKeys.forEach(key => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          }
        }
      })

      if (Object.keys(changedProps).length > 0) {
        console.log('[why-did-you-update]', name, changedProps)
      }
    }

    previousProps.current = props
  })
}

function UserProfile({ user, settings, theme }: Props) {
  useWhyDidYouUpdate('UserProfile', { user, settings, theme })

  return <div>...</div>
}
```

## Profiler Best Practices

### When to Profile

1. **During development**: Regular profiling catches issues early
2. **Before production**: Profile with production build
3. **After refactoring**: Verify performance didn't regress
4. **With real data**: Use production-like data volumes
5. **On slower devices**: Test on low-end hardware

### What to Measure

```typescript
// ✅ Good: Measure real user interactions
test('Search performance', async () => {
  const start = performance.now()

  render(<SearchPage />)

  const input = screen.getByRole('searchbox')
  await userEvent.type(input, 'react performance')

  const duration = performance.now() - start

  expect(duration).toBeLessThan(100) // Should be fast
})
```

### Setting Realistic Goals

- **UI Updates**: < 16ms (60fps)
- **Search Input**: < 50ms
- **Page Load**: < 1000ms
- **Data Fetch**: < 2000ms
- **Heavy Calculation**: < 100ms

## Summary

**Key Profiling Techniques**:

1. **Profiler API** - Programmatic performance tracking
2. **Flame Graph** - Visual component hierarchy analysis
3. **Ranked Chart** - Identify slowest components
4. **Timeline** - Understand render patterns over time
5. **Performance Budgets** - Enforce performance standards
6. **Production Monitoring** - Track real user performance

**Common Issues Found**:
- Unnecessary rerenders (use memo, useMemo, useCallback)
- Context overuse (split contexts)
- Expensive calculations (use useMemo)
- Large lists (use virtualization)
- Poor component structure (lift state, composition)

**Tools**:
- React DevTools Profiler
- Chrome Performance Tab
- Lighthouse
- Web Vitals
- Custom performance monitoring

**Next**: Lecture 2 covers memoization patterns in depth.
