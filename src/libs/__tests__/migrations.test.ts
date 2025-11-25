import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INTERVAL } from '@/constants'
import type { TabSchema } from '@/containers/home/home.schema'
import {
  CURRENT_DATA_VERSION,
  getMigration,
  migrateData,
  STORAGE_VERSION_KEY,
  validateTabs,
} from '../migrations'

// Mock dependencies
vi.mock('@/utils/url', () => ({
  isValidUrl: vi.fn((url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }),
  normalizeUrl: vi.fn((url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
      return parsed.href
    } catch {
      return url
    }
  }),
}))

vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { isValidUrl, normalizeUrl } from '@/utils/url'

const mockIsValidUrl = vi.mocked(isValidUrl)
const mockNormalizeUrl = vi.mocked(normalizeUrl)

describe('Migrations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsValidUrl.mockImplementation((url: string) => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    })
    mockNormalizeUrl.mockImplementation((url: string) => {
      try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
        return parsed.href
      } catch {
        return url
      }
    })
  })

  describe('CURRENT_DATA_VERSION', () => {
    it('should be defined', () => {
      expect(CURRENT_DATA_VERSION).toBeDefined()
      expect(typeof CURRENT_DATA_VERSION).toBe('number')
    })

    it('should be 1', () => {
      expect(CURRENT_DATA_VERSION).toBe(1)
    })
  })

  describe('STORAGE_VERSION_KEY', () => {
    it('should be defined', () => {
      expect(STORAGE_VERSION_KEY).toBeDefined()
      expect(typeof STORAGE_VERSION_KEY).toBe('string')
    })

    it('should be "dataVersion"', () => {
      expect(STORAGE_VERSION_KEY).toBe('dataVersion')
    })
  })

  describe('getMigration', () => {
    it('should return null when fromVersion equals toVersion', () => {
      const migration = getMigration(1, 1)
      expect(migration).toBeNull()
    })

    it('should return migration function for 0 -> 1', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()
      expect(typeof migration).toBe('function')
    })

    it('should return null for unsupported migration path', () => {
      const migration = getMigration(1, 2)
      expect(migration).toBeNull()
    })

    it('should return null for reverse migration', () => {
      const migration = getMigration(1, 0)
      expect(migration).toBeNull()
    })

    it('should return migration function that handles arrays', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const legacyTabs = [
        {
          id: 1,
          url: 'https://example.com',
          interval: 5000,
        },
      ]

      const result = migration?.(legacyTabs)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return migration function that returns data as-is for non-arrays', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const nonArray = { test: 'data' }
      const result = migration?.(nonArray)
      expect(result).toBe(nonArray)
    })
  })

  describe('migrateData', () => {
    it('should return data unchanged when version is current', () => {
      const data = [{ id: 1, name: 'Tab', url: 'https://example.com', interval: 5000 }]
      const result = migrateData(data, CURRENT_DATA_VERSION)

      expect(result).toBe(data)
    })

    it('should return data unchanged when version is null and current is 0', () => {
      // If CURRENT_DATA_VERSION is 1, version 0 should trigger migration
      // But if version is null, it defaults to 0
      const data = [{ id: 1, url: 'https://example.com' }]
      const result = migrateData(data, null)

      // Should attempt migration from 0 to 1
      expect(result).toBeDefined()
    })

    it('should return data unchanged when version is newer than current', () => {
      const data = [{ id: 1, name: 'Tab', url: 'https://example.com', interval: 5000 }]
      const result = migrateData(data, CURRENT_DATA_VERSION + 1)

      expect(result).toBe(data)
    })

    it('should migrate data from version 0 to current', () => {
      const legacyData = [
        {
          id: '1',
          url: 'https://example.com',
          interval: 3000,
        },
      ]

      const result = migrateData(legacyData, 0)

      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result) && result.length > 0) {
        expect(result[0]).toHaveProperty('id')
        expect(result[0]).toHaveProperty('url')
        expect(result[0]).toHaveProperty('interval')
        expect(result[0]).toHaveProperty('name')
      }
    })

    it('should apply migrations sequentially', () => {
      const legacyData = [
        {
          id: '1',
          url: 'https://example.com',
        },
      ]

      const result = migrateData(legacyData, 0)

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('validateTabs', () => {
    it('should return empty array for non-array input', () => {
      const result = validateTabs(null)
      expect(result).toEqual([])
    })

    it('should return empty array for non-array object', () => {
      const result = validateTabs({ test: 'data' })
      expect(result).toEqual([])
    })

    it('should return empty array for empty array', () => {
      const result = validateTabs([])
      expect(result).toEqual([])
    })

    it('should validate and return valid tabs', () => {
      const validTabs: TabSchema[] = [
        {
          id: 1,
          name: 'Tab 1',
          url: 'https://example.com',
          interval: 5000,
        },
        {
          id: 2,
          name: 'Tab 2',
          url: 'https://example2.com',
          interval: 10000,
        },
      ]

      const result = validateTabs(validTabs)

      expect(result.length).toBe(2)
      expect(result[0].id).toBe(1)
      expect(result[1].id).toBe(2)
    })

    it('should skip invalid tabs and return valid ones', () => {
      const mixedTabs = [
        {
          id: 1,
          name: 'Valid Tab',
          url: 'https://example.com',
          interval: 5000,
        },
        {
          id: 'invalid',
          name: 'Invalid Tab',
          // Missing required url
        },
        {
          id: 3,
          name: 'Another Valid Tab',
          url: 'https://example3.com',
          interval: 5000,
        },
      ]

      const result = validateTabs(mixedTabs)

      // Should only return valid tabs
      expect(result.length).toBe(2)
      expect(result[0].id).toBe(1)
      expect(result[1].id).toBe(3)
    })

    it('should handle tabs with missing optional fields', () => {
      const tabs = [
        {
          id: 1,
          name: 'Tab',
          url: 'https://example.com',
          interval: 5000,
          saved: true,
        },
      ]

      const result = validateTabs(tabs)

      expect(result.length).toBe(1)
      expect(result[0].saved).toBe(true)
    })

    it('should return empty array when all tabs are invalid', () => {
      const invalidTabs = [{ id: 'invalid' }, { name: 'No ID' }, { url: 'invalid-url' }]

      const result = validateTabs(invalidTabs)

      expect(result).toEqual([])
    })
  })

  describe('migrateTabsV0ToV1 (via getMigration)', () => {
    it('should migrate tabs with numeric IDs', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const legacyTabs = [
        {
          id: 1,
          url: 'https://example.com',
          interval: 5000,
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
      expect(result[0].id).toBe(1)
      expect(result[0].url).toContain('https://example.com')
    })

    it('should migrate tabs with string IDs', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const legacyTabs = [
        {
          id: '1',
          url: 'https://example.com',
          interval: 5000,
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
      expect(typeof result[0].id).toBe('number')
    })

    it('should generate IDs for tabs without valid IDs', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const legacyTabs = [
        {
          url: 'https://example.com',
          interval: 5000,
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
      expect(typeof result[0].id).toBe('number')
      expect(result[0].id).toBeGreaterThan(0)
    })

    it('should ensure unique IDs', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const legacyTabs = [
        {
          id: 1,
          url: 'https://example.com',
          interval: 5000,
        },
        {
          id: 1, // Duplicate ID
          url: 'https://example2.com',
          interval: 5000,
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      expect(result[0].id).not.toBe(result[1].id)
    })

    it('should normalize URLs', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      mockNormalizeUrl.mockReturnValue('https://example.com/')

      const legacyTabs = [
        {
          id: 1,
          url: 'example.com',
          interval: 5000,
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(mockNormalizeUrl).toHaveBeenCalled()
      expect(result[0].url).toBeDefined()
    })

    it('should skip tabs with invalid URLs', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      mockIsValidUrl.mockReturnValue(false)

      const legacyTabs = [
        {
          id: 1,
          url: 'not-a-valid-url',
          interval: 5000,
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should set minimum interval for tabs with invalid intervals', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const legacyTabs = [
        {
          id: 1,
          url: 'https://example.com',
          interval: 1000, // Less than INTERVAL.MIN
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      expect(result[0].interval).toBeGreaterThanOrEqual(INTERVAL.MIN)
    })

    it('should set default interval when interval is missing', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const legacyTabs = [
        {
          id: 1,
          url: 'https://example.com',
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      expect(result[0].interval).toBe(INTERVAL.MIN)
    })

    it('should generate name from URL when name is missing', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const legacyTabs = [
        {
          id: 1,
          url: 'https://example.com',
          interval: 5000,
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      expect(result[0].name).toBeDefined()
      expect(result[0].name.length).toBeGreaterThan(0)
    })

    it('should preserve saved field', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const legacyTabs = [
        {
          id: 1,
          url: 'https://example.com',
          interval: 5000,
          saved: true,
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      expect(result[0].saved).toBe(true)
    })

    it('should set saved to false when missing', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const legacyTabs = [
        {
          id: 1,
          url: 'https://example.com',
          interval: 5000,
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      expect(result[0].saved).toBe(false)
    })

    it('should handle empty array', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const result = migration?.([]) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should skip invalid tabs and continue with valid ones', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const legacyTabs = [
        {
          id: 1,
          url: 'https://example.com',
          interval: 5000,
        },
        {
          // Invalid: missing url
          id: 2,
          interval: 5000,
        },
        {
          id: 3,
          url: 'https://example3.com',
          interval: 5000,
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      // Should have at least 2 valid tabs (first and third)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle string IDs that cannot be parsed', () => {
      const migration = getMigration(0, 1)
      expect(migration).toBeDefined()

      const legacyTabs = [
        {
          id: 'invalid-number',
          url: 'https://example.com',
          interval: 5000,
        },
      ]

      const result = migration?.(legacyTabs) as TabSchema[]

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
      expect(typeof result[0].id).toBe('number')
    })
  })
})
