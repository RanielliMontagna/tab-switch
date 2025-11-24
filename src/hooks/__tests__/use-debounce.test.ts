import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDebounce } from '../use-debounce'

describe('useDebounce', () => {
  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300))

    expect(result.current).toBe('initial')
  })

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 50 },
    })

    expect(result.current).toBe('initial')

    // Change value
    rerender({ value: 'updated', delay: 50 })

    // Value should not change immediately
    expect(result.current).toBe('initial')

    // Wait for debounce delay
    await waitFor(
      () => {
        expect(result.current).toBe('updated')
      },
      { timeout: 200 }
    )
  })

  it('should use custom delay', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 100 },
    })

    rerender({ value: 'updated', delay: 100 })

    // Should not update before delay
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(result.current).toBe('initial')

    // Should update after delay
    await waitFor(
      () => {
        expect(result.current).toBe('updated')
      },
      { timeout: 200 }
    )
  })

  it('should cancel previous timeout on rapid changes', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: 'initial' },
    })

    // Rapid changes
    rerender({ value: 'change1' })
    await new Promise((resolve) => setTimeout(resolve, 30))

    rerender({ value: 'change2' })
    await new Promise((resolve) => setTimeout(resolve, 30))

    rerender({ value: 'change3' })
    await new Promise((resolve) => setTimeout(resolve, 30))

    // Should still be initial
    expect(result.current).toBe('initial')

    // After full delay from last change
    await waitFor(
      () => {
        expect(result.current).toBe('change3')
      },
      { timeout: 200 }
    )
  })

  it('should handle number values', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 50), {
      initialProps: { value: 0 },
    })

    rerender({ value: 100 })

    await waitFor(
      () => {
        expect(result.current).toBe(100)
      },
      { timeout: 200 }
    )
  })
})
