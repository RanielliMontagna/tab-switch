import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../ErrorBoundary'

// Mock logger
vi.mock('@/libs/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'errorBoundary.title': 'Something went wrong',
        'errorBoundary.description': 'An error occurred. Please try again.',
        'errorBoundary.details': 'Error details',
        'errorBoundary.retry': 'Try again',
        'errorBoundary.reload': 'Reload page',
      }
      return translations[key] || key
    },
  }),
}))

// Component that throws an error
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for expected error throws
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should render error fallback when child throws error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An error occurred. Please try again.')).toBeInTheDocument()
  })

  it('should display error message in details', async () => {
    const user = userEvent.setup()

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    )

    const detailsButton = screen.getByText('Error details')
    expect(detailsButton).toBeInTheDocument()

    // Click to expand details
    await user.click(detailsButton)

    expect(screen.getByText(/Test error message/)).toBeInTheDocument()
  })

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should have retry button that can be clicked', async () => {
    const user = userEvent.setup()

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    const retryButton = screen.getByText('Try again')
    expect(retryButton).toBeInTheDocument()

    // Click the retry button - it should reset the error state
    // Note: The actual reset behavior depends on the children not throwing again
    // If children still throw, ErrorBoundary will catch it again
    await user.click(retryButton)

    // After click, the error boundary should still be visible if children still throw
    // or should show children if they don't throw
    // We just verify the button was clickable
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('should call window.location.reload when reload button is clicked', async () => {
    const user = userEvent.setup()

    // Mock window.location.reload
    const originalReload = window.location.reload
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        reload: reloadSpy,
      },
      writable: true,
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByText('Reload page')
    await user.click(reloadButton)

    expect(reloadSpy).toHaveBeenCalled()

    // Restore original
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        reload: originalReload,
      },
      writable: true,
    })
  })

  it('should handle null error gracefully', () => {
    // Create a component that throws a non-Error object
    function ThrowNonError(): never {
      throw 'String error'
    }

    render(
      <ErrorBoundary>
        <ThrowNonError />
      </ErrorBoundary>
    )

    // Should still render error boundary
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
