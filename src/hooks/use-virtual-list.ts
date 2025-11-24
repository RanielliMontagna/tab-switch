import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

interface UseVirtualListOptions {
  count: number
  estimateSize?: number
  overscan?: number
  enabled?: boolean
}

/**
 * Hook for virtualizing large lists to improve performance
 * Only renders visible items, reducing DOM nodes and improving scroll performance
 *
 * @param options - Configuration options
 * @param options.count - Total number of items in the list
 * @param options.estimateSize - Estimated height of each item in pixels (default: 50)
 * @param options.overscan - Number of items to render outside visible area (default: 5)
 * @param options.enabled - Whether virtualization is enabled (default: true)
 * @returns Virtualizer instance and container ref
 */
export function useVirtualList({
  count,
  estimateSize = 50,
  overscan = 5,
  enabled = true,
}: UseVirtualListOptions) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    enabled: enabled && count > 10, // Only enable if more than 10 items
  })

  return {
    virtualizer,
    parentRef,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  }
}
