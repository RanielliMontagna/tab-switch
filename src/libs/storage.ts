/**
 * Storage utility for Chrome Extension
 * Uses chrome.storage.local when available, falls back to localStorage for development
 */

const STORAGE_KEYS = {
  TABS: 'tabs',
  SWITCH: 'switch',
} as const

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

const isChromeExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id && !!chrome.storage

/**
 * Get value from storage
 */
export async function getStorageItem<T>(key: StorageKey): Promise<T | null> {
  if (isChromeExtension) {
    try {
      const result = await chrome.storage.local.get(key)
      const value = result[key]
      return (value as T) ?? null
    } catch (error) {
      console.error(`Error getting ${key} from chrome.storage:`, error)
      return null
    }
  }

  // Fallback to localStorage
  try {
    const item = localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : null
  } catch (error) {
    console.error(`Error getting ${key} from localStorage:`, error)
    return null
  }
}

/**
 * Set value in storage
 */
export async function setStorageItem<T>(key: StorageKey, value: T): Promise<void> {
  if (isChromeExtension) {
    try {
      await chrome.storage.local.set({ [key]: value })
      return
    } catch (error) {
      console.error(`Error setting ${key} in chrome.storage:`, error)
      throw error
    }
  }

  // Fallback to localStorage
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error setting ${key} in localStorage:`, error)
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
      console.error(`Error removing ${key} from chrome.storage:`, error)
      throw error
    }
  }

  // Fallback to localStorage
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error)
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
      console.error('Error getting all items from chrome.storage:', error)
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

export { STORAGE_KEYS }
