import { describe, expect, it, vi } from 'vitest'
import type { DataWithIntegrity } from '../integrity'
import {
  generateChecksum,
  unwrapWithIntegrity,
  validateImportedData,
  verifyChecksum,
  wrapWithIntegrity,
} from '../integrity'

// Mock logger
vi.mock('@/libs/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}))

describe('Integrity Utilities', () => {
  describe('generateChecksum', () => {
    it('should generate checksum for string', () => {
      const checksum = generateChecksum('test data')

      expect(typeof checksum).toBe('string')
      expect(checksum.length).toBeGreaterThan(0)
    })

    it('should generate checksum for number', () => {
      const checksum = generateChecksum(42)

      expect(typeof checksum).toBe('string')
      expect(checksum.length).toBeGreaterThan(0)
    })

    it('should generate checksum for object', () => {
      const data = { key: 'value', number: 42 }
      const checksum = generateChecksum(data)

      expect(typeof checksum).toBe('string')
      expect(checksum.length).toBeGreaterThan(0)
    })

    it('should generate checksum for array', () => {
      const data = [1, 2, 3, 'test']
      const checksum = generateChecksum(data)

      expect(typeof checksum).toBe('string')
      expect(checksum.length).toBeGreaterThan(0)
    })

    it('should generate same checksum for same data', () => {
      const data = { key: 'value' }
      const checksum1 = generateChecksum(data)
      const checksum2 = generateChecksum(data)

      expect(checksum1).toBe(checksum2)
    })

    it('should generate different checksums for different data', () => {
      const checksum1 = generateChecksum({ key: 'value1' })
      const checksum2 = generateChecksum({ key: 'value2' })

      expect(checksum1).not.toBe(checksum2)
    })

    it('should handle null', () => {
      const checksum = generateChecksum(null)

      expect(typeof checksum).toBe('string')
    })

    it('should handle undefined', () => {
      const checksum = generateChecksum(undefined)

      expect(typeof checksum).toBe('string')
    })

    it('should handle empty object', () => {
      const checksum = generateChecksum({})

      expect(typeof checksum).toBe('string')
    })

    it('should handle empty array', () => {
      const checksum = generateChecksum([])

      expect(typeof checksum).toBe('string')
    })

    it('should return empty string on JSON.stringify error', () => {
      // Create object that causes JSON.stringify to fail
      const circular: { self?: unknown } = {}
      circular.self = circular

      const checksum = generateChecksum(circular)

      expect(checksum).toBe('')
    })
  })

  describe('verifyChecksum', () => {
    it('should return true for matching checksums', () => {
      const data = { key: 'value' }
      const checksum = generateChecksum(data)

      expect(verifyChecksum(data, checksum)).toBe(true)
    })

    it('should return false for non-matching checksums', () => {
      const data = { key: 'value' }
      const wrongChecksum = 'wrong-checksum'

      expect(verifyChecksum(data, wrongChecksum)).toBe(false)
    })

    it('should return false for modified data', () => {
      const originalData = { key: 'value' }
      const checksum = generateChecksum(originalData)
      const modifiedData = { key: 'modified' }

      expect(verifyChecksum(modifiedData, checksum)).toBe(false)
    })

    it('should handle different data types', () => {
      const stringData = 'test'
      const stringChecksum = generateChecksum(stringData)
      expect(verifyChecksum(stringData, stringChecksum)).toBe(true)

      const numberData = 42
      const numberChecksum = generateChecksum(numberData)
      expect(verifyChecksum(numberData, numberChecksum)).toBe(true)

      const arrayData = [1, 2, 3]
      const arrayChecksum = generateChecksum(arrayData)
      expect(verifyChecksum(arrayData, arrayChecksum)).toBe(true)
    })
  })

  describe('wrapWithIntegrity', () => {
    it('should wrap data with checksum', () => {
      const data = { key: 'value' }
      const wrapped = wrapWithIntegrity(data)

      expect(wrapped.data).toEqual(data)
      expect(wrapped.checksum).toBe(generateChecksum(data))
      expect(typeof wrapped.timestamp).toBe('number')
    })

    it('should include version when provided', () => {
      const data = { key: 'value' }
      const wrapped = wrapWithIntegrity(data, 1)

      expect(wrapped.version).toBe(1)
    })

    it('should not include version when not provided', () => {
      const data = { key: 'value' }
      const wrapped = wrapWithIntegrity(data)

      expect(wrapped.version).toBeUndefined()
    })

    it('should include timestamp', () => {
      const before = Date.now()
      const data = { key: 'value' }
      const wrapped = wrapWithIntegrity(data)
      const after = Date.now()

      expect(wrapped.timestamp).toBeGreaterThanOrEqual(before)
      expect(wrapped.timestamp).toBeLessThanOrEqual(after)
    })

    it('should handle different data types', () => {
      const stringWrapped = wrapWithIntegrity('test')
      expect(stringWrapped.data).toBe('test')
      expect(verifyChecksum(stringWrapped.data, stringWrapped.checksum)).toBe(true)

      const numberWrapped = wrapWithIntegrity(42)
      expect(numberWrapped.data).toBe(42)
      expect(verifyChecksum(numberWrapped.data, numberWrapped.checksum)).toBe(true)

      const arrayWrapped = wrapWithIntegrity([1, 2, 3])
      expect(arrayWrapped.data).toEqual([1, 2, 3])
      expect(verifyChecksum(arrayWrapped.data, arrayWrapped.checksum)).toBe(true)
    })
  })

  describe('unwrapWithIntegrity', () => {
    it('should unwrap valid data', () => {
      const originalData = { key: 'value' }
      const wrapped = wrapWithIntegrity(originalData)
      const unwrapped = unwrapWithIntegrity(wrapped)

      expect(unwrapped).toEqual(originalData)
    })

    it('should return null when data is missing', () => {
      const wrapped: Partial<DataWithIntegrity<unknown>> = {
        checksum: 'some-checksum',
      }

      const unwrapped = unwrapWithIntegrity(wrapped as DataWithIntegrity<unknown>)

      expect(unwrapped).toBeNull()
    })

    it('should return null when checksum is missing', () => {
      const wrapped: Partial<DataWithIntegrity<{ key: string }>> = {
        data: { key: 'value' },
      }

      const unwrapped = unwrapWithIntegrity(wrapped as DataWithIntegrity<{ key: string }>)

      expect(unwrapped).toBeNull()
    })

    it('should return null when checksum is invalid', () => {
      const wrapped = {
        data: { key: 'value' },
        checksum: 'invalid-checksum',
      }

      const unwrapped = unwrapWithIntegrity(wrapped)

      expect(unwrapped).toBeNull()
    })

    it('should return null when data is modified', () => {
      const originalData = { key: 'value' }
      const wrapped = wrapWithIntegrity(originalData)
      wrapped.data = { key: 'modified' }

      const unwrapped = unwrapWithIntegrity(wrapped)

      expect(unwrapped).toBeNull()
    })

    it('should preserve data type', () => {
      const stringWrapped = wrapWithIntegrity('test')
      expect(unwrapWithIntegrity(stringWrapped)).toBe('test')

      const numberWrapped = wrapWithIntegrity(42)
      expect(unwrapWithIntegrity(numberWrapped)).toBe(42)

      const arrayWrapped = wrapWithIntegrity([1, 2, 3])
      expect(unwrapWithIntegrity(arrayWrapped)).toEqual([1, 2, 3])
    })
  })

  describe('validateImportedData', () => {
    it('should validate data with integrity wrapper', () => {
      const originalData = { key: 'value' }
      const wrapped = wrapWithIntegrity(originalData)

      const result = validateImportedData<typeof originalData>(wrapped)

      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(originalData)
      expect(result.error).toBeUndefined()
    })

    it('should return error when integrity wrapper is invalid', () => {
      const wrapped = {
        data: { key: 'value' },
        checksum: 'invalid-checksum',
      }

      const result = validateImportedData<{ key: string }>(wrapped)

      expect(result.isValid).toBe(false)
      expect(result.data).toBeNull()
      expect(result.error).toBe('Data integrity check failed')
    })

    it('should validate data with expected checksum', () => {
      const data = { key: 'value' }
      const checksum = generateChecksum(data)

      const result = validateImportedData<typeof data>(data, checksum)

      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(data)
    })

    it('should return error when expected checksum does not match', () => {
      const data = { key: 'value' }
      const wrongChecksum = 'wrong-checksum'

      const result = validateImportedData<typeof data>(data, wrongChecksum)

      expect(result.isValid).toBe(false)
      expect(result.data).toBeNull()
      expect(result.error).toBe('Checksum validation failed')
    })

    it('should return valid when no checksum provided and no wrapper', () => {
      const data = { key: 'value' }

      const result = validateImportedData<typeof data>(data)

      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(data)
    })

    it('should handle null data', () => {
      const result = validateImportedData<null>(null)

      expect(result.isValid).toBe(true)
      expect(result.data).toBeNull()
    })

    it('should handle primitive types', () => {
      const stringResult = validateImportedData<string>('test')
      expect(stringResult.isValid).toBe(true)
      expect(stringResult.data).toBe('test')

      const numberResult = validateImportedData<number>(42)
      expect(numberResult.isValid).toBe(true)
      expect(numberResult.data).toBe(42)
    })

    it('should handle arrays', () => {
      const data = [1, 2, 3]
      const result = validateImportedData<number[]>(data)

      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(data)
    })

    it('should handle error during validation', () => {
      // Create object that causes JSON.stringify to fail
      const circular: { self?: unknown } = {}
      circular.self = circular

      const wrapped = {
        data: circular,
        checksum: 'some-checksum',
      }

      const result = validateImportedData<typeof circular>(wrapped)

      expect(result.isValid).toBe(false)
      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
    })

    it('should prioritize integrity wrapper over expected checksum', () => {
      const originalData = { key: 'value' }
      const wrapped = wrapWithIntegrity(originalData)
      const wrongChecksum = 'wrong-checksum'

      // Should use wrapper validation, not expected checksum
      const result = validateImportedData<typeof originalData>(wrapped, wrongChecksum)

      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(originalData)
    })

    it('should handle data without wrapper and without expected checksum', () => {
      const data = { key: 'value' }

      const result = validateImportedData<typeof data>(data)

      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(data)
    })
  })
})
