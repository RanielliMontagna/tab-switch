/**
 * Data integrity utilities
 * Provides functions to verify data integrity using checksums/hashes
 */

import { logger } from '@/libs/logger'

/**
 * Simple hash function for data integrity checking
 * Uses a simple hash algorithm suitable for small data sets
 * @param data - Data to hash
 * @returns Hash string
 */
function simpleHash(data: string): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Generates a checksum for data
 * @param data - Data to generate checksum for
 * @returns Checksum string
 */
export function generateChecksum(data: unknown): string {
  try {
    const jsonString = JSON.stringify(data)
    return simpleHash(jsonString)
  } catch (error) {
    logger.error('Error generating checksum:', error)
    return ''
  }
}

/**
 * Verifies data integrity by comparing checksums
 * @param data - Data to verify
 * @param expectedChecksum - Expected checksum
 * @returns true if checksums match, false otherwise
 */
export function verifyChecksum(data: unknown, expectedChecksum: string): boolean {
  const actualChecksum = generateChecksum(data)
  return actualChecksum === expectedChecksum
}

/**
 * Data with integrity information
 */
export interface DataWithIntegrity<T> {
  data: T
  checksum: string
  version?: number
  timestamp?: number
}

/**
 * Wraps data with integrity information
 * @param data - Data to wrap
 * @param version - Optional version number
 * @returns Data with integrity information
 */
export function wrapWithIntegrity<T>(data: T, version?: number): DataWithIntegrity<T> {
  return {
    data,
    checksum: generateChecksum(data),
    version,
    timestamp: Date.now(),
  }
}

/**
 * Validates and unwraps data with integrity information
 * @param wrapped - Wrapped data with integrity
 * @returns Unwrapped data if valid, null otherwise
 */
export function unwrapWithIntegrity<T>(wrapped: DataWithIntegrity<T>): T | null {
  if (!wrapped.data || !wrapped.checksum) {
    logger.warn('Invalid integrity data: missing data or checksum')
    return null
  }

  const isValid = verifyChecksum(wrapped.data, wrapped.checksum)
  if (!isValid) {
    logger.warn('Data integrity check failed: checksum mismatch')
    return null
  }

  return wrapped.data
}

/**
 * Validates imported data integrity
 * @param importedData - Data imported from file
 * @param expectedChecksum - Optional expected checksum
 * @returns Validation result
 */
export function validateImportedData<T>(
  importedData: unknown,
  expectedChecksum?: string
): { isValid: boolean; data: T | null; error?: string } {
  try {
    // If data has integrity wrapper, validate it
    if (
      typeof importedData === 'object' &&
      importedData !== null &&
      'data' in importedData &&
      'checksum' in importedData
    ) {
      const unwrapped = unwrapWithIntegrity(importedData as DataWithIntegrity<T>)
      if (unwrapped === null) {
        return {
          isValid: false,
          data: null,
          error: 'Data integrity check failed',
        }
      }
      return { isValid: true, data: unwrapped }
    }

    // If expected checksum provided, validate against it
    if (expectedChecksum) {
      const isValid = verifyChecksum(importedData, expectedChecksum)
      if (!isValid) {
        return {
          isValid: false,
          data: null,
          error: 'Checksum validation failed',
        }
      }
    }

    return { isValid: true, data: importedData as T }
  } catch (error) {
    logger.error('Error validating imported data:', error)
    return {
      isValid: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
