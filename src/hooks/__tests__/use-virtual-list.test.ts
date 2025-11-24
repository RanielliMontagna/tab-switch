import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVirtualList } from '../use-virtual-list'

// Mock @tanstack/react-virtual
const mockGetVirtualItems = vi.fn(() => [])
const mockGetTotalSize = vi.fn(() => 0)
const mockVirtualizer = {
  getVirtualItems: mockGetVirtualItems,
  getTotalSize: mockGetTotalSize,
}

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(),
}))

import { useVirtualizer } from '@tanstack/react-virtual'

const mockUseVirtualizerFn = vi.mocked(useVirtualizer)

describe('useVirtualList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseVirtualizerFn.mockReturnValue(
      mockVirtualizer as unknown as ReturnType<typeof useVirtualizer>
    )
    mockGetVirtualItems.mockReturnValue([])
    mockGetTotalSize.mockReturnValue(0)
  })

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useVirtualList({ count: 20 }))

      expect(result.current.parentRef).toBeDefined()
      expect(result.current.virtualizer).toBeDefined()
      expect(result.current.virtualItems).toEqual([])
      expect(result.current.totalSize).toBe(0)
    })

    it('should create parentRef', () => {
      const { result } = renderHook(() => useVirtualList({ count: 20 }))

      expect(result.current.parentRef).toBeDefined()
      expect(result.current.parentRef.current).toBeNull()
    })

    it('should call useVirtualizer with correct parameters', () => {
      renderHook(() => useVirtualList({ count: 20 }))

      expect(mockUseVirtualizerFn).toHaveBeenCalledWith({
        count: 20,
        getScrollElement: expect.any(Function),
        estimateSize: expect.any(Function),
        overscan: 5,
        enabled: true,
      })
    })

    it('should use default estimateSize of 50', () => {
      renderHook(() => useVirtualList({ count: 20 }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      expect(callArgs?.estimateSize).toBeDefined()

      const estimateSizeFn = callArgs?.estimateSize as () => number
      expect(estimateSizeFn()).toBe(50)
    })

    it('should use default overscan of 5', () => {
      renderHook(() => useVirtualList({ count: 20 }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      expect(callArgs?.overscan).toBe(5)
    })
  })

  describe('Custom options', () => {
    it('should use custom estimateSize', () => {
      renderHook(() => useVirtualList({ count: 20, estimateSize: 100 }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      const estimateSizeFn = callArgs?.estimateSize as () => number
      expect(estimateSizeFn()).toBe(100)
    })

    it('should use custom overscan', () => {
      renderHook(() => useVirtualList({ count: 20, overscan: 10 }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      expect(callArgs?.overscan).toBe(10)
    })

    it('should disable virtualization when enabled is false', () => {
      renderHook(() => useVirtualList({ count: 20, enabled: false }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      expect(callArgs?.enabled).toBe(false)
    })

    it('should disable virtualization when count is 10 or less', () => {
      renderHook(() => useVirtualList({ count: 10 }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      expect(callArgs?.enabled).toBe(false)
    })

    it('should disable virtualization when count is less than 10', () => {
      renderHook(() => useVirtualList({ count: 5 }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      expect(callArgs?.enabled).toBe(false)
    })

    it('should enable virtualization when count is greater than 10', () => {
      renderHook(() => useVirtualList({ count: 11 }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      expect(callArgs?.enabled).toBe(true)
    })

    it('should disable virtualization when enabled is false even if count > 10', () => {
      renderHook(() => useVirtualList({ count: 20, enabled: false }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      expect(callArgs?.enabled).toBe(false)
    })
  })

  describe('Return values', () => {
    it('should return virtualizer instance', () => {
      const { result } = renderHook(() => useVirtualList({ count: 20 }))

      expect(result.current.virtualizer).toBe(mockVirtualizer)
    })

    it('should return parentRef', () => {
      const { result } = renderHook(() => useVirtualList({ count: 20 }))

      expect(result.current.parentRef).toBeDefined()
      expect(typeof result.current.parentRef).toBe('object')
    })

    it('should return virtualItems from virtualizer', () => {
      const mockItems = [
        { index: 0, start: 0, end: 50, size: 50 },
        { index: 1, start: 50, end: 100, size: 50 },
      ]
      mockGetVirtualItems.mockReturnValue(mockItems as never[])

      const { result } = renderHook(() => useVirtualList({ count: 20 }))

      expect(result.current.virtualItems).toEqual(mockItems)
      expect(mockGetVirtualItems).toHaveBeenCalled()
    })

    it('should return totalSize from virtualizer', () => {
      mockGetTotalSize.mockReturnValue(1000)

      const { result } = renderHook(() => useVirtualList({ count: 20 }))

      expect(result.current.totalSize).toBe(1000)
      expect(mockGetTotalSize).toHaveBeenCalled()
    })
  })

  describe('getScrollElement', () => {
    it('should return parentRef.current from getScrollElement', () => {
      renderHook(() => useVirtualList({ count: 20 }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      const getScrollElement = callArgs?.getScrollElement as () => HTMLElement | null

      expect(getScrollElement()).toBeNull()
    })

    it('should return element when parentRef is set', () => {
      const { result } = renderHook(() => useVirtualList({ count: 20 }))

      const div = document.createElement('div')
      result.current.parentRef.current = div

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      const getScrollElement = callArgs?.getScrollElement as () => HTMLElement | null

      expect(getScrollElement()).toBe(div)
    })
  })

  describe('Edge cases', () => {
    it('should handle count of 0', () => {
      renderHook(() => useVirtualList({ count: 0 }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      expect(callArgs?.count).toBe(0)
      expect(callArgs?.enabled).toBe(false)
    })

    it('should handle very large count', () => {
      renderHook(() => useVirtualList({ count: 10000 }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      expect(callArgs?.count).toBe(10000)
      expect(callArgs?.enabled).toBe(true)
    })

    it('should handle custom estimateSize of 0', () => {
      renderHook(() => useVirtualList({ count: 20, estimateSize: 0 }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      const estimateSizeFn = callArgs?.estimateSize as () => number
      expect(estimateSizeFn()).toBe(0)
    })

    it('should handle overscan of 0', () => {
      renderHook(() => useVirtualList({ count: 20, overscan: 0 }))

      const callArgs = mockUseVirtualizerFn.mock.calls[0]?.[0]
      expect(callArgs?.overscan).toBe(0)
    })
  })
})
