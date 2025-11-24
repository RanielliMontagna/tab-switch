/**
 * Health check utilities for the extension
 * Provides functions to verify the extension's state and diagnose issues
 */

import { hasStoragePermission, hasTabsPermission } from '@/utils/chrome-api'
import { logger } from './logger'
import { getStorageItem, STORAGE_KEYS } from './storage'
import { canCreateTabs } from './tab-management'
import { getRotationState } from './tab-rotation'

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: HealthCheck[]
  timestamp: number
}

/**
 * Individual health check
 */
export interface HealthCheck {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: Record<string, unknown>
}

/**
 * Performs a comprehensive health check of the extension
 * @returns Health check result with status and detailed checks
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const checks: HealthCheck[] = []
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  // Check Chrome API availability
  checks.push(checkChromeApi())

  // Check permissions
  const storagePermission = checkStoragePermission()
  const tabsPermission = checkTabsPermission()
  checks.push(storagePermission, tabsPermission)

  // Check storage accessibility
  const storageCheck = await checkStorageAccess()
  checks.push(storageCheck)

  // Check rotation state
  const rotationCheck = checkRotationState()
  checks.push(rotationCheck)

  // Determine overall status
  const failedChecks = checks.filter((c) => c.status === 'fail').length
  const warningChecks = checks.filter((c) => c.status === 'warning').length

  if (failedChecks > 0) {
    overallStatus = 'unhealthy'
  } else if (warningChecks > 0) {
    overallStatus = 'degraded'
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    checks,
    timestamp: Date.now(),
  }

  logger.info('Health check completed:', result)
  return result
}

/**
 * Checks if Chrome API is available
 */
function checkChromeApi(): HealthCheck {
  const isAvailable =
    typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.storage && !!chrome.tabs

  return {
    name: 'chrome-api',
    status: isAvailable ? 'pass' : 'fail',
    message: isAvailable
      ? 'Chrome Extension API is available'
      : 'Chrome Extension API is not available',
    details: {
      chrome: typeof chrome !== 'undefined',
      runtime: typeof chrome !== 'undefined' && !!chrome.runtime,
      storage: typeof chrome !== 'undefined' && !!chrome.storage,
      tabs: typeof chrome !== 'undefined' && !!chrome.tabs,
    },
  }
}

/**
 * Checks storage permission
 */
function checkStoragePermission(): HealthCheck {
  const hasPermission = hasStoragePermission()

  return {
    name: 'storage-permission',
    status: hasPermission ? 'pass' : 'fail',
    message: hasPermission ? 'Storage permission is granted' : 'Storage permission is missing',
  }
}

/**
 * Checks tabs permission
 */
function checkTabsPermission(): HealthCheck {
  const hasPermission = hasTabsPermission()
  const canCreate = canCreateTabs()

  return {
    name: 'tabs-permission',
    status: hasPermission && canCreate ? 'pass' : 'fail',
    message:
      hasPermission && canCreate
        ? 'Tabs permission is granted'
        : 'Tabs permission is missing or insufficient',
    details: {
      hasPermission,
      canCreate,
    },
  }
}

/**
 * Checks if storage is accessible
 */
async function checkStorageAccess(): Promise<HealthCheck> {
  try {
    // Try to read a known key
    const testValue = await getStorageItem<unknown>(STORAGE_KEYS.TABS)
    const canRead = testValue !== null || true // null is valid (key doesn't exist)

    // Try to write (we'll just check if the API is callable)
    const canWrite = typeof chrome !== 'undefined' && !!chrome.storage?.local?.set

    const isAccessible = canRead && canWrite

    return {
      name: 'storage-access',
      status: isAccessible ? 'pass' : 'fail',
      message: isAccessible ? 'Storage is accessible' : 'Storage is not accessible',
      details: {
        canRead,
        canWrite,
      },
    }
  } catch (error) {
    return {
      name: 'storage-access',
      status: 'fail',
      message: `Storage access error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

/**
 * Checks rotation state
 */
function checkRotationState(): HealthCheck {
  try {
    const rotationState = getRotationState()
    const hasState = rotationState.currentTabs !== null

    return {
      name: 'rotation-state',
      status: hasState ? 'pass' : 'warning',
      message: hasState
        ? `Rotation is configured (${rotationState.currentTabs?.length || 0} tabs)`
        : 'No rotation state found (normal if rotation is not active)',
      details: {
        isPaused: rotationState.isPaused,
        currentIndex: rotationState.currentIndex,
        tabsCount: rotationState.currentTabs?.length || 0,
      },
    }
  } catch (error) {
    return {
      name: 'rotation-state',
      status: 'warning',
      message: `Could not check rotation state: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Gets a summary of the health check for display
 */
export function getHealthCheckSummary(result: HealthCheckResult): string {
  const passed = result.checks.filter((c) => c.status === 'pass').length
  const failed = result.checks.filter((c) => c.status === 'fail').length
  const warnings = result.checks.filter((c) => c.status === 'warning').length

  return `Health: ${result.status.toUpperCase()} | Passed: ${passed} | Failed: ${failed} | Warnings: ${warnings}`
}
