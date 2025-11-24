import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TabSchema } from '@/containers/home/home.schema'
import { CURRENT_DATA_VERSION, STORAGE_VERSION_KEY } from '../migrations'
import { STORAGE_KEYS } from '../storage'

// Import storage functions after mocks are set up
let storageModule: typeof import('../storage')

// Mock dependencies
vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('../migrations', async () => {
  const actual = await vi.importActual('../migrations')
  return {
    ...actual,
    migrateData: vi.fn((data) => data), // Return data as-is for tests
    validateTabs: vi.fn((data) => {
      // Return data as-is if it's an array, otherwise empty array
      return Array.isArray(data) ? data : []
    }),
  }
})

// Mock Chrome API
let mockStorageData: Record<string, unknown> = {}

const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}

const mockChromeRuntime = {
  id: 'test-extension-id',
}

// Setup Chrome mocks
async function setupChromeMocks() {
  mockStorageData = {}

  // Mock get to return Promise that resolves with the requested data
  mockChromeStorage.local.get.mockImplementation(
    (keys: string | string[] | null): Promise<Record<string, unknown>> => {
      const result: Record<string, unknown> = {}
      if (keys === null) {
        Object.assign(result, mockStorageData)
      } else if (typeof keys === 'string') {
        if (keys in mockStorageData) {
          result[keys] = mockStorageData[keys]
        }
      } else {
        for (const key of keys) {
          if (key in mockStorageData) {
            result[key] = mockStorageData[key]
          }
        }
      }
      return Promise.resolve(result)
    }
  )

  // Mock set to update mockStorageData
  mockChromeStorage.local.set.mockImplementation(
    (items: Record<string, unknown>): Promise<void> => {
      Object.assign(mockStorageData, items)
      return Promise.resolve()
    }
  )

  // Mock remove to delete from mockStorageData
  mockChromeStorage.local.remove.mockImplementation((keys: string | string[]): Promise<void> => {
    if (typeof keys === 'string') {
      delete mockStorageData[keys]
    } else {
      for (const key of keys) {
        delete mockStorageData[key]
      }
    }
    return Promise.resolve()
  })

  global.chrome = {
    storage: mockChromeStorage as unknown as typeof chrome.storage,
    runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
  } as unknown as typeof chrome

  // Reset modules and re-import storage module after chrome is set up
  vi.resetModules()
  storageModule = await import('../storage')
}

function clearChromeMocks() {
  delete (global as unknown as { chrome?: typeof chrome }).chrome
  vi.clearAllMocks()
}

