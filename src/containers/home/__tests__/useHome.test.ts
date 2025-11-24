import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TabSchema } from '../home.schema'
import { useHome } from '../useHome'

// Mock dependencies
vi.mock('@/hooks/use-sessions', () => ({
  useSessions: vi.fn(),
}))

vi.mock('@/hooks/use-tab-operations', () => ({
  useTabOperations: vi.fn(),
}))

vi.mock('@/hooks/use-tab-import-export', () => ({
  useTabImportExport: vi.fn(),
}))

vi.mock('@/hooks/use-rotation-control', () => ({
  useRotationControl: vi.fn(),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}))

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => key,
  })),
}))

vi.mock('@/libs/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import { useRotationControl } from '@/hooks/use-rotation-control'
import { useSessions } from '@/hooks/use-sessions'
import { useTabImportExport } from '@/hooks/use-tab-import-export'
import { useTabOperations } from '@/hooks/use-tab-operations'

const mockUseSessions = vi.mocked(useSessions)
const mockUseTabOperations = vi.mocked(useTabOperations)
const mockUseTabImportExport = vi.mocked(useTabImportExport)
const mockUseRotationControl = vi.mocked(useRotationControl)

describe('useHome', () => {
  const mockTabs: TabSchema[] = [
    { id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 },
    { id: 2, name: 'Tab 2', url: 'https://example.org', interval: 10000 },
  ]

  const mockSessions = {
    sessions: [
      {
        id: 'session-1',
        name: 'Default',
        tabs: mockTabs,
        createdAt: Date.now(),
      },
    ],
    currentSessionId: 'session-1',
    currentSession: {
      id: 'session-1',
      name: 'Default',
      tabs: mockTabs,
      createdAt: Date.now(),
    },
    currentSessionTabs: mockTabs,
    isLoading: false,
    loadSessions: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn(),
    updateCurrentSessionTabs: vi.fn().mockResolvedValue(undefined),
    switchSession: vi.fn(),
    updateSessionName: vi.fn(),
    deleteSession: vi.fn(),
  }

  const mockTabOperations = {
    isDeleting: null,
    isReordering: false,
    handleRemoveTab: vi.fn(),
    handleDragEnd: vi.fn(),
  }

  const mockTabImportExport = {
    exportTabs: vi.fn(),
    importTabs: vi.fn(),
    importFromPaste: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn(),
  }

  const mockRotationControl = {
    activeSwitch: false,
    isPaused: false,
    loadRotationState: vi.fn().mockResolvedValue(undefined),
    handleCheckedChange: vi.fn(),
    handlePauseResume: vi.fn(),
  }

  beforeEach(() => {
    mockUseSessions.mockReturnValue(mockSessions as ReturnType<typeof useSessions>)
    mockUseTabOperations.mockReturnValue(mockTabOperations as ReturnType<typeof useTabOperations>)
    mockUseTabImportExport.mockReturnValue(
      mockTabImportExport as ReturnType<typeof useTabImportExport>
    )
    mockUseRotationControl.mockReturnValue(
      mockRotationControl as ReturnType<typeof useRotationControl>
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default values', async () => {
      const { result } = renderHook(() => useHome())

      // Wait for useEffect to complete
      await waitFor(() => {
        expect(mockSessions.loadSessions).toHaveBeenCalled()
      })

      expect(result.current.tabs).toEqual(mockTabs)
      expect(result.current.activeSwitch).toBe(false)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSaving).toBe(false)
      expect(result.current.isDeleting).toBe(null)
      expect(result.current.isReordering).toBe(false)
    })

    it('should load sessions and rotation state on mount', async () => {
      renderHook(() => useHome())

      await waitFor(() => {
        expect(mockSessions.loadSessions).toHaveBeenCalled()
        expect(mockRotationControl.loadRotationState).toHaveBeenCalled()
      })
    })
  })

  describe('Form submission', () => {
    it('should handle form submission successfully', async () => {
      const { result } = renderHook(() => useHome())

      const formData = {
        name: 'New Tab',
        url: 'https://newsite.com',
        interval: 8000,
      }

      await act(async () => {
        await result.current.handleSubmit(formData)
      })

      await waitFor(() => {
        expect(mockSessions.updateCurrentSessionTabs).toHaveBeenCalled()
        expect(result.current.methods.getValues('name')).toBe('')
        expect(result.current.methods.getValues('url')).toBe('')
      })
    })

    it('should generate correct ID for new tab', async () => {
      const { result } = renderHook(() => useHome())

      const formData = {
        name: 'New Tab',
        url: 'https://newsite.com',
        interval: 8000,
      }

      await act(async () => {
        await result.current.handleSubmit(formData)
      })

      await waitFor(() => {
        const updateCall = mockSessions.updateCurrentSessionTabs.mock.calls[0]?.[0]
        expect(updateCall).toBeDefined()
        if (Array.isArray(updateCall)) {
          const newTab = updateCall[updateCall.length - 1]
          expect(newTab.id).toBe(3) // Max ID from mockTabs is 2, so new should be 3
        }
      })
    })

    it('should validate and correct interval below minimum', async () => {
      const { result } = renderHook(() => useHome())

      const formData = {
        name: 'New Tab',
        url: 'https://newsite.com',
        interval: 1000, // Below minimum of 5000
      }

      await act(async () => {
        await result.current.handleSubmit(formData)
      })

      await waitFor(() => {
        const updateCall = mockSessions.updateCurrentSessionTabs.mock.calls[0]?.[0]
        if (Array.isArray(updateCall)) {
          const newTab = updateCall[updateCall.length - 1]
          expect(newTab.interval).toBe(5000) // Should be corrected to minimum
        }
      })
    })

    it('should handle string interval and convert to number', async () => {
      const { result } = renderHook(() => useHome())

      const formData = {
        name: 'New Tab',
        url: 'https://newsite.com',
        interval: '10000' as unknown as number,
      }

      await act(async () => {
        await result.current.handleSubmit(formData)
      })

      await waitFor(() => {
        const updateCall = mockSessions.updateCurrentSessionTabs.mock.calls[0]?.[0]
        if (Array.isArray(updateCall)) {
          const newTab = updateCall[updateCall.length - 1]
          expect(newTab.interval).toBe(10000)
        }
      })
    })

    it('should round interval to nearest integer', async () => {
      const { result } = renderHook(() => useHome())

      const formData = {
        name: 'New Tab',
        url: 'https://newsite.com',
        interval: 7500.7,
      }

      await act(async () => {
        await result.current.handleSubmit(formData)
      })

      await waitFor(() => {
        const updateCall = mockSessions.updateCurrentSessionTabs.mock.calls[0]?.[0]
        if (Array.isArray(updateCall)) {
          const newTab = updateCall[updateCall.length - 1]
          expect(newTab.interval).toBe(7501) // Rounded
        }
      })
    })

    it('should handle form submission error', async () => {
      const { result } = renderHook(() => useHome())

      mockSessions.updateCurrentSessionTabs.mockRejectedValueOnce(new Error('Storage error'))

      const formData = {
        name: 'New Tab',
        url: 'https://newsite.com',
        interval: 8000,
      }

      await act(async () => {
        await result.current.handleSubmit(formData)
      })

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false)
      })
    })
  })

  describe('Tab operations', () => {
    it('should expose tab operations handlers', () => {
      const { result } = renderHook(() => useHome())

      expect(result.current.handleDragEnd).toBe(mockTabOperations.handleDragEnd)
      expect(result.current.isDeleting).toBe(null)
      expect(result.current.isReordering).toBe(false)
    })

    it('should sync local tabs when session tabs change', async () => {
      const { result, rerender } = renderHook(() => useHome())

      const newTabs: TabSchema[] = [
        { id: 3, name: 'Tab 3', url: 'https://example.net', interval: 6000 },
      ]

      await act(async () => {
        mockUseSessions.mockReturnValue({
          ...mockSessions,
          currentSessionTabs: newTabs,
        } as ReturnType<typeof useSessions>)

        rerender()
      })

      await waitFor(() => {
        expect(result.current.tabs).toEqual(newTabs)
      })
    })
  })

  describe('Import/Export', () => {
    it('should expose import/export functions', () => {
      const { result } = renderHook(() => useHome())

      expect(result.current.exportTabs).toBe(mockTabImportExport.exportTabs)
      expect(result.current.importTabs).toBe(mockTabImportExport.importTabs)
      expect(result.current.importFromPaste).toBe(mockTabImportExport.importFromPaste)
      expect(result.current.handleDragOver).toBe(mockTabImportExport.handleDragOver)
      expect(result.current.handleDragLeave).toBe(mockTabImportExport.handleDragLeave)
      expect(result.current.handleDrop).toBe(mockTabImportExport.handleDrop)
    })
  })

  describe('Rotation control', () => {
    it('should expose rotation control handlers', () => {
      const { result } = renderHook(() => useHome())

      expect(result.current.handleCheckedChange).toBe(mockRotationControl.handleCheckedChange)
      expect(result.current.handlePauseResume).toBe(mockRotationControl.handlePauseResume)
      expect(result.current.activeSwitch).toBe(false)
      expect(result.current.isPaused).toBe(false)
    })
  })

  describe('Session management', () => {
    it('should expose session management functions', () => {
      const { result } = renderHook(() => useHome())

      expect(result.current.sessions).toEqual(mockSessions.sessions)
      expect(result.current.currentSessionId).toBe('session-1')
      expect(result.current.currentSession).toEqual(mockSessions.currentSession)
      expect(result.current.createSession).toBe(mockSessions.createSession)
      expect(result.current.switchSession).toBe(mockSessions.switchSession)
      expect(result.current.updateSessionName).toBe(mockSessions.updateSessionName)
      expect(result.current.deleteSession).toBe(mockSessions.deleteSession)
    })
  })

  describe('Error handling', () => {
    it('should handle load error gracefully', async () => {
      mockSessions.loadSessions.mockRejectedValueOnce(new Error('Load error'))

      await act(async () => {
        renderHook(() => useHome())
      })

      await waitFor(() => {
        expect(mockSessions.loadSessions).toHaveBeenCalled()
      })
    })

    it('should handle rotation state load error', async () => {
      mockRotationControl.loadRotationState.mockRejectedValueOnce(new Error('Rotation error'))

      await act(async () => {
        renderHook(() => useHome())
      })

      await waitFor(() => {
        expect(mockRotationControl.loadRotationState).toHaveBeenCalled()
      })
    })
  })

  describe('ID generation', () => {
    it('should generate ID 1 when no tabs exist', async () => {
      mockUseSessions.mockReturnValue({
        ...mockSessions,
        currentSessionTabs: [],
      } as ReturnType<typeof useSessions>)

      const { result } = renderHook(() => useHome())

      const formData = {
        name: 'First Tab',
        url: 'https://first.com',
        interval: 5000,
      }

      await act(async () => {
        await result.current.handleSubmit(formData)
      })

      await waitFor(() => {
        const updateCall = mockSessions.updateCurrentSessionTabs.mock.calls[0]?.[0]
        if (Array.isArray(updateCall)) {
          const newTab = updateCall[updateCall.length - 1]
          expect(newTab.id).toBe(1)
        }
      })
    })
  })
})
