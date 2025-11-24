import { DragEndEvent } from '@dnd-kit/core'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { BackgroundMessage } from '@/@types/messages'
import { FILE, FORM_DEFAULTS, VALIDATION } from '@/constants'
import { useToast } from '@/hooks/use-toast'
import { getStorageItem, STORAGE_KEYS, setStorageItem } from '@/libs/storage'
import { retry } from '@/utils/retry'
import { sanitizeUrl } from '@/utils/url'
import { newTabSchema, TabSchema, tabsFileSchema } from './home.schema'

export function useHome() {
  const { t } = useTranslation()

  const { toast } = useToast()
  const [tabs, setTabs] = useState<TabSchema[]>([])
  const [activeSwitch, setActiveSwitch] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)

  const methods = useForm<TabSchema>({
    resolver: zodResolver(newTabSchema),
    defaultValues: {
      name: FORM_DEFAULTS.NAME,
      url: FORM_DEFAULTS.URL,
      interval: FORM_DEFAULTS.INTERVAL,
      saved: FORM_DEFAULTS.SAVED,
    },
    mode: 'onChange',
  })

  async function handleSubmit(data: TabSchema) {
    setIsSaving(true)
    try {
      const newTabs = [...tabs, data]
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
      console.error('Error saving tab:', error)
      toast({
        title: t('toastSaveError.title'),
        description: t('toastSaveError.description'),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const loadTabs = useCallback(async () => {
    setIsLoading(true)
    try {
      const loadedTabs = await getStorageItem<TabSchema[]>(STORAGE_KEYS.TABS)
      if (loadedTabs) {
        setTabs(loadedTabs)
      }

      const loadedSwitch = await getStorageItem<boolean>(STORAGE_KEYS.SWITCH)
      if (loadedSwitch !== null) {
        setActiveSwitch(loadedSwitch)
      }
    } catch (error) {
      console.error('Error loading tabs from storage:', error)
      toast({
        title: t('toastLoadError.title'),
        description: t('toastLoadError.description'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [t, toast])

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
      console.error('Error removing tab:', error)
      toast({
        title: t('toastDeleteError.title'),
        description: t('toastDeleteError.description'),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(null)
    }
  }

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
        console.error('Error reordering tabs:', error)
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
              console.warn(`Retrying message send (attempt ${attempt}/3)`)
            },
          }
        )
      } catch (error) {
        console.error('Failed to send message to background script:', error)
        throw error
      }

      // Save the switch state to storage
      await setStorageItem(STORAGE_KEYS.SWITCH, checked)

      // Update the switch state
      setActiveSwitch(checked)
    } catch (error) {
      console.error('Error changing switch state:', error)
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
            const result = tabsFileSchema.safeParse(parsed)

            if (!result.success) {
              showImportError()
              return
            }

            // Sanitize URLs in imported data
            const sanitizedTabs = result.data.map((tab) => {
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

  return {
    tabs,
    methods,
    activeSwitch,
    isLoading,
    isSaving,
    isDeleting,
    isReordering,
    importTabs,
    exportTabs,
    handleSubmit,
    handleDragEnd,
    handleCheckedChange,
  }
}