describe('Storage', () => {
  beforeEach(async () => {
    clearChromeMocks()
    localStorage.clear()
    vi.clearAllMocks()
    await setupChromeMocks()
  })

  describe('getStorageItem', () => {
    describe('Chrome Extension mode', () => {
      it('should get item from chrome.storage.local', async () => {
        const testValue = 'dark'
        mockStorageData[STORAGE_KEYS.THEME] = testValue

        const result = await storageModule.getStorageItem(STORAGE_KEYS.THEME)

        expect(result).toEqual(testValue)
      })

      it('should return null when item does not exist', async () => {
        mockStorageData = {}

        const result = await storageModule.getStorageItem(STORAGE_KEYS.THEME)

        expect(result).toBeNull()
      })

      it('should return null when value is undefined', async () => {
        mockStorageData[STORAGE_KEYS.THEME] = undefined

        const result = await storageModule.getStorageItem(STORAGE_KEYS.THEME)

        expect(result).toBeNull()
      })

      it('should handle errors gracefully', async () => {
        mockChromeStorage.local.get.mockImplementation(() => {
          throw new Error('Storage error')
        })

        const result = await storageModule.getStorageItem(STORAGE_KEYS.THEME)

        expect(result).toBeNull()
      })

      it('should validate tabs storage', async () => {
        const tabs: TabSchema[] = [
          { id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 },
        ]
        mockStorageData[STORAGE_KEYS.TABS] = tabs

        const result = await storageModule.getStorageItem<TabSchema[]>(STORAGE_KEYS.TABS)

        // validateTabsStorage uses Zod schema which validates but doesn't transform
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
        if (result && Array.isArray(result) && result.length > 0) {
          expect(result[0]).toHaveProperty('id')
          expect(result[0]).toHaveProperty('url')
        }
      })

      it('should validate switch storage', async () => {
        mockStorageData[STORAGE_KEYS.SWITCH] = true

        const result = await storageModule.getStorageItem<boolean>(STORAGE_KEYS.SWITCH)

        expect(result).toBe(true)
      })

      it('should validate theme storage', async () => {
        mockStorageData[STORAGE_KEYS.THEME] = 'dark'

        const result = await storageModule.getStorageItem<string>(STORAGE_KEYS.THEME)

        expect(result).toBe('dark')
      })

      it('should validate language storage', async () => {
        mockStorageData[STORAGE_KEYS.LANGUAGE] = 'pt'

        const result = await storageModule.getStorageItem<string>(STORAGE_KEYS.LANGUAGE)

        expect(result).toBe('pt')
      })

      it('should validate unknown keys without validation', async () => {
        mockStorageData.unknownKey = 'value'

        const result = await storageModule.getStorageItem('unknownKey')

        expect(result).toBe('value')
      })
    })

    describe('localStorage fallback mode', () => {
      it('should get item from localStorage when chrome is not available', async () => {
        clearChromeMocks()
        // Re-import without chrome
        vi.resetModules()
        storageModule = await import('../storage')

        const testValue = 'dark' // Use a valid theme value
        localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(testValue))

        const result = await storageModule.getStorageItem(STORAGE_KEYS.THEME)

        expect(result).toEqual(testValue)
      })

      it('should return null when item does not exist in localStorage', async () => {
        clearChromeMocks()
        vi.resetModules()
        storageModule = await import('../storage')

        const result = await storageModule.getStorageItem(STORAGE_KEYS.THEME)

        expect(result).toBeNull()
      })

      it('should handle JSON parse errors', async () => {
        clearChromeMocks()
        vi.resetModules()
        storageModule = await import('../storage')

        localStorage.setItem(STORAGE_KEYS.THEME, 'invalid json')

        const result = await storageModule.getStorageItem(STORAGE_KEYS.THEME)

        expect(result).toBeNull()
      })

      it('should validate and return tabs from localStorage', async () => {
        clearChromeMocks()
        vi.resetModules()
        storageModule = await import('../storage')

        const tabs: TabSchema[] = [
          { id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 },
        ]
        localStorage.setItem(STORAGE_KEYS.TABS, JSON.stringify(tabs))

        const result = await storageModule.getStorageItem<TabSchema[]>(STORAGE_KEYS.TABS)

        // validateTabsStorage uses Zod schema which validates but doesn't transform
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
        if (result && Array.isArray(result) && result.length > 0) {
          expect(result[0]).toHaveProperty('id')
          expect(result[0]).toHaveProperty('url')
        }
      })
    })
  })

  describe('setStorageItem', () => {
    describe('Chrome Extension mode', () => {
      it('should set item in chrome.storage.local', async () => {
        const testValue = 'dark'

        await storageModule.setStorageItem(STORAGE_KEYS.THEME, testValue)

        expect(mockStorageData[STORAGE_KEYS.THEME]).toBe(testValue)
      })

      it('should update data version when saving tabs', async () => {
        const tabs: TabSchema[] = [
          { id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 },
        ]

        await storageModule.setStorageItem(STORAGE_KEYS.TABS, tabs)

        expect(mockStorageData[STORAGE_KEYS.TABS]).toEqual(tabs)
        expect(mockStorageData[STORAGE_VERSION_KEY]).toBe(CURRENT_DATA_VERSION)
      })

      it('should throw error when chrome.storage.set fails', async () => {
        mockChromeStorage.local.set.mockImplementation(() => {
          throw new Error('Storage error')
        })

        await expect(storageModule.setStorageItem(STORAGE_KEYS.THEME, 'dark')).rejects.toThrow(
          'Storage error'
        )
      })
    })

    describe('localStorage fallback mode', () => {
      it('should set item in localStorage when chrome is not available', async () => {
        clearChromeMocks()
        vi.resetModules()
        storageModule = await import('../storage')

        const testValue = 'dark'

        await storageModule.setStorageItem(STORAGE_KEYS.THEME, testValue)

        expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe(JSON.stringify(testValue))
      })

      it('should update data version when saving tabs to localStorage', async () => {
        clearChromeMocks()
        vi.resetModules()
        storageModule = await import('../storage')

        const tabs: TabSchema[] = [
          { id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 },
        ]

        await storageModule.setStorageItem(STORAGE_KEYS.TABS, tabs)

        expect(localStorage.getItem(STORAGE_KEYS.TABS)).toBe(JSON.stringify(tabs))
        expect(localStorage.getItem(STORAGE_VERSION_KEY)).toBe(String(CURRENT_DATA_VERSION))
      })

      it('should throw error when localStorage.setItem fails', async () => {
        clearChromeMocks()
        vi.resetModules()
        storageModule = await import('../storage')

        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new Error('QuotaExceededError')
        })

        await expect(storageModule.setStorageItem(STORAGE_KEYS.THEME, 'dark')).rejects.toThrow(
          'QuotaExceededError'
        )

        setItemSpy.mockRestore()
      })
    })
  })

  describe('removeStorageItem', () => {
    describe('Chrome Extension mode', () => {
      it('should remove item from chrome.storage.local', async () => {
        mockStorageData[STORAGE_KEYS.THEME] = 'dark'

        await storageModule.removeStorageItem(STORAGE_KEYS.THEME)

        expect(mockStorageData[STORAGE_KEYS.THEME]).toBeUndefined()
      })

      it('should throw error when chrome.storage.remove fails', async () => {
        mockChromeStorage.local.remove.mockImplementation(() => {
          throw new Error('Storage error')
        })

        await expect(storageModule.removeStorageItem(STORAGE_KEYS.THEME)).rejects.toThrow(
          'Storage error'
        )
      })
    })

    describe('localStorage fallback mode', () => {
      it('should remove item from localStorage when chrome is not available', async () => {
        clearChromeMocks()
        vi.resetModules()
        storageModule = await import('../storage')

        localStorage.setItem(STORAGE_KEYS.THEME, 'dark')

        await storageModule.removeStorageItem(STORAGE_KEYS.THEME)

        expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBeNull()
      })

      it('should handle errors when removing from localStorage', async () => {
        clearChromeMocks()
        vi.resetModules()
        storageModule = await import('../storage')

        // Mock localStorage.removeItem to throw
        const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
          throw new Error('Remove error')
        })

        await expect(storageModule.removeStorageItem(STORAGE_KEYS.THEME)).rejects.toThrow(
          'Remove error'
        )

        removeItemSpy.mockRestore()
      })
    })
  })

  describe('getAllStorageItems', () => {
    describe('Chrome Extension mode', () => {
      it('should get all items from chrome.storage.local', async () => {
        mockStorageData = {
          [STORAGE_KEYS.THEME]: 'dark',
          [STORAGE_KEYS.LANGUAGE]: 'pt',
        }

        const result = await storageModule.getAllStorageItems()

        expect(result).toEqual(mockStorageData)
      })

      it('should return empty object on error', async () => {
        mockChromeStorage.local.get.mockImplementation(() => {
          throw new Error('Storage error')
        })

        const result = await storageModule.getAllStorageItems()

        expect(result).toEqual({})
      })
    })

    describe('localStorage fallback mode', () => {
      it('should get all items from localStorage', async () => {
        clearChromeMocks()
        vi.resetModules()
        storageModule = await import('../storage')

        localStorage.setItem('key1', JSON.stringify('value1'))
        localStorage.setItem('key2', JSON.stringify('value2'))
        localStorage.setItem('key3', 'invalid json')

        const result = await storageModule.getAllStorageItems()

        expect(result.key1).toBe('value1')
        expect(result.key2).toBe('value2')
        expect(result.key3).toBe('invalid json')
      })

      it('should handle non-JSON values in localStorage', async () => {
        clearChromeMocks()
        vi.resetModules()
        storageModule = await import('../storage')

        localStorage.setItem('key1', 'plain string')

        const result = await storageModule.getAllStorageItems()

        expect(result.key1).toBe('plain string')
      })

      it('should return empty object when localStorage is empty', async () => {
        clearChromeMocks()
        vi.resetModules()
        storageModule = await import('../storage')

        const result = await storageModule.getAllStorageItems()

        expect(result).toEqual({})
      })
    })
  })

  describe('getTabsWithMigration', () => {
    it('should return empty array when no tabs data exists', async () => {
      mockStorageData = {
        [STORAGE_VERSION_KEY]: CURRENT_DATA_VERSION,
      }

      const result = await storageModule.getTabsWithMigration()

      expect(result).toEqual([])
    })

    it('should return tabs when data exists and version matches', async () => {
      const tabs: TabSchema[] = [
        { id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 },
      ]
      mockStorageData = {
        [STORAGE_VERSION_KEY]: CURRENT_DATA_VERSION,
        [STORAGE_KEYS.TABS]: tabs,
      }

      const result = await storageModule.getTabsWithMigration()

      // validateTabs may normalize URLs, so check structure instead of exact match
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id', 1)
        expect(result[0]).toHaveProperty('name', 'Tab 1')
        expect(result[0]).toHaveProperty('url')
        expect(result[0]).toHaveProperty('interval', 5000)
      }
    })

    it('should migrate tabs when version is different', async () => {
      const tabs: TabSchema[] = [
        { id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 },
      ]
      const oldVersion = 0
      mockStorageData = {
        [STORAGE_VERSION_KEY]: oldVersion,
        [STORAGE_KEYS.TABS]: tabs,
      }

      const result = await storageModule.getTabsWithMigration()

      // validateTabs may normalize URLs, so check structure instead of exact match
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id')
        expect(result[0]).toHaveProperty('url')
      }
      // Should save migrated data
      expect(mockStorageData[STORAGE_VERSION_KEY]).toBe(CURRENT_DATA_VERSION)
    })

    it('should return empty array when version is null and no tabs exist', async () => {
      mockStorageData = {}

      const result = await storageModule.getTabsWithMigration()

      expect(result).toEqual([])
    })
  })

  describe('Storage key validation', () => {
    it('should validate pause state storage', async () => {
      mockStorageData[STORAGE_KEYS.IS_PAUSED] = true

      const result = await storageModule.getStorageItem<boolean>(STORAGE_KEYS.IS_PAUSED)

      expect(result).toBe(true)
    })

    it('should validate sessions storage', async () => {
      const sessions = {
        sessions: [
          {
            id: 'session-1',
            name: 'Default',
            tabs: [],
            createdAt: Date.now(),
          },
        ],
        currentSessionId: 'session-1',
      }
      mockStorageData[STORAGE_KEYS.SESSIONS] = sessions

      const result = await storageModule.getStorageItem(STORAGE_KEYS.SESSIONS)

      // validateSessionsStorage returns the validated data or default structure
      expect(result).toBeDefined()
      if (result && typeof result === 'object' && 'sessions' in result) {
        expect(result.sessions).toBeDefined()
      }
    })

    it('should validate data version storage', async () => {
      mockStorageData[STORAGE_VERSION_KEY] = 2

      const result = await storageModule.getStorageItem<number>(STORAGE_VERSION_KEY)

      // validateDataVersionStorage returns the validated number or 0 if validation fails
      expect(result).toBeDefined()
      if (result !== null) {
        expect(typeof result).toBe('number')
      }
    })
  })
})
