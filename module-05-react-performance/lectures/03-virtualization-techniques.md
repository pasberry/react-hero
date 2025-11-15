# Lecture 3: Virtualization Techniques

## Introduction

Rendering large lists in React can cause severe performance problems. Virtualization (also called "windowing") solves this by only rendering items visible in the viewport. This lecture covers how virtualization works, how to implement it, and how libraries like react-window work internally.

## The Problem with Large Lists

### Performance Impact

```typescript
// ❌ Problem: Rendering 10,000 items
function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="message-list">
      {messages.map(message => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  )
}
```

**Issues**:
- 10,000 DOM nodes created
- 10,000 React components mounted
- Initial render: 2-3 seconds
- Memory usage: 100+ MB
- Scrolling: Janky, drops frames
- Search indexing: Browser struggles

### Measurement

```typescript
function SlowList() {
  const start = performance.now()

  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    text: `Item ${i}`,
  }))

  useEffect(() => {
    console.log('Mount time:', performance.now() - start, 'ms')
  }, [])

  return (
    <>
      {items.map(item => (
        <div key={item.id}>{item.text}</div>
      ))}
    </>
  )
}

// Console: Mount time: 2847ms
```

## Virtualization Fundamentals

### Core Concept

Only render items currently visible in the viewport:

```
Total Items: 10,000
Viewport Height: 600px
Item Height: 50px
Visible Items: 600 / 50 = 12 items

Render: 12 items + buffer (maybe 20 total)
Not render: 9,980 items
```

**Performance**:
- Initial render: <50ms (vs 2847ms)
- Memory: ~2MB (vs 100MB)
- Smooth 60fps scrolling

### Basic Implementation

```typescript
function VirtualList({ items, height, itemHeight }: {
  items: any[]
  height: number
  itemHeight: number
}) {
  const [scrollTop, setScrollTop] = useState(0)

  // Calculate visible range
  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.ceil((scrollTop + height) / itemHeight)

  // Get visible items with buffer
  const visibleItems = items.slice(
    Math.max(0, startIndex - 5), // 5 item buffer above
    Math.min(items.length, endIndex + 5) // 5 item buffer below
  )

  // Total height to enable scrolling
  const totalHeight = items.length * itemHeight

  return (
    <div
      style={{ height, overflow: 'auto' }}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = startIndex - 5 + i
          return (
            <div
              key={items[index].id}
              style={{
                position: 'absolute',
                top: index * itemHeight,
                height: itemHeight,
                left: 0,
                right: 0,
              }}
            >
              {items[index].text}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

## Advanced Virtual List Implementation

### Variable Height Items

```typescript
interface VirtualListProps {
  items: any[]
  height: number
  estimateItemHeight: (index: number) => number
  renderItem: (item: any, index: number) => ReactNode
}

