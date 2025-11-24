import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  GetRotationStateMessage,
  PauseRotationMessage,
  ResumeRotationMessage,
  StartRotationMessage,
} from '@/@types/messages'
import * as tabManagement from '@/libs/tab-management'
import * as tabRotation from '@/libs/tab-rotation'

// Mock dependencies
vi.mock('@/libs/tab-management', () => ({
  createTabs: vi.fn(),
  removeOtherTabs: vi.fn(),
}))

vi.mock('@/libs/tab-rotation', () => ({
  startRotation: vi.fn(),
  stopRotation: vi.fn(),
  pauseRotation: vi.fn(),
  resumeRotation: vi.fn(),
  getRotationState: vi.fn(),
}))

vi.mock('@/libs/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock Chrome API
const mockSendResponse = vi.fn()
const mockChromeRuntime = {
  onMessage: {
    addListener: vi.fn((callback) => {
      // Store callback for testing
      ;(globalThis as unknown as { testMessageHandler: typeof callback }).testMessageHandler =
        callback
    }),
  },
}

global.chrome = {
  runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
  tabs: {
    create: vi.fn(),
    query: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
  } as unknown as typeof chrome.tabs,
} as unknown as typeof chrome

// Import after mocks are set up
await import('../index')

const mockCreateTabs = vi.mocked(tabManagement.createTabs)
const mockRemoveOtherTabs = vi.mocked(tabManagement.removeOtherTabs)
const mockStartRotation = vi.mocked(tabRotation.startRotation)
const mockStopRotation = vi.mocked(tabRotation.stopRotation)
const mockPauseRotation = vi.mocked(tabRotation.pauseRotation)
const mockResumeRotation = vi.mocked(tabRotation.resumeRotation)
const mockGetRotationState = vi.mocked(tabRotation.getRotationState)

// Helper to get the message handler
function getMessageHandler() {
  return (globalThis as unknown as { testMessageHandler: typeof mockSendResponse })
    .testMessageHandler
}

describe('Background Script', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendResponse.mockClear()
  })

  describe('Start rotation message', () => {
    it('should handle start rotation message successfully', async () => {
      const tabs = [
        { id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 },
        { id: 2, name: 'Tab 2', url: 'https://example.org', interval: 10000 },
      ]

      const message: StartRotationMessage = {
        status: true,
        tabs,
      }

      mockCreateTabs.mockResolvedValue({
        tabs: [
          { id: 1, interval: 5000 },
          { id: 2, interval: 10000 },
        ],
        errors: [],
      })
      mockRemoveOtherTabs.mockResolvedValue(0)

      const handler = getMessageHandler()
      if (handler) {
        await handler(message, {} as chrome.runtime.MessageSender, mockSendResponse)
      }

      expect(mockCreateTabs).toHaveBeenCalledWith(tabs)
      expect(mockRemoveOtherTabs).toHaveBeenCalledWith([1, 2])
      expect(mockStartRotation).toHaveBeenCalledWith([
        { id: 1, interval: 5000 },
        { id: 2, interval: 10000 },
      ])
      expect(mockSendResponse).toHaveBeenCalledWith({
        status: 'Rotation started',
        success: true,
      })
    })

    it('should handle start rotation with tab creation errors', async () => {
      const tabs = [{ id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 }]

      const message: StartRotationMessage = {
        status: true,
        tabs,
      }

      mockCreateTabs.mockResolvedValue({
        tabs: [],
        errors: [{ tab: 'Tab 1', error: 'Failed to create tab' }],
      })

      const handler = getMessageHandler()
      if (handler) {
        await handler(message, {} as chrome.runtime.MessageSender, mockSendResponse)
      }

      expect(mockCreateTabs).toHaveBeenCalledWith(tabs)
      expect(mockStartRotation).not.toHaveBeenCalled()
      expect(mockSendResponse).toHaveBeenCalledWith({
        status: 'error',
        message: expect.stringContaining('Failed to create tabs'),
        success: false,
      })
    })

    it('should handle start rotation with partial tab creation', async () => {
      const tabs = [
        { id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 },
        { id: 2, name: 'Tab 2', url: 'https://example.org', interval: 10000 },
      ]

      const message: StartRotationMessage = {
        status: true,
        tabs,
      }

      mockCreateTabs.mockResolvedValue({
        tabs: [{ id: 1, interval: 5000 }],
        errors: [{ tab: 'Tab 2', error: 'Failed to create tab' }],
      })
      mockRemoveOtherTabs.mockResolvedValue(0)

      const handler = getMessageHandler()
      if (handler) {
        await handler(message, {} as chrome.runtime.MessageSender, mockSendResponse)
      }

      expect(mockCreateTabs).toHaveBeenCalledWith(tabs)
      expect(mockRemoveOtherTabs).toHaveBeenCalledWith([1])
      expect(mockStartRotation).toHaveBeenCalledWith([{ id: 1, interval: 5000 }])
      expect(mockSendResponse).toHaveBeenCalledWith({
        status: 'Rotation started',
        success: true,
      })
    })
  })

  describe('Stop rotation message', () => {
    it('should handle stop rotation message', async () => {
      const message = { status: false }

      const handler = getMessageHandler()
      if (handler) {
        await handler(message, {} as chrome.runtime.MessageSender, mockSendResponse)
      }

      expect(mockStopRotation).toHaveBeenCalled()
      expect(mockSendResponse).toHaveBeenCalledWith({
        status: 'Rotation stopped',
        success: true,
      })
    })
  })

  describe('Pause rotation message', () => {
    it('should handle pause rotation message', async () => {
      const message: PauseRotationMessage = { action: 'pause' }

      const handler = getMessageHandler()
      if (handler) {
        await handler(message, {} as chrome.runtime.MessageSender, mockSendResponse)
      }

      expect(mockPauseRotation).toHaveBeenCalled()
      expect(mockSendResponse).toHaveBeenCalledWith({
        status: 'Rotation paused',
        success: true,
      })
    })
  })

  describe('Resume rotation message', () => {
    it('should handle resume rotation message successfully', async () => {
      const message: ResumeRotationMessage = { action: 'resume' }

      mockResumeRotation.mockReturnValue(true)

      const handler = getMessageHandler()
      if (handler) {
        await handler(message, {} as chrome.runtime.MessageSender, mockSendResponse)
      }

      expect(mockResumeRotation).toHaveBeenCalled()
      expect(mockSendResponse).toHaveBeenCalledWith({
        status: 'Rotation resumed',
        success: true,
      })
    })

    it('should handle resume rotation when nothing to resume', async () => {
      const message: ResumeRotationMessage = { action: 'resume' }

      mockResumeRotation.mockReturnValue(false)

      const handler = getMessageHandler()
      if (handler) {
        await handler(message, {} as chrome.runtime.MessageSender, mockSendResponse)
      }

      expect(mockResumeRotation).toHaveBeenCalled()
      expect(mockSendResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'No rotation to resume',
        success: false,
      })
    })
  })

  describe('Get rotation state message', () => {
    it('should return rotation state when active', async () => {
      const message: GetRotationStateMessage = { action: 'getState' }

      mockGetRotationState.mockReturnValue({
        isPaused: false,
        currentTabs: [
          { id: 1, interval: 5000 },
          { id: 2, interval: 10000 },
        ],
        currentIndex: 0,
      })

      const handler = getMessageHandler()
      if (handler) {
        await handler(message, {} as chrome.runtime.MessageSender, mockSendResponse)
      }

      expect(mockGetRotationState).toHaveBeenCalled()
      expect(mockSendResponse).toHaveBeenCalledWith({
        status: 'ok',
        success: true,
        isActive: true,
        isPaused: false,
        tabsCount: 2,
      })
    })

    it('should return rotation state when inactive', async () => {
      const message: GetRotationStateMessage = { action: 'getState' }

      mockGetRotationState.mockReturnValue({
        isPaused: false,
        currentTabs: null,
        currentIndex: 0,
      })

      const handler = getMessageHandler()
      if (handler) {
        await handler(message, {} as chrome.runtime.MessageSender, mockSendResponse)
      }

      expect(mockGetRotationState).toHaveBeenCalled()
      expect(mockSendResponse).toHaveBeenCalledWith({
        status: 'ok',
        success: true,
        isActive: false,
        isPaused: false,
        tabsCount: 0,
      })
    })

    it('should return rotation state when paused', async () => {
      const message: GetRotationStateMessage = { action: 'getState' }

      mockGetRotationState.mockReturnValue({
        isPaused: true,
        currentTabs: [{ id: 1, interval: 5000 }],
        currentIndex: 0,
      })

      const handler = getMessageHandler()
      if (handler) {
        await handler(message, {} as chrome.runtime.MessageSender, mockSendResponse)
      }

      expect(mockGetRotationState).toHaveBeenCalled()
      expect(mockSendResponse).toHaveBeenCalledWith({
        status: 'ok',
        success: true,
        isActive: true,
        isPaused: true,
        tabsCount: 1,
      })
    })
  })

  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      const message: StartRotationMessage = {
        status: true,
        tabs: [{ id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 }],
      }

      mockCreateTabs.mockRejectedValue(new Error('Test error'))

      const handler = getMessageHandler()
      if (handler) {
        await handler(message, {} as chrome.runtime.MessageSender, mockSendResponse)
      }

      expect(mockSendResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error',
        success: false,
      })
    })

    it('should handle unknown error types', async () => {
      const message: StartRotationMessage = {
        status: true,
        tabs: [{ id: 1, name: 'Tab 1', url: 'https://example.com', interval: 5000 }],
      }

      mockCreateTabs.mockRejectedValue('String error')

      const handler = getMessageHandler()
      if (handler) {
        await handler(message, {} as chrome.runtime.MessageSender, mockSendResponse)
      }

      expect(mockSendResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unknown error occurred',
        success: false,
      })
    })
  })
})
