import { describe, expect, it, vi } from 'vitest'
import { retry } from '../retry'

describe('retry', () => {
  it('should return result on first attempt if function succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await retry(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure and succeed on second attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce('success')

    const result = await retry(fn, { maxAttempts: 3, delay: 10 })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should retry with exponential backoff', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failed'))
    const onRetry = vi.fn()

    const startTime = Date.now()
    const promise = retry(fn, { maxAttempts: 3, delay: 50, onRetry })

    await expect(promise).rejects.toThrow('Failed')

    const endTime = Date.now()
    const elapsed = endTime - startTime

    // Should have waited at least 50ms (first retry) + 100ms (second retry) = 150ms
    expect(elapsed).toBeGreaterThanOrEqual(100)
    expect(onRetry).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
    expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error))
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should throw last error after max attempts', async () => {
    const error = new Error('Final error')
    const fn = vi.fn().mockRejectedValue(error)

    await expect(retry(fn, { maxAttempts: 2, delay: 10 })).rejects.toThrow('Final error')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should handle non-Error objects', async () => {
    const fn = vi.fn().mockRejectedValue('String error')

    await expect(retry(fn, { maxAttempts: 2, delay: 10 })).rejects.toThrow()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should use default options when not provided', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await retry(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should call onRetry callback with correct attempt number', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failed'))
    const onRetry = vi.fn()

    await expect(retry(fn, { maxAttempts: 2, delay: 10, onRetry })).rejects.toThrow()

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
  })
})