function VariableHeightVirtualList({
  items,
  height,
  estimateItemHeight,
  renderItem,
}: VirtualListProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(
    new Map()
  )
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Build offset cache
  const getItemOffset = useCallback(
    (index: number): number => {
      let offset = 0
      for (let i = 0; i < index; i++) {
        offset += measuredHeights.get(i) ?? estimateItemHeight(i)
      }
      return offset
    },
    [measuredHeights, estimateItemHeight]
  )

  // Find start index via binary search
  const findStartIndex = useCallback(
    (scrollTop: number): number => {
      let low = 0
      let high = items.length - 1

      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const offset = getItemOffset(mid)

        if (offset === scrollTop) {
          return mid
        } else if (offset < scrollTop) {
          low = mid + 1
        } else {
          high = mid - 1
        }
      }

      return Math.max(0, high)
    },
    [items.length, getItemOffset]
  )

  // Find visible range
  const startIndex = findStartIndex(scrollTop)
  let endIndex = startIndex
  let currentOffset = getItemOffset(startIndex)

  while (currentOffset < scrollTop + height && endIndex < items.length) {
    currentOffset += measuredHeights.get(endIndex) ?? estimateItemHeight(endIndex)
    endIndex++
  }

  // Measure items after render
  useEffect(() => {
    const newMeasuredHeights = new Map(measuredHeights)
    let changed = false

    itemRefs.current.forEach((element, index) => {
      const height = element.getBoundingClientRect().height
      if (measuredHeights.get(index) !== height) {
        newMeasuredHeights.set(index, height)
        changed = true
      }
    })

    if (changed) {
      setMeasuredHeights(newMeasuredHeights)
    }
  })

  const visibleItems = items.slice(startIndex, endIndex + 1)
  const totalHeight = getItemOffset(items.length)

  return (
    <div
      style={{ height, overflow: 'auto' }}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = startIndex + i
          return (
            <div
              key={item.id}
              ref={el => {
                if (el) itemRefs.current.set(index, el)
              }}
              style={{
                position: 'absolute',
                top: getItemOffset(index),
                left: 0,
                right: 0,
              }}
            >
              {renderItem(item, index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### Horizontal Virtualization

```typescript
function HorizontalVirtualList({
  items,
  width,
  itemWidth,
  renderItem,
}: {
  items: any[]
  width: number
  itemWidth: number
  renderItem: (item: any) => ReactNode
}) {
  const [scrollLeft, setScrollLeft] = useState(0)

  const startIndex = Math.floor(scrollLeft / itemWidth)
  const endIndex = Math.ceil((scrollLeft + width) / itemWidth)

  const visibleItems = items.slice(
    Math.max(0, startIndex - 3),
    Math.min(items.length, endIndex + 3)
  )

  const totalWidth = items.length * itemWidth

  return (
    <div
      style={{ width, overflowX: 'auto', overflowY: 'hidden' }}
      onScroll={e => setScrollLeft(e.currentTarget.scrollLeft)}
    >
      <div style={{ width: totalWidth, height: '100%', position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = startIndex - 3 + i
          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                left: index * itemWidth,
                width: itemWidth,
                top: 0,
                bottom: 0,
              }}
            >
              {renderItem(item)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### Grid Virtualization

```typescript
function VirtualGrid({
  items,
  width,
  height,
  columnCount,
  rowHeight,
  columnWidth,
  renderItem,
}: {
  items: any[]
  width: number
  height: number
  columnCount: number
  rowHeight: number
  columnWidth: number
  renderItem: (item: any, rowIndex: number, colIndex: number) => ReactNode
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const rowCount = Math.ceil(items.length / columnCount)

  // Visible row range
  const startRow = Math.floor(scrollTop / rowHeight)
  const endRow = Math.ceil((scrollTop + height) / rowHeight)

  // Visible column range
  const startCol = Math.floor(scrollLeft / columnWidth)
  const endCol = Math.ceil((scrollLeft + width) / columnWidth)

  const cells: ReactNode[] = []

  for (let row = startRow; row <= endRow && row < rowCount; row++) {
    for (let col = startCol; col <= endCol && col < columnCount; col++) {
      const index = row * columnCount + col
      if (index >= items.length) break

      cells.push(
        <div
          key={`${row}-${col}`}
          style={{
            position: 'absolute',
            top: row * rowHeight,
            left: col * columnWidth,
            width: columnWidth,
            height: rowHeight,
          }}
        >
          {renderItem(items[index], row, col)}
        </div>
      )
    }
  }

  return (
    <div
      style={{ width, height, overflow: 'auto' }}
      onScroll={e => {
        setScrollTop(e.currentTarget.scrollTop)
        setScrollLeft(e.currentTarget.scrollLeft)
      }}
    >
      <div
        style={{
          width: columnCount * columnWidth,
          height: rowCount * rowHeight,
          position: 'relative',
        }}
      >
        {cells}
      </div>
    </div>
  )
}
```

## React-Window Internals

### How FixedSizeList Works

```typescript
// Simplified react-window implementation
function FixedSizeList({
  height,
  itemCount,
  itemSize,
  width,
  children: Item,
}: {
  height: number
  itemCount: number
  itemSize: number
  width: number
  children: ComponentType<{ index: number; style: CSSProperties }>
}) {
  const [scrollOffset, setScrollOffset] = useState(0)

  // Calculate visible range
  const itemsPerViewport = Math.ceil(height / itemSize)
  const startIndex = Math.floor(scrollOffset / itemSize)
  const stopIndex = Math.min(
    itemCount - 1,
    startIndex + itemsPerViewport
  )

  // Overscan for smooth scrolling
  const overscan = 2
  const visibleStartIndex = Math.max(0, startIndex - overscan)
  const visibleStopIndex = Math.min(itemCount - 1, stopIndex + overscan)

  const items = []
  for (let index = visibleStartIndex; index <= visibleStopIndex; index++) {
    items.push(
      <Item
        key={index}
        index={index}
        style={{
          position: 'absolute',
          top: index * itemSize,
          width: '100%',
          height: itemSize,
        }}
      />
    )
  }

  return (
    <div
      style={{ position: 'relative', height, width, overflow: 'auto' }}
      onScroll={e => setScrollOffset(e.currentTarget.scrollTop)}
    >
      <div style={{ height: itemCount * itemSize }}>{items}</div>
    </div>
  )
}
```

### Usage

```typescript
import { FixedSizeList } from 'react-window'

function App() {
  const items = Array.from({ length: 10000 }, (_, i) => `Item ${i}`)

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          {items[index]}
        </div>
      )}
    </FixedSizeList>
  )
}
```

## Performance Optimizations

### Scroll Performance

```typescript
function OptimizedVirtualList(props: VirtualListProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const rafRef = useRef<number>()

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    // Cancel previous frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    // Schedule update for next frame
    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(e.currentTarget.scrollTop)
    })
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return <div onScroll={handleScroll}>{/* ... */}</div>
}
```

### Memoized Items

```typescript
interface ItemData {
  items: any[]
  // ... other props
}

