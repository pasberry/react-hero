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
  renderItem,
}: VariableListProps<T>) {
  // TODO: Implement VariableList with ResizeObserver
  // 1. Track measured heights with useRef
  // 2. Set up ResizeObserver in useEffect
  // 3. Update measurements when items resize
  // 4. Trigger re-render when measurements change

  return (
    <VirtualList
      items={items}
      height={height}
      itemHeight={() => estimatedItemHeight}
      estimatedItemHeight={estimatedItemHeight}
      renderItem={renderItem}
    />
  )
}
