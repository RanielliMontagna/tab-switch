/**
 * Retry utility for async operations
 */

export interface RetryOptions {
  maxAttempts?: number
  delay?: number
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * Retry an async function with exponential backoff
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Result of the function
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, delay = 1000, onRetry } = options

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxAttempts) {
        onRetry?.(attempt, lastError)
        const backoffDelay = delay * 2 ** (attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, backoffDelay))
      }
    }
  }

  if (!lastError) {
    throw new Error('Retry failed: unknown error')
  }
  throw lastError
}