const Row = memo(({ index, style, data }: {
  index: number
  style: CSSProperties
  data: ItemData
}) => {
  const item = data.items[index]

  return (
    <div style={style}>
      {item.text}
    </div>
  )
})

function VirtualizedList({ items }: { items: any[] }) {
  const itemData = useMemo(
    () => ({ items }),
    [items]
  )

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
      itemData={itemData}
    >
      {Row}
    </FixedSizeList>
  )
}
```

### Dynamic Height with ResizeObserver

```typescript
function useMeasure(): [RefObject<HTMLDivElement>, DOMRect | null] {
  const ref = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!ref.current) return

    const observer = new ResizeObserver(([entry]) => {
      setRect(entry.contentRect)
    })

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [])

  return [ref, rect]
}

function DynamicHeightItem({ index }: { index: number }) {
  const [ref, rect] = useMeasure()

  // Report height to parent
  useEffect(() => {
    if (rect) {
      reportHeight(index, rect.height)
    }
  }, [index, rect])

  return (
    <div ref={ref}>
      <h3>Item {index}</h3>
      <p>Dynamic content...</p>
    </div>
  )
}
```

## Advanced Techniques

### Infinite Scroll with Virtualization

```typescript
function InfiniteVirtualList() {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [isLoading, setIsLoading] = useState(false)
  const listRef = useRef<FixedSizeList>(null)

  const loadMore = useCallback(async () => {
    if (isLoading) return

    setIsLoading(true)
    const newItems = await fetchMoreItems()
    setItems(prev => [...prev, ...newItems])
    setIsLoading(false)
  }, [isLoading])

  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: {
    scrollOffset: number
    scrollUpdateWasRequested: boolean
  }) => {
    const totalHeight = items.length * ITEM_HEIGHT
    const threshold = totalHeight - VIEWPORT_HEIGHT - 200

    if (scrollOffset > threshold && !scrollUpdateWasRequested) {
      loadMore()
    }
  }, [items.length, loadMore])

  return (
    <FixedSizeList
      ref={listRef}
      height={VIEWPORT_HEIGHT}
      itemCount={items.length}
      itemSize={ITEM_HEIGHT}
      onScroll={handleScroll}
    >
      {Row}
    </FixedSizeList>
  )
}
```

### Sticky Headers

```typescript
function VirtualListWithStickyHeaders({
  items,
  getSectionHeader,
}: {
  items: any[]
  getSectionHeader: (index: number) => string | null
}) {
  const [scrollTop, setScrollTop] = useState(0)

  // Group items by section
  const sections = useMemo(() => {
    const result: Array<{ header: string; items: any[] }> = []
    let currentSection: { header: string; items: any[] } | null = null

    items.forEach((item, index) => {
      const header = getSectionHeader(index)

      if (header !== currentSection?.header) {
        currentSection = { header: header || '', items: [] }
        result.push(currentSection)
      }

      currentSection?.items.push(item)
    })

    return result
  }, [items, getSectionHeader])

  // Find current sticky header
  const currentHeader = useMemo(() => {
    let offset = 0

    for (const section of sections) {
      const sectionHeight = HEADER_HEIGHT + section.items.length * ITEM_HEIGHT

      if (scrollTop < offset + sectionHeight) {
        return section.header
      }

      offset += sectionHeight
    }

    return sections[sections.length - 1]?.header
  }, [sections, scrollTop])

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        background: 'white',
      }}>
        {currentHeader}
      </div>
      <VirtualList
        items={items}
        onScroll={setScrollTop}
      />
    </div>
  )
}
```

### Keyboard Navigation

```typescript
function VirtualListWithKeyboard({ items }: { items: any[] }) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const listRef = useRef<FixedSizeList>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => Math.min(items.length - 1, prev + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => Math.max(0, prev - 1))
        break
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setFocusedIndex(items.length - 1)
        break
    }
  }, [items.length])

  useEffect(() => {
    // Scroll to focused item
    listRef.current?.scrollToItem(focusedIndex, 'smart')
  }, [focusedIndex])

  return (
    <div onKeyDown={handleKeyDown} tabIndex={0}>
      <FixedSizeList ref={listRef} {...props}>
        {({ index, style }) => (
          <div
            style={{
              ...style,
              background: index === focusedIndex ? '#e0e0e0' : 'white',
            }}
          >
            {items[index]}
          </div>
        )}
      </FixedSizeList>
    </div>
  )
}
```

## Real-World Use Cases

### Chat Application

```typescript
function ChatMessages({ messages }: { messages: Message[] }) {
  const listRef = useRef<FixedSizeList>(null)

  // Auto-scroll to bottom on new message
  useEffect(() => {
    listRef.current?.scrollToItem(messages.length - 1)
  }, [messages.length])

  return (
    <FixedSizeList
      ref={listRef}
      height={600}
      itemCount={messages.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <MessageItem
          style={style}
          message={messages[index]}
        />
      )}
    </FixedSizeList>
  )
}
```

### File Explorer

```typescript
function FileExplorer({ files }: { files: FileNode[] }) {
  const flattenFiles = useMemo(() => {
    const result: Array<{ file: FileNode; depth: number }> = []

    const traverse = (node: FileNode, depth: number) => {
      result.push({ file: node, depth })
      if (node.expanded && node.children) {
        node.children.forEach(child => traverse(child, depth + 1))
      }
    }

    files.forEach(file => traverse(file, 0))
    return result
  }, [files])

  return (
    <FixedSizeList
      height={600}
      itemCount={flattenFiles.length}
      itemSize={32}
      width="100%"
    >
      {({ index, style }) => (
        <FileItem
          style={{
            ...style,
            paddingLeft: flattenFiles[index].depth * 20,
          }}
          file={flattenFiles[index].file}
        />
      )}
    </FixedSizeList>
  )
}
```

## Summary

**Key Concepts**:
1. **Virtualization** - Only render visible items
2. **Viewport** - The visible area
3. **Overscan** - Buffer items above/below viewport
4. **Fixed vs Variable** - Item height consistency

**Performance Benefits**:
- 100x faster initial render
- 50x less memory usage
- Smooth 60fps scrolling
- Handles millions of items

**Implementation Options**:
1. **Custom** - Full control, more code
2. **react-window** - Lightweight, flexible
3. **react-virtualized** - Feature-rich, larger
4. **TanStack Virtual** - Modern, TypeScript-first

**Best Practices**:
- Use fixed heights when possible
- Memoize item components
- Debounce scroll handlers
- Use requestAnimationFrame
- Add keyboard navigation
- Test with real data volumes

**Next**: Lecture 4 covers rerender optimization strategies.
