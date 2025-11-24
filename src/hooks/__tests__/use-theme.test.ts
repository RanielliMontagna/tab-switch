import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTheme } from '../use-theme'

// Mock dependencies
vi.mock('@/libs/storage', () => ({
  getStorageItem: vi.fn(),
  setStorageItem: vi.fn(),
  STORAGE_KEYS: {
    THEME: 'theme',
  },
}))

import { getStorageItem, setStorageItem } from '@/libs/storage'

const mockGetStorageItem = vi.mocked(getStorageItem)
const mockSetStorageItem = vi.mocked(setStorageItem)

describe('useTheme', () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset mock before each test
    vi.clearAllMocks()

    // Mock matchMedia - default implementation returns light mode
    mockMatchMedia = vi.fn((query: string) => {
      return {
        matches: false, // Default to light mode
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList
    })

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
      configurable: true,
    })

    // Reset document classes
    document.documentElement.classList.remove('dark')

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.documentElement.classList.remove('dark')
  })

  describe('Initialization', () => {
    it('should initialize with "system" theme by default', () => {
      mockGetStorageItem.mockResolvedValue(null)

      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe('system')
      expect(result.current.mounted).toBe(false)
    })

    it('should load theme from storage on mount', async () => {
      mockGetStorageItem.mockResolvedValue('dark')

      const { result } = renderHook(() => useTheme())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      expect(mockGetStorageItem).toHaveBeenCalledWith('theme')
      expect(result.current.theme).toBe('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should apply light theme when system prefers light', async () => {
      mockGetStorageItem.mockResolvedValue('system')
      mockMatchMedia.mockImplementationOnce(
        () =>
          ({
            matches: false, // Light mode
            media: '(prefers-color-scheme: dark)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }) as MediaQueryList
      )

      const { result } = renderHook(() => useTheme())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      expect(result.current.effectiveTheme).toBe('light')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  describe('getSystemTheme', () => {
    it('should return "light" when system prefers light', () => {
      mockGetStorageItem.mockResolvedValue(null)
      mockMatchMedia.mockImplementationOnce(
        () =>
          ({
            matches: false,
            media: '(prefers-color-scheme: dark)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }) as MediaQueryList
      )

      const { result } = renderHook(() => useTheme())

      expect(result.current.effectiveTheme).toBe('light')
    })

    it('should return "dark" when system prefers dark', async () => {
      mockGetStorageItem.mockResolvedValue(null)
      // Override default mock for this test to return dark mode
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList)

      const { result } = renderHook(() => useTheme())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      expect(result.current.effectiveTheme).toBe('dark')
    })
  })

  describe('applyTheme', () => {
    it('should add "dark" class for dark theme', async () => {
      mockGetStorageItem.mockResolvedValue('dark')

      renderHook(() => useTheme())

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })
    })

    it('should remove "dark" class for light theme', async () => {
      mockGetStorageItem.mockResolvedValue('light')

      renderHook(() => useTheme())

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false)
      })
    })

    it('should apply system theme when theme is "system"', async () => {
      mockGetStorageItem.mockResolvedValue('system')
      // Override default mock for this test to return dark mode
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList)

      renderHook(() => useTheme())

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })
    })
  })

  describe('System theme listener', () => {
    it('should not listen to system theme changes when theme is not "system"', async () => {
      mockGetStorageItem.mockResolvedValue('dark')
      const addEventListener = vi.fn()

      mockMatchMedia.mockImplementationOnce(
        () =>
          ({
            matches: false,
            media: '(prefers-color-scheme: dark)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener,
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }) as MediaQueryList
      )

      renderHook(() => useTheme())

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })

      // Should not add listener for system theme changes
      expect(addEventListener).not.toHaveBeenCalled()
    })
  })

  describe('toggleTheme', () => {
    it('should toggle from "dark" to "light"', async () => {
      mockGetStorageItem.mockResolvedValue('dark')

      const { result } = renderHook(() => useTheme())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      await act(async () => {
        await result.current.toggleTheme()
      })

      expect(mockSetStorageItem).toHaveBeenCalledWith('theme', 'light')
      expect(result.current.theme).toBe('light')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('should toggle from "light" to "dark"', async () => {
      mockGetStorageItem.mockResolvedValue('light')

      const { result } = renderHook(() => useTheme())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      await act(async () => {
        await result.current.toggleTheme()
      })

      expect(mockSetStorageItem).toHaveBeenCalledWith('theme', 'dark')
      expect(result.current.theme).toBe('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should toggle from "system" to "dark"', async () => {
      mockGetStorageItem.mockResolvedValue('system')

      const { result } = renderHook(() => useTheme())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      await act(async () => {
        await result.current.toggleTheme()
      })

      expect(mockSetStorageItem).toHaveBeenCalledWith('theme', 'dark')
      expect(result.current.theme).toBe('dark')
    })
  })

  describe('setTheme', () => {
    it('should set theme to "dark"', async () => {
      mockGetStorageItem.mockResolvedValue('light')

      const { result } = renderHook(() => useTheme())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      await act(async () => {
        await result.current.setTheme('dark')
      })

      expect(mockSetStorageItem).toHaveBeenCalledWith('theme', 'dark')
      expect(result.current.theme).toBe('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should set theme to "light"', async () => {
      mockGetStorageItem.mockResolvedValue('dark')

      const { result } = renderHook(() => useTheme())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      await act(async () => {
        await result.current.setTheme('light')
      })

      expect(mockSetStorageItem).toHaveBeenCalledWith('theme', 'light')
      expect(result.current.theme).toBe('light')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('should set theme to "system"', async () => {
      mockGetStorageItem.mockResolvedValue('dark')

      const { result } = renderHook(() => useTheme())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      await act(async () => {
        await result.current.setTheme('system')
      })

      expect(mockSetStorageItem).toHaveBeenCalledWith('theme', 'system')
      expect(result.current.theme).toBe('system')
    })
  })

  describe('effectiveTheme', () => {
    it('should return resolved theme when theme is "system"', async () => {
      mockGetStorageItem.mockResolvedValue('system')
      // Override default mock for this test to return dark mode
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList)

      const { result } = renderHook(() => useTheme())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      expect(result.current.effectiveTheme).toBe('dark')
    })

    it('should return theme directly when not "system"', async () => {
      mockGetStorageItem.mockResolvedValue('dark')

      const { result } = renderHook(() => useTheme())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      expect(result.current.effectiveTheme).toBe('dark')
    })
  })
})
