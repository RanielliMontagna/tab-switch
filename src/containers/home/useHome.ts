import { DragEndEvent } from '@dnd-kit/core'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type {
  BackgroundMessage,
  PauseRotationMessage,
  ResumeRotationMessage,
} from '@/@types/messages'
import { FILE, FORM_DEFAULTS, VALIDATION } from '@/constants'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/libs/logger'
import { getStorageItem, getTabsWithMigration, STORAGE_KEYS, setStorageItem } from '@/libs/storage'
import { retry } from '@/utils/retry'
import { sanitizeUrl } from '@/utils/url'
import {
  minInterval,
  NewTabSchema,
  newTabSchema,
  TabSchema,
  tabRotateFileSchema,
  tabsFileSchema,
} from './home.schema'

/**
 * Main hook for managing the home page state and operations
 * Handles tabs management, form submission, drag & drop, import/export, and rotation control
 *
 * @returns Object containing:
 *   - tabs: Array of configured tabs
 *   - methods: React Hook Form methods for form management
 *   - activeSwitch: Whether rotation is currently active
 *   - isPaused: Whether rotation is paused
 *   - isLoading: Loading state for initial data fetch
 *   - isSaving: Saving state for form submission
 *   - isDeleting: ID of tab being deleted (or null)
 *   - isReordering: Whether tabs are being reordered
 *   - importTabs: Function to import tabs from JSON file
 *   - exportTabs: Function to export tabs to JSON file
 *   - handleSubmit: Form submission handler
 *   - handleDragEnd: Drag & drop end handler
 *   - handleCheckedChange: Switch toggle handler
 *   - handlePauseResume: Pause/resume rotation handler
 */
