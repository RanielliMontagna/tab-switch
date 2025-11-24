import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLanguage } from '../use-language'

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}))

vi.mock('@/libs/storage', () => ({
  getStorageItem: vi.fn(),
  setStorageItem: vi.fn(),
  STORAGE_KEYS: {
    LANGUAGE: 'language',
  },
}))

vi.mock('@/libs/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}))

import { useTranslation } from 'react-i18next'
import { getStorageItem, setStorageItem } from '@/libs/storage'

const mockUseTranslation = vi.mocked(useTranslation)
const mockGetStorageItem = vi.mocked(getStorageItem)
const mockSetStorageItem = vi.mocked(setStorageItem)

describe('useLanguage', () => {
  let mockI18n: {
    language: string
    changeLanguage: ReturnType<typeof vi.fn>
    on: ReturnType<typeof vi.fn>
    off: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockI18n = {
      language: 'en',
      changeLanguage: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
    }

    mockUseTranslation.mockReturnValue({
      i18n: mockI18n,
      t: vi.fn((key: string) => key),
      ready: true,
    } as unknown as ReturnType<typeof useTranslation>)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with i18n language', () => {
      mockI18n.language = 'pt'
      mockGetStorageItem.mockResolvedValue(null)

      const { result } = renderHook(() => useLanguage())

      expect(result.current.currentLanguage).toBe('pt')
      expect(result.current.mounted).toBe(false)
    })

    it('should initialize with default "en" if language is not supported', async () => {
      mockI18n.language = 'fr'
      mockGetStorageItem.mockResolvedValue(null)

      const { result } = renderHook(() => useLanguage())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      expect(result.current.currentLanguage).toBe('en')
    })

    it('should load language from storage on mount', async () => {
      mockGetStorageItem.mockResolvedValue('pt')

      const { result } = renderHook(() => useLanguage())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      expect(mockGetStorageItem).toHaveBeenCalledWith('language')
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('pt')
      expect(result.current.currentLanguage).toBe('pt')
    })

    it('should use detected language if storage value is invalid', async () => {
      mockI18n.language = 'pt'
      mockGetStorageItem.mockResolvedValue('invalid' as 'pt' | 'en')

      const { result } = renderHook(() => useLanguage())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      expect(result.current.currentLanguage).toBe('pt')
    })

    it('should handle storage error gracefully', async () => {
      mockGetStorageItem.mockRejectedValue(new Error('Storage error'))

      const { result } = renderHook(() => useLanguage())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      expect(result.current.currentLanguage).toBe('en')
    })
  })

  describe('Language change listener', () => {
    it('should listen to i18n language changes', () => {
      renderHook(() => useLanguage())

      expect(mockI18n.on).toHaveBeenCalledWith('languageChanged', expect.any(Function))
    })

    it('should update current language when i18n language changes', async () => {
      let languageChangeHandler: (lng: string) => void
      mockI18n.on.mockImplementation((event, handler) => {
        if (event === 'languageChanged') {
          languageChangeHandler = handler
        }
      })

      const { result } = renderHook(() => useLanguage())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      act(() => {
        if (languageChangeHandler) {
          languageChangeHandler('pt')
        }
      })

      expect(result.current.currentLanguage).toBe('pt')
    })

    it('should ignore unsupported language changes', async () => {
      let languageChangeHandler: (lng: string) => void
      mockI18n.on.mockImplementation((event, handler) => {
        if (event === 'languageChanged') {
          languageChangeHandler = handler
        }
      })

      const { result } = renderHook(() => useLanguage())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      const previousLanguage = result.current.currentLanguage

      act(() => {
        if (languageChangeHandler) {
          languageChangeHandler('fr')
        }
      })

      expect(result.current.currentLanguage).toBe(previousLanguage)
    })

    it('should cleanup listener on unmount', () => {
      const { unmount } = renderHook(() => useLanguage())

      unmount()

      expect(mockI18n.off).toHaveBeenCalledWith('languageChanged', expect.any(Function))
    })
  })

  describe('changeLanguage', () => {
    it('should change language and save to storage', async () => {
      mockGetStorageItem.mockResolvedValue(null)

      const { result } = renderHook(() => useLanguage())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      await act(async () => {
        await result.current.changeLanguage('pt')
      })

      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('pt')
      expect(mockSetStorageItem).toHaveBeenCalledWith('language', 'pt')
      expect(result.current.currentLanguage).toBe('pt')
    })

    it('should handle change language error', async () => {
      mockGetStorageItem.mockResolvedValue(null)
      mockI18n.changeLanguage.mockRejectedValueOnce(new Error('Change error'))

      const { result } = renderHook(() => useLanguage())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      await act(async () => {
        await result.current.changeLanguage('pt')
      })

      // Should not throw, but language might not change
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('pt')
    })
  })

  describe('toggleLanguage', () => {
    it('should toggle from "en" to "pt"', async () => {
      mockI18n.language = 'en'
      mockGetStorageItem.mockResolvedValue(null)

      const { result } = renderHook(() => useLanguage())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      await act(async () => {
        await result.current.toggleLanguage()
      })

      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('pt')
      expect(mockSetStorageItem).toHaveBeenCalledWith('language', 'pt')
    })

    it('should toggle from "pt" to "en"', async () => {
      mockI18n.language = 'pt'
      mockGetStorageItem.mockResolvedValue('pt')

      const { result } = renderHook(() => useLanguage())

      await waitFor(() => {
        expect(result.current.mounted).toBe(true)
      })

      await act(async () => {
        await result.current.toggleLanguage()
      })

      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('en')
      expect(mockSetStorageItem).toHaveBeenCalledWith('language', 'en')
    })
  })
})
