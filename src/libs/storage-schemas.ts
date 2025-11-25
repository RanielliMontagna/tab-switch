/**
 * Zod schemas for runtime validation of storage data
 * Ensures type safety and data integrity at runtime
 */

import { z } from 'zod'
import { sessionsStorageSchema, tabSchema } from '@/containers/home/home.schema'

/**
 * Schema for validating tabs array from storage
 */
export const tabsStorageSchema = z.array(tabSchema)

/**
 * Schema for validating switch state from storage
 */
export const switchStorageSchema = z.boolean()

/**
 * Schema for validating pause state from storage
 */
export const pauseStateStorageSchema = z.boolean()

/**
 * Schema for validating theme preference from storage
 */
export const themeStorageSchema = z.enum(['light', 'dark', 'system'])

/**
 * Schema for validating language preference from storage
 */
export const languageStorageSchema = z.enum(['pt', 'en'])

/**
 * Schema for validating tab behavior preference from storage
 * - 'keep-tabs': Keeps existing tabs and adds rotation tabs to current window
 * - 'close-others': Closes tabs not in rotation (legacy behavior)
 */
export const tabBehaviorStorageSchema = z.enum(['keep-tabs', 'close-others'])

/**
 * Schema for validating data version from storage
 */
export const dataVersionStorageSchema = z.number().int().nonnegative()

/**
 * Validates tabs data from storage
 * @param data - Data to validate
 * @returns Validated tabs array or empty array if validation fails
 */
export function validateTabsStorage(data: unknown): z.infer<typeof tabsStorageSchema> {
  try {
    return tabsStorageSchema.parse(data)
  } catch {
    return []
  }
}

/**
 * Validates switch state from storage
 * @param data - Data to validate
 * @returns Validated boolean or false if validation fails
 */
export function validateSwitchStorage(data: unknown): z.infer<typeof switchStorageSchema> {
  try {
    return switchStorageSchema.parse(data)
  } catch {
    return false
  }
}

/**
 * Validates pause state from storage
 * @param data - Data to validate
 * @returns Validated boolean or false if validation fails
 */
export function validatePauseStateStorage(data: unknown): z.infer<typeof pauseStateStorageSchema> {
  try {
    return pauseStateStorageSchema.parse(data)
  } catch {
    return false
  }
}

/**
 * Validates theme preference from storage
 * @param data - Data to validate
 * @returns Validated theme or 'system' if validation fails
 */
export function validateThemeStorage(data: unknown): z.infer<typeof themeStorageSchema> {
  try {
    return themeStorageSchema.parse(data)
  } catch {
    return 'system'
  }
}

/**
 * Validates language preference from storage
 * @param data - Data to validate
 * @returns Validated language or 'en' if validation fails
 */
export function validateLanguageStorage(data: unknown): z.infer<typeof languageStorageSchema> {
  try {
    return languageStorageSchema.parse(data)
  } catch {
    return 'en'
  }
}

/**
 * Validates tab behavior preference from storage
 * @param data - Data to validate
 * @returns Validated tab behavior or 'keep-tabs' if validation fails
 */
export function validateTabBehaviorStorage(
  data: unknown
): z.infer<typeof tabBehaviorStorageSchema> {
  try {
    return tabBehaviorStorageSchema.parse(data)
  } catch {
    return 'keep-tabs'
  }
}

/**
 * Validates data version from storage
 * @param data - Data to validate
 * @returns Validated version number or 0 if validation fails
 */
export function validateDataVersionStorage(
  data: unknown
): z.infer<typeof dataVersionStorageSchema> {
  try {
    return dataVersionStorageSchema.parse(data)
  } catch {
    return 0
  }
}

/**
 * Schema for validating sessions from storage
 */
export const sessionsStorageValidationSchema = sessionsStorageSchema

/**
 * Validates sessions data from storage
 * @param data - Data to validate
 * @returns Validated sessions storage or default structure if validation fails
 */
export function validateSessionsStorage(
  data: unknown
): z.infer<typeof sessionsStorageValidationSchema> {
  try {
    return sessionsStorageValidationSchema.parse(data)
  } catch {
    return {
      sessions: [],
      currentSessionId: undefined,
    }
  }
}
