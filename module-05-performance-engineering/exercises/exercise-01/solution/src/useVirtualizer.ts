import { useMemo, useRef } from 'react'
import { VirtualizerOptions, VirtualizerResult, VirtualItem } from './types'

export function useVirtualizer({
  count,
  estimatedItemHeight,
  getItemHeight,
  scrollTop,
  viewportHeight,
  overscan,
}: VirtualizerOptions): VirtualizerResult {
  // Cache measured heights to avoid recalculation
  const measuredHeights = useRef<Map<number, number>>(new Map())

  // Get height (measured or call getItemHeight)
  function getHeight(index: number): number {
    const measured = measuredHeights.current.get(index)
    if (measured !== undefined) return measured

    const height = getItemHeight(index)
    measuredHeights.current.set(index, height)
    return height
  }

  // Calculate positions for all items
  const itemPositions = useMemo(() => {
    const positions: Array<{ start: number; end: number; height: number }> = []
    let currentOffset = 0

    for (let i = 0; i < count; i++) {
      const height = getHeight(i)
      positions.push({
        start: currentOffset,
        end: currentOffset + height,
        height,
      })
      currentOffset += height
    }

    return positions
  }, [count, scrollTop]) // Recalculate when scrolling (heights may change)

  // Find visible range using binary search - O(log n) instead of O(n)
  const { startIndex, endIndex } = useMemo(() => {
    if (count === 0) {
      return { startIndex: 0, endIndex: 0 }
    }

    // Binary search for first visible item
    let start = 0
    let end = count - 1

    while (start <= end) {
      const mid = Math.floor((start + end) / 2)
      const position = itemPositions[mid]

      if (position.end < scrollTop) {
        // Item is above viewport
        start = mid + 1
      } else if (position.start > scrollTop) {
        // Item is below viewport
        end = mid - 1
      } else {
        // Item intersects viewport top
        start = mid
        break
      }
    }

    const viewportBottom = scrollTop + viewportHeight

    // Find last visible item (linear search from start)
    let lastVisible = start
    while (
      lastVisible < count &&
      itemPositions[lastVisible].start < viewportBottom
    ) {
      lastVisible++
    }

    // Add overscan
    const startIndex = Math.max(0, start - overscan)
    const endIndex = Math.min(count - 1, lastVisible + overscan)

    return { startIndex, endIndex }
  }, [scrollTop, viewportHeight, overscan, itemPositions, count])

  // Build virtual items array
  const virtualItems: VirtualItem[] = useMemo(() => {
    const items: VirtualItem[] = []

    for (let i = startIndex; i <= endIndex; i++) {
      const position = itemPositions[i]
      if (position) {
        items.push({
          index: i,
          start: position.start,
          height: position.height,
        })
      }
    }

    return items
  }, [startIndex, endIndex, itemPositions])

  const totalHeight = itemPositions[count - 1]?.end || 0

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
  }
}
