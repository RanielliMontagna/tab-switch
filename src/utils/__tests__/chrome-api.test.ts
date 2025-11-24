import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ChromeApiError,
  getChromeRuntimeError,
  hasStoragePermission,
  hasTabsPermission,
  promisifyChromeApi,
  promisifyChromeApiVoid,
  safeChromeOperation,
  validateChromePermissions,
  wrapChromeCallback,
} from '../chrome-api'

// Mock logger
vi.mock('@/libs/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock Chrome API
const mockChromeRuntime = {
  lastError: null as { message?: string } | null,
}

const mockChromeTabs = {
  create: vi.fn(),
}

const mockChromeStorage = {
  local: {
    get: vi.fn(),
  },
}

function setupChromeMocks() {
  global.chrome = {
    runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
    tabs: mockChromeTabs as unknown as typeof chrome.tabs,
    storage: mockChromeStorage as unknown as typeof chrome.storage,
  } as unknown as typeof chrome
}

function clearChromeMocks() {
  delete (global as unknown as { chrome?: typeof chrome }).chrome
  mockChromeRuntime.lastError = null
  vi.clearAllMocks()
}

describe('Chrome API Utilities', () => {
  beforeEach(() => {
    clearChromeMocks()
    setupChromeMocks()
  })

  afterEach(() => {
    clearChromeMocks()
  })

  describe('ChromeApiError', () => {
    it('should create error with message', () => {
      const error = new ChromeApiError('Test error')

      expect(error.message).toBe('Test error')
      expect(error.name).toBe('ChromeApiError')
      expect(error.code).toBeUndefined()
      expect(error.originalError).toBeUndefined()
    })

    it('should create error with code', () => {
      const error = new ChromeApiError('Test error', 'TEST_CODE')

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
    })

    it('should create error with original error', () => {
      const originalError = new Error('Original')
      const error = new ChromeApiError('Test error', 'TEST_CODE', originalError)

      expect(error.originalError).toBe(originalError)
    })
  })

  describe('getChromeRuntimeError', () => {
    it('should return null when no error', () => {
      mockChromeRuntime.lastError = null

      expect(getChromeRuntimeError()).toBeNull()
    })

    it('should return error message when error exists', () => {
      mockChromeRuntime.lastError = { message: 'Test error' }

      expect(getChromeRuntimeError()).toBe('Test error')
    })

    it('should return null when error has no message', () => {
      mockChromeRuntime.lastError = {}

      expect(getChromeRuntimeError()).toBeNull()
    })
  })

  describe('wrapChromeCallback', () => {
    it('should call callback when no error', () => {
      mockChromeRuntime.lastError = null
      const callback = vi.fn()

      const wrapped = wrapChromeCallback(callback)
      wrapped('arg1', 'arg2')

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should throw ChromeApiError when error exists', () => {
      mockChromeRuntime.lastError = { message: 'Runtime error' }
      const callback = vi.fn()

      const wrapped = wrapChromeCallback(callback)

      expect(() => wrapped('arg1')).toThrow(ChromeApiError)
      expect(callback).not.toHaveBeenCalled()
    })

    it('should use custom error message', () => {
      mockChromeRuntime.lastError = { message: 'Runtime error' }
      const callback = vi.fn()

      const wrapped = wrapChromeCallback(callback, 'Custom error')

      expect(() => wrapped('arg1')).toThrow('Custom error: Runtime error')
    })
  })

  describe('promisifyChromeApi', () => {
    it('should resolve with result when no error', async () => {
      mockChromeRuntime.lastError = null
      const result = { id: 1, url: 'https://example.com' }

      const promise = promisifyChromeApi<typeof result>((callback) => {
        callback(result)
      })

      await expect(promise).resolves.toEqual(result)
    })

    it('should reject with ChromeApiError when error exists', async () => {
      mockChromeRuntime.lastError = { message: 'Runtime error' }

      const promise = promisifyChromeApi<unknown>((callback) => {
        callback(null)
      })

      await expect(promise).rejects.toThrow(ChromeApiError)
      await expect(promise).rejects.toThrow('Runtime error')
    })

    it('should use custom error message', async () => {
      mockChromeRuntime.lastError = { message: 'Runtime error' }

      const promise = promisifyChromeApi<unknown>((callback) => {
        callback(null)
      }, 'Custom error message')

      await expect(promise).rejects.toThrow('Custom error message: Runtime error')
    })

    it('should handle different result types', async () => {
      mockChromeRuntime.lastError = null

      const stringResult = promisifyChromeApi<string>((callback) => {
        callback('test')
      })
      await expect(stringResult).resolves.toBe('test')

      const numberResult = promisifyChromeApi<number>((callback) => {
        callback(42)
      })
      await expect(numberResult).resolves.toBe(42)

      const arrayResult = promisifyChromeApi<number[]>((callback) => {
        callback([1, 2, 3])
      })
      await expect(arrayResult).resolves.toEqual([1, 2, 3])
    })
  })

  describe('promisifyChromeApiVoid', () => {
    it('should resolve when no error', async () => {
      mockChromeRuntime.lastError = null

      const promise = promisifyChromeApiVoid((callback) => {
        callback()
      })

      await expect(promise).resolves.toBeUndefined()
    })

    it('should reject with ChromeApiError when error exists', async () => {
      mockChromeRuntime.lastError = { message: 'Runtime error' }

      const promise = promisifyChromeApiVoid((callback) => {
        callback()
      })

      await expect(promise).rejects.toThrow(ChromeApiError)
    })

    it('should use custom error message', async () => {
      mockChromeRuntime.lastError = { message: 'Runtime error' }

      const promise = promisifyChromeApiVoid((callback) => {
        callback()
      }, 'Custom error message')

      await expect(promise).rejects.toThrow('Custom error message: Runtime error')
    })
  })

  describe('hasTabsPermission', () => {
    it('should return true when tabs API is available', () => {
      setupChromeMocks()

      expect(hasTabsPermission()).toBe(true)
    })

    it('should return false when chrome is undefined', () => {
      clearChromeMocks()

      expect(hasTabsPermission()).toBe(false)
    })

    it('should return false when tabs is undefined', () => {
      global.chrome = {
        runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
      } as unknown as typeof chrome

      expect(hasTabsPermission()).toBe(false)
    })

    it('should return false when tabs.create is not a function', () => {
      global.chrome = {
        runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
        tabs: {} as unknown as typeof chrome.tabs,
      } as unknown as typeof chrome

      expect(hasTabsPermission()).toBe(false)
    })
  })

  describe('hasStoragePermission', () => {
    it('should return true when storage API is available', () => {
      setupChromeMocks()

      expect(hasStoragePermission()).toBe(true)
    })

    it('should return false when chrome is undefined', () => {
      clearChromeMocks()

      expect(hasStoragePermission()).toBe(false)
    })

    it('should return false when storage is undefined', () => {
      global.chrome = {
        runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
      } as unknown as typeof chrome

      expect(hasStoragePermission()).toBe(false)
    })

    it('should return false when storage.local is undefined', () => {
      global.chrome = {
        runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
        storage: {} as unknown as typeof chrome.storage,
      } as unknown as typeof chrome

      expect(hasStoragePermission()).toBe(false)
    })

    it('should return false when storage.local.get is not a function', () => {
      global.chrome = {
        runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
        storage: {
          local: {},
        } as unknown as typeof chrome.storage,
      } as unknown as typeof chrome

      expect(hasStoragePermission()).toBe(false)
    })
  })

  describe('validateChromePermissions', () => {
    it('should not throw when all permissions are available', () => {
      setupChromeMocks()

      expect(() => validateChromePermissions(['tabs', 'storage'])).not.toThrow()
    })

    it('should throw when tabs permission is missing', () => {
      global.chrome = {
        runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
        storage: mockChromeStorage as unknown as typeof chrome.storage,
      } as unknown as typeof chrome

      expect(() => validateChromePermissions(['tabs'])).toThrow(ChromeApiError)
      expect(() => validateChromePermissions(['tabs'])).toThrow(
        'Missing required Chrome permissions: tabs'
      )
    })

    it('should throw when storage permission is missing', () => {
      global.chrome = {
        runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
        tabs: mockChromeTabs as unknown as typeof chrome.tabs,
      } as unknown as typeof chrome

      expect(() => validateChromePermissions(['storage'])).toThrow(ChromeApiError)
      expect(() => validateChromePermissions(['storage'])).toThrow(
        'Missing required Chrome permissions: storage'
      )
    })

    it('should throw when multiple permissions are missing', () => {
      clearChromeMocks()

      expect(() => validateChromePermissions(['tabs', 'storage'])).toThrow(ChromeApiError)
      expect(() => validateChromePermissions(['tabs', 'storage'])).toThrow(
        'Missing required Chrome permissions'
      )
    })

    it('should handle empty permissions array', () => {
      setupChromeMocks()

      expect(() => validateChromePermissions([])).not.toThrow()
    })

    it('should handle unknown permissions', () => {
      setupChromeMocks()

      // Unknown permissions are ignored
      expect(() => validateChromePermissions(['unknown'])).not.toThrow()
    })
  })

  describe('safeChromeOperation', () => {
    it('should return result when operation succeeds', async () => {
      const result = await safeChromeOperation(() => Promise.resolve('success'))

      expect(result).toBe('success')
    })

    it('should return result for synchronous operation', async () => {
      const result = await safeChromeOperation(() => 'success')

      expect(result).toBe('success')
    })

    it('should return null when operation throws ChromeApiError', async () => {
      const result = await safeChromeOperation(() => {
        throw new ChromeApiError('Test error')
      })

      expect(result).toBeNull()
    })

    it('should return null when operation throws generic error', async () => {
      const result = await safeChromeOperation(() => {
        throw new Error('Generic error')
      })

      expect(result).toBeNull()
    })

    it('should use custom error message', async () => {
      const result = await safeChromeOperation(() => {
        throw new ChromeApiError('Test error')
      }, 'Custom error')

      expect(result).toBeNull()
    })

    it('should handle async operations', async () => {
      const result = await safeChromeOperation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return 'async result'
      })

      expect(result).toBe('async result')
    })

    it('should handle async errors', async () => {
      const result = await safeChromeOperation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        throw new Error('Async error')
      })

      expect(result).toBeNull()
    })

    it('should handle operations returning different types', async () => {
      const stringResult = await safeChromeOperation(() => 'string')
      expect(stringResult).toBe('string')

      const numberResult = await safeChromeOperation(() => 42)
      expect(numberResult).toBe(42)

      const objectResult = await safeChromeOperation(() => ({ key: 'value' }))
      expect(objectResult).toEqual({ key: 'value' })

      const nullResult = await safeChromeOperation(() => null)
      expect(nullResult).toBeNull()
    })
  })
})
