/**
 * Storage utility for Chrome Extension
 * Uses chrome.storage.local when available, falls back to localStorage for development
 */

import type { TabSchema } from '@/containers/home/home.schema'
import { logger } from './logger'
import { CURRENT_DATA_VERSION, migrateData, STORAGE_VERSION_KEY, validateTabs } from './migrations'
import {
  validateDataVersionStorage,
  validateLanguageStorage,
  validatePauseStateStorage,
  validateSwitchStorage,
  validateTabsStorage,
  validateThemeStorage,
} from './storage-schemas'

const STORAGE_KEYS = {
  TABS: 'tabs',
  SWITCH: 'switch',
  IS_PAUSED: 'isPaused',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS] | typeof STORAGE_VERSION_KEY

const isChromeExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id && !!chrome.storage

/**
 * Get value from storage
 */
/**
 * Get value from storage with runtime type validation
 * @param key - Storage key
 * @returns Validated value or null if not found/invalid
 */
export async function getStorageItem<T>(key: StorageKey | string): Promise<T | null> {
  if (isChromeExtension) {
    try {
      const result = await chrome.storage.local.get(key)
      const value = result[key]

      // Runtime validation based on key
      if (value !== undefined && value !== null) {
        const validated = validateStorageValue(key, value)
        return (validated as T) ?? null
      }

      return null
    } catch (error) {
      logger.error(`Error getting ${key} from chrome.storage:`, error)
      return null
    }
  }

  // Fallback to localStorage
  try {
    const item = localStorage.getItem(key)
    if (!item) {
      return null
    }

    const parsed = JSON.parse(item)
    // Runtime validation based on key
    const validated = validateStorageValue(key, parsed)
    return (validated as T) ?? null
  } catch (error) {
    logger.error(`Error getting ${key} from localStorage:`, error)
    return null
  }
}

/**
 * Validates storage value based on key using Zod schemas
 * @param key - Storage key
 * @param value - Value to validate
 * @returns Validated value or null if validation fails
 */
function validateStorageValue(key: StorageKey | string, value: unknown): unknown {
  // Validate based on key type
  if (key === STORAGE_KEYS.TABS) {
    return validateTabsStorage(value)
  }
  if (key === STORAGE_KEYS.SWITCH) {
    return validateSwitchStorage(value)
  }
  if (key === STORAGE_KEYS.IS_PAUSED) {
    return validatePauseStateStorage(value)
  }
  if (key === STORAGE_KEYS.THEME) {
    return validateThemeStorage(value)
  }
  if (key === STORAGE_KEYS.LANGUAGE) {
    return validateLanguageStorage(value)
  }
  if (key === STORAGE_VERSION_KEY) {
    return validateDataVersionStorage(value)
  }

  // For unknown keys, return as-is (but log warning in development)
  if (import.meta.env.DEV) {
    logger.debug(`No validation schema for storage key: ${key}`)
  }
  return value
}

/**
 * Set value in storage
 */
export async function setStorageItem<T>(key: StorageKey, value: T): Promise<void> {
  if (isChromeExtension) {
    try {
      // If saving tabs, also update the data version
      if (key === STORAGE_KEYS.TABS) {
        await chrome.storage.local.set({
          [key]: value,
          [STORAGE_VERSION_KEY]: CURRENT_DATA_VERSION,
        })
      } else {
        await chrome.storage.local.set({ [key]: value })
      }
      return
    } catch (error) {
      logger.error(`Error setting ${key} in chrome.storage:`, error)
      throw error
    }
  }

  // Fallback to localStorage
  try {
    localStorage.setItem(key, JSON.stringify(value))
    // If saving tabs, also update the data version
    if (key === STORAGE_KEYS.TABS) {
      localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_DATA_VERSION))
    }
  } catch (error) {
    logger.error(`Error setting ${key} in localStorage:`, error)
    throw error
  }
}

/**
 * Remove value from storage
 */
export async function removeStorageItem(key: StorageKey): Promise<void> {
  if (isChromeExtension) {
    try {
      await chrome.storage.local.remove(key)
      return
    } catch (error) {
      logger.error(`Error removing ${key} from chrome.storage:`, error)
      throw error
    }
  }

  // Fallback to localStorage
  try {
    localStorage.removeItem(key)
  } catch (error) {
    logger.error(`Error removing ${key} from localStorage:`, error)
    throw error
  }
}

/**
 * Get all storage items
 */
export async function getAllStorageItems(): Promise<Record<string, unknown>> {
  if (isChromeExtension) {
    try {
      const result = await chrome.storage.local.get(null)
      return result as Record<string, unknown>
    } catch (error) {
      logger.error('Error getting all items from chrome.storage:', error)
      return {}
    }
  }

  // Fallback to localStorage
  const items: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      try {
        const value = localStorage.getItem(key)
        items[key] = value ? JSON.parse(value) : null
      } catch {
        items[key] = localStorage.getItem(key)
      }
    }
  }
  return items
}

/**
 * Get tabs with automatic migration and validation
 */
export async function getTabsWithMigration(): Promise<TabSchema[]> {
  // Get current version
  const version = await getStorageItem<number>(STORAGE_VERSION_KEY as StorageKey)

  // Get tabs data
  const tabsData = await getStorageItem<unknown>(STORAGE_KEYS.TABS)

  if (!tabsData) {
    return []
  }

  // Migrate data if needed
  const migratedData = migrateData(tabsData, version)

  // Validate migrated data
  const validatedTabs = validateTabs(migratedData)

  // If migration occurred, save the migrated and validated data
  if (version !== CURRENT_DATA_VERSION && validatedTabs.length > 0) {
    await setStorageItem(STORAGE_KEYS.TABS, validatedTabs)
    logger.info(`Migrated tabs from version ${version ?? 0} to ${CURRENT_DATA_VERSION}`)
  }

  return validatedTabs
}

export { STORAGE_KEYS }