export function useHome() {
  const { t } = useTranslation()

  const { toast } = useToast()
  const [tabs, setTabs] = useState<TabSchema[]>([])
  const [activeSwitch, setActiveSwitch] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)

  const methods = useForm<NewTabSchema>({
    resolver: zodResolver(newTabSchema),
    defaultValues: {
      name: FORM_DEFAULTS.NAME,
      url: FORM_DEFAULTS.URL,
      interval: FORM_DEFAULTS.INTERVAL,
      saved: FORM_DEFAULTS.SAVED,
    },
    mode: 'onChange',
  })

  /**
   * Handles form submission for adding a new tab
   * Validates interval, generates ID, saves to storage, and shows toast notification
   *
   * @param data - Form data containing name, url, and interval
   */
  async function handleSubmit(data: NewTabSchema) {
    setIsSaving(true)
    try {
      // Ensure interval is a number
      const interval = typeof data.interval === 'string' ? parseFloat(data.interval) : data.interval
      const validatedInterval =
        Number.isNaN(interval) || interval < minInterval ? minInterval : Math.round(interval)

      // Generate ID for the new tab
      const newId = tabs.length > 0 ? Math.max(...tabs.map((t) => t.id)) + 1 : 1
      const tabWithId: TabSchema = { ...data, id: newId, interval: validatedInterval }
      const newTabs = [...tabs, tabWithId]
      setTabs(newTabs)

      // Save the form data to storage
      await setStorageItem(STORAGE_KEYS.TABS, newTabs)

      // Clear the form
      methods.reset()

      toast({
        title: t('toastSaveSuccess.title'),
        description: t('toastSaveSuccess.description'),
        variant: 'success',
      })
    } catch (error) {
      logger.error('Error saving tab:', error)
      toast({
        title: t('toastSaveError.title'),
        description: t('toastSaveError.description'),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Loads tabs and switch state from storage
   * Handles migration and validation automatically
   */
  const loadTabs = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load tabs with automatic migration and validation
      const loadedTabs = await getTabsWithMigration()
      if (loadedTabs.length > 0) {
        setTabs(loadedTabs)
      }

      const loadedSwitch = await getStorageItem<boolean>(STORAGE_KEYS.SWITCH)
      if (loadedSwitch !== null) {
        setActiveSwitch(loadedSwitch)
      }

      const loadedPaused = await getStorageItem<boolean>(STORAGE_KEYS.IS_PAUSED)
      if (loadedPaused !== null) {
        setIsPaused(loadedPaused)
      }
    } catch (error) {
      logger.error('Error loading tabs from storage:', error)
      toast({
        title: t('toastLoadError.title'),
        description: t('toastLoadError.description'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [t, toast])

  /**
   * Removes a tab from the list and updates storage
   *
   * @param index - Index of the tab to remove
   */
  async function handleRemoveTab(index: number) {
    const tabToDelete = tabs[index]
    if (!tabToDelete) return

    setIsDeleting(tabToDelete.name)
    try {
      // Add a small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 200))

      const newTabs = tabs.filter((_, i) => i !== index)

      setTabs(newTabs)

      // Save the form data to storage
      await setStorageItem(STORAGE_KEYS.TABS, newTabs)
    } catch (error) {
      logger.error('Error removing tab:', error)
      toast({
        title: t('toastDeleteError.title'),
        description: t('toastDeleteError.description'),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(null)
    }
  }

  /**
   * Handles drag & drop end event for reordering tabs
   * Also handles deletion if dragged to delete zone
   *
   * @param event - Drag end event from dnd-kit
   */
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    const idDelete = (event.activatorEvent.target as HTMLElement).id

    if (idDelete === 'delete') {
      await handleRemoveTab(tabs.findIndex((tab) => tab.name === active.id))
      return
    }

    if (event.over?.id === 'delete') {
      await handleRemoveTab(tabs.findIndex((tab) => tab.name === active.id))
      return
    }

    if (active.id !== over?.id) {
      setIsReordering(true)
      try {
        const oldIndex = tabs.findIndex((tab) => tab.name === active.id)
        const newIndex = tabs.findIndex((tab) => tab.name === over?.id)

        const reorderedTabs = Array.from(tabs)
        const [removed] = reorderedTabs.splice(oldIndex, 1)
        reorderedTabs.splice(newIndex, 0, removed)

        setTabs(reorderedTabs)

        // Save the reordered tabs to storage
        await setStorageItem(STORAGE_KEYS.TABS, reorderedTabs)
      } catch (error) {
        logger.error('Error reordering tabs:', error)
        toast({
          title: t('toastReorderError.title'),
          description: t('toastReorderError.description'),
          variant: 'destructive',
        })
      } finally {
        // Small delay for visual feedback
        setTimeout(() => setIsReordering(false), 300)
      }
    }
  }

  /**
   * Handles switch toggle to start/stop rotation
   * Validates minimum tabs requirement and sends message to background script
   *
   * @param checked - Whether the switch is checked (rotation active)
   */
  async function handleCheckedChange(checked: boolean) {
    try {
      //Verify if exist at least two tabs to start the auto refresh
      if (tabs.length < VALIDATION.MIN_TABS_FOR_ROTATION) {
        toast({
          title: t('toastLeastOneTab.title'),
          description: t('toastLeastOneTab.description'),
          variant: 'destructive',
        })

        return
      }

      // Send message to background script with retry
      const message: BackgroundMessage = checked ? { status: true, tabs } : { status: false }

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
            onRetry: (attempt) => {
              logger.warn(`Retrying message send (attempt ${attempt}/3)`)
            },
          }
        )
      } catch (error) {
        logger.error('Failed to send message to background script:', error)
        throw error
      }

      // Save the switch state to storage
      await setStorageItem(STORAGE_KEYS.SWITCH, checked)

      // If turning off, also clear pause state
      if (!checked) {
        await setStorageItem(STORAGE_KEYS.IS_PAUSED, false)
        setIsPaused(false)
      }

      // Update the switch state
      setActiveSwitch(checked)
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
  }

  /**
   * Exports tabs configuration to a JSON file
   * Creates a downloadable blob and triggers download
   */
  function exportTabs() {
    const data = new Blob([JSON.stringify(tabs)], { type: FILE.MIME_TYPE })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')

    a.href = url
    a.download = FILE.EXPORT_NAME
    a.click()

    URL.revokeObjectURL(url)

    toast({
      title: t('toastExportSuccess.title'),
      description: `${tabs.length} ${t('toastExportSuccess.description')}`,
      variant: 'success',
    })
  }

  /**
   * Imports tabs configuration from a JSON file
   * Supports both standard format and legacy tab-rotate format
   * Validates and sanitizes URLs before importing
   */
  function importTabs() {
    const input = document.createElement('input')

    input.type = 'file'
    input.accept = FILE.ACCEPT_TYPE
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]

      if (file) {
        const reader = new FileReader()

        reader.onload = async (e) => {
          const showImportError = () => {
            toast({
              title: t('toastImportError.title'),
              description: t('toastImportError.description'),
              variant: 'destructive',
            })
          }

          try {
            const content = e.target?.result as string
            const parsed = JSON.parse(content)

            // Try to detect format and convert
            let convertedTabs: Array<{ name: string; url: string; interval: number }> = []

            // First, try the standard format
            const standardResult = tabsFileSchema.safeParse(parsed)
            if (standardResult.success) {
              convertedTabs = standardResult.data.map((tab) => ({
                name: tab.name,
                url: tab.url,
                interval: Number(tab.interval),
              }))
            } else {
              // Try the tab-rotate format (legacy)
              const tabRotateResult = tabRotateFileSchema.safeParse(parsed)
              if (tabRotateResult.success) {
                convertedTabs = tabRotateResult.data.map((tab) => ({
                  name: tab.nome,
                  url: tab.url,
                  interval: tab.duracao, // Already converted to milliseconds in schema
                }))
              } else {
                showImportError()
                return
              }
            }

            // Sanitize URLs in imported data
            const sanitizedTabs = convertedTabs.map((tab) => {
              const sanitizedUrl = sanitizeUrl(tab.url)
              if (!sanitizedUrl) {
                throw new Error(`Invalid URL in tab: ${tab.name}`)
              }
              return { ...tab, url: sanitizedUrl }
            })

            setTabs(sanitizedTabs as TabSchema[])

            // Save the form data to storage
            await setStorageItem(STORAGE_KEYS.TABS, sanitizedTabs)

            toast({
              title: t('toastImportSuccess.title'),
              description: `${sanitizedTabs.length} ${t('toastImportSuccess.description')}`,
              variant: 'success',
            })
          } catch {
            showImportError()
          }
        }

        reader.readAsText(file)
      }
    }

    input.click()
  }

  useEffect(() => {
    loadTabs()
  }, [loadTabs])

  /**
   * Handles pause/resume rotation action
   * Sends message to background script and updates local state
   */
  async function handlePauseResume() {
    try {
      if (!activeSwitch) {
        return
      }

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
      } catch (error) {
        logger.error('Failed to send pause/resume message:', error)
        throw error
      }

      // Save the pause state to storage
      await setStorageItem(STORAGE_KEYS.IS_PAUSED, newPausedState)

      // Update the pause state
      setIsPaused(newPausedState)

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
  }

  return {
    tabs,
    methods,
    activeSwitch,
    isPaused,
    isLoading,
    isSaving,
    isDeleting,
    isReordering,
    importTabs,
    exportTabs,
    handleSubmit,
    handleDragEnd,
    handleCheckedChange,
    handlePauseResume,
  }
}
