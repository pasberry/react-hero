# Lecture 5: Concurrent Features for Performance

## Introduction

React 18's Concurrent Features (useTransition, useDeferredValue, Suspense) provide fine-grained control over rendering priority. This lecture covers how to use these features to keep your UI responsive during expensive updates.

## useTransition

### Basic Usage

```typescript
import { useState, useTransition } from 'react'

function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [isPending, startTransition] = useTransition()

  const handleSearch = (value: string) => {
    setQuery(value) // Urgent: Update input immediately

    startTransition(() => {
      // Non-urgent: Update results can be interrupted
      const filtered = expensiveSearch(value)
      setResults(filtered)
    })
  }

  return (
    <>
      <input
        value={query}
        onChange={e => handleSearch(e.target.value)}
      />
      {isPending && <div>Searching...</div>}
      <ResultsList results={results} />
    </>
  )
}
```

**Without useTransition**:
```
User types → UI freezes → Results update → UI responsive
                (blocked for 500ms)
```

**With useTransition**:
```
User types → Input updates immediately → Results update in background
             (UI stays responsive)
```

### Real-World Example: Tab Switching

```typescript
function TabContainer() {
  const [activeTab, setActiveTab] = useState('posts')
  const [isPending, startTransition] = useTransition()

  const handleTabChange = (tab: string) => {
    startTransition(() => {
      setActiveTab(tab)
    })
  }

  return (
    <>
      <TabBar
        active={activeTab}
        onChange={handleTabChange}
        pending={isPending}
      />
      {activeTab === 'posts' && <Posts />}
      {activeTab === 'comments' && <Comments />}
      {activeTab === 'profile' && <Profile />}
    </>
  )
}

// Tab button shows pending state
function TabButton({ active, pending, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={active ? 'active' : ''}
      style={{ opacity: pending ? 0.7 : 1 }}
    >
      {children}
      {pending && <Spinner />}
    </button>
  )
}
```

### Complex Search with Highlighting

```typescript
function CodeSearch() {
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isPending, startTransition] = useTransition()

  const handleSearch = (value: string) => {
    setQuery(value) // Urgent: input value

    startTransition(() => {
      // Non-urgent: search and highlight
      const results = searchFiles(value)
      const highlighted = results.map(file => ({
        ...file,
        content: highlightMatches(file.content, value),
      }))
      setFiles(highlighted)
    })
  }

  return (
    <>
      <SearchInput
        value={query}
        onChange={handleSearch}
        pending={isPending}
      />
      <FileList files={files} />
    </>
  )
}

function highlightMatches(text: string, query: string): string {
  // Expensive: highlight all matches with regex
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}
```

## useDeferredValue

### Basic Usage

```typescript
import { useState, useDeferredValue, memo } from 'react'

function SearchResults() {
  const [query, setQuery] = useState('')

  // Deferred value updates with lower priority
  const deferredQuery = useDeferredValue(query)

  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <Results query={deferredQuery} />
    </>
  )
}

const Results = memo(function Results({ query }: { query: string }) {
  const results = useMemo(() => {
    // Expensive search
    return searchDatabase(query)
  }, [query])

  return (
    <ul>
      {results.map(result => (
        <li key={result.id}>{result.title}</li>
      ))}
    </ul>
  )
})
```

**Timeline**:
```
User types 'r'
  → query = 'r' (immediate)
  → deferredQuery = '' (still old value)
  → React renders input
  → When idle, deferredQuery = 'r'
  → Results render with 'r'

User types 'e' (before deferredQuery updated)
  → query = 're' (immediate)
  → deferredQuery = '' (still old)
  → Input renders with 're'
  → Previous update ('r') cancelled
  → When idle, deferredQuery = 're'
  → Results render with 're' (only once!)
```

### Throttling Expensive Renders

```typescript
function Graph({ data }: { data: DataPoint[] }) {
  const [zoomLevel, setZoomLevel] = useState(1)
  const deferredZoom = useDeferredValue(zoomLevel)

  // Slider updates immediately
  // Graph updates when browser is idle
  return (
    <>
      <input
        type="range"
        value={zoomLevel}
        onChange={e => setZoomLevel(Number(e.target.value))}
        min={0.5}
        max={3}
        step={0.1}
      />
      <ExpensiveGraph data={data} zoom={deferredZoom} />
    </>
  )
}

const ExpensiveGraph = memo(function ExpensiveGraph({
  data,
  zoom
}: {
  data: DataPoint[]
  zoom: number
}) {
  // Expensive: Recalculate all points
  const scaledData = useMemo(() => {
    return data.map(point => ({
      x: point.x * zoom,
      y: point.y * zoom,
    }))
  }, [data, zoom])

  return <svg>{/* Render graph */}</svg>
})
```

### Showing Stale Content

```typescript
function Feed({ category }: { category: string }) {
  const deferredCategory = useDeferredValue(category)

  const isStale = category !== deferredCategory

  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      <Posts category={deferredCategory} />
    </div>
  )
}
```

## useTransition vs useDeferredValue

### When to Use Each

