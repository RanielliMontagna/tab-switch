/**
 * Hook for health checks
 * Provides health check functionality for the extension
 */

import { useCallback, useState } from 'react'
import {
  getHealthCheckSummary,
  type HealthCheckResult,
  performHealthCheck,
} from '@/libs/health-check'
import { logger } from '@/libs/logger'

/**
 * Hook for managing health checks
 * @returns Object with health check state and functions
 */
export function useHealthCheck() {
  const [lastCheck, setLastCheck] = useState<HealthCheckResult | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  /**
   * Performs a health check
   */
  const checkHealth = useCallback(async (): Promise<HealthCheckResult> => {
    setIsChecking(true)
    try {
      const result = await performHealthCheck()
      setLastCheck(result)
      logger.info('Health check completed:', getHealthCheckSummary(result))
      return result
    } catch (error) {
      logger.error('Error performing health check:', error)
      throw error
    } finally {
      setIsChecking(false)
    }
  }, [])

  return {
    lastCheck,
    isChecking,
    checkHealth,
  }
}
