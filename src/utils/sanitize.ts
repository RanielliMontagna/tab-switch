/**
 * Input sanitization utilities
 * Provides functions to sanitize user inputs to prevent XSS and other security issues
 */

/**
 * Sanitizes a string by removing potentially dangerous characters
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = input.replace(/\0/g, '')

  // Remove control characters using character codes
  sanitized = sanitized
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0)
      // Allow printable characters, newlines (10), and tabs (9)
      return (code >= 32 && code <= 126) || code === 9 || code === 10 || code > 127
    })
    .join('')

  return sanitized.trim()
}

/**
 * Sanitizes a number input
 * @param input - Number or string to sanitize
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Sanitized number or null if invalid
 */
export function sanitizeNumber(input: unknown, min?: number, max?: number): number | null {
  if (typeof input === 'number') {
    if (Number.isNaN(input) || !Number.isFinite(input)) {
      return null
    }
    let value = input
    if (min !== undefined && value < min) {
      value = min
    }
    if (max !== undefined && value > max) {
      value = max
    }
    return value
  }

  if (typeof input === 'string') {
    const parsed = parseFloat(input)
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      return null
    }
    let value = parsed
    if (min !== undefined && value < min) {
      value = min
    }
    if (max !== undefined && value > max) {
      value = max
    }
    return value
  }

  return null
}

/**
 * Sanitizes a name input (for tab names)
 * @param input - Name to sanitize
 * @param maxLength - Maximum length (default: 100)
 * @returns Sanitized name
 */
export function sanitizeName(input: string, maxLength = 100): string {
  const sanitized = sanitizeString(input)
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength)
  }
  return sanitized
}

/**
 * Sanitizes form data object
 * @param data - Form data object
 * @returns Sanitized form data
 */
export function sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
  const sanitized = { ...data }

  const keys = Object.keys(sanitized) as Array<keyof T>
  for (const key of keys) {
    const value = sanitized[key]

    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value) as T[typeof key]
    } else if (typeof value === 'number') {
      const sanitizedNum = sanitizeNumber(value)
      if (sanitizedNum !== null) {
        sanitized[key] = sanitizedNum as T[typeof key]
      }
    }
  }

  return sanitized
}

/**
 * Validates and sanitizes a URL input
 * Note: This is a basic sanitization. Full URL validation should be done separately.
 * @param input - URL string to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrlInput(input: string): string {
  const sanitized = sanitizeString(input)

  // Basic check for dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  const lowerInput = sanitized.toLowerCase().trim()

  for (const protocol of dangerousProtocols) {
    if (lowerInput.startsWith(protocol)) {
      return ''
    }
  }

  return sanitized
}
