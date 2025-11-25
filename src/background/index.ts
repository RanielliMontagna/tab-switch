import type {
  GetRotationStateMessage,
  PauseRotationMessage,
  ResumeRotationMessage,
  RotationStateResponse,
  StartRotationMessage,
} from '@/@types/messages'
import { logger } from '@/libs/logger'
import { getStorageItem, STORAGE_KEYS } from '@/libs/storage'
import { createTabs, removeOtherTabs } from '@/libs/tab-management'
import {
  getRotationState,
  pauseRotation,
  resumeRotation,
  startRotation,
  stopRotation,
} from '@/libs/tab-rotation'
import {
  notifyRotationPaused,
  notifyRotationResumed,
  notifyRotationStarted,
  notifyRotationStopped,
} from '@/utils/notifications'

/**
 * Message listener for Chrome extension runtime messages
 * Handles start, stop, pause, and resume rotation commands from the popup
 *
 * @param message - The message from the popup (StartRotationMessage, PauseRotationMessage, ResumeRotationMessage, or stop command)
 * @param _sender - The sender of the message (unused)
 * @param sendResponse - Callback to send response back to sender
 * @returns Promise<boolean> - Always returns true to indicate async response
 */
chrome.runtime.onMessage.addListener(
  async (
    message:
      | StartRotationMessage
      | { status: false }
      | PauseRotationMessage
      | ResumeRotationMessage
      | GetRotationStateMessage,
    _sender,
    sendResponse
  ): Promise<boolean> => {
    try {
      // Handle getState action - return current rotation state
      if ('action' in message && message.action === 'getState') {
        const rotationState = getRotationState()
        const isActive = rotationState.currentTabs !== null && rotationState.currentTabs.length > 0
        const response: RotationStateResponse = {
          status: 'ok',
          success: true,
          isActive,
          isPaused: rotationState.isPaused,
          tabsCount: rotationState.currentTabs?.length || 0,
        }
        sendResponse(response)
        return true
      }

      // Handle pause action
      if ('action' in message && message.action === 'pause') {
        pauseRotation()
        notifyRotationPaused().catch((error) => {
          logger.error('Error showing pause notification:', error)
        })
        sendResponse({ status: 'Rotation paused', success: true })
        return true
      }

      // Handle resume action
      if ('action' in message && message.action === 'resume') {
        const resumed = resumeRotation()
        if (resumed) {
          notifyRotationResumed().catch((error) => {
            logger.error('Error showing resume notification:', error)
          })
          sendResponse({ status: 'Rotation resumed', success: true })
        } else {
          sendResponse({
            status: 'error',
            message: 'No rotation to resume',
            success: false,
          })
        }
        return true
      }

      // Handle stop action
      if (!message.status) {
        stopRotation()
        notifyRotationStopped().catch((error) => {
          logger.error('Error showing stop notification:', error)
        })
        sendResponse({ status: 'Rotation stopped', success: true })
        return true
      }

      // Handle start action
      // Get tab behavior preference
      const tabBehavior =
        (await getStorageItem<'keep-tabs' | 'close-others'>(STORAGE_KEYS.TAB_BEHAVIOR)) ||
        'keep-tabs'

      logger.info(`Tab behavior preference: ${tabBehavior}`)

      // Create tabs in current window
      const creationResult = await createTabs(message.tabs)

      if (creationResult.tabs.length === 0) {
        const errorMessages = creationResult.errors.map((e) => `${e.tab}: ${e.error}`).join(', ')
        sendResponse({
          status: 'error',
          message: `Failed to create tabs. Please check permissions and URLs. Errors: ${errorMessages}`,
          success: false,
        })
        return true
      }

      // Only remove other tabs if behavior is 'close-others'
      if (tabBehavior === 'close-others') {
        logger.info('Removing other tabs (close-others mode)')
        await removeOtherTabs(creationResult.tabs.map((tab) => tab.id))
      } else {
        logger.info(`Keeping existing tabs (${tabBehavior} mode)`)
      }

      // Start rotation with created tabs
      startRotation(creationResult.tabs)
      notifyRotationStarted(creationResult.tabs.length).catch((error) => {
        logger.error('Error showing start notification:', error)
      })
      sendResponse({ status: 'Rotation started', success: true })
      return true
    } catch (error) {
      logger.error('Error in background script:', error)
      sendResponse({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
      })
      return true
    }
  }
)
