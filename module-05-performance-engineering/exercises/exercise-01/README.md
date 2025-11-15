# Exercise 1: Build a Custom Virtualization Library

## 🎯 Goal

Build a production-grade virtualization library similar to `react-window` that efficiently renders massive lists (10,000+ items) by only rendering visible items in the viewport, achieving consistent 60 FPS scrolling performance.

## 📚 Prerequisites

- Complete Lectures 1-2 in Module 5
- Understanding of DOM APIs (getBoundingClientRect, scrollTop, etc.)
- Knowledge of React performance optimization
- Familiarity with requestAnimationFrame

## 🎓 Learning Objectives

By completing this exercise, you will:

✅ Understand the fundamentals of list virtualization
✅ Master viewport calculations and visible item determination
✅ Implement efficient scroll event handling
✅ Handle variable-height items with accurate positioning
✅ Optimize for 60 FPS scrolling with minimal re-renders
✅ Build reusable performance-critical React components

## 📝 Task Description

Build **"VirtualList"** - a custom virtualization component with the following features:

### Core Features

1. **Fixed-Height Virtualization**
   - Render only items visible in viewport
   - Smooth scrolling with overscan buffer
   - Efficient item positioning

2. **Variable-Height Support**
   - Dynamic height measurement
   - Accurate scroll position calculation
   - Smooth transitions as heights are measured

3. **Performance Optimizations**
   - 60 FPS scrolling
   - Minimal re-renders
   - Efficient DOM updates
   - RAF-based scroll handling

4. **Advanced Features**
   - Horizontal virtualization
   - Grid layout support
   - Scroll-to-index API
   - Infinite loading integration

## 🏗️ Starter Code

See [./starter](./starter) for:
- `VirtualList.tsx` - Main component skeleton
- `useVirtualizer.ts` - Core virtualization hook
- `types.ts` - TypeScript interfaces
- `examples/` - Demo applications
- `__tests__/` - Test suite

## ✅ Acceptance Criteria

### 1. Core VirtualList Component

**VirtualList.tsx**:
```typescript
import React, { useRef, useState, useEffect } from 'react'

interface VirtualListProps<T> {
  items: T[]
  height: number                    // Container height
  itemHeight: number | ((index: number) => number)
  overscan?: number                 // Extra items to render
  renderItem: (item: T, index: number) => React.ReactNode
  onScroll?: (scrollTop: number) => void
  estimatedItemHeight?: number      // For variable heights
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  overscan = 3,
  renderItem,
  onScroll,
  estimatedItemHeight = 50
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // Calculate which items are visible
  const { virtualItems, totalHeight } = useVirtualizer({
    count: items.length,
    estimatedItemHeight,
    getItemHeight: typeof itemHeight === 'function' ? itemHeight : () => itemHeight,
    scrollTop,
    viewportHeight: height,
    overscan
  })

  // Handle scroll with RAF throttling
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    let rafId: number

    function handleScroll() {
      rafId = requestAnimationFrame(() => {
        setScrollTop(element.scrollTop)
        onScroll?.(element.scrollTop)
      })
    }

    element.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      element.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(rafId)
    }
  }, [onScroll])

  return (
    <div
      ref={scrollRef}
      style={{
        height,
        overflow: 'auto',
        position: 'relative'
      }}
    >
      {/* Spacer to maintain scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ index, start, height: itemHeight }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: start,
              left: 0,
              width: '100%',
              height: itemHeight
            }}
          >
            {renderItem(items[index], index)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 2. Virtualization Hook

**useVirtualizer.ts**:
```typescript
import { useMemo, useRef, useEffect } from 'react'

interface VirtualizerOptions {
  count: number
  estimatedItemHeight: number
  getItemHeight: (index: number) => number
  scrollTop: number
  viewportHeight: number
  overscan: number
}

interface VirtualItem {
  index: number
  start: number
  height: number
}

