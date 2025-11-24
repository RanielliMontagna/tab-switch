import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHealthCheck } from '../use-health-check'

// Mock dependencies
vi.mock('@/libs/health-check', () => ({
  performHealthCheck: vi.fn(),
  getHealthCheckSummary: vi.fn((result) => `Summary: ${result.status}`),
}))

vi.mock('@/libs/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import type { HealthCheckResult } from '@/libs/health-check'
import { getHealthCheckSummary, performHealthCheck } from '@/libs/health-check'

const mockPerformHealthCheck = vi.mocked(performHealthCheck)
const mockGetHealthCheckSummary = vi.mocked(getHealthCheckSummary)

describe('useHealthCheck', () => {
  const mockHealthCheckResult: HealthCheckResult = {
    status: 'healthy',
    checks: [{ name: 'chrome-api', status: 'pass', message: 'Chrome API is available' }],
    timestamp: Date.now(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockPerformHealthCheck.mockResolvedValue(mockHealthCheckResult)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with null lastCheck', () => {
      const { result } = renderHook(() => useHealthCheck())

      expect(result.current.lastCheck).toBeNull()
    })

    it('should initialize with isChecking as false', () => {
      const { result } = renderHook(() => useHealthCheck())

      expect(result.current.isChecking).toBe(false)
    })

    it('should expose checkHealth function', () => {
      const { result } = renderHook(() => useHealthCheck())

      expect(typeof result.current.checkHealth).toBe('function')
    })
  })

  describe('checkHealth', () => {
    it('should perform health check successfully', async () => {
      const { result } = renderHook(() => useHealthCheck())

      let checkResult: HealthCheckResult | undefined

      await act(async () => {
        checkResult = await result.current.checkHealth()
      })

      expect(mockPerformHealthCheck).toHaveBeenCalledTimes(1)
      expect(checkResult).toEqual(mockHealthCheckResult)
      expect(result.current.lastCheck).toEqual(mockHealthCheckResult)
      expect(result.current.isChecking).toBe(false)
    })

    it('should set isChecking to true during check', async () => {
      let resolveCheck: (value: HealthCheckResult) => void
      const checkPromise = new Promise<HealthCheckResult>((resolve) => {
        resolveCheck = resolve
      })
      mockPerformHealthCheck.mockReturnValueOnce(checkPromise)

      const { result } = renderHook(() => useHealthCheck())

      act(() => {
        result.current.checkHealth()
      })

      // Should be checking
      expect(result.current.isChecking).toBe(true)

      await act(async () => {
        if (resolveCheck) {
          resolveCheck(mockHealthCheckResult)
        }
        await checkPromise
      })

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
    })

    it('should update lastCheck after successful check', async () => {
      const { result } = renderHook(() => useHealthCheck())

      await act(async () => {
        await result.current.checkHealth()
      })

      expect(result.current.lastCheck).toEqual(mockHealthCheckResult)
      expect(result.current.lastCheck?.status).toBe('healthy')
    })

    it('should log health check summary on success', async () => {
      const { logger } = await import('@/libs/logger')

      const { result } = renderHook(() => useHealthCheck())

      await act(async () => {
        await result.current.checkHealth()
      })

      expect(mockGetHealthCheckSummary).toHaveBeenCalledWith(mockHealthCheckResult)
      expect(logger.info).toHaveBeenCalledWith(
        'Health check completed:',
        expect.stringContaining('Summary:')
      )
    })

    it('should handle errors and throw', async () => {
      const error = new Error('Health check failed')
      mockPerformHealthCheck.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useHealthCheck())

      await expect(
        act(async () => {
          await result.current.checkHealth()
        })
      ).rejects.toThrow('Health check failed')

      expect(result.current.isChecking).toBe(false)
      expect(result.current.lastCheck).toBeNull()
    })

    it('should log errors', async () => {
      const { logger } = await import('@/libs/logger')
      const error = new Error('Health check failed')
      mockPerformHealthCheck.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useHealthCheck())

      await act(async () => {
        try {
          await result.current.checkHealth()
        } catch {
          // Expected to throw
        }
      })

      expect(logger.error).toHaveBeenCalledWith('Error performing health check:', error)
    })

    it('should reset isChecking to false after error', async () => {
      const error = new Error('Health check failed')
      mockPerformHealthCheck.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useHealthCheck())

      await act(async () => {
        try {
          await result.current.checkHealth()
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.isChecking).toBe(false)
    })

    it('should handle multiple consecutive checks', async () => {
      const { result } = renderHook(() => useHealthCheck())

      const result1: HealthCheckResult = {
        status: 'healthy',
        checks: [],
        timestamp: Date.now(),
      }
      const result2: HealthCheckResult = {
        status: 'degraded',
        checks: [],
        timestamp: Date.now() + 1000,
      }

      mockPerformHealthCheck.mockResolvedValueOnce(result1).mockResolvedValueOnce(result2)

      await act(async () => {
        await result.current.checkHealth()
      })

      expect(result.current.lastCheck).toEqual(result1)

      await act(async () => {
        await result.current.checkHealth()
      })

      expect(result.current.lastCheck).toEqual(result2)
      expect(mockPerformHealthCheck).toHaveBeenCalledTimes(2)
    })

    it('should maintain lastCheck between checks', async () => {
      const { result } = renderHook(() => useHealthCheck())

      await act(async () => {
        await result.current.checkHealth()
      })

      const firstCheckTimestamp = result.current.lastCheck?.timestamp

      // Create a new result with different timestamp
      const newResult: HealthCheckResult = {
        ...mockHealthCheckResult,
        timestamp: Date.now() + 1000,
      }
      mockPerformHealthCheck.mockResolvedValueOnce(newResult)

      await act(async () => {
        await result.current.checkHealth()
      })

      // Should have updated with new timestamp
      expect(result.current.lastCheck?.timestamp).not.toBe(firstCheckTimestamp)
      expect(result.current.lastCheck).toEqual(newResult)
    })
  })

  describe('State management', () => {
    it('should not update lastCheck on error', async () => {
      const initialResult: HealthCheckResult = {
        status: 'healthy',
        checks: [],
        timestamp: Date.now(),
      }

      const { result } = renderHook(() => useHealthCheck())

      // First successful check
      mockPerformHealthCheck.mockResolvedValueOnce(initialResult)
      await act(async () => {
        await result.current.checkHealth()
      })

      expect(result.current.lastCheck).toEqual(initialResult)

      // Then error
      const error = new Error('Check failed')
      mockPerformHealthCheck.mockRejectedValueOnce(error)

      await act(async () => {
        try {
          await result.current.checkHealth()
        } catch {
          // Expected
        }
      })

      // Should still have the previous result
      expect(result.current.lastCheck).toEqual(initialResult)
    })

    it('should handle rapid successive calls', async () => {
      const { result } = renderHook(() => useHealthCheck())

      await act(async () => {
        const promises = [
          result.current.checkHealth(),
          result.current.checkHealth(),
          result.current.checkHealth(),
        ]
        await Promise.all(promises)
      })

      expect(mockPerformHealthCheck).toHaveBeenCalledTimes(3)
      expect(result.current.isChecking).toBe(false)
    })
  })
})
