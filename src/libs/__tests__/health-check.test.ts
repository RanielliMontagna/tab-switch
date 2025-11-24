import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getHealthCheckSummary, type HealthCheckResult, performHealthCheck } from '../health-check'

// Mock dependencies
vi.mock('@/utils/chrome-api', () => ({
  hasStoragePermission: vi.fn(),
  hasTabsPermission: vi.fn(),
}))

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('../storage', () => ({
  getStorageItem: vi.fn(),
  STORAGE_KEYS: {
    TABS: 'tabs',
  },
}))

vi.mock('../tab-management', () => ({
  canCreateTabs: vi.fn(),
}))

vi.mock('../tab-rotation', () => ({
  getRotationState: vi.fn(),
}))

import { hasStoragePermission, hasTabsPermission } from '@/utils/chrome-api'
import { getStorageItem } from '../storage'
import { canCreateTabs } from '../tab-management'
import { getRotationState } from '../tab-rotation'

const mockHasStoragePermission = vi.mocked(hasStoragePermission)
const mockHasTabsPermission = vi.mocked(hasTabsPermission)
const mockGetStorageItem = vi.mocked(getStorageItem)
const mockCanCreateTabs = vi.mocked(canCreateTabs)
const mockGetRotationState = vi.mocked(getRotationState)