export function useVirtualizer({
  count,
  estimatedItemHeight,
  getItemHeight,
  scrollTop,
  viewportHeight,
  overscan
}: VirtualizerOptions) {
  // Cache measured heights
  const measuredHeights = useRef<Map<number, number>>(new Map())

  // Get height (measured or estimated)
  function getHeight(index: number): number {
    const measured = measuredHeights.current.get(index)
    if (measured !== undefined) return measured

    const height = getItemHeight(index)
    measuredHeights.current.set(index, height)
    return height
  }

  // Calculate item positions
  const itemPositions = useMemo(() => {
    const positions: Array<{ start: number; end: number; height: number }> = []
    let currentOffset = 0

    for (let i = 0; i < count; i++) {
      const height = getHeight(i)
      positions.push({
        start: currentOffset,
        end: currentOffset + height,
        height
      })
      currentOffset += height
    }

    return positions
  }, [count, scrollTop]) // Recalculate when heights change

  // Find visible range
  const { startIndex, endIndex } = useMemo(() => {
    // Binary search for first visible item
    let start = 0
    let end = count - 1

    while (start <= end) {
      const mid = Math.floor((start + end) / 2)
      const position = itemPositions[mid]

      if (position.end < scrollTop) {
        start = mid + 1
      } else if (position.start > scrollTop) {
        end = mid - 1
      } else {
        start = mid
        break
      }
    }

    const startIndex = Math.max(0, start - overscan)
    const endIndex = Math.min(count - 1, start + Math.ceil(viewportHeight / estimatedItemHeight) + overscan)

    return { startIndex, endIndex }
  }, [scrollTop, viewportHeight, overscan, itemPositions])

  // Build virtual items array
  const virtualItems: VirtualItem[] = useMemo(() => {
    const items: VirtualItem[] = []

    for (let i = startIndex; i <= endIndex; i++) {
      const position = itemPositions[i]
      items.push({
        index: i,
        start: position.start,
        height: position.height
      })
    }

    return items
  }, [startIndex, endIndex, itemPositions])

  const totalHeight = itemPositions[count - 1]?.end || 0

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex
  }
}
```

### 3. Variable Height Support

**VariableList.tsx**:
```typescript
import React, { useRef, useEffect } from 'react'
import { VirtualList } from './VirtualList'

interface VariableListProps<T> {
  items: T[]
  height: number
  estimatedItemHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
}

export function VariableList<T>({
  items,
  height,
  estimatedItemHeight,
  renderItem
}: VariableListProps<T>) {
  const measurementsRef = useRef<Map<number, number>>(new Map())
  const observerRef = useRef<ResizeObserver>()

  // Measure item heights as they render
  useEffect(() => {
    observerRef.current = new ResizeObserver((entries) => {
      let changed = false

      for (const entry of entries) {
        const index = Number(entry.target.getAttribute('data-index'))
        const height = entry.contentRect.height

        if (measurementsRef.current.get(index) !== height) {
          measurementsRef.current.set(index, height)
          changed = true
        }
      }

      if (changed) {
        // Trigger re-render to update positions
        setMeasurements(new Map(measurementsRef.current))
      }
    })

    return () => observerRef.current?.disconnect()
  }, [])

  const [measurements, setMeasurements] = React.useState(measurementsRef.current)

  return (
    <VirtualList
      items={items}
      height={height}
      itemHeight={(index) => measurements.get(index) || estimatedItemHeight}
      estimatedItemHeight={estimatedItemHeight}
      renderItem={(item, index) => (
        <div
          ref={(el) => {
            if (el && observerRef.current) {
              el.setAttribute('data-index', String(index))
              observerRef.current.observe(el)
            }
          }}
        >
          {renderItem(item, index)}
        </div>
      )}
    />
  )
}
```

### 4. Performance Requirements

Your virtualization library must achieve:

**Rendering Performance**:
- Initial render: < 50ms for 10,000 items
- Scroll performance: Consistent 60 FPS
- Re-renders: < 10ms per scroll event
- Memory usage: < 50MB for 10,000 items

**Test**:
```typescript
// Performance benchmark
const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  title: `Item ${i}`,
  description: `Description for item ${i}`
}))

function App() {
  return (
    <VirtualList
      items={items}
      height={600}
      itemHeight={60}
      renderItem={(item) => (
        <div style={{ padding: 16 }}>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      )}
    />
  )
}

// Expectations:
// - Renders ~10 items (only visible ones)
// - Scroll stays at 60 FPS
// - Total DOM nodes: < 20
```

### 5. API Features

**Scroll to index**:
```typescript
interface VirtualListRef {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
  scrollToOffset: (offset: number) => void
}

// Usage
const listRef = useRef<VirtualListRef>(null)

<VirtualList ref={listRef} {...props} />

listRef.current?.scrollToIndex(500, 'center')
```

**Infinite loading**:
```typescript
<VirtualList
  items={items}
  height={600}
  itemHeight={60}
  onScroll={(scrollTop, scrollHeight, clientHeight) => {
    // Load more when near bottom
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      loadMoreItems()
    }
  }}
  renderItem={...}
/>
```

## 🚀 Getting Started

### Step 1: Initialize

```bash
cd starter
npm install
npm run dev
```

### Step 2: Implement Core Features

1. **Day 1**: Basic virtualization with fixed heights
2. **Day 2**: Scroll event handling with RAF
3. **Day 3**: Variable height support
4. **Day 4**: Performance optimization
5. **Day 5**: Advanced features + testing

### Step 3: Test Performance

```bash
npm run benchmark

# Expected output:
# ✓ Renders 10,000 items in < 50ms
# ✓ Scrolling at 60 FPS
# ✓ Memory usage < 50MB
# ✓ DOM nodes < 20
```

## 💡 Hints

### Performance Optimization Tips

1. **Use requestAnimationFrame** for scroll handling:
```typescript
let rafId: number

