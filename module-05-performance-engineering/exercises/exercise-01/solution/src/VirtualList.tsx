import React, { useRef, useState, useEffect } from 'react'
import { useVirtualizer } from './useVirtualizer'

interface VirtualListProps<T> {
  items: T[]
  height: number
  itemHeight: number | ((index: number) => number)
  overscan?: number
  renderItem: (item: T, index: number) => React.ReactNode
  onScroll?: (scrollTop: number) => void
  estimatedItemHeight?: number
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  overscan = 3,
  renderItem,
  onScroll,
  estimatedItemHeight = 50,
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // Calculate which items are visible
  const { virtualItems, totalHeight } = useVirtualizer({
    count: items.length,
    estimatedItemHeight,
    getItemHeight:
      typeof itemHeight === 'function' ? itemHeight : () => itemHeight,
    scrollTop,
    viewportHeight: height,
    overscan,
  })

  // Handle scroll with RAF throttling for smooth 60 FPS
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    let rafId: number | undefined

    function handleScroll() {
      // Cancel previous RAF if still pending
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId)
      }

      // Schedule update on next animation frame
      rafId = requestAnimationFrame(() => {
        setScrollTop(element.scrollTop)
        onScroll?.(element.scrollTop)
        rafId = undefined
      })
    }

    // Use passive listener for better scroll performance
    element.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      element.removeEventListener('scroll', handleScroll)
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [onScroll])

  return (
    <div
      ref={scrollRef}
      style={{
        height,
        overflow: 'auto',
        position: 'relative',
        willChange: 'scroll-position', // Hint to browser for optimization
      }}
    >
      {/* Spacer to maintain total scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Render only visible items */}
        {virtualItems.map(({ index, start, height: itemHeight }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: start,
              left: 0,
              width: '100%',
              height: itemHeight,
            }}
          >
            {renderItem(items[index], index)}
          </div>
        ))}
      </div>
    </div>
  )
}
