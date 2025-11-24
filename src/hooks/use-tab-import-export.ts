/**
 * Hook for tab import/export operations
 * Extracted from useHome to reduce complexity
 */

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FILE } from '@/constants'
import type { TabSchema } from '@/containers/home/home.schema'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/libs/logger'
import { STORAGE_KEYS, setStorageItem } from '@/libs/storage'
import { sanitizeUrl } from '@/utils/url'
import { tabRotateFileSchema, tabsFileSchema } from '../containers/home/home.schema'

/**
 * Hook for managing tab import/export operations
 * @param tabs - Current tabs array
 * @param setTabs - Function to update tabs array
 * @returns Object with export and import functions
 */
export function useTabImportExport(
  tabs: TabSchema[],
  setTabs: React.Dispatch<React.SetStateAction<TabSchema[]>>
) {
  const { t } = useTranslation()
  const { toast } = useToast()

  /**
   * Exports tabs to a JSON file
   */
  const exportTabs = useCallback(() => {
    try {
      const dataStr = JSON.stringify(tabs, null, 2)
      const dataBlob = new Blob([dataStr], { type: FILE.MIME_TYPE })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = FILE.EXPORT_NAME
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: t('toastExportSuccess.title'),
        description: `${tabs.length} ${t('toastExportSuccess.description')}`,
        variant: 'success',
      })
    } catch (error) {
      logger.error('Error exporting tabs:', error)
      toast({
        title: t('toastExportError.title'),
        description: t('toastExportError.description'),
        variant: 'destructive',
      })
    }
  }, [tabs, t, toast])

  /**
   * Imports tabs from a JSON file
   */
  const importTabs = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = FILE.ACCEPT_TYPE

    input.onchange = async (event) => {
      const inputElement = event.target
      const file = inputElement instanceof HTMLInputElement ? inputElement.files?.[0] : undefined
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            toast({
              title: t('toastImportError.title'),
              description: t('toastImportError.description'),
              variant: 'destructive',
            })
            return
          }

          const content = typeof e.target.result === 'string' ? e.target.result : ''
          const parsed = JSON.parse(content)

          // Validate the imported data and convert to TabSchema format
          let convertedTabs: Array<{ name: string; url: string; interval: number }> = []

          if (Array.isArray(parsed)) {
            // Try standard format first
            const tabsResult = tabsFileSchema.safeParse(parsed)
            if (tabsResult.success) {
              convertedTabs = tabsResult.data.map((tab) => ({
                name: tab.name,
                url: tab.url,
                interval: Number(tab.interval),
              }))
            } else {
              // Try tab-rotate format (legacy)
              const rotateResult = tabRotateFileSchema.safeParse(parsed)
              if (rotateResult.success) {
                convertedTabs = rotateResult.data.map((tab) => ({
                  name: tab.nome,
                  url: tab.url,
                  interval: tab.duracao, // Already converted to milliseconds in schema
                }))
              } else {
                throw new Error('Invalid file format')
              }
            }
          } else {
            throw new Error('Invalid file format')
          }

          // Sanitize URLs and generate IDs
          const sanitizedTabs: TabSchema[] = []
          for (let i = 0; i < convertedTabs.length; i++) {
            const tab = convertedTabs[i]
            const sanitizedUrl = sanitizeUrl(tab.url)
            if (!sanitizedUrl) {
              throw new Error(`Invalid URL in tab: ${tab.name}`)
            }
            sanitizedTabs.push({
              ...tab,
              url: sanitizedUrl,
              id: Date.now() + i, // Generate unique ID
            })
          }

          // Save to storage
          await setStorageItem(STORAGE_KEYS.TABS, sanitizedTabs)
          setTabs(sanitizedTabs)

          toast({
            title: t('toastImportSuccess.title'),
            description: `${sanitizedTabs.length} ${t('toastImportSuccess.description')}`,
            variant: 'success',
          })
        } catch (error) {
          logger.error('Error importing tabs:', error)
          toast({
            title: t('toastImportError.title'),
            description: t('toastImportError.description'),
            variant: 'destructive',
          })
        }
      }

      reader.readAsText(file)
    }

    input.click()
  }, [setTabs, t, toast])

  return {
    exportTabs,
    importTabs,
  }
}
