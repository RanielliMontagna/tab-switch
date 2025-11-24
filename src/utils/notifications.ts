/**
 * Notification utilities for Chrome extension
 * Handles showing notifications when rotation starts/stops/pauses/resumes
 */

import { logger } from '@/libs/logger'

/**
 * Shows a notification to the user
 * @param title - Notification title
 * @param message - Notification message
 * @param type - Notification type (basic, image, list)
 * @param iconUrl - Optional icon URL
 */
export async function showNotification(
  title: string,
  message: string,
  type: chrome.notifications.TemplateType = 'basic',
  iconUrl?: string
): Promise<string | null> {
  try {
    // Check if notifications API is available
    if (!chrome.notifications || typeof chrome.notifications.create !== 'function') {
      logger.warn('Notifications API not available')
      return null
    }

    const notificationId = await chrome.notifications.create({
      type,
      iconUrl: iconUrl || chrome.runtime.getURL('favicon/favicon-96x96.png'),
      title,
      message,
    })

    logger.debug(`Notification shown: ${title}`)
    // chrome.notifications.create returns string | undefined
    // Convert undefined to null for consistency
    return typeof notificationId === 'string' ? notificationId : null
  } catch (error) {
    logger.error('Error showing notification:', error)
    return null
  }
}

/**
 * Shows a notification when rotation starts
 * @param tabsCount - Number of tabs in rotation
 */
export async function notifyRotationStarted(tabsCount: number): Promise<void> {
  await showNotification(
    'Rotation Started',
    `Tab rotation started with ${tabsCount} tab${tabsCount !== 1 ? 's' : ''}`,
    'basic'
  )
}

/**
 * Shows a notification when rotation stops
 */
export async function notifyRotationStopped(): Promise<void> {
  await showNotification('Rotation Stopped', 'Tab rotation has been stopped', 'basic')
}

/**
 * Shows a notification when rotation is paused
 */
export async function notifyRotationPaused(): Promise<void> {
  await showNotification('Rotation Paused', 'Tab rotation has been paused', 'basic')
}

/**
 * Shows a notification when rotation is resumed
 */
export async function notifyRotationResumed(): Promise<void> {
  await showNotification('Rotation Resumed', 'Tab rotation has been resumed', 'basic')
}