function handleScroll() {
  if (rafId) cancelAnimationFrame(rafId)

  rafId = requestAnimationFrame(() => {
    // Update scroll position
  })
}
```

2. **Memoize calculations**:
```typescript
const visibleRange = useMemo(() => {
  // Calculate visible items
  return { start, end }
}, [scrollTop, itemHeight])
```

3. **Use absolute positioning**:
```typescript
<div style={{
  position: 'absolute',
  top: itemTop,      // Pre-calculated offset
  transform: 'none'  // Avoid transform for better perf
}}>
```

4. **Passive event listeners**:
```typescript
element.addEventListener('scroll', handleScroll, { passive: true })
```

5. **Binary search for visible range**:
```typescript
// O(log n) instead of O(n)
function findStartIndex(scrollTop: number, positions: number[]) {
  let left = 0, right = positions.length - 1

  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (positions[mid] < scrollTop) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  return left
}
```

### Common Pitfalls

1. **Don't measure heights in render** - Use ResizeObserver
2. **Don't use inline styles for every item** - Use CSS classes
3. **Don't forget overscan** - Prevents white flashes while scrolling
4. **Don't block the main thread** - Use RAF for heavy calculations

## 🎯 Stretch Goals

1. **Horizontal Virtualization**
   - Support horizontal scrolling
   - Combined horizontal + vertical (grid)

2. **Grid Layout**
   - Multi-column virtualization
   - Variable column widths

3. **Reverse Scroll**
   - Chat-like reverse scrolling
   - Maintain scroll position on prepend

4. **Sticky Headers**
   - Section headers that stick on scroll
   - Grouping with sticky dividers

5. **Advanced Optimizations**
   - Web Worker for calculations
   - Virtualize styles (CSS-in-JS)
   - Intersection Observer API

## 📖 Reference Solution

See [./solution](./solution) for a complete implementation with:
- Full virtualization logic
- Variable height support
- Performance optimizations
- Advanced features (scroll-to, infinite loading)
- Comprehensive tests
- Benchmark suite

## 🔍 Debugging Tips

### Performance Profiling

1. **Chrome DevTools Performance**:
   - Record while scrolling
   - Look for long frames (>16ms)
   - Check for layout thrashing

2. **React DevTools Profiler**:
   - Enable "Highlight updates"
   - Record scroll interaction
   - Identify unnecessary re-renders

3. **Memory profiling**:
   - Take heap snapshot
   - Check for memory leaks
   - Verify DOM node count

### Common Issues

1. **Janky scrolling**:
   - Check: Are you blocking the main thread?
   - Solution: Move calculations to RAF

2. **White flashes**:
   - Check: Is overscan too small?
   - Solution: Increase overscan value

3. **Wrong positions**:
   - Check: Are heights measured correctly?
   - Solution: Use ResizeObserver, not manual measurement

4. **Memory leaks**:
   - Check: Are event listeners cleaned up?
   - Solution: Return cleanup function from useEffect

## ⏱️ Time Estimate

- **Basic virtualization**: 2-3 hours
- **Variable heights**: 2-3 hours
- **Performance optimization**: 1-2 hours
- **Advanced features**: 2-3 hours
- **Testing**: 1-2 hours

**Total**: 8-13 hours over 3-5 days

## 🎓 What You'll Learn

This exercise demonstrates:

- **Virtualization algorithms**: How to calculate visible items efficiently
- **Scroll performance**: RAF throttling, passive listeners
- **DOM optimization**: Absolute positioning, minimal re-renders
- **Memory efficiency**: Rendering only what's needed
- **Measurement strategies**: ResizeObserver, getBoundingClientRect
- **Binary search**: O(log n) visible range calculation

### Real-World Applications

✅ Large data tables (10,000+ rows)
✅ Chat applications (infinite message history)
✅ Social media feeds
✅ File explorers
✅ Log viewers
✅ Analytics dashboards

### Industry Standard Libraries

This exercise teaches the fundamentals behind:
- `react-window` by Brian Vaughn
- `react-virtualized` by Brian Vaughn
- `@tanstack/virtual` (formerly react-virtual)
- `virtua` by @inokawa

---

**Next**: After completing this exercise, move on to [Module 6: State Management](../../module-06-state-management) to learn advanced state patterns for large applications.

## 📚 Additional Resources

- [React Window Documentation](https://react-window.vercel.app/)
- [Inside Fiber: in-depth overview](https://indepth.dev/posts/1008/inside-fiber-in-depth-overview-of-the-new-reconciliation-algorithm-in-react)
- [List Virtualization Best Practices](https://web.dev/virtualize-long-lists-react-window/)
- [ResizeObserver API](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
