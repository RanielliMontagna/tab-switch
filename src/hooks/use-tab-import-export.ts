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
import { validateImportedData } from '@/utils/integrity'
import { rateLimiters } from '@/utils/rate-limiter'
import { sanitizeUrl } from '@/utils/url'
import { tabRotateFileSchema, tabsFileSchema } from '../containers/home/home.schema'

/**
 * Processes imported JSON content and updates tabs
 * Shared logic for file input, drag-and-drop, and paste
 */
async function processImportedContent(
  content: string,
  setTabs: React.Dispatch<React.SetStateAction<TabSchema[]>>,
  t: (key: string) => string,
  toast: ReturnType<typeof useToast>['toast']
): Promise<void> {
  try {
    // Check rate limiting
    if (!rateLimiters.import.isAllowed()) {
      toast({
        title: t('toastImportError.title'),
        description: 'Rate limit exceeded. Please wait before importing again.',
        variant: 'destructive',
      })
      throw new Error('Rate limit exceeded')
    }

    if (!content || content.trim() === '') {
      toast({
        title: t('toastImportError.title'),
        description: t('toastImportError.description'),
        variant: 'destructive',
      })
      throw new Error('No content')
    }

    const parsed = JSON.parse(content)

    // Validate data integrity
    const integrityCheck = validateImportedData(parsed)
    if (!integrityCheck.isValid) {
      logger.warn('Data integrity check failed:', integrityCheck.error)
      // Continue anyway, but log the warning
    }

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
    throw error
  }
}

/**
 * Processes an imported file and updates tabs
 * Uses processImportedContent internally
 */
async function processImportedFile(
  file: File,
  setTabs: React.Dispatch<React.SetStateAction<TabSchema[]>>,
  t: (key: string) => string,
  toast: ReturnType<typeof useToast>['toast']
): Promise<void> {
  const reader = new FileReader()

  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      try {
        if (!e.target?.result) {
          toast({
            title: t('toastImportError.title'),
            description: t('toastImportError.description'),
            variant: 'destructive',
          })
          reject(new Error('No file content'))
          return
        }

        const content = typeof e.target.result === 'string' ? e.target.result : ''
        await processImportedContent(content, setTabs, t, toast)
        resolve()
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      toast({
        title: t('toastImportError.title'),
        description: t('toastImportError.description'),
        variant: 'destructive',
      })
      reject(new Error('File read error'))
    }

    reader.readAsText(file)
  })
}

/**
 * Hook for managing tab import/export operations
 * @param tabs - Current tabs array
 * @param setTabs - Function to update tabs array
 * @returns Object with export and import functions, plus drag-and-drop handlers
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
   * Uses a persistent hidden input in HTML to prevent popup from closing
   */
  const importTabs = useCallback(() => {
    // Get the persistent input from HTML (created in index.html)
    const input = document.getElementById('tab-import-input') as HTMLInputElement

    if (!input) {
      logger.error('Import input not found in DOM')
      toast({
        title: t('toastImportError.title'),
        description: 'Import input not found. Please reload the extension.',
        variant: 'destructive',
      })
      return
    }

    // Reset input value to allow selecting the same file again
    input.value = ''

    // Remove previous event listeners by cloning the element
    const newInput = input.cloneNode(true) as HTMLInputElement
    input.parentNode?.replaceChild(newInput, input)
    const fileInput = newInput

    fileInput.onchange = async (event) => {
      const inputElement = event.target
      const file = inputElement instanceof HTMLInputElement ? inputElement.files?.[0] : undefined

      if (!file) {
        // Reset input for next use
        fileInput.value = ''
        return
      }

      // Immediately try to restore focus to prevent popup from closing
      // This must happen synchronously before any async operations
      try {
        window.focus()
        document.body.focus()
      } catch {
        // Ignore focus errors
      }

      // Process the file using shared logic
      try {
        await processImportedFile(file, setTabs, t, toast)
        // Reset input for next use
        fileInput.value = ''
      } catch {
        // Error already handled in processImportedFile
        fileInput.value = ''
      }
    }

    // Trigger file picker
    // Note: Chrome may close the popup when file dialog opens
    // This is a known limitation - DevTools being open prevents this behavior
    try {
      fileInput.click()
    } catch (error) {
      logger.error('Error triggering file picker:', error)
      toast({
        title: t('toastImportError.title'),
        description: 'Failed to open file picker. Please try again.',
        variant: 'destructive',
      })
    }
  }, [setTabs, t, toast])

  /**
   * Handles drag-and-drop file import
   * This avoids the popup closing issue with file input
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = Array.from(e.dataTransfer.files)
      const jsonFile = files.find(
        (file) => file.name.endsWith('.json') || file.type === 'application/json'
      )

      if (!jsonFile) {
        toast({
          title: t('toastImportError.title'),
          description: 'Please drop a JSON file.',
          variant: 'destructive',
        })
        return
      }

      try {
        await processImportedFile(jsonFile, setTabs, t, toast)
      } catch {
        // Error already handled in processImportedFile
      }
    },
    [setTabs, t, toast]
  )

  /**
   * Imports tabs from pasted JSON content
   * This avoids the popup closing issue completely
   */
  const importFromPaste = useCallback(
    async (jsonContent: string) => {
      try {
        await processImportedContent(jsonContent, setTabs, t, toast)
      } catch {
        // Error already handled in processImportedContent
      }
    },
    [setTabs, t, toast]
  )

  return {
    exportTabs,
    importTabs,
    importFromPaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}
