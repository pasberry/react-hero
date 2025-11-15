import React, { useRef, useEffect, useState } from 'react'
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
  const measurementsRef = useRef<Map<number, number>>(new Map())
  const observerRef = useRef<ResizeObserver>()
  const [measurements, setMeasurements] = useState<Map<number, number>>(
    new Map()
  )

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

  // Wrapper component to observe individual items
  function MeasuredItem({ item, index }: { item: T; index: number }) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const element = ref.current
      if (element && observerRef.current) {
        element.setAttribute('data-index', String(index))
        observerRef.current.observe(element)

        return () => {
          observerRef.current?.unobserve(element)
        }
      }
    }, [index])

    return <div ref={ref}>{renderItem(item, index)}</div>
  }

  return (
    <VirtualList
      items={items}
      height={height}
      itemHeight={(index) =>
        measurements.get(index) || estimatedItemHeight
      }
      estimatedItemHeight={estimatedItemHeight}
      renderItem={(item, index) => <MeasuredItem item={item} index={index} />}
    />
  )
}
