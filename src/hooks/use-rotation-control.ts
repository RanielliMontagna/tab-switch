/**
 * Hook for rotation control (start, stop, pause, resume)
 * Extracted from useHome to reduce complexity
 */

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  BackgroundMessage,
  PauseRotationMessage,
  ResumeRotationMessage,
} from '@/@types/messages'
import { VALIDATION } from '@/constants'
import type { TabSchema } from '@/containers/home/home.schema'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/libs/logger'
import { getStorageItem, STORAGE_KEYS, setStorageItem } from '@/libs/storage'
import { rateLimiters } from '@/utils'
import { retry } from '@/utils/retry'

/**
 * Response type from background script
 */
interface BackgroundResponse {
  status: string
  success: boolean
  message?: string
}

/**
 * Hook for managing rotation control
 * @param tabs - Current tabs array
 * @returns Object with rotation state and handlers
 */
export function useRotationControl(tabs: TabSchema[]) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [activeSwitch, setActiveSwitch] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  /**
   * Loads rotation state from storage
   */
  const loadRotationState = useCallback(async () => {
    const loadedSwitch = await getStorageItem<boolean>(STORAGE_KEYS.SWITCH)
    if (loadedSwitch !== null && loadedSwitch !== undefined) {
      setActiveSwitch(loadedSwitch)
      logger.debug(`Loaded switch state from storage: ${loadedSwitch}`)
    } else {
      logger.debug('No switch state found in storage, defaulting to false')
      setActiveSwitch(false)
    }

    const loadedPaused = await getStorageItem<boolean>(STORAGE_KEYS.IS_PAUSED)
    if (loadedPaused !== null) {
      setIsPaused(loadedPaused)
    }
  }, [])

  /**
   * Handles switch toggle to start/stop rotation
   * @param checked - Whether the switch is checked (rotation active)
   */
  const handleCheckedChange = useCallback(
    async (checked: boolean) => {
      try {
        // Only validate minimum tabs when trying to activate (not when deactivating)
        if (checked && tabs.length < VALIDATION.MIN_TABS_FOR_ROTATION) {
          toast({
            title: t('toastLeastOneTab.title'),
            description: t('toastLeastOneTab.description'),
            variant: 'destructive',
          })
          return
        }

        // Check rate limiting for rotation operations
        if (!rateLimiters.rotation.isAllowed()) {
          toast({
            title: t('toastSwitchError.title'),
            description: 'Rate limit exceeded. Please wait before toggling rotation again.',
            variant: 'destructive',
          })
          return
        }

        // Send message to background script with retry
        const message: BackgroundMessage = checked ? { status: true, tabs } : { status: false }

        logger.debug(`Sending message to background: ${checked ? 'start' : 'stop'} rotation`)

        try {
          const response = await retry(
            () =>
              new Promise<BackgroundResponse>((resolve, reject) => {
                chrome.runtime.sendMessage(message, (response) => {
                  if (chrome.runtime.lastError) {
                    const errorMsg = chrome.runtime.lastError.message
                    logger.error('Chrome runtime error:', errorMsg)
                    reject(new Error(errorMsg))
                  } else if (response && typeof response === 'object' && 'success' in response) {
                    logger.debug('Background response:', response)
                    resolve(response as BackgroundResponse)
                  } else {
                    logger.debug('No response from background, assuming success')
                    resolve({ status: 'ok', success: true })
                  }
                })
              }),
            {
              maxAttempts: 3,
              delay: 500,
              onRetry: (attempt) => {
                logger.warn(`Retrying message send (attempt ${attempt}/3)`)
              },
            }
          )

          // Check if the operation was successful
          if (!response.success) {
            const errorMessage = response.message || 'Failed to start/stop rotation'
            logger.error('Background script returned error:', errorMessage)
            toast({
              title: t('toastSwitchError.title'),
              description: errorMessage,
              variant: 'destructive',
            })
            return
          }

          logger.debug(`Rotation ${checked ? 'started' : 'stopped'} successfully`)
        } catch (error) {
          logger.error('Failed to send message to background script:', error)
          toast({
            title: t('toastSwitchError.title'),
            description: t('toastSwitchError.description'),
            variant: 'destructive',
          })
          return
        }

        // Save the switch state to storage
        await setStorageItem(STORAGE_KEYS.SWITCH, checked)
        logger.debug(`Saved switch state to storage: ${checked}`)

        // If turning off, also clear pause state
        if (!checked) {
          await setStorageItem(STORAGE_KEYS.IS_PAUSED, false)
          setIsPaused(false)
        }

        // Update the switch state only after successful operation
        setActiveSwitch(checked)
        logger.debug(`Updated activeSwitch state to: ${checked}`)
      } catch (error) {
        logger.error('Error changing switch state:', error)
        // Check if it's a Chrome extension error
        if (error instanceof Error && error.message.includes('Extension context invalidated')) {
          toast({
            title: t('toastNotInstalled.title'),
            description: t('toastNotInstalled.description'),
            variant: 'destructive',
          })
        } else {
          toast({
            title: t('toastSwitchError.title'),
            description: t('toastSwitchError.description'),
            variant: 'destructive',
          })
        }
      }
    },
    [tabs, t, toast]
  )

  /**
   * Handles pause/resume rotation
   */
  const handlePauseResume = useCallback(async () => {
    const newPausedState = !isPaused
    const message: PauseRotationMessage | ResumeRotationMessage = newPausedState
      ? { action: 'pause' }
      : { action: 'resume' }

    try {
      await retry(
        () =>
          new Promise<void>((resolve, reject) => {
            chrome.runtime.sendMessage(message, (_response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
              } else {
                resolve()
              }
            })
          }),
        {
          maxAttempts: 3,
          delay: 500,
        }
      )

      setIsPaused(newPausedState)
      await setStorageItem(STORAGE_KEYS.IS_PAUSED, newPausedState)

      toast({
        title: newPausedState ? t('toastPaused.title') : t('toastResumed.title'),
        description: newPausedState ? t('toastPaused.description') : t('toastResumed.description'),
        variant: 'success',
      })
    } catch (error) {
      logger.error('Error pausing/resuming rotation:', error)
      toast({
        title: t('toastPauseResumeError.title'),
        description: t('toastPauseResumeError.description'),
        variant: 'destructive',
      })
    }
  }, [isPaused, t, toast])

  return {
    activeSwitch,
    isPaused,
    loadRotationState,
    handleCheckedChange,
    handlePauseResume,
  }
}
