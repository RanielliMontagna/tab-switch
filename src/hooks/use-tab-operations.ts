/**
 * Hook for tab operations (add, remove, reorder)
 * Extracted from useHome to reduce complexity
 */

import { DragEndEvent } from '@dnd-kit/core'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TabSchema } from '@/containers/home/home.schema'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/libs/logger'
import { STORAGE_KEYS, setStorageItem } from '@/libs/storage'

/**
 * Hook for managing tab operations
 * @param tabs - Current tabs array
 * @param setTabs - Function to update tabs array
 * @returns Object with handlers and state for tab operations
 */
export function useTabOperations(
  tabs: TabSchema[],
  setTabs: React.Dispatch<React.SetStateAction<TabSchema[]>>
) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)

  /**
   * Removes a tab from the list and updates storage
   * @param index - Index of the tab to remove
   */
  const handleRemoveTab = useCallback(
    async (index: number) => {
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
    },
    [tabs, setTabs, t, toast]
  )

  /**
   * Handles drag & drop end event for reordering tabs
   * Also handles deletion if dragged to delete zone
   * @param event - Drag end event from dnd-kit
   */
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      const target = event.activatorEvent.target
      const idDelete = target instanceof HTMLElement ? target.id : undefined

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
    },
    [tabs, setTabs, handleRemoveTab, t, toast]
  )

  return {
    isDeleting,
    isReordering,
    handleRemoveTab,
    handleDragEnd,
  }
}
