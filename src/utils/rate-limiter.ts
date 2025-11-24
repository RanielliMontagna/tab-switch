/**
 * Rate limiter utility
 * Prevents abuse of sensitive operations by limiting the frequency of operations
 */

import { logger } from '@/libs/logger'

/**
 * Rate limiter configuration
 */
interface RateLimiterConfig {
  /**
   * Maximum number of operations allowed
   */
  maxOperations: number
  /**
   * Time window in milliseconds
   */
  windowMs: number
  /**
   * Optional key for scoped rate limiting
   */
  key?: string
}

/**
 * Operation record for tracking
 */
interface OperationRecord {
  timestamp: number
  count: number
}

/**
 * In-memory storage for rate limit tracking
 * In a production environment, this could be stored in chrome.storage
 */
const operationHistory = new Map<string, OperationRecord[]>()

/**
 * Rate limiter class
 */
class RateLimiter {
  private config: RateLimiterConfig
  private historyKey: string

  constructor(config: RateLimiterConfig) {
    this.config = config
    this.historyKey = config.key || 'default'
  }

  /**
   * Checks if an operation is allowed
   * @returns true if allowed, false if rate limited
   */
  isAllowed(): boolean {
    const now = Date.now()
    const history = operationHistory.get(this.historyKey) || []

    // Remove old records outside the time window
    const recentHistory = history.filter((record) => now - record.timestamp < this.config.windowMs)

    // Count total operations in the window
    const totalOperations = recentHistory.reduce((sum, record) => sum + record.count, 0)

    if (totalOperations >= this.config.maxOperations) {
      logger.warn(
        `Rate limit exceeded for ${this.historyKey}: ${totalOperations}/${this.config.maxOperations} operations in ${this.config.windowMs}ms`
      )
      return false
    }

    // Add current operation
    recentHistory.push({ timestamp: now, count: 1 })
    operationHistory.set(this.historyKey, recentHistory)

    return true
  }

  /**
   * Resets the rate limiter for this key
   */
  reset(): void {
    operationHistory.delete(this.historyKey)
  }

  /**
   * Gets the current operation count in the window
   */
  getCurrentCount(): number {
    const now = Date.now()
    const history = operationHistory.get(this.historyKey) || []
    const recentHistory = history.filter((record) => now - record.timestamp < this.config.windowMs)
    return recentHistory.reduce((sum, record) => sum + record.count, 0)
  }

  /**
   * Gets the remaining operations allowed
   */
  getRemaining(): number {
    return Math.max(0, this.config.maxOperations - this.getCurrentCount())
  }
}

/**
 * Creates a rate limiter instance
 * @param config - Rate limiter configuration
 * @returns Rate limiter instance
 */
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  return new RateLimiter(config)
}

/**
 * Pre-configured rate limiters for common operations
 */
export const rateLimiters = {
  /**
   * Rate limiter for tab creation (max 10 tabs per minute)
   */
  tabCreation: createRateLimiter({
    maxOperations: 10,
    windowMs: 60 * 1000, // 1 minute
    key: 'tab-creation',
  }),

  /**
   * Rate limiter for import operations (max 5 imports per minute)
   */
  import: createRateLimiter({
    maxOperations: 5,
    windowMs: 60 * 1000, // 1 minute
    key: 'import',
  }),

  /**
   * Rate limiter for rotation start/stop (max 20 operations per minute)
   */
  rotation: createRateLimiter({
    maxOperations: 20,
    windowMs: 60 * 1000, // 1 minute
    key: 'rotation',
  }),
}

/**
 * Cleans up old rate limit records (should be called periodically)
 */
export function cleanupRateLimitHistory(): void {
  const now = Date.now()
  const maxAge = 5 * 60 * 1000 // 5 minutes

  for (const [key, history] of operationHistory.entries()) {
    const recentHistory = history.filter((record) => now - record.timestamp < maxAge)
    if (recentHistory.length === 0) {
      operationHistory.delete(key)
    } else {
      operationHistory.set(key, recentHistory)
    }
  }
}

// Cleanup old records every 5 minutes (only in browser environment)
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimitHistory, 5 * 60 * 1000)
} else if (typeof globalThis !== 'undefined' && 'setInterval' in globalThis) {
  // For service worker environment
  setInterval(cleanupRateLimitHistory, 5 * 60 * 1000)
}
