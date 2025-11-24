import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TabSchema } from '@/containers/home/home.schema'
import { canCreateTabs, createTabs, removeOtherTabs } from '../tab-management'

// Mock dependencies
vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/utils/chrome-api', () => ({
  promisifyChromeApi: vi.fn(),
  safeChromeOperation: vi.fn((fn) => fn()),
}))

vi.mock('@/utils/rate-limiter', () => ({
  rateLimiters: {
    tabCreation: {
      isAllowed: vi.fn(() => true),
    },
  },
}))

vi.mock('@/utils/url-security', () => ({
  validateUrlForTabCreation: vi.fn(() => true),
}))

// Import mocked modules
import { promisifyChromeApi, safeChromeOperation } from '@/utils/chrome-api'
import { rateLimiters } from '@/utils/rate-limiter'
import { validateUrlForTabCreation } from '@/utils/url-security'

// Mock Chrome API
const mockChromeTabs = {
  create: vi.fn(),
  query: vi.fn(),
  remove: vi.fn(),
}

const mockChromeRuntime = {
  id: 'test-extension-id',
}

// Setup Chrome mocks
function setupChromeMocks() {
  global.chrome = {
    tabs: mockChromeTabs as unknown as typeof chrome.tabs,
    runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
  } as unknown as typeof chrome
}

function clearChromeMocks() {
  delete (global as unknown as { chrome?: typeof chrome }).chrome
  vi.clearAllMocks()
}

