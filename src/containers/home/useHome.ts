import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FORM_DEFAULTS } from '@/constants'
import { useRotationControl, useTabImportExport, useTabOperations } from '@/hooks'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/libs/logger'
import { getTabsWithMigration, STORAGE_KEYS, setStorageItem } from '@/libs/storage'
import { minInterval, NewTabSchema, newTabSchema, TabSchema } from './home.schema'

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
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Use extracted hooks for better separation of concerns
  const { isDeleting, isReordering, handleDragEnd } = useTabOperations(tabs, setTabs)

  const { exportTabs, importTabs } = useTabImportExport(tabs, setTabs)

  const { activeSwitch, isPaused, loadRotationState, handleCheckedChange, handlePauseResume } =
    useRotationControl(tabs)

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

      // Load rotation state (handled by useRotationControl hook)
      await loadRotationState()
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
  }, [loadRotationState, t, toast])

  // Load tabs on mount
  useEffect(() => {
    loadTabs().catch((error) => {
      logger.error('Failed to load tabs:', error)
    })
  }, [loadTabs])

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
