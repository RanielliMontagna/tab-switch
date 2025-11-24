/**
 * URL validation and sanitization utilities
 */

const ALLOWED_PROTOCOLS = ['http:', 'https:'] as const

/**
 * Sanitize and validate URL
 * @param url - URL string to validate
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null
  }

  // Trim whitespace
  const trimmed = url.trim()

  if (!trimmed) {
    return null
  }

  try {
    // Try to parse as URL
    const parsed = new URL(trimmed)

    // Check if protocol is allowed
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol as (typeof ALLOWED_PROTOCOLS)[number])) {
      return null
    }

    // Return sanitized URL (only protocol, hostname, pathname, search, hash)
    // This removes any potential XSS vectors
    const sanitized = new URL(parsed.href)
    sanitized.search = parsed.search
    sanitized.hash = parsed.hash

    return sanitized.href
  } catch {
    // If URL parsing fails, try to add https:// prefix
    try {
      const withProtocol =
        trimmed.startsWith('http://') || trimmed.startsWith('https://')
          ? trimmed
          : `https://${trimmed}`

      const parsed = new URL(withProtocol)

      if (!ALLOWED_PROTOCOLS.includes(parsed.protocol as (typeof ALLOWED_PROTOCOLS)[number])) {
        return null
      }

      return parsed.href
    } catch {
      return null
    }
  }
}

/**
 * Validate URL format and protocol
 * @param url - URL string to validate
 * @returns true if URL is valid and safe
 */
export function isValidUrl(url: string): boolean {
  return sanitizeUrl(url) !== null
}

/**
 * Normalize URL (add protocol if missing, lowercase hostname)
 * @param url - URL string to normalize
 * @returns Normalized URL or original if invalid
 */
export function normalizeUrl(url: string): string {
  const sanitized = sanitizeUrl(url)
  if (!sanitized) {
    return url
  }

  try {
    const parsed = new URL(sanitized)
    parsed.hostname = parsed.hostname.toLowerCase()
    return parsed.href
  } catch {
    return sanitized
  }
}