```typescript
// ✅ useTransition: When you control the state update
function Component() {
  const [state, setState] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleUpdate = (value: string) => {
    startTransition(() => {
      setState(value) // You control this
    })
  }

  return <input onChange={e => handleUpdate(e.target.value)} />
}

// ✅ useDeferredValue: When you receive the value as a prop
function Component({ value }: { value: string }) {
  const deferredValue = useDeferredValue(value)

  // You don't control when value changes
  return <ExpensiveComponent value={deferredValue} />
}
```

### Combined Usage

```typescript
function FilterableList({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState('')
  const [isPending, startTransition] = useTransition()
  const deferredFilter = useDeferredValue(filter)

  const handleFilterChange = (value: string) => {
    setFilter(value) // Immediate

    startTransition(() => {
      // Trigger expensive computation
      triggerFilterUpdate()
    })
  }

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(deferredFilter.toLowerCase())
    )
  }, [items, deferredFilter])

  return (
    <>
      <input
        value={filter}
        onChange={e => handleFilterChange(e.target.value)}
      />
      {isPending && <div>Filtering...</div>}
      <List items={filteredItems} />
    </>
  )
}
```

## Suspense for Performance

### Code Splitting

```typescript
import { lazy, Suspense } from 'react'

// Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'))
const HeavyMap = lazy(() => import('./HeavyMap'))
const HeavyEditor = lazy(() => import('./HeavyEditor'))

function Dashboard() {
  return (
    <div>
      <Header /> {/* Loads immediately */}

      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart /> {/* Loads on demand */}
      </Suspense>

      <Suspense fallback={<MapSkeleton />}>
        <HeavyMap />
      </Suspense>

      <Suspense fallback={<EditorSkeleton />}>
        <HeavyEditor />
      </Suspense>
    </div>
  )
}
```

### Preloading

```typescript
const HeavyChart = lazy(() => import('./HeavyChart'))

function Dashboard() {
  const preloadChart = () => {
    // Start loading before needed
    import('./HeavyChart')
  }

  return (
    <div>
      <button
        onMouseEnter={preloadChart} // Preload on hover
        onClick={() => setShowChart(true)}
      >
        Show Chart
      </button>

      {showChart && (
        <Suspense fallback={<Skeleton />}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  )
}
```

### Named Suspense Boundaries

```typescript
function Page() {
  return (
    <>
      <Header />

      {/* Critical content - high priority */}
      <Suspense fallback={<ContentSkeleton />}>
        <MainContent />
      </Suspense>

      {/* Secondary content - lower priority */}
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>

      {/* Tertiary content - lowest priority */}
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments />
      </Suspense>

      <Footer />
    </>
  )
}
```

## Advanced Patterns

### Debounced Transitions

```typescript
function useDebounceTransition(delay: number) {
  const [isPending, startTransition] = useTransition()
  const timeoutRef = useRef<NodeJS.Timeout>()

  const debouncedTransition = useCallback(
    (callback: () => void) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        startTransition(callback)
      }, delay)
    },
    [delay, startTransition]
  )

  return [isPending, debouncedTransition] as const
}

function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [isPending, debouncedTransition] = useDebounceTransition(300)

  const handleSearch = (value: string) => {
    setQuery(value)

    debouncedTransition(() => {
      setResults(searchDatabase(value))
    })
  }

  return <>{/* ... */}</>
}
```

### Progressive Enhancement

```typescript
function DataTable({ data }: { data: Item[] }) {
  const [showAll, setShowAll] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleShowAll = () => {
    startTransition(() => {
      setShowAll(true)
    })
  }

  const displayData = showAll ? data : data.slice(0, 100)

  return (
    <>
      <table>
        {displayData.map(item => (
          <TableRow key={item.id} data={item} />
        ))}
      </table>

      {!showAll && (
        <button onClick={handleShowAll} disabled={isPending}>
          {isPending ? 'Loading...' : `Show all ${data.length} items`}
        </button>
      )}
    </>
  )
}
```

### Optimistic Updates with Transitions

```typescript
function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [isPending, startTransition] = useTransition()

  const addTodo = async (text: string) => {
    const tempId = `temp-${Date.now()}`

    // Optimistic update
    setTodos(prev => [...prev, { id: tempId, text, completed: false }])

    startTransition(async () => {
      try {
        // Real API call
        const newTodo = await api.createTodo(text)

        // Replace temp with real
        setTodos(prev =>
          prev.map(todo => (todo.id === tempId ? newTodo : todo))
        )
      } catch (error) {
        // Rollback on error
        setTodos(prev => prev.filter(todo => todo.id !== tempId))
      }
    })
  }

  return <>{/* ... */}</>
}
```

## Performance Measurement

### Measuring Transition Time

```typescript
function useTransitionTiming() {
  const [isPending, startTransition] = useTransition()
  const startTimeRef = useRef<number>()

  const timedTransition = useCallback(
    (callback: () => void) => {
      startTimeRef.current = performance.now()

      startTransition(() => {
        callback()

        // Measure after update
        requestIdleCallback(() => {
          if (startTimeRef.current) {
            const duration = performance.now() - startTimeRef.current
            console.log('Transition completed in', duration, 'ms')

            // Send to analytics
            track('transition-time', { duration })
          }
        })
      })
    },
    [startTransition]
  )

  return [isPending, timedTransition] as const
}
```

