/**
 * URL security validation utilities
 * Provides functions to detect potentially malicious URLs
 */

import { logger } from '@/libs/logger'

/**
 * Known malicious patterns and suspicious indicators
 */
const MALICIOUS_PATTERNS = {
  // Common phishing patterns
  suspiciousDomains: [
    'bit.ly',
    'tinyurl.com',
    't.co',
    'goo.gl',
    'short.link',
    // Add more as needed
  ],
  // Suspicious query parameters
  suspiciousParams: ['redirect', 'url', 'link', 'goto', 'next'],
  // IP addresses (often used in phishing)
  ipAddressPattern: /^\d+\.\d+\.\d+\.\d+$/,
  // Suspicious characters
  suspiciousChars: /[^\w\-._~:/?#[\]@!$&'()*+,;=%]/,
}

/**
 * URL security check result
 */
export interface UrlSecurityResult {
  isSafe: boolean
  riskLevel: 'low' | 'medium' | 'high'
  warnings: string[]
  details?: {
    isShortened?: boolean
    isIpAddress?: boolean
    hasSuspiciousParams?: boolean
    domain?: string
  }
}

/**
 * Checks if a URL is potentially malicious
 * @param url - URL to check
 * @returns Security check result
 */
export function checkUrlSecurity(url: string): UrlSecurityResult {
  const warnings: string[] = []
  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  const details: UrlSecurityResult['details'] = {}

  try {
    const urlObj = new URL(url)

    // Check domain
    const domain = urlObj.hostname.toLowerCase()
    details.domain = domain

    // Check for IP address
    if (MALICIOUS_PATTERNS.ipAddressPattern.test(domain)) {
      details.isIpAddress = true
      warnings.push('URL uses IP address instead of domain name')
      riskLevel = 'medium'
    }

    // Check for shortened URLs
    const isShortened = MALICIOUS_PATTERNS.suspiciousDomains.some((suspicious) =>
      domain.includes(suspicious)
    )
    if (isShortened) {
      details.isShortened = true
      warnings.push('URL appears to be a shortened link')
      riskLevel = 'high'
    }

    // Check for suspicious query parameters
    const hasSuspiciousParams = MALICIOUS_PATTERNS.suspiciousParams.some((param) =>
      urlObj.searchParams.has(param)
    )
    if (hasSuspiciousParams) {
      details.hasSuspiciousParams = true
      warnings.push('URL contains suspicious query parameters')
      riskLevel = riskLevel === 'low' ? 'medium' : 'high'
    }

    // Check protocol
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      warnings.push(`Unusual protocol: ${urlObj.protocol}`)
      riskLevel = 'high'
    }

    // Check for suspicious characters
    if (MALICIOUS_PATTERNS.suspiciousChars.test(url)) {
      warnings.push('URL contains suspicious characters')
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel
    }

    const isSafe = riskLevel === 'low' || (riskLevel === 'medium' && warnings.length === 0)

    return {
      isSafe,
      riskLevel,
      warnings,
      details,
    }
  } catch (error) {
    logger.warn('Error checking URL security:', error)
    return {
      isSafe: false,
      riskLevel: 'high',
      warnings: ['Invalid URL format'],
    }
  }
}

/**
 * Validates URL before creating a tab
 * @param url - URL to validate
 * @returns true if URL is safe to use, false otherwise
 */
export function validateUrlForTabCreation(url: string): boolean {
  const securityCheck = checkUrlSecurity(url)

  if (!securityCheck.isSafe) {
    logger.warn('URL failed security check:', {
      url,
      riskLevel: securityCheck.riskLevel,
      warnings: securityCheck.warnings,
    })
  }

  // Allow low and medium risk URLs, but log warnings
  // High risk URLs are blocked
  return securityCheck.riskLevel !== 'high'
}

/**
 * Gets a user-friendly warning message for a URL security issue
 * @param result - Security check result
 * @returns Warning message or null if safe
 */
export function getSecurityWarningMessage(result: UrlSecurityResult): string | null {
  if (result.isSafe || result.warnings.length === 0) {
    return null
  }

  if (result.riskLevel === 'high') {
    return `High security risk detected: ${result.warnings.join(', ')}`
  }

  if (result.riskLevel === 'medium') {
    return `Security warning: ${result.warnings.join(', ')}`
  }

  return null
}
