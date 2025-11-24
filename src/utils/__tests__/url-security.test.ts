import { describe, expect, it, vi } from 'vitest'
import {
  checkUrlSecurity,
  getSecurityWarningMessage,
  validateUrlForTabCreation,
} from '../url-security'

// Mock logger
vi.mock('@/libs/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}))

describe('URL Security', () => {
  describe('checkUrlSecurity', () => {
    it('should return safe result for valid HTTPS URL', () => {
      const result = checkUrlSecurity('https://example.com')

      expect(result.isSafe).toBe(true)
      expect(result.riskLevel).toBe('low')
      expect(result.warnings).toEqual([])
      expect(result.details?.domain).toBe('example.com')
    })

    it('should return safe result for valid HTTP URL', () => {
      const result = checkUrlSecurity('http://example.com')

      expect(result.isSafe).toBe(true)
      expect(result.riskLevel).toBe('low')
      expect(result.warnings).toEqual([])
      expect(result.details?.domain).toBe('example.com')
    })

    it('should detect IP address and set medium risk', () => {
      const result = checkUrlSecurity('https://192.168.1.1')

      expect(result.isSafe).toBe(false)
      expect(result.riskLevel).toBe('medium')
      expect(result.warnings).toContain('URL uses IP address instead of domain name')
      expect(result.details?.isIpAddress).toBe(true)
      expect(result.details?.domain).toBe('192.168.1.1')
    })

    it('should detect shortened URLs and set high risk', () => {
      const result = checkUrlSecurity('https://bit.ly/abc123')

      expect(result.isSafe).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.warnings).toContain('URL appears to be a shortened link')
      expect(result.details?.isShortened).toBe(true)
      expect(result.details?.domain).toBe('bit.ly')
    })

    it('should detect multiple shortened URL services', () => {
      const services = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'short.link']

      for (const service of services) {
        const result = checkUrlSecurity(`https://${service}/test`)

        expect(result.riskLevel).toBe('high')
        expect(result.details?.isShortened).toBe(true)
        expect(result.warnings).toContain('URL appears to be a shortened link')
      }
    })

    it('should detect suspicious query parameters', () => {
      const suspiciousParams = ['redirect', 'url', 'link', 'goto', 'next']

      for (const param of suspiciousParams) {
        const result = checkUrlSecurity(`https://example.com?${param}=http://evil.com`)

        expect(result.details?.hasSuspiciousParams).toBe(true)
        expect(result.warnings).toContain('URL contains suspicious query parameters')
        expect(result.riskLevel).toBe('medium')
      }
    })

    it('should set high risk for unusual protocols', () => {
      const result = checkUrlSecurity('javascript:alert(1)')

      expect(result.isSafe).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.warnings.some((w) => w.includes('Unusual protocol'))).toBe(true)
    })

    it('should detect suspicious characters', () => {
      const result = checkUrlSecurity('https://example.com/path<script>')

      expect(result.riskLevel).toBe('medium')
      expect(result.warnings).toContain('URL contains suspicious characters')
    })

    it('should handle multiple risk factors', () => {
      const result = checkUrlSecurity('https://bit.ly/test?redirect=http://evil.com')

      expect(result.riskLevel).toBe('high')
      expect(result.details?.isShortened).toBe(true)
      expect(result.details?.hasSuspiciousParams).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(1)
    })

    it('should handle invalid URL format', () => {
      const result = checkUrlSecurity('not-a-valid-url')

      expect(result.isSafe).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.warnings).toContain('Invalid URL format')
      expect(result.details).toBeUndefined()
    })

    it('should handle empty string', () => {
      const result = checkUrlSecurity('')

      expect(result.isSafe).toBe(false)
      expect(result.riskLevel).toBe('high')
      expect(result.warnings).toContain('Invalid URL format')
    })

    it('should preserve domain in details', () => {
      const result = checkUrlSecurity('https://subdomain.example.com/path')

      expect(result.details?.domain).toBe('subdomain.example.com')
    })

    it('should handle URLs with path, query, and hash', () => {
      const result = checkUrlSecurity('https://example.com/path?query=value#hash')

      expect(result.isSafe).toBe(true)
      expect(result.riskLevel).toBe('low')
      expect(result.details?.domain).toBe('example.com')
    })

    it('should handle case-insensitive domain matching', () => {
      const result = checkUrlSecurity('https://BIT.LY/test')

      expect(result.details?.domain).toBe('bit.ly')
      expect(result.details?.isShortened).toBe(true)
    })

    it('should set isSafe correctly for medium risk with warnings', () => {
      const result = checkUrlSecurity('https://192.168.1.1')

      // Medium risk with warnings should be unsafe
      expect(result.isSafe).toBe(false)
      expect(result.riskLevel).toBe('medium')
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('validateUrlForTabCreation', () => {
    it('should return true for safe URLs', () => {
      expect(validateUrlForTabCreation('https://example.com')).toBe(true)
      expect(validateUrlForTabCreation('http://example.com')).toBe(true)
    })

    it('should return true for medium risk URLs', () => {
      expect(validateUrlForTabCreation('https://192.168.1.1')).toBe(true)
    })

    it('should return false for high risk URLs', () => {
      expect(validateUrlForTabCreation('https://bit.ly/test')).toBe(false)
      expect(validateUrlForTabCreation('javascript:alert(1)')).toBe(false)
    })

    it('should return false for invalid URLs', () => {
      expect(validateUrlForTabCreation('not-a-valid-url')).toBe(false)
      expect(validateUrlForTabCreation('')).toBe(false)
    })

    it('should return false for URLs with unusual protocols', () => {
      expect(validateUrlForTabCreation('file:///path/to/file')).toBe(false)
      expect(validateUrlForTabCreation('ftp://example.com')).toBe(false)
    })

    it('should return true for URLs with suspicious params but low risk', () => {
      // URL with suspicious param but not shortened or unusual protocol
      // Should be medium risk, which is allowed
      expect(validateUrlForTabCreation('https://example.com?redirect=http://other.com')).toBe(true)
    })
  })

  describe('getSecurityWarningMessage', () => {
    it('should return null for safe URLs', () => {
      const result = checkUrlSecurity('https://example.com')
      const message = getSecurityWarningMessage(result)

      expect(message).toBeNull()
    })

    it('should return null for URLs with no warnings', () => {
      const result: ReturnType<typeof checkUrlSecurity> = {
        isSafe: true,
        riskLevel: 'low',
        warnings: [],
      }
      const message = getSecurityWarningMessage(result)

      expect(message).toBeNull()
    })

    it('should return high risk message for high risk URLs', () => {
      const result = checkUrlSecurity('https://bit.ly/test')
      const message = getSecurityWarningMessage(result)

      expect(message).toContain('High security risk detected')
      expect(message).toContain('shortened link')
    })

    it('should return medium risk message for medium risk URLs', () => {
      const result = checkUrlSecurity('https://192.168.1.1')
      const message = getSecurityWarningMessage(result)

      expect(message).toContain('Security warning')
      expect(message).toContain('IP address')
    })

    it('should include all warnings in message', () => {
      const result = checkUrlSecurity('https://bit.ly/test?redirect=http://evil.com')
      const message = getSecurityWarningMessage(result)

      expect(message).toContain('shortened link')
      expect(message).toContain('suspicious query parameters')
    })

    it('should return null for low risk with warnings (edge case)', () => {
      const result: ReturnType<typeof checkUrlSecurity> = {
        isSafe: true,
        riskLevel: 'low',
        warnings: ['Some warning'],
      }
      const message = getSecurityWarningMessage(result)

      // Low risk should return null even with warnings
      expect(message).toBeNull()
    })
  })
})
