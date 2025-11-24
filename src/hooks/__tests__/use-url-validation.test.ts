import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUrlValidation } from '../use-url-validation'

// Mock dependencies
vi.mock('@/utils/url', () => ({
  isValidUrl: vi.fn(),
  normalizeUrl: vi.fn(),
}))

import { isValidUrl, normalizeUrl } from '@/utils/url'

const mockIsValidUrl = vi.mocked(isValidUrl)
const mockNormalizeUrl = vi.mocked(normalizeUrl)

// Mock fetch globally
global.fetch = vi.fn()

describe('useUrlValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with idle status', () => {
      const { result } = renderHook(() => useUrlValidation(''))

      expect(result.current.status).toBe('idle')
      expect(result.current.normalizedUrl).toBeNull()
      expect(result.current.error).toBeUndefined()
    })

    it('should remain idle when url is empty', () => {
      const { result } = renderHook(() => useUrlValidation(''))

      expect(result.current.status).toBe('idle')
      expect(result.current.normalizedUrl).toBeNull()
    })

    it('should remain idle when url is only whitespace', () => {
      const { result } = renderHook(() => useUrlValidation('   '))

      expect(result.current.status).toBe('idle')
      expect(result.current.normalizedUrl).toBeNull()
    })

    it('should remain idle when enabled is false', () => {
      mockIsValidUrl.mockReturnValue(true)
      mockNormalizeUrl.mockReturnValue('https://example.com')

      const { result } = renderHook(() => useUrlValidation('https://example.com', false))

      expect(result.current.status).toBe('idle')
      expect(result.current.normalizedUrl).toBeNull()
    })
  })

  describe('URL format validation', () => {
    it('should set invalid status for invalid URL format', () => {
      mockIsValidUrl.mockReturnValue(false)

      const { result } = renderHook(() => useUrlValidation('invalid-url'))

      expect(result.current.status).toBe('invalid')
      expect(result.current.normalizedUrl).toBeNull()
      expect(result.current.error).toBe('Invalid URL format')
    })

    it('should set invalid status when normalizeUrl returns null', () => {
      mockIsValidUrl.mockReturnValue(true)
      mockNormalizeUrl.mockReturnValue('')

      const { result } = renderHook(() => useUrlValidation('https://example.com'))

      expect(result.current.status).toBe('invalid')
      expect(result.current.normalizedUrl).toBeNull()
      expect(result.current.error).toBe('Invalid URL format')
    })
  })

  describe('URL validation flow', () => {
    it('should set validating status and normalized URL', () => {
      mockIsValidUrl.mockReturnValue(true)
      mockNormalizeUrl.mockReturnValue('https://example.com')
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      const { result } = renderHook(() => useUrlValidation('https://example.com'))

      expect(result.current.status).toBe('validating')
      expect(result.current.normalizedUrl).toBe('https://example.com')
    })

    it('should set valid status on successful fetch', async () => {
      vi.useRealTimers()
      mockIsValidUrl.mockReturnValue(true)
      mockNormalizeUrl.mockReturnValue('https://example.com')
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      } as Response)

      const { result } = renderHook(() => useUrlValidation('https://example.com'))

      await waitFor(
        () => {
          expect(result.current.status).toBe('valid')
        },
        { timeout: 1000 }
      )

      expect(result.current.normalizedUrl).toBe('https://example.com')
      expect(result.current.error).toBeUndefined()
      vi.useFakeTimers()
    })

    it('should set valid status on fetch error (CORS/network issues)', async () => {
      vi.useRealTimers()
      mockIsValidUrl.mockReturnValue(true)
      mockNormalizeUrl.mockReturnValue('https://example.com')
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useUrlValidation('https://example.com'))

      await waitFor(
        () => {
          expect(result.current.status).toBe('valid')
        },
        { timeout: 1000 }
      )

      expect(result.current.normalizedUrl).toBe('https://example.com')
      vi.useFakeTimers()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup fetch on unmount', () => {
      mockIsValidUrl.mockReturnValue(true)
      mockNormalizeUrl.mockReturnValue('https://example.com')
      const abortSpy = vi.fn()
      const originalAbortController = global.AbortController

      global.AbortController = class {
        signal = {} as AbortSignal
        abort = abortSpy
      } as typeof AbortController

      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      const { unmount } = renderHook(() => useUrlValidation('https://example.com'))

      unmount()

      expect(abortSpy).toHaveBeenCalled()

      global.AbortController = originalAbortController
    })

    it('should cleanup timeout on unmount', () => {
      mockIsValidUrl.mockReturnValue(true)
      mockNormalizeUrl.mockReturnValue('https://example.com')
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      const { unmount } = renderHook(() => useUrlValidation('https://example.com'))

      unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('URL changes', () => {
    it('should revalidate when URL changes', async () => {
      vi.useRealTimers()
      mockIsValidUrl.mockReturnValue(true)
      mockNormalizeUrl.mockReturnValue('https://example.com')
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      } as Response)

      const { result, rerender } = renderHook(({ url }) => useUrlValidation(url), {
        initialProps: { url: 'https://example.com' },
      })

      await waitFor(
        () => {
          expect(result.current.status).toBe('valid')
        },
        { timeout: 1000 }
      )

      mockNormalizeUrl.mockReturnValue('https://example2.com')
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      } as Response)
      rerender({ url: 'https://example2.com' })

      await waitFor(
        () => {
          expect(result.current.status).toBe('validating')
        },
        { timeout: 1000 }
      )

      expect(result.current.normalizedUrl).toBe('https://example2.com')
      vi.useFakeTimers()
    })

    it('should reset to idle when URL becomes empty', () => {
      mockIsValidUrl.mockReturnValue(true)
      mockNormalizeUrl.mockReturnValue('https://example.com')

      const { result, rerender } = renderHook(({ url }) => useUrlValidation(url), {
        initialProps: { url: 'https://example.com' },
      })

      expect(result.current.status).toBe('validating')

      rerender({ url: '' })

      expect(result.current.status).toBe('idle')
      expect(result.current.normalizedUrl).toBeNull()
    })
  })

  describe('Fetch configuration', () => {
    it('should use HEAD method', () => {
      mockIsValidUrl.mockReturnValue(true)
      mockNormalizeUrl.mockReturnValue('https://example.com')
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      renderHook(() => useUrlValidation('https://example.com'))

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'HEAD',
          mode: 'no-cors',
        })
      )
    })

    it('should use AbortController signal', () => {
      mockIsValidUrl.mockReturnValue(true)
      mockNormalizeUrl.mockReturnValue('https://example.com')
      let capturedSignal: AbortSignal | undefined

      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((_url, options) => {
        capturedSignal = (options as RequestInit)?.signal as AbortSignal
        return new Promise(() => {}) // Never resolves
      })

      renderHook(() => useUrlValidation('https://example.com'))

      expect(capturedSignal).toBeDefined()
      expect(capturedSignal).toBeInstanceOf(AbortSignal)
    })
  })
})