describe('Tab Management', () => {
  beforeEach(() => {
    clearChromeMocks()
    setupChromeMocks()
    vi.clearAllMocks()
    // Reset mocks to default behavior
    vi.mocked(rateLimiters.tabCreation.isAllowed).mockReturnValue(true)
    vi.mocked(validateUrlForTabCreation).mockReturnValue(true)
    vi.mocked(safeChromeOperation).mockImplementation(async (fn) => fn())
  })

  describe('canCreateTabs', () => {
    it('should return true when chrome.tabs.create is available', () => {
      const result = canCreateTabs()

      expect(result).toBe(true)
    })

    it('should return false when chrome is not available', () => {
      clearChromeMocks()

      const result = canCreateTabs()

      expect(result).toBe(false)
    })

    it('should return false when chrome.tabs is not available', () => {
      global.chrome = {
        runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
      } as unknown as typeof chrome

      const result = canCreateTabs()

      expect(result).toBe(false)
    })

    it('should return false when chrome.tabs.create is not a function', () => {
      global.chrome = {
        tabs: {} as unknown as typeof chrome.tabs,
        runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
      } as unknown as typeof chrome

      const result = canCreateTabs()

      expect(result).toBe(false)
    })
  })

  describe('createTabs', () => {
    const mockTabConfigs: TabSchema[] = [
      { id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 },
      { id: 2, name: 'Tab 2', url: 'https://google.com', interval: 3000 },
    ]

    it('should create tabs successfully', async () => {
      // Query returns empty array (no existing tabs)
      // Then createOrReuseTab creates each tab
      vi.mocked(promisifyChromeApi)
        .mockResolvedValueOnce([]) // query existing tabs - no existing tabs
        .mockResolvedValueOnce({ id: 100, url: 'https://example.com' }) // create first tab
        .mockResolvedValueOnce({ id: 101, url: 'https://google.com' }) // create second tab

      const result = await createTabs(mockTabConfigs)

      expect(result.tabs).toHaveLength(2)
      expect(result.tabs[0]).toEqual({ id: 100, interval: 5000 })
      expect(result.tabs[1]).toEqual({ id: 101, interval: 3000 })
      expect(result.errors).toHaveLength(0)
    })

    it('should reuse existing tabs with same URL', async () => {
      const existingTabs = [
        { id: 50, url: 'https://example.com' },
        { id: 51, url: 'https://other.com' },
      ]

      // First call is query, then createOrReuseTab is called for each tab
      // For first tab, it finds existing tab (no create call)
      // For second tab, it creates a new one
      vi.mocked(promisifyChromeApi)
        .mockResolvedValueOnce(existingTabs) // query existing tabs
        .mockResolvedValueOnce({ id: 101, url: 'https://google.com' }) // create second tab

      const result = await createTabs(mockTabConfigs)

      expect(result.tabs).toHaveLength(2)
      // First tab should reuse existing tab with ID 50
      expect(result.tabs[0]).toEqual({ id: 50, interval: 5000 })
      // Second tab should be created
      expect(result.tabs[1]).toEqual({ id: 101, interval: 3000 })
      expect(result.errors).toHaveLength(0)
    })

    it('should handle rate limiting', async () => {
      vi.mocked(rateLimiters.tabCreation.isAllowed).mockReturnValue(false)

      const result = await createTabs(mockTabConfigs)

      expect(result.tabs).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].tab).toBe('all')
      expect(result.errors[0].error).toContain('Rate limit exceeded')
    })

    it('should handle missing tabs permission', async () => {
      global.chrome = {
        runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
      } as unknown as typeof chrome

      const result = await createTabs(mockTabConfigs)

      expect(result.tabs).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].tab).toBe('all')
      expect(result.errors[0].error).toContain('Missing tabs permission')
    })

    it('should handle URL validation failure', async () => {
      vi.mocked(validateUrlForTabCreation).mockReturnValue(false)

      vi.mocked(promisifyChromeApi).mockResolvedValueOnce([]) // query existing tabs

      const result = await createTabs(mockTabConfigs)

      expect(result.tabs).toHaveLength(0)
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0].tab).toBe('Tab 1')
      expect(result.errors[1].tab).toBe('Tab 2')
    })

    it('should handle tab creation failure', async () => {
      vi.mocked(promisifyChromeApi)
        .mockResolvedValueOnce([]) // query existing tabs
        .mockResolvedValueOnce(null) // create first tab fails
        .mockResolvedValueOnce({ id: 101, url: 'https://google.com' }) // create second tab succeeds

      const result = await createTabs(mockTabConfigs)

      expect(result.tabs).toHaveLength(1)
      expect(result.tabs[0]).toEqual({ id: 101, interval: 3000 })
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].tab).toBe('Tab 1')
    })

    it('should handle tab creation without ID', async () => {
      vi.mocked(promisifyChromeApi)
        .mockResolvedValueOnce([]) // query existing tabs
        .mockResolvedValueOnce({ url: 'https://example.com' }) // created tab without ID
        .mockResolvedValueOnce({ id: 101, url: 'https://google.com' }) // create second tab succeeds

      const result = await createTabs(mockTabConfigs)

      expect(result.tabs).toHaveLength(1)
      expect(result.tabs[0]).toEqual({ id: 101, interval: 3000 })
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].tab).toBe('Tab 1')
    })

    it('should handle query tabs failure', async () => {
      vi.mocked(promisifyChromeApi)
        .mockResolvedValueOnce(null) // query existing tabs fails
        .mockResolvedValueOnce({ id: 100, url: 'https://example.com' }) // create first tab
        .mockResolvedValueOnce({ id: 101, url: 'https://google.com' }) // create second tab

      const result = await createTabs(mockTabConfigs)

      expect(result.tabs).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle empty tab configs array', async () => {
      vi.mocked(promisifyChromeApi).mockResolvedValueOnce([]) // query existing tabs

      const result = await createTabs([])

      expect(result.tabs).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle tabs with normalized URLs', async () => {
      const existingTabs = [{ id: 50, url: 'https://example.com/' }] // trailing slash
      const tabConfigs: TabSchema[] = [
        { id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 }, // no trailing slash
      ]

      vi.mocked(promisifyChromeApi).mockResolvedValueOnce(existingTabs) // query existing tabs

      const result = await createTabs(tabConfigs)

      // Should reuse existing tab despite URL normalization differences
      expect(result.tabs).toHaveLength(1)
      expect(result.tabs[0]).toEqual({ id: 50, interval: 5000 })
      expect(result.errors).toHaveLength(0)
    })

    it('should handle error during tab creation', async () => {
      vi.mocked(promisifyChromeApi)
        .mockResolvedValueOnce([]) // query existing tabs
        .mockRejectedValueOnce(new Error('Creation failed')) // create first tab throws
        .mockResolvedValueOnce({ id: 101, url: 'https://google.com' }) // create second tab succeeds

      const result = await createTabs(mockTabConfigs)

      expect(result.tabs).toHaveLength(1)
      expect(result.tabs[0]).toEqual({ id: 101, interval: 3000 })
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].tab).toBe('Tab 1')
    })
  })

  describe('removeOtherTabs', () => {
    it('should remove tabs not in keepTabIds', async () => {
      const allTabs = [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://google.com' },
        { id: 3, url: 'https://github.com' },
      ]

      vi.mocked(promisifyChromeApi)
        .mockResolvedValueOnce(allTabs) // query all tabs
        .mockResolvedValueOnce(undefined) // remove tab 1
        .mockResolvedValueOnce(undefined) // remove tab 3

      const result = await removeOtherTabs([2])

      expect(result).toBe(2)
      expect(promisifyChromeApi).toHaveBeenCalledTimes(3) // query + 2 removes
    })

    it('should return 0 when all tabs are in rotation', async () => {
      const allTabs = [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://google.com' },
      ]

      vi.mocked(promisifyChromeApi).mockResolvedValueOnce(allTabs) // query all tabs

      const result = await removeOtherTabs([1, 2])

      expect(result).toBe(0)
      expect(promisifyChromeApi).toHaveBeenCalledTimes(1) // only query
    })

    it('should return 0 when no tabs exist', async () => {
      vi.mocked(promisifyChromeApi).mockResolvedValueOnce([]) // query all tabs

      const result = await removeOtherTabs([1, 2])

      expect(result).toBe(0)
    })

    it('should handle query tabs failure', async () => {
      vi.mocked(promisifyChromeApi).mockResolvedValueOnce(null) // query fails

      const result = await removeOtherTabs([1, 2])

      expect(result).toBe(0)
    })

    it('should handle tabs without IDs', async () => {
      const allTabs = [
        { id: 1, url: 'https://example.com' },
        { url: 'https://google.com' }, // no ID
        { id: 3, url: 'https://github.com' },
      ]

      vi.mocked(promisifyChromeApi)
        .mockResolvedValueOnce(allTabs) // query all tabs
        .mockResolvedValueOnce(undefined) // remove tab 3

      const result = await removeOtherTabs([1])

      expect(result).toBe(1) // Only tab 3 should be removed
    })

    it('should handle empty keepTabIds', async () => {
      const allTabs = [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://google.com' },
      ]

      vi.mocked(promisifyChromeApi)
        .mockResolvedValueOnce(allTabs) // query all tabs
        .mockResolvedValueOnce(undefined) // remove tab 1
        .mockResolvedValueOnce(undefined) // remove tab 2

      const result = await removeOtherTabs([])

      expect(result).toBe(2)
    })

    it('should handle tab removal failure', async () => {
      const allTabs = [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://google.com' },
      ]

      // safeChromeOperation wraps the promisifyChromeApi call
      // If promisifyChromeApi rejects, safeChromeOperation catches and returns null
      vi.mocked(promisifyChromeApi)
        .mockResolvedValueOnce(allTabs) // query all tabs
        .mockRejectedValueOnce(new Error('Removal failed')) // remove tab 1 fails
        .mockResolvedValueOnce(undefined) // remove tab 2 succeeds

      vi.mocked(safeChromeOperation).mockImplementation(async (fn) => {
        try {
          const result = await fn()
          return result
        } catch {
          return null
        }
      })

      const result = await removeOtherTabs([])

      expect(result).toBe(1) // Only one tab removed successfully
    })

    it('should handle error during removal', async () => {
      const allTabs = [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://google.com' },
      ]

      // safeChromeOperation wraps the promisifyChromeApi call
      // If promisifyChromeApi rejects, safeChromeOperation catches and returns null
      vi.mocked(promisifyChromeApi)
        .mockResolvedValueOnce(allTabs) // query all tabs
        .mockRejectedValueOnce(new Error('Removal failed')) // remove tab 1 throws
        .mockResolvedValueOnce(undefined) // remove tab 2 succeeds

      vi.mocked(safeChromeOperation).mockImplementation(async (fn) => {
        try {
          const result = await fn()
          return result
        } catch {
          return null
        }
      })

      const result = await removeOtherTabs([])

      expect(result).toBe(1) // Only one tab removed successfully
    })
  })
})
