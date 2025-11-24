import { describe, expect, it } from 'vitest'
import {
  sanitizeFormData,
  sanitizeName,
  sanitizeNumber,
  sanitizeString,
  sanitizeUrlInput,
} from '../sanitize'

describe('Sanitize Utilities', () => {
  describe('sanitizeString', () => {
    it('should return empty string for non-string input', () => {
      expect(sanitizeString(null as unknown as string)).toBe('')
      expect(sanitizeString(undefined as unknown as string)).toBe('')
      expect(sanitizeString(123 as unknown as string)).toBe('')
      expect(sanitizeString({} as unknown as string)).toBe('')
    })

    it('should remove null bytes', () => {
      expect(sanitizeString('test\0string')).toBe('teststring')
      expect(sanitizeString('\0\0\0')).toBe('')
    })

    it('should remove control characters except newlines and tabs', () => {
      expect(sanitizeString('test\x01string')).toBe('teststring')
      expect(sanitizeString('test\x08string')).toBe('teststring')
      expect(sanitizeString('test\nstring')).toBe('test\nstring')
      expect(sanitizeString('test\tstring')).toBe('test\tstring')
    })

    it('should preserve printable characters', () => {
      const input = 'Hello World 123 !@#$%^&*()'
      expect(sanitizeString(input)).toBe(input)
    })

    it('should preserve unicode characters', () => {
      const input = 'Hello 世界 🌍'
      expect(sanitizeString(input)).toBe(input)
    })

    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test')
      expect(sanitizeString('\t\ntest\n\t')).toBe('test')
    })

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('')
    })

    it('should handle string with only whitespace', () => {
      expect(sanitizeString('   ')).toBe('')
      expect(sanitizeString('\t\n')).toBe('')
    })

    it('should preserve newlines and tabs in content', () => {
      expect(sanitizeString('line1\nline2')).toBe('line1\nline2')
      expect(sanitizeString('col1\tcol2')).toBe('col1\tcol2')
    })
  })

  describe('sanitizeNumber', () => {
    it('should return number for valid number input', () => {
      expect(sanitizeNumber(42)).toBe(42)
      expect(sanitizeNumber(0)).toBe(0)
      expect(sanitizeNumber(-10)).toBe(-10)
      expect(sanitizeNumber(3.14)).toBe(3.14)
    })

    it('should return null for NaN', () => {
      expect(sanitizeNumber(NaN)).toBeNull()
    })

    it('should return null for Infinity', () => {
      expect(sanitizeNumber(Infinity)).toBeNull()
      expect(sanitizeNumber(-Infinity)).toBeNull()
    })

    it('should parse valid string numbers', () => {
      expect(sanitizeNumber('42')).toBe(42)
      expect(sanitizeNumber('3.14')).toBe(3.14)
      expect(sanitizeNumber('-10')).toBe(-10)
      expect(sanitizeNumber('0')).toBe(0)
    })

    it('should return null for invalid string numbers', () => {
      expect(sanitizeNumber('not a number')).toBeNull()
      expect(sanitizeNumber('abc123')).toBeNull()
      expect(sanitizeNumber('')).toBeNull()
    })

    it('should enforce minimum value', () => {
      expect(sanitizeNumber(5, 10)).toBe(10)
      expect(sanitizeNumber('5', 10)).toBe(10)
      expect(sanitizeNumber(15, 10)).toBe(15)
    })

    it('should enforce maximum value', () => {
      expect(sanitizeNumber(15, undefined, 10)).toBe(10)
      expect(sanitizeNumber('15', undefined, 10)).toBe(10)
      expect(sanitizeNumber(5, undefined, 10)).toBe(5)
    })

    it('should enforce both min and max', () => {
      expect(sanitizeNumber(5, 10, 20)).toBe(10)
      expect(sanitizeNumber(25, 10, 20)).toBe(20)
      expect(sanitizeNumber(15, 10, 20)).toBe(15)
    })

    it('should return null for non-number, non-string input', () => {
      expect(sanitizeNumber(null)).toBeNull()
      expect(sanitizeNumber(undefined)).toBeNull()
      expect(sanitizeNumber({})).toBeNull()
      expect(sanitizeNumber([])).toBeNull()
      expect(sanitizeNumber(true)).toBeNull()
    })
  })

  describe('sanitizeName', () => {
    it('should sanitize string input', () => {
      expect(sanitizeName('Test Name')).toBe('Test Name')
      expect(sanitizeName('  Test Name  ')).toBe('Test Name')
    })

    it('should remove control characters', () => {
      expect(sanitizeName('Test\x01Name')).toBe('TestName')
    })

    it('should enforce max length', () => {
      const longName = 'a'.repeat(150)
      const result = sanitizeName(longName, 100)

      expect(result.length).toBe(100)
      expect(result).toBe('a'.repeat(100))
    })

    it('should use default max length of 100', () => {
      const longName = 'a'.repeat(150)
      const result = sanitizeName(longName)

      expect(result.length).toBe(100)
    })

    it('should handle custom max length', () => {
      const name = 'a'.repeat(50)
      const result = sanitizeName(name, 30)

      expect(result.length).toBe(30)
    })

    it('should preserve name within max length', () => {
      const name = 'Short Name'
      expect(sanitizeName(name, 100)).toBe('Short Name')
    })

    it('should trim whitespace before checking length', () => {
      const name = `  ${'a'.repeat(50)}  `
      const result = sanitizeName(name, 50)

      expect(result.length).toBe(50)
      expect(result).toBe('a'.repeat(50))
    })
  })

  describe('sanitizeFormData', () => {
    it('should sanitize string values', () => {
      const data = {
        name: 'Test\x01Name',
        email: 'test@example.com',
      }

      const result = sanitizeFormData(data)

      expect(result.name).toBe('TestName')
      expect(result.email).toBe('test@example.com')
    })

    it('should sanitize number values', () => {
      const data = {
        age: 25,
        count: 100,
      }

      const result = sanitizeFormData(data)

      expect(result.age).toBe(25)
      expect(result.count).toBe(100)
    })

    it('should handle NaN and Infinity in numbers', () => {
      const data = {
        invalid: NaN,
        infinity: Infinity,
      }

      const result = sanitizeFormData(data)

      // NaN and Infinity should remain as-is (not converted to null)
      // because sanitizeNumber returns null but we don't replace the value
      expect(result.invalid).toBeNaN()
      expect(result.infinity).toBe(Infinity)
    })

    it('should preserve non-string, non-number values', () => {
      const data = {
        string: 'test',
        number: 42,
        boolean: true,
        nullValue: null,
        array: [1, 2, 3],
        object: { nested: 'value' },
      }

      const result = sanitizeFormData(data)

      expect(result.string).toBe('test')
      expect(result.number).toBe(42)
      expect(result.boolean).toBe(true)
      expect(result.nullValue).toBeNull()
      expect(result.array).toEqual([1, 2, 3])
      expect(result.object).toEqual({ nested: 'value' })
    })

    it('should not mutate original object', () => {
      const data = {
        name: 'Test\x01Name',
      }

      const result = sanitizeFormData(data)

      expect(data.name).toBe('Test\x01Name')
      expect(result.name).toBe('TestName')
    })

    it('should handle empty object', () => {
      const data = {}
      const result = sanitizeFormData(data)

      expect(result).toEqual({})
    })

    it('should handle complex nested structures', () => {
      const data = {
        name: 'Test\x01Name',
        age: 25,
        metadata: {
          created: '2024-01-01',
          tags: ['tag1', 'tag2'],
        },
      }

      const result = sanitizeFormData(data)

      expect(result.name).toBe('TestName')
      expect(result.age).toBe(25)
      // Nested objects are not sanitized (only top-level)
      expect(result.metadata).toEqual(data.metadata)
    })
  })

  describe('sanitizeUrlInput', () => {
    it('should sanitize valid URL input', () => {
      expect(sanitizeUrlInput('https://example.com')).toBe('https://example.com')
      expect(sanitizeUrlInput('http://example.com')).toBe('http://example.com')
    })

    it('should remove control characters', () => {
      expect(sanitizeUrlInput('https://example.com\x01')).toBe('https://example.com')
    })

    it('should trim whitespace', () => {
      expect(sanitizeUrlInput('  https://example.com  ')).toBe('https://example.com')
    })

    it('should block javascript: protocol', () => {
      expect(sanitizeUrlInput('javascript:alert(1)')).toBe('')
      expect(sanitizeUrlInput('JAVASCRIPT:alert(1)')).toBe('')
    })

    it('should block data: protocol', () => {
      expect(sanitizeUrlInput('data:text/html,<script>alert(1)</script>')).toBe('')
      expect(sanitizeUrlInput('DATA:text/html,test')).toBe('')
    })

    it('should block vbscript: protocol', () => {
      expect(sanitizeUrlInput('vbscript:msgbox("test")')).toBe('')
    })

    it('should block file: protocol', () => {
      expect(sanitizeUrlInput('file:///path/to/file')).toBe('')
      expect(sanitizeUrlInput('FILE:///path/to/file')).toBe('')
    })

    it('should allow safe protocols', () => {
      expect(sanitizeUrlInput('https://example.com')).toBe('https://example.com')
      expect(sanitizeUrlInput('http://example.com')).toBe('http://example.com')
    })

    it('should handle URLs with dangerous protocol in path', () => {
      // Should not block if dangerous protocol is not at the start
      expect(sanitizeUrlInput('https://example.com/javascript:test')).toBe(
        'https://example.com/javascript:test'
      )
    })

    it('should handle empty string', () => {
      expect(sanitizeUrlInput('')).toBe('')
    })

    it('should handle string with only whitespace', () => {
      expect(sanitizeUrlInput('   ')).toBe('')
    })

    it('should preserve valid URL structure', () => {
      const url = 'https://example.com/path?query=value#hash'
      expect(sanitizeUrlInput(url)).toBe(url)
    })
  })
})
