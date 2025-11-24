import { useEffect, useState } from 'react'
import { isValidUrl, normalizeUrl } from '@/utils/url'

export type UrlValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'error'

export interface UrlValidationResult {
  status: UrlValidationStatus
  normalizedUrl: string | null
  error?: string
}

/**
 * Hook to validate URL asynchronously
 * @param url - URL to validate
 * @param enabled - Whether validation is enabled
 * @returns Validation result
 */
export function useUrlValidation(url: string, enabled = true): UrlValidationResult {
  const [result, setResult] = useState<UrlValidationResult>({
    status: 'idle',
    normalizedUrl: null,
  })

  useEffect(() => {
    if (!enabled || !url || url.trim().length === 0) {
      setResult({ status: 'idle', normalizedUrl: null })
      return
    }

    // Basic format validation first
    if (!isValidUrl(url)) {
      setResult({
        status: 'invalid',
        normalizedUrl: null,
        error: 'Invalid URL format',
      })
      return
    }

    // Normalize URL
    const normalized = normalizeUrl(url)
    if (!normalized) {
      setResult({
        status: 'invalid',
        normalizedUrl: null,
        error: 'Invalid URL format',
      })
      return
    }

    // Set validating state
    setResult({ status: 'validating', normalizedUrl: normalized })

    // Validate URL accessibility with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    // Try to fetch URL (HEAD request to check if accessible)
    fetch(normalized, {
      method: 'HEAD',
      mode: 'no-cors', // Avoid CORS issues, we just want to know if URL is reachable
      signal: controller.signal,
    })
      .then(() => {
        clearTimeout(timeoutId)
        setResult({
          status: 'valid',
          normalizedUrl: normalized,
        })
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        // For no-cors mode, we can't detect actual errors, so we assume valid if format is correct
        if (error.name === 'AbortError') {
          setResult({
            status: 'error',
            normalizedUrl: normalized,
            error: 'Validation timeout',
          })
        } else {
          // If format is valid, we assume it's valid even if we can't verify accessibility
          // (due to CORS or network issues)
          setResult({
            status: 'valid',
            normalizedUrl: normalized,
          })
        }
      })

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [url, enabled])

  return result
}
