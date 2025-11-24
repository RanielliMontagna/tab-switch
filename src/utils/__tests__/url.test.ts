import { describe, expect, it } from 'vitest'
import { isValidUrl, normalizeUrl, sanitizeUrl } from '../url'

describe('url utilities', () => {
  describe('sanitizeUrl', () => {
    it('should return null for empty string', () => {
      expect(sanitizeUrl('')).toBeNull()
    })

    it('should return null for non-string input', () => {
      expect(sanitizeUrl(null as unknown as string)).toBeNull()
      expect(sanitizeUrl(undefined as unknown as string)).toBeNull()
    })

    it('should return null for invalid URL', () => {
      // Invalid URLs that can't be parsed even with https:// prefix
      expect(sanitizeUrl('')).toBeNull()
      expect(sanitizeUrl('   ')).toBeNull()
    })

    it('should return null for non-http/https protocols', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
      expect(sanitizeUrl('file:///path/to/file')).toBeNull()
      expect(sanitizeUrl('ftp://example.com')).toBeNull()
    })

    it('should sanitize valid http URL', () => {
      const result = sanitizeUrl('http://example.com')
      expect(result).toBe('http://example.com/')
    })

    it('should sanitize valid https URL', () => {
      const result = sanitizeUrl('https://example.com')
      expect(result).toBe('https://example.com/')
    })

    it('should add https:// prefix if missing', () => {
      const result = sanitizeUrl('example.com')
      expect(result).toBe('https://example.com/')
    })

    it('should preserve path, query and hash', () => {
      const result = sanitizeUrl('https://example.com/path?query=1#hash')
      expect(result).toBe('https://example.com/path?query=1#hash')
    })

    it('should trim whitespace', () => {
      const result = sanitizeUrl('  https://example.com  ')
      expect(result).toBe('https://example.com/')
    })
  })

  describe('isValidUrl', () => {
    it('should return true for valid http URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true)
    })

    it('should return true for valid https URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
    })

    it('should return false for invalid URL', () => {
      // Empty string is invalid
      expect(isValidUrl('')).toBe(false)
      // Only whitespace is invalid
      expect(isValidUrl('   ')).toBe(false)
    })

    it('should return false for non-http/https protocols', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false)
    })
  })

  describe('normalizeUrl', () => {
    it('should normalize URL to lowercase hostname', () => {
      const result = normalizeUrl('https://EXAMPLE.COM')
      expect(result).toBe('https://example.com/')
    })

    it('should return original URL if invalid', () => {
      // normalizeUrl will try to sanitize, and if that fails, returns original
      // But sanitizeUrl might add https:// prefix, so we test with truly invalid input
      const invalid = ''
      const result = normalizeUrl(invalid)
      expect(result).toBe(invalid)
    })

    it('should preserve valid URL structure', () => {
      const result = normalizeUrl('https://Example.com/path?query=1#hash')
      expect(result).toBe('https://example.com/path?query=1#hash')
    })
  })
})
