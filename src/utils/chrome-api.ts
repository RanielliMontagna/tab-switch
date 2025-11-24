/**
 * Utilities for Chrome Extension API error handling
 * Provides consistent error handling patterns for Chrome APIs
 */

import { logger } from '@/libs/logger'

/**
 * Error types for Chrome API operations
 */
export class ChromeApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: unknown
  ) {
    super(message)
    this.name = 'ChromeApiError'
  }
}

/**
 * Check if Chrome runtime has an error
 * @returns The error message if present, null otherwise
 */
export function getChromeRuntimeError(): string | null {
  if (chrome.runtime.lastError) {
    return chrome.runtime.lastError.message ?? null
  }
  return null
}

/**
 * Wraps a Chrome API callback to handle errors consistently
 * @param callback - The callback function to wrap
 * @param errorMessage - Custom error message prefix
 * @returns Wrapped callback that handles errors
 */
export function wrapChromeCallback<T extends unknown[]>(
  callback: (...args: T) => void,
  errorMessage?: string
): (...args: T) => void {
  return (...args: T) => {
    const error = getChromeRuntimeError()
    if (error) {
      const message = errorMessage ? `${errorMessage}: ${error}` : `Chrome API error: ${error}`
      logger.error(message)
      throw new ChromeApiError(message, 'RUNTIME_ERROR', error)
    }
    callback(...args)
  }
}

/**
 * Promisifies a Chrome API callback-based function
 * @param chromeApiCall - Function that takes a callback as last parameter
 * @param errorMessage - Custom error message for logging
 * @returns Promise that resolves with the result or rejects with ChromeApiError
 */
export function promisifyChromeApi<T>(
  chromeApiCall: (callback: (result: T) => void) => void,
  errorMessage = 'Chrome API call failed'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    chromeApiCall((result: T) => {
      const error = getChromeRuntimeError()
      if (error) {
        const message = `${errorMessage}: ${error}`
        logger.error(message)
        reject(new ChromeApiError(message, 'RUNTIME_ERROR', error))
        return
      }
      resolve(result)
    })
  })
}

/**
 * Promisifies Chrome API calls that return void
 * @param chromeApiCall - Function that takes a callback as last parameter
 * @param errorMessage - Custom error message for logging
 * @returns Promise that resolves or rejects with ChromeApiError
 */
export function promisifyChromeApiVoid(
  chromeApiCall: (callback: () => void) => void,
  errorMessage = 'Chrome API call failed'
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    chromeApiCall(() => {
      const error = getChromeRuntimeError()
      if (error) {
        const message = `${errorMessage}: ${error}`
        logger.error(message)
        reject(new ChromeApiError(message, 'RUNTIME_ERROR', error))
        return
      }
      resolve()
    })
  })
}

/**
 * Checks if Chrome tabs API is available
 * @returns true if tabs API is available, false otherwise
 */
export function hasTabsPermission(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.tabs && typeof chrome.tabs.create === 'function'
}

/**
 * Checks if Chrome storage API is available
 * @returns true if storage API is available, false otherwise
 */
export function hasStoragePermission(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    !!chrome.storage &&
    !!chrome.storage.local &&
    typeof chrome.storage.local.get === 'function'
  )
}

/**
 * Validates that required Chrome permissions are available
 * @param permissions - Array of permission names to check
 * @throws ChromeApiError if any permission is missing
 */
export function validateChromePermissions(permissions: string[]): void {
  const missing: string[] = []

  if (permissions.includes('tabs') && !hasTabsPermission()) {
    missing.push('tabs')
  }

  if (permissions.includes('storage') && !hasStoragePermission()) {
    missing.push('storage')
  }

  if (missing.length > 0) {
    const message = `Missing required Chrome permissions: ${missing.join(', ')}`
    logger.error(message)
    throw new ChromeApiError(message, 'MISSING_PERMISSIONS')
  }
}

/**
 * Safely executes a Chrome API operation with error handling
 * @param operation - The operation to execute
 * @param errorMessage - Custom error message
 * @returns Result of the operation or null if it fails
 */
export async function safeChromeOperation<T>(
  operation: () => Promise<T> | T,
  errorMessage = 'Chrome API operation failed'
): Promise<T | null> {
  try {
    return await Promise.resolve(operation())
  } catch (error) {
    if (error instanceof ChromeApiError) {
      logger.error(`${errorMessage}:`, error.message)
    } else {
      logger.error(`${errorMessage}:`, error)
    }
    return null
  }
}
