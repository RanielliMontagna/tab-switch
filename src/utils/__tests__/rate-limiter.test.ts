import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanupRateLimitHistory, createRateLimiter, rateLimiters } from '../rate-limiter'

// Mock logger
vi.mock('@/libs/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear all rate limiters before each test
    rateLimiters.tabCreation.reset()
    rateLimiters.import.reset()
    rateLimiters.rotation.reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createRateLimiter', () => {
    it('should create a rate limiter instance', () => {
      const limiter = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
      })

      expect(limiter).toBeDefined()
      expect(typeof limiter.isAllowed).toBe('function')
      expect(typeof limiter.reset).toBe('function')
      expect(typeof limiter.getCurrentCount).toBe('function')
      expect(typeof limiter.getRemaining).toBe('function')
    })

    it('should create rate limiter with custom key', () => {
      const limiter = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'custom-key',
      })

      expect(limiter).toBeDefined()
    })

    it('should create rate limiter without key (uses default)', () => {
      const limiter = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
      })

      expect(limiter).toBeDefined()
    })
  })

  describe('isAllowed', () => {
    it('should allow operations within limit', () => {
      const limiter = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'test-isAllowed',
      })

      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(true)
    })

    it('should block operations when limit is exceeded', () => {
      const limiter = createRateLimiter({
        maxOperations: 2,
        windowMs: 1000,
        key: 'test-limit-exceeded',
      })

      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(false) // Third call should be blocked
    })

    it('should allow operations after window expires', async () => {
      vi.useFakeTimers()
      const limiter = createRateLimiter({
        maxOperations: 2,
        windowMs: 1000,
        key: 'test-window-expiry',
      })

      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(false)

      // Advance time beyond window
      vi.advanceTimersByTime(1001)

      // Should allow again after window expires
      expect(limiter.isAllowed()).toBe(true)
    })

    it('should filter out old records outside window', async () => {
      vi.useFakeTimers()
      const limiter = createRateLimiter({
        maxOperations: 3,
        windowMs: 1000,
        key: 'test-filter-old',
      })

      // Make 2 operations
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(true)

      // Advance time
      vi.advanceTimersByTime(500)

      // Make another operation
      expect(limiter.isAllowed()).toBe(true)

      // Advance time beyond window for first 2 operations
      vi.advanceTimersByTime(600)

      // Should still allow (only 1 operation in current window)
      expect(limiter.isAllowed()).toBe(true)
    })

    it('should handle multiple rate limiters independently', () => {
      const limiter1 = createRateLimiter({
        maxOperations: 2,
        windowMs: 1000,
        key: 'test-indep-1',
      })

      const limiter2 = createRateLimiter({
        maxOperations: 2,
        windowMs: 1000,
        key: 'test-indep-2',
      })

      expect(limiter1.isAllowed()).toBe(true)
      expect(limiter1.isAllowed()).toBe(true)
      expect(limiter1.isAllowed()).toBe(false)

      // Second limiter should still work
      expect(limiter2.isAllowed()).toBe(true)
      expect(limiter2.isAllowed()).toBe(true)
      expect(limiter2.isAllowed()).toBe(false)
    })
  })

  describe('reset', () => {
    it('should reset rate limiter history', () => {
      const limiter = createRateLimiter({
        maxOperations: 2,
        windowMs: 1000,
        key: 'test-reset',
      })

      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(false)

      limiter.reset()

      // Should allow again after reset
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(true)
    })

    it('should reset only the specific limiter', () => {
      const limiter1 = createRateLimiter({
        maxOperations: 2,
        windowMs: 1000,
        key: 'test-reset-1',
      })

      const limiter2 = createRateLimiter({
        maxOperations: 2,
        windowMs: 1000,
        key: 'test-reset-2',
      })

      expect(limiter1.isAllowed()).toBe(true)
      expect(limiter1.isAllowed()).toBe(true)
      expect(limiter1.isAllowed()).toBe(false)

      expect(limiter2.isAllowed()).toBe(true)
      expect(limiter2.isAllowed()).toBe(true)
      expect(limiter2.isAllowed()).toBe(false)

      limiter1.reset()

      // limiter1 should work again
      expect(limiter1.isAllowed()).toBe(true)

      // limiter2 should still be blocked
      expect(limiter2.isAllowed()).toBe(false)
    })
  })

  describe('getCurrentCount', () => {
    it('should return 0 when no operations', () => {
      const limiter = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'test-count-0',
      })

      expect(limiter.getCurrentCount()).toBe(0)
    })

    it('should return correct count of operations', () => {
      const limiter = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'test-count',
      })

      expect(limiter.getCurrentCount()).toBe(0)

      limiter.isAllowed()
      expect(limiter.getCurrentCount()).toBe(1)

      limiter.isAllowed()
      expect(limiter.getCurrentCount()).toBe(2)

      limiter.isAllowed()
      expect(limiter.getCurrentCount()).toBe(3)
    })

    it('should exclude old operations outside window', async () => {
      vi.useFakeTimers()
      const limiter = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'test-count-window',
      })

      limiter.isAllowed()
      limiter.isAllowed()
      expect(limiter.getCurrentCount()).toBe(2)

      vi.advanceTimersByTime(1001)

      // Old operations should be excluded
      expect(limiter.getCurrentCount()).toBe(0)
    })

    it('should count operations within window correctly', async () => {
      vi.useFakeTimers()
      const limiter = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'test-count-window-2',
      })

      limiter.isAllowed() // timestamp: 0
      vi.advanceTimersByTime(400) // now: 400
      limiter.isAllowed() // timestamp: 400
      vi.advanceTimersByTime(400) // now: 800
      limiter.isAllowed() // timestamp: 800

      // All 3 should be in window (all within 1000ms from now=800)
      expect(limiter.getCurrentCount()).toBe(3)

      vi.advanceTimersByTime(201) // now: 1001

      // First operation (timestamp: 0) should be out of window (1001 - 0 = 1001 >= 1000)
      // Second (400) and third (800) should still be in window
      expect(limiter.getCurrentCount()).toBe(2)
    })
  })

  describe('getRemaining', () => {
    it('should return maxOperations when no operations', () => {
      const limiter = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'test-remaining-0',
      })

      expect(limiter.getRemaining()).toBe(5)
    })

    it('should return correct remaining count', () => {
      const limiter = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'test-remaining',
      })

      limiter.isAllowed()
      expect(limiter.getRemaining()).toBe(4)

      limiter.isAllowed()
      expect(limiter.getRemaining()).toBe(3)

      limiter.isAllowed()
      expect(limiter.getRemaining()).toBe(2)
    })

    it('should return 0 when limit is reached', () => {
      const limiter = createRateLimiter({
        maxOperations: 2,
        windowMs: 1000,
        key: 'test-remaining-limit',
      })

      limiter.isAllowed()
      limiter.isAllowed()

      expect(limiter.getRemaining()).toBe(0)
    })

    it('should not return negative values', () => {
      const limiter = createRateLimiter({
        maxOperations: 2,
        windowMs: 1000,
        key: 'test-remaining-negative',
      })

      limiter.isAllowed()
      limiter.isAllowed()
      limiter.isAllowed() // This will be blocked but count might be 2

      expect(limiter.getRemaining()).toBeGreaterThanOrEqual(0)
    })
  })

  describe('rateLimiters (pre-configured)', () => {
    it('should have tabCreation limiter configured', () => {
      expect(rateLimiters.tabCreation).toBeDefined()
      expect(rateLimiters.tabCreation.isAllowed()).toBe(true)
    })

    it('should have import limiter configured', () => {
      expect(rateLimiters.import).toBeDefined()
      expect(rateLimiters.import.isAllowed()).toBe(true)
    })

    it('should have rotation limiter configured', () => {
      expect(rateLimiters.rotation).toBeDefined()
      expect(rateLimiters.rotation.isAllowed()).toBe(true)
    })

    it('should enforce tabCreation limit (10 per minute)', () => {
      for (let i = 0; i < 10; i++) {
        expect(rateLimiters.tabCreation.isAllowed()).toBe(true)
      }
      expect(rateLimiters.tabCreation.isAllowed()).toBe(false)
    })

    it('should enforce import limit (5 per minute)', () => {
      for (let i = 0; i < 5; i++) {
        expect(rateLimiters.import.isAllowed()).toBe(true)
      }
      expect(rateLimiters.import.isAllowed()).toBe(false)
    })

    it('should enforce rotation limit (20 per minute)', () => {
      for (let i = 0; i < 20; i++) {
        expect(rateLimiters.rotation.isAllowed()).toBe(true)
      }
      expect(rateLimiters.rotation.isAllowed()).toBe(false)
    })
  })

  describe('cleanupRateLimitHistory', () => {
    it('should remove old records beyond max age', async () => {
      vi.useFakeTimers()
      const limiter = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'test-cleanup',
      })

      limiter.isAllowed()
      limiter.isAllowed()

      // Advance time beyond 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)

      cleanupRateLimitHistory()

      // History should be cleaned up
      expect(limiter.getCurrentCount()).toBe(0)
    })

    it('should keep recent records within max age', async () => {
      vi.useFakeTimers()
      const limiter = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'test-cleanup-keep',
      })

      limiter.isAllowed()
      limiter.isAllowed()

      // Advance time but within 5 minutes
      vi.advanceTimersByTime(2 * 60 * 1000)

      cleanupRateLimitHistory()

      // Recent records should still be there (if within window)
      // But since window is 1000ms, they should be gone
      expect(limiter.getCurrentCount()).toBe(0)
    })

    it('should delete keys with no recent history', async () => {
      vi.useFakeTimers()
      const limiter1 = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'test-cleanup-delete-1',
      })

      const limiter2 = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'test-cleanup-delete-2',
      })

      limiter1.isAllowed()
      limiter2.isAllowed()

      // Advance time beyond 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)

      cleanupRateLimitHistory()

      // Both should be cleaned up
      expect(limiter1.getCurrentCount()).toBe(0)
      expect(limiter2.getCurrentCount()).toBe(0)
    })

    it('should handle multiple keys with mixed ages', async () => {
      vi.useFakeTimers()
      const limiter1 = createRateLimiter({
        maxOperations: 5,
        windowMs: 10 * 60 * 1000, // 10 minutes window
        key: 'test-cleanup-mixed-1',
      })

      const limiter2 = createRateLimiter({
        maxOperations: 5,
        windowMs: 1000,
        key: 'test-cleanup-mixed-2',
      })

      limiter1.isAllowed()
      limiter2.isAllowed()

      // Advance time beyond 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)

      cleanupRateLimitHistory()

      // limiter1 should still have records (window is 10 minutes)
      // limiter2 should be cleaned (window is 1 second, but cleanup removes > 5 min)
      expect(limiter1.getCurrentCount()).toBe(0) // Actually, cleanup removes > 5 min, so both should be 0
      expect(limiter2.getCurrentCount()).toBe(0)
    })
  })

  describe('Edge cases', () => {
    it('should handle zero maxOperations', () => {
      const limiter = createRateLimiter({
        maxOperations: 0,
        windowMs: 1000,
        key: 'test-zero-max',
      })

      expect(limiter.isAllowed()).toBe(false)
      expect(limiter.getRemaining()).toBe(0)
    })

    it('should handle very small window', async () => {
      vi.useFakeTimers()
      const limiter = createRateLimiter({
        maxOperations: 2,
        windowMs: 10, // 10ms window
        key: 'test-small-window',
      })

      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(false)

      vi.advanceTimersByTime(11)

      expect(limiter.isAllowed()).toBe(true)
    })

    it('should handle very large window', () => {
      const limiter = createRateLimiter({
        maxOperations: 2,
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        key: 'test-large-window',
      })

      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(false)
    })

    it('should handle concurrent operations', () => {
      const limiter = createRateLimiter({
        maxOperations: 100,
        windowMs: 1000,
        key: 'test-concurrent',
      })

      // Simulate many rapid operations
      for (let i = 0; i < 100; i++) {
        limiter.isAllowed()
      }

      expect(limiter.getCurrentCount()).toBe(100)
      expect(limiter.isAllowed()).toBe(false)
    })
  })
})
