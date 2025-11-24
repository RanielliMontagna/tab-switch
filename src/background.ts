import type {
  PauseRotationMessage,
  ResumeRotationMessage,
  StartRotationMessage,
} from '@/@types/messages'
import type { TabSchema } from '@/containers/home/home.schema'
import { logger } from '@/libs/logger'

/**
 * Variable used to stop the rotation of the tabs
 */
let stopRotation = false

/**
 * Variable used to pause the rotation of the tabs (without losing state)
 */
let isPaused = false

/**
 * Current tabs being rotated (stored to resume after pause)
 */
let currentRotationTabs: TabWithInterval[] | null = null

/**
 * Cleanup function for rotation timeout
 */
let rotationTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Current tab index in rotation (maintained across pause/resume)
 */
let currentTabIndex = 0

/**
 * Interface for tab with ID and interval
 */
interface TabWithInterval {
  id: number
  interval: number
}

/**
 * Interface for tab creation error
 */
interface TabCreationError {
  tab: string
  error: string
}

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
      | ResumeRotationMessage,
    _sender,
    sendResponse
  ): Promise<boolean> => {
    try {
      // Handle pause action
      if ('action' in message && message.action === 'pause') {
        isPaused = true
        if (rotationTimeout) {
          clearTimeout(rotationTimeout)
          rotationTimeout = null
        }
        sendResponse({ status: 'Rotation paused', success: true })
        return true
      }

      // Handle resume action
      if ('action' in message && message.action === 'resume') {
        if (isPaused && currentRotationTabs) {
          isPaused = false
          rotateTabs(currentRotationTabs)
          sendResponse({ status: 'Rotation resumed', success: true })
          return true
        }
        sendResponse({
          status: 'error',
          message: 'No rotation to resume',
          success: false,
        })
        return true
      }

      // Handle stop action
      if (!message.status) {
        stopRotation = true
        isPaused = false
        currentRotationTabs = null
        if (rotationTimeout) {
          clearTimeout(rotationTimeout)
          rotationTimeout = null
        }
        sendResponse({ status: 'Rotation stopped', success: true })
        return true
      }

      // Handle start action
      const tabs = await createTabs(message.tabs)
      if (tabs.length === 0) {
        sendResponse({
          status: 'error',
          message: 'Failed to create tabs. Please check permissions and URLs.',
          success: false,
        })
        return true
      }

      // Reset pause state and index when starting new rotation
      isPaused = false
      currentTabIndex = 0
      currentRotationTabs = tabs
      rotateTabs(tabs)
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

/**
 * Creates new browser tabs based on the provided tab configurations
 * Validates permissions, creates tabs, and removes existing tabs not in the rotation
 *
 * @param tabs - Array of tab configurations to create (name, url, interval)
 * @returns Promise resolving to array of created tab IDs and their intervals
 * @throws Error if no tabs could be created or if permissions are missing
 */
async function createTabs(tabs: TabSchema[]): Promise<TabWithInterval[]> {
  const tabIds: TabWithInterval[] = []
  const errors: TabCreationError[] = []

  // Check if we have permission to create tabs
  if (!chrome.tabs || typeof chrome.tabs.create !== 'function') {
    throw new Error('Missing tabs permission. Please check extension permissions.')
  }

  // Create new tabs and wait for all to be created
  await Promise.all(
    tabs.map((tab) => {
      return new Promise<void>((resolve) => {
        try {
          chrome.tabs.create({ url: tab.url }, (createdTab) => {
            if (chrome.runtime.lastError) {
              logger.error(
                `Failed to create tab for ${tab.name || tab.url}:`,
                chrome.runtime.lastError.message
              )
              errors.push({
                tab: tab.name || tab.url,
                error: chrome.runtime.lastError?.message || 'Unknown error',
              })
              resolve()
              return
            }

            if (createdTab?.id) {
              tabIds.push({ id: createdTab.id, interval: tab.interval })
              logger.debug(`Created tab: ${tab.name || tab.url} (ID: ${createdTab.id})`)
            } else {
              errors.push({
                tab: tab.name || tab.url,
                error: 'Tab was created but no ID was returned',
              })
            }
            resolve()
          })
        } catch (error) {
          logger.error(`Error creating tab for ${tab.name || tab.url}:`, error)
          errors.push({
            tab: tab.name || tab.url,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          resolve()
        }
      })
    })
  )

  // Log errors if any
  if (errors.length > 0) {
    logger.warn('Some tabs failed to create:', errors)
  }

  // If no tabs were created successfully, throw an error
  if (tabIds.length === 0) {
    throw new Error(
      `Failed to create any tabs. Errors: ${errors.map((e) => `${e.tab}: ${e.error}`).join(', ')}`
    )
  }

  // Remove other tabs only if we have permission
  try {
    chrome.tabs.query({}, (allTabs) => {
      if (chrome.runtime.lastError) {
        logger.warn('Failed to query tabs:', chrome.runtime.lastError.message)
        return
      }

      allTabs.forEach((tab) => {
        if (tab.id && !tabIds.find((tabId) => tabId.id === tab.id)) {
          chrome.tabs.remove(tab.id, () => {
            if (chrome.runtime.lastError) {
              logger.warn(
                `Failed to remove tab ${tab.id}:`,
                chrome.runtime.lastError.message || 'Unknown error'
              )
            }
          })
        }
      })
    })
  } catch (error) {
    logger.warn('Error removing tabs:', error)
    // Don't throw - we can continue even if we can't remove old tabs
  }

  return tabIds
}

/**
 * Rotates between tabs based on their configured intervals
 * Maintains state across pause/resume operations
 *
 * @param tabs - Array of tabs with IDs and intervals to rotate through
 * @returns Cleanup function to stop rotation, or undefined if rotation cannot start
 */
function rotateTabs(tabs: TabWithInterval[]): (() => void) | undefined {
  if (!tabs || tabs.length === 0) {
    logger.error('Cannot rotate: no tabs provided')
    return
  }

  // Reset index if starting new rotation (not resuming)
  if (!isPaused || !currentRotationTabs) {
    currentTabIndex = 0
  }

  const rotate = (): void => {
    if (stopRotation) {
      stopRotation = false
      isPaused = false
      currentRotationTabs = null
      if (rotationTimeout) {
        clearTimeout(rotationTimeout)
        rotationTimeout = null
      }
      return
    }

    // Check if rotation is paused
    if (isPaused) {
      // Don't clear timeout, just don't schedule next rotation
      // This allows us to resume from the same point
      return
    }

    // Validate current tab index
    if (currentTabIndex < 0 || currentTabIndex >= tabs.length) {
      logger.error(`Invalid tab index: ${currentTabIndex}. Resetting to 0.`)
      currentTabIndex = 0
    }

    const tab = tabs[currentTabIndex]
    if (!tab || !tab.id) {
      logger.error(`Invalid tab at index ${currentTabIndex}. Skipping.`)
      currentTabIndex = currentTabIndex === tabs.length - 1 ? 0 : currentTabIndex + 1
      rotationTimeout = setTimeout(rotate, tabs[currentTabIndex]?.interval || 5000)
      return
    }

    // Check if we have permission to update tabs
    if (!chrome.tabs || typeof chrome.tabs.update !== 'function') {
      logger.error('Missing tabs permission. Stopping rotation.')
      stopRotation = true
      return
    }

    // Update the active tab
    chrome.tabs.update(tab.id, { active: true }, (_updatedTab) => {
      if (chrome.runtime.lastError) {
        logger.error(`Failed to activate tab ${tab.id}:`, chrome.runtime.lastError.message)
        // Try to continue with next tab
        currentTabIndex = currentTabIndex === tabs.length - 1 ? 0 : currentTabIndex + 1
        rotationTimeout = setTimeout(rotate, tabs[currentTabIndex]?.interval || 5000)
        return
      }

      // Move to next tab
      currentTabIndex = currentTabIndex === tabs.length - 1 ? 0 : currentTabIndex + 1

      // Schedule next rotation
      const nextInterval = tabs[currentTabIndex]?.interval || 5000
      rotationTimeout = setTimeout(rotate, nextInterval)
    })
  }

  rotate()

  // Return cleanup function
  return () => {
    if (rotationTimeout) {
      clearTimeout(rotationTimeout)
      rotationTimeout = null
    }
    stopRotation = true
  }
}