describe('Health Check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default mocks
    mockHasStoragePermission.mockReturnValue(true)
    mockHasTabsPermission.mockReturnValue(true)
    mockCanCreateTabs.mockReturnValue(true)
    mockGetStorageItem.mockResolvedValue(null)
    mockGetRotationState.mockReturnValue({
      currentTabs: null,
      currentIndex: 0,
      isPaused: false,
    })

    // Setup Chrome API mocks
    global.chrome = {
      runtime: {},
      storage: {
        local: {
          set: vi.fn(),
          get: vi.fn(),
        },
      },
      tabs: {},
    } as unknown as typeof chrome
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (global as { chrome?: unknown }).chrome
  })

  describe('performHealthCheck', () => {
    it('should return healthy status when all checks pass', async () => {
      // Set rotation state with active tabs to avoid warning
      mockGetRotationState.mockReturnValue({
        currentTabs: [{ id: 1, interval: 5000 }],
        currentIndex: 0,
        isPaused: false,
      })

      const result = await performHealthCheck()

      expect(result.status).toBe('healthy')
      expect(result.checks.length).toBeGreaterThan(0)
      expect(result.timestamp).toBeGreaterThan(0)
      expect(result.checks.every((c) => c.status === 'pass')).toBe(true)
    })

    it('should return unhealthy status when any check fails', async () => {
      mockHasStoragePermission.mockReturnValue(false)

      const result = await performHealthCheck()

      expect(result.status).toBe('unhealthy')
      expect(result.checks.some((c) => c.status === 'fail')).toBe(true)
    })

    it('should return degraded status when there are warnings', async () => {
      mockGetRotationState.mockReturnValue({
        currentTabs: null,
        currentIndex: 0,
        isPaused: false,
      })

      const result = await performHealthCheck()

      // Rotation state with null tabs should be a warning
      expect(result.status).toBe('degraded')
      expect(result.checks.some((c) => c.status === 'warning')).toBe(true)
    })

    it('should check Chrome API availability', async () => {
      const result = await performHealthCheck()

      const chromeApiCheck = result.checks.find((c) => c.name === 'chrome-api')
      expect(chromeApiCheck).toBeDefined()
      expect(chromeApiCheck?.status).toBe('pass')
      expect(chromeApiCheck?.message).toContain('Chrome Extension API is available')
    })

    it('should fail Chrome API check when chrome is undefined', async () => {
      delete (global as { chrome?: unknown }).chrome

      const result = await performHealthCheck()

      const chromeApiCheck = result.checks.find((c) => c.name === 'chrome-api')
      expect(chromeApiCheck).toBeDefined()
      expect(chromeApiCheck?.status).toBe('fail')
      expect(chromeApiCheck?.message).toContain('Chrome Extension API is not available')
    })

    it('should fail Chrome API check when chrome.runtime is missing', async () => {
      global.chrome = {
        storage: {
          local: {
            set: vi.fn(),
            get: vi.fn(),
          },
        },
        tabs: {},
      } as unknown as typeof chrome

      const result = await performHealthCheck()

      const chromeApiCheck = result.checks.find((c) => c.name === 'chrome-api')
      expect(chromeApiCheck?.status).toBe('fail')
    })

    it('should fail Chrome API check when chrome.storage is missing', async () => {
      global.chrome = {
        runtime: {},
        tabs: {},
      } as unknown as typeof chrome

      const result = await performHealthCheck()

      const chromeApiCheck = result.checks.find((c) => c.name === 'chrome-api')
      expect(chromeApiCheck?.status).toBe('fail')
    })

    it('should fail Chrome API check when chrome.tabs is missing', async () => {
      global.chrome = {
        runtime: {},
        storage: {
          local: {
            set: vi.fn(),
            get: vi.fn(),
          },
        },
      } as unknown as typeof chrome

      const result = await performHealthCheck()

      const chromeApiCheck = result.checks.find((c) => c.name === 'chrome-api')
      expect(chromeApiCheck?.status).toBe('fail')
    })

    it('should check storage permission', async () => {
      const result = await performHealthCheck()

      const storageCheck = result.checks.find((c) => c.name === 'storage-permission')
      expect(storageCheck).toBeDefined()
      expect(storageCheck?.status).toBe('pass')
      expect(storageCheck?.message).toContain('Storage permission is granted')
    })

    it('should fail storage permission check when permission is missing', async () => {
      mockHasStoragePermission.mockReturnValue(false)

      const result = await performHealthCheck()

      const storageCheck = result.checks.find((c) => c.name === 'storage-permission')
      expect(storageCheck?.status).toBe('fail')
      expect(storageCheck?.message).toContain('Storage permission is missing')
    })

    it('should check tabs permission', async () => {
      const result = await performHealthCheck()

      const tabsCheck = result.checks.find((c) => c.name === 'tabs-permission')
      expect(tabsCheck).toBeDefined()
      expect(tabsCheck?.status).toBe('pass')
      expect(tabsCheck?.message).toContain('Tabs permission is granted')
    })

    it('should fail tabs permission check when permission is missing', async () => {
      mockHasTabsPermission.mockReturnValue(false)

      const result = await performHealthCheck()

      const tabsCheck = result.checks.find((c) => c.name === 'tabs-permission')
      expect(tabsCheck?.status).toBe('fail')
      expect(tabsCheck?.message).toContain('Tabs permission is missing')
    })

    it('should fail tabs permission check when cannot create tabs', async () => {
      mockCanCreateTabs.mockReturnValue(false)

      const result = await performHealthCheck()

      const tabsCheck = result.checks.find((c) => c.name === 'tabs-permission')
      expect(tabsCheck?.status).toBe('fail')
      expect(tabsCheck?.message).toContain('Tabs permission is missing or insufficient')
    })

    it('should check storage access successfully', async () => {
      mockGetStorageItem.mockResolvedValue(null)

      const result = await performHealthCheck()

      const storageAccessCheck = result.checks.find((c) => c.name === 'storage-access')
      expect(storageAccessCheck).toBeDefined()
      expect(storageAccessCheck?.status).toBe('pass')
      expect(storageAccessCheck?.message).toContain('Storage is accessible')
    })

    it('should check storage access with existing data', async () => {
      mockGetStorageItem.mockResolvedValue([
        { id: 1, name: 'Tab', url: 'https://example.com', interval: 5000 },
      ])

      const result = await performHealthCheck()

      const storageAccessCheck = result.checks.find((c) => c.name === 'storage-access')
      expect(storageAccessCheck?.status).toBe('pass')
    })

    it('should fail storage access check when read fails', async () => {
      mockGetStorageItem.mockRejectedValue(new Error('Storage read error'))

      const result = await performHealthCheck()

      const storageAccessCheck = result.checks.find((c) => c.name === 'storage-access')
      expect(storageAccessCheck?.status).toBe('fail')
      expect(storageAccessCheck?.message).toContain('Storage access error')
      expect(storageAccessCheck?.details?.error).toBe('Storage read error')
    })

    it('should fail storage access check when write is not available', async () => {
      global.chrome = {
        runtime: {},
        storage: {
          local: {
            get: vi.fn(),
          },
        },
        tabs: {},
      } as unknown as typeof chrome

      const result = await performHealthCheck()

      const storageAccessCheck = result.checks.find((c) => c.name === 'storage-access')
      expect(storageAccessCheck?.status).toBe('fail')
    })

    it('should check rotation state with active rotation', async () => {
      mockGetRotationState.mockReturnValue({
        currentTabs: [
          { id: 1, interval: 5000 },
          { id: 2, interval: 5000 },
        ],
        currentIndex: 0,
        isPaused: false,
      })

      const result = await performHealthCheck()

      const rotationCheck = result.checks.find((c) => c.name === 'rotation-state')
      expect(rotationCheck).toBeDefined()
      expect(rotationCheck?.status).toBe('pass')
      expect(rotationCheck?.message).toContain('Rotation is configured')
      expect(rotationCheck?.details?.tabsCount).toBe(2)
    })

    it('should check rotation state with no active rotation', async () => {
      mockGetRotationState.mockReturnValue({
        currentTabs: null,
        currentIndex: 0,
        isPaused: false,
      })

      const result = await performHealthCheck()

      const rotationCheck = result.checks.find((c) => c.name === 'rotation-state')
      expect(rotationCheck?.status).toBe('warning')
      expect(rotationCheck?.message).toContain('No rotation state found')
    })

    it('should handle rotation state check error', async () => {
      mockGetRotationState.mockImplementation(() => {
        throw new Error('Rotation state error')
      })

      const result = await performHealthCheck()

      const rotationCheck = result.checks.find((c) => c.name === 'rotation-state')
      expect(rotationCheck?.status).toBe('warning')
      expect(rotationCheck?.message).toContain('Could not check rotation state')
    })

    it('should include timestamp in result', async () => {
      const before = Date.now()
      const result = await performHealthCheck()
      const after = Date.now()

      expect(result.timestamp).toBeGreaterThanOrEqual(before)
      expect(result.timestamp).toBeLessThanOrEqual(after)
    })

    it('should include all checks in result', async () => {
      const result = await performHealthCheck()

      expect(result.checks.length).toBe(5)
      expect(result.checks.map((c) => c.name)).toEqual([
        'chrome-api',
        'storage-permission',
        'tabs-permission',
        'storage-access',
        'rotation-state',
      ])
    })

    it('should prioritize unhealthy over degraded', async () => {
      mockHasStoragePermission.mockReturnValue(false)
      mockGetRotationState.mockReturnValue({
        currentTabs: null,
        currentIndex: 0,
        isPaused: false,
      })

      const result = await performHealthCheck()

      expect(result.status).toBe('unhealthy')
    })
  })

  describe('getHealthCheckSummary', () => {
    it('should generate summary for healthy status', () => {
      const result: HealthCheckResult = {
        status: 'healthy',
        checks: [
          { name: 'check1', status: 'pass', message: 'OK' },
          { name: 'check2', status: 'pass', message: 'OK' },
        ],
        timestamp: Date.now(),
      }

      const summary = getHealthCheckSummary(result)

      expect(summary).toContain('HEALTHY')
      expect(summary).toContain('Passed: 2')
      expect(summary).toContain('Failed: 0')
      expect(summary).toContain('Warnings: 0')
    })

    it('should generate summary for degraded status', () => {
      const result: HealthCheckResult = {
        status: 'degraded',
        checks: [
          { name: 'check1', status: 'pass', message: 'OK' },
          { name: 'check2', status: 'warning', message: 'Warning' },
        ],
        timestamp: Date.now(),
      }

      const summary = getHealthCheckSummary(result)

      expect(summary).toContain('DEGRADED')
      expect(summary).toContain('Passed: 1')
      expect(summary).toContain('Failed: 0')
      expect(summary).toContain('Warnings: 1')
    })

    it('should generate summary for unhealthy status', () => {
      const result: HealthCheckResult = {
        status: 'unhealthy',
        checks: [
          { name: 'check1', status: 'pass', message: 'OK' },
          { name: 'check2', status: 'fail', message: 'Failed' },
        ],
        timestamp: Date.now(),
      }

      const summary = getHealthCheckSummary(result)

      expect(summary).toContain('UNHEALTHY')
      expect(summary).toContain('Passed: 1')
      expect(summary).toContain('Failed: 1')
      expect(summary).toContain('Warnings: 0')
    })

    it('should handle mixed check statuses', () => {
      const result: HealthCheckResult = {
        status: 'unhealthy',
        checks: [
          { name: 'check1', status: 'pass', message: 'OK' },
          { name: 'check2', status: 'fail', message: 'Failed' },
          { name: 'check3', status: 'warning', message: 'Warning' },
        ],
        timestamp: Date.now(),
      }

      const summary = getHealthCheckSummary(result)

      expect(summary).toContain('Passed: 1')
      expect(summary).toContain('Failed: 1')
      expect(summary).toContain('Warnings: 1')
    })

    it('should handle empty checks array', () => {
      const result: HealthCheckResult = {
        status: 'healthy',
        checks: [],
        timestamp: Date.now(),
      }

      const summary = getHealthCheckSummary(result)

      expect(summary).toContain('Passed: 0')
      expect(summary).toContain('Failed: 0')
      expect(summary).toContain('Warnings: 0')
    })
  })
})