### Comparing Before/After

```typescript
function PerformanceTest() {
  const [mode, setMode] = useState<'normal' | 'transition'>('normal')
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')

  const handleSearch = (value: string) => {
    const start = performance.now()

    if (mode === 'transition') {
      setQuery(value)
      startTransition(() => {
        // Expensive update
        processSearch(value)
      })
    } else {
      setQuery(value)
      processSearch(value)
    }

    requestIdleCallback(() => {
      console.log(`${mode} mode took`, performance.now() - start, 'ms')
    })
  }

  return (
    <>
      <button onClick={() => setMode(m => m === 'normal' ? 'transition' : 'normal')}>
        Mode: {mode}
      </button>
      <input onChange={e => handleSearch(e.target.value)} />
    </>
  )
}
```

## Real-World Use Cases

### Autocomplete

```typescript
function Autocomplete() {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const deferredInput = useDeferredValue(input)

  useEffect(() => {
    if (deferredInput) {
      // Expensive: Search through large dataset
      const results = searchSuggestions(deferredInput)
      setSuggestions(results)
    } else {
      setSuggestions([])
    }
  }, [deferredInput])

  const isStale = input !== deferredInput

  return (
    <>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Search..."
      />
      <div style={{ opacity: isStale ? 0.6 : 1 }}>
        {suggestions.map(suggestion => (
          <div key={suggestion}>{suggestion}</div>
        ))}
      </div>
    </>
  )
}
```

### Data Table Sorting

```typescript
function DataTable({ data }: { data: Row[] }) {
  const [sortBy, setSortBy] = useState<string>('name')
  const deferredSortBy = useDeferredValue(sortBy)

  const sortedData = useMemo(() => {
    // Expensive: Sort 10,000 rows
    return [...data].sort((a, b) => {
      const aVal = a[deferredSortBy]
      const bVal = b[deferredSortBy]
      return aVal > bVal ? 1 : -1
    })
  }, [data, deferredSortBy])

  const isStale = sortBy !== deferredSortBy

  return (
    <>
      <SortControls value={sortBy} onChange={setSortBy} />
      <table style={{ opacity: isStale ? 0.7 : 1 }}>
        {sortedData.map(row => (
          <TableRow key={row.id} data={row} />
        ))}
      </table>
    </>
  )
}
```

### Image Gallery

```typescript
function ImageGallery({ images }: { images: Image[] }) {
  const [filter, setFilter] = useState('all')
  const [isPending, startTransition] = useTransition()

  const filteredImages = useMemo(() => {
    if (filter === 'all') return images

    // Expensive: Process and filter 1000 images
    return images.filter(img => img.category === filter)
  }, [images, filter])

  const handleFilterChange = (newFilter: string) => {
    startTransition(() => {
      setFilter(newFilter)
    })
  }

  return (
    <>
      <FilterBar
        value={filter}
        onChange={handleFilterChange}
        pending={isPending}
      />
      <div style={{ opacity: isPending ? 0.7 : 1 }}>
        {filteredImages.map(img => (
          <ImageCard key={img.id} image={img} />
        ))}
      </div>
    </>
  )
}
```

## Best Practices

### Do's

```typescript
// ✅ Use for expensive updates
startTransition(() => {
  setExpensiveState(computeExpensiveValue())
})

// ✅ Keep urgent updates immediate
setInputValue(e.target.value) // Don't wrap in transition

// ✅ Show pending states
{isPending && <Spinner />}

// ✅ Use with memo for best results
const Results = memo(function Results({ query }) {
  return <ExpensiveList query={query} />
})
```

### Don'ts

```typescript
// ❌ Don't wrap everything in transitions
startTransition(() => {
  setCount(count + 1) // Unnecessary for simple updates
})

// ❌ Don't expect synchronous behavior
startTransition(() => {
  setState(newValue)
  console.log(state) // Still old value!
})

// ❌ Don't use for I/O
startTransition(async () => {
  await fetchData() // Not for async operations
  setState(data)
})
```

## Summary

**Concurrent Features**:

1. **useTransition** - Mark updates as non-urgent
   - Returns `[isPending, startTransition]`
   - Use when you control the state update
   - Shows pending state

2. **useDeferredValue** - Defer updating a value
   - Returns deferred version of value
   - Use when value comes from props
   - Automatically throttles updates

3. **Suspense** - Show fallback while loading
   - Works with lazy() for code splitting
   - Works with data fetching libraries
   - Enables progressive rendering

**Performance Impact**:
- Keeps UI responsive during heavy updates
- Prevents frame drops
- Maintains 60fps during interactions
- Better perceived performance

**Key Principles**:
- Urgent updates first (user input)
- Defer expensive updates (search results)
- Show loading states
- Measure the difference

**When to Use**:
- Large lists filtering/sorting
- Complex search/autocomplete
- Tab switching with heavy content
- Real-time data visualization
- Any update that blocks the UI

**Module 5 Complete!** You now have a comprehensive understanding of React performance optimization, from profiling to virtualization to concurrent rendering.
