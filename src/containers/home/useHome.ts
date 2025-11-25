import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FORM_DEFAULTS } from '@/constants'
import { useRotationControl, useTabImportExport, useTabOperations } from '@/hooks'
import { useSessions } from '@/hooks/use-sessions'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/libs/logger'
import { generateNameFromUrl } from '@/utils/url'
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
  const [isSaving, setIsSaving] = useState(false)

  // Use sessions hook for managing multiple rotation sessions
  const {
    sessions,
    currentSessionId,
    currentSession,
    currentSessionTabs: tabs,
    isLoading: sessionsLoading,
    loadSessions,
    createSession,
    updateCurrentSessionTabs,
    switchSession,
    updateSessionName,
    deleteSession,
  } = useSessions()

  // Local state for tabs (synced with current session)
  const [localTabs, setLocalTabs] = useState<TabSchema[]>([])

  // Sync local tabs with session tabs
  useEffect(() => {
    setLocalTabs(tabs)
  }, [tabs])

  // Use extracted hooks for better separation of concerns
  const { isDeleting, isReordering, handleDragEnd } = useTabOperations(localTabs, (newTabs) => {
    const updatedTabs = typeof newTabs === 'function' ? newTabs(localTabs) : newTabs
    setLocalTabs(updatedTabs)
    updateCurrentSessionTabs(updatedTabs).catch((error) => {
      logger.error('Error updating session tabs:', error)
    })
  })

  const { exportTabs, importTabs, importFromPaste, handleDragOver, handleDragLeave, handleDrop } =
    useTabImportExport(localTabs, (newTabs) => {
      const updatedTabs = typeof newTabs === 'function' ? newTabs(localTabs) : newTabs
      setLocalTabs(updatedTabs)
      updateCurrentSessionTabs(updatedTabs).catch((error) => {
        logger.error('Error updating session tabs:', error)
      })
    })

  const { activeSwitch, isPaused, loadRotationState, handleCheckedChange, handlePauseResume } =
    useRotationControl(localTabs)

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

      // Generate name from URL if name is not provided or is empty
      const name =
        data.name?.trim() || generateNameFromUrl(data.url) || `Tab ${localTabs.length + 1}`

      // Generate ID for the new tab
      const newId = localTabs.length > 0 ? Math.max(...localTabs.map((t) => t.id)) + 1 : 1
      const tabWithId: TabSchema = { ...data, name, id: newId, interval: validatedInterval }
      const newTabs = [...localTabs, tabWithId]
      setLocalTabs(newTabs)

      // Save to current session
      await updateCurrentSessionTabs(newTabs)

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

  // Load sessions and rotation state on mount (only once)
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadSessions()
        await loadRotationState()
      } catch (error) {
        logger.error('Failed to load data:', error)
        toast({
          title: t('toastLoadError.title'),
          description: t('toastLoadError.description'),
          variant: 'destructive',
        })
      }
    }
    loadData().catch((error) => {
      logger.error('Failed to load data:', error)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRotationState, loadSessions, t, toast]) // Only run on mount

  // Sync local tabs when session tabs change (prevent infinite loop)
  useEffect(() => {
    // Only update if tabs actually changed (compare by reference and length first for performance)
    if (localTabs.length !== tabs.length || localTabs !== tabs) {
      // Deep comparison only if lengths differ or reference differs
      const tabsChanged =
        localTabs.length !== tabs.length ||
        localTabs.some((tab, index) => tab.id !== tabs[index]?.id || tab.url !== tabs[index]?.url)

      if (tabsChanged) {
        setLocalTabs(tabs)
      }
    }
  }, [tabs, localTabs]) // Only depend on tabs, not localTabs

  return {
    tabs: localTabs,
    methods,
    activeSwitch,
    isPaused,
    isLoading: sessionsLoading,
    isSaving,
    isDeleting,
    isReordering,
    importTabs,
    importFromPaste,
    exportTabs,
    handleSubmit,
    handleDragEnd,
    handleCheckedChange,
    handlePauseResume,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    // Session management
    sessions,
    currentSessionId,
    currentSession,
    createSession,
    switchSession,
    updateSessionName,
    deleteSession,
  }
}
