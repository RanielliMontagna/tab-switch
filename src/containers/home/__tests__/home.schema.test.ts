import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INTERVAL } from '@/constants'
import {
  anyTabsFileSchema,
  newTabSchema,
  sessionSchema,
  sessionsStorageSchema,
  tabRotateFileSchema,
  tabSchema,
  tabsFileSchema,
} from '../home.schema'

// Mock URL utilities
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
      const parsed = new URL(url)
      return parsed.href
    } catch {
      return url
    }
  }),
}))

import { isValidUrl, normalizeUrl } from '@/utils/url'

const mockIsValidUrl = vi.mocked(isValidUrl)
const mockNormalizeUrl = vi.mocked(normalizeUrl)

describe('Home Schema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default mocks
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

  describe('newTabSchema', () => {
    it('should validate valid new tab', () => {
      const validTab = {
        name: 'Test Tab',
        url: 'https://example.com',
        interval: 5000,
      }

      const result = newTabSchema.parse(validTab)

      expect(result.name).toBe('Test Tab')
      expect(result.url).toContain('https://example.com')
      expect(result.interval).toBe(5000)
    })

    it('should include optional saved field', () => {
      const validTab = {
        name: 'Test Tab',
        url: 'https://example.com',
        interval: 5000,
        saved: true,
      }

      const result = newTabSchema.parse(validTab)

      expect(result.saved).toBe(true)
    })

    it('should reject invalid URL', () => {
      const invalidTab = {
        name: 'Test Tab',
        url: 'not-a-url',
        interval: 5000,
      }

      expect(() => newTabSchema.parse(invalidTab)).toThrow()
    })

    it('should reject interval below minimum', () => {
      const invalidTab = {
        name: 'Test Tab',
        url: 'https://example.com',
        interval: INTERVAL.MIN - 1,
      }

      expect(() => newTabSchema.parse(invalidTab)).toThrow()
    })

    it('should normalize URL', () => {
      mockIsValidUrl.mockReturnValue(true)
      mockNormalizeUrl.mockReturnValue('https://example.com/')

      const tab = {
        name: 'Test Tab',
        url: 'example.com',
        interval: 5000,
      }

      const result = newTabSchema.parse(tab)

      expect(mockNormalizeUrl).toHaveBeenCalledWith('example.com')
      expect(result.url).toBe('https://example.com/')
    })
  })

  describe('tabSchema', () => {
    it('should validate tab with id', () => {
      const validTab = {
        id: 1,
        name: 'Test Tab',
        url: 'https://example.com',
        interval: 5000,
      }

      const result = tabSchema.parse(validTab)

      expect(result.id).toBe(1)
      expect(result.name).toBe('Test Tab')
    })

    it('should reject tab without id', () => {
      const invalidTab = {
        name: 'Test Tab',
        url: 'https://example.com',
        interval: 5000,
      }

      expect(() => tabSchema.parse(invalidTab)).toThrow()
    })

    it('should reject negative id', () => {
      const invalidTab = {
        id: -1,
        name: 'Test Tab',
        url: 'https://example.com',
        interval: 5000,
      }

      expect(() => tabSchema.parse(invalidTab)).toThrow()
    })
  })

  describe('tabsFileSchema', () => {
    it('should validate array of new tabs', () => {
      const validTabs = [
        {
          name: 'Tab 1',
          url: 'https://example.com',
          interval: 5000,
        },
        {
          name: 'Tab 2',
          url: 'https://example2.com',
          interval: 10000,
        },
      ]

      const result = tabsFileSchema.parse(validTabs)

      expect(result.length).toBe(2)
      expect(result[0].name).toBe('Tab 1')
    })

    it('should reject non-array', () => {
      expect(() => tabsFileSchema.parse({})).toThrow()
    })
  })

  describe('tabRotateFileSchema', () => {
    it('should validate tab-rotate.json format', () => {
      const validTab = {
        nome: 'Test Tab',
        url: 'https://example.com',
        duracao: 5, // seconds
      }

      const result = tabRotateFileSchema.parse([validTab])

      expect(result[0].nome).toBe('Test Tab')
      expect(result[0].duracao).toBeGreaterThanOrEqual(INTERVAL.MIN)
    })

    it('should convert seconds string to milliseconds', () => {
      const tab = {
        nome: 'Test Tab',
        url: 'https://example.com',
        duracao: '5', // string seconds
      }

      const result = tabRotateFileSchema.parse([tab])

      expect(result[0].duracao).toBe(5000) // converted to milliseconds
    })

    it('should convert seconds number to milliseconds', () => {
      const tab = {
        nome: 'Test Tab',
        url: 'https://example.com',
        duracao: 10, // number seconds
      }

      const result = tabRotateFileSchema.parse([tab])

      expect(result[0].duracao).toBe(10000) // converted to milliseconds
    })

    it('should use default when duracao is not string or number', () => {
      const tab = {
        nome: 'Test Tab',
        url: 'https://example.com',
        duracao: null, // invalid type
      }

      const result = tabRotateFileSchema.parse([tab])

      // Should use minInterval / 1000 as default, then convert to milliseconds
      expect(result[0].duracao).toBeGreaterThanOrEqual(INTERVAL.MIN)
    })

    it('should handle NaN and return minInterval', () => {
      const tab = {
        nome: 'Test Tab',
        url: 'https://example.com',
        duracao: 'invalid', // will parse to NaN
      }

      const result = tabRotateFileSchema.parse([tab])

      expect(result[0].duracao).toBe(INTERVAL.MIN)
    })

    it('should handle zero and return minInterval', () => {
      const tab = {
        nome: 'Test Tab',
        url: 'https://example.com',
        duracao: 0, // zero seconds
      }

      const result = tabRotateFileSchema.parse([tab])

      expect(result[0].duracao).toBe(INTERVAL.MIN)
    })

    it('should handle negative value and return minInterval', () => {
      const tab = {
        nome: 'Test Tab',
        url: 'https://example.com',
        duracao: -5, // negative seconds
      }

      const result = tabRotateFileSchema.parse([tab])

      expect(result[0].duracao).toBe(INTERVAL.MIN)
    })

    it('should round seconds to milliseconds', () => {
      const tab = {
        nome: 'Test Tab',
        url: 'https://example.com',
        duracao: 5.7, // decimal seconds
      }

      const result = tabRotateFileSchema.parse([tab])

      // Math.round(5.7 * 1000) = 5700
      expect(result[0].duracao).toBe(5700) // rounded to milliseconds
    })

    it('should ensure minimum interval', () => {
      const tab = {
        nome: 'Test Tab',
        url: 'https://example.com',
        duracao: 0.001, // very small seconds (less than minInterval)
      }

      const result = tabRotateFileSchema.parse([tab])

      expect(result[0].duracao).toBeGreaterThanOrEqual(INTERVAL.MIN)
    })

    it('should handle string with decimal', () => {
      const tab = {
        nome: 'Test Tab',
        url: 'https://example.com',
        duracao: '3.5', // string decimal seconds
      }

      const result = tabRotateFileSchema.parse([tab])

      // Math.round(3.5 * 1000) = 3500, but Math.max(5000, 3500) = 5000 (minInterval)
      expect(result[0].duracao).toBe(5000) // minInterval applied
    })

    it('should validate array of tab-rotate format', () => {
      const validTabs = [
        {
          nome: 'Tab 1',
          url: 'https://example.com',
          duracao: 5,
        },
        {
          nome: 'Tab 2',
          url: 'https://example2.com',
          duracao: 10,
        },
      ]

      const result = tabRotateFileSchema.parse(validTabs)

      expect(result.length).toBe(2)
      expect(result[0].nome).toBe('Tab 1')
      expect(result[1].nome).toBe('Tab 2')
    })
  })

  describe('anyTabsFileSchema', () => {
    it('should accept tabsFileSchema format', () => {
      const tabs = [
        {
          name: 'Tab 1',
          url: 'https://example.com',
          interval: 5000,
        },
      ]

      const result = anyTabsFileSchema.parse(tabs)

      expect(result.length).toBe(1)
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('interval')
    })

    it('should accept tabRotateFileSchema format', () => {
      const tabs = [
        {
          nome: 'Tab 1',
          url: 'https://example.com',
          duracao: 5,
        },
      ]

      const result = anyTabsFileSchema.parse(tabs)

      expect(result.length).toBe(1)
      expect(result[0]).toHaveProperty('nome')
      expect(result[0]).toHaveProperty('duracao')
    })

    it('should reject invalid format', () => {
      const invalid = [
        {
          invalid: 'data',
        },
      ]

      expect(() => anyTabsFileSchema.parse(invalid)).toThrow()
    })
  })

  describe('sessionSchema', () => {
    it('should validate session with required fields', () => {
      const validSession = {
        id: 'session-1',
        name: 'My Session',
        tabs: [
          {
            id: 1,
            name: 'Tab 1',
            url: 'https://example.com',
            interval: 5000,
          },
        ],
      }

      const result = sessionSchema.parse(validSession)

      expect(result.id).toBe('session-1')
      expect(result.name).toBe('My Session')
      expect(result.tabs.length).toBe(1)
    })

    it('should include optional timestamps', () => {
      const session = {
        id: 'session-1',
        name: 'My Session',
        tabs: [],
        createdAt: 1234567890,
        updatedAt: 1234567891,
      }

      const result = sessionSchema.parse(session)

      expect(result.createdAt).toBe(1234567890)
      expect(result.updatedAt).toBe(1234567891)
    })

    it('should reject session without id', () => {
      const invalidSession = {
        name: 'My Session',
        tabs: [],
      }

      expect(() => sessionSchema.parse(invalidSession)).toThrow()
    })

    it('should reject session without name', () => {
      const invalidSession = {
        id: 'session-1',
        tabs: [],
      }

      expect(() => sessionSchema.parse(invalidSession)).toThrow()
    })
  })

  describe('sessionsStorageSchema', () => {
    it('should validate sessions storage', () => {
      const validStorage = {
        sessions: [
          {
            id: 'session-1',
            name: 'Session 1',
            tabs: [],
          },
        ],
        currentSessionId: 'session-1',
      }

      const result = sessionsStorageSchema.parse(validStorage)

      expect(result.sessions.length).toBe(1)
      expect(result.currentSessionId).toBe('session-1')
    })

    it('should allow optional currentSessionId', () => {
      const validStorage = {
        sessions: [
          {
            id: 'session-1',
            name: 'Session 1',
            tabs: [],
          },
        ],
      }

      const result = sessionsStorageSchema.parse(validStorage)

      expect(result.sessions.length).toBe(1)
      expect(result.currentSessionId).toBeUndefined()
    })

    it('should reject invalid sessions array', () => {
      const invalidStorage = {
        sessions: 'not-an-array',
      }

      expect(() => sessionsStorageSchema.parse(invalidStorage)).toThrow()
    })
  })
})
