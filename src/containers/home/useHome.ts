import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'

import { DragEndEvent } from '@dnd-kit/core'
import { useToast } from '@/hooks/use-toast'
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '@/libs/storage'
import type { BackgroundMessage } from '@/@types/messages'

import { newTabSchema, TabSchema, tabsFileSchema } from './home.schema'

export function useHome() {
  const { t } = useTranslation()

  const { toast } = useToast()
  const [tabs, setTabs] = useState<TabSchema[]>([])
  const [activeSwitch, setActiveSwitch] = useState(false)

  const methods = useForm<TabSchema>({
    resolver: zodResolver(newTabSchema),
    defaultValues: { name: '', url: '', interval: 5000, saved: false },
  })

  async function handleSubmit(data: TabSchema) {
    const newTabs = [...tabs, data]
    setTabs(newTabs)

    // Save the form data to storage
    await setStorageItem(STORAGE_KEYS.TABS, newTabs)

    // Clear the form
    methods.reset()
  }

  async function loadTabs() {
    const loadedTabs = await getStorageItem<TabSchema[]>(STORAGE_KEYS.TABS)
    if (loadedTabs) {
      setTabs(loadedTabs)
    }

    const loadedSwitch = await getStorageItem<boolean>(STORAGE_KEYS.SWITCH)
    if (loadedSwitch !== null) {
      setActiveSwitch(loadedSwitch)
    }
  }

  async function handleRemoveTab(index: number) {
    const newTabs = tabs.filter((_, i) => i !== index)

    setTabs(newTabs)

    // Save the form data to storage
    await setStorageItem(STORAGE_KEYS.TABS, newTabs)
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
      const oldIndex = tabs.findIndex((tab) => tab.name === active.id)
      const newIndex = tabs.findIndex((tab) => tab.name === over?.id)

      const reorderedTabs = Array.from(tabs)
      const [removed] = reorderedTabs.splice(oldIndex, 1)
      reorderedTabs.splice(newIndex, 0, removed)

      setTabs(reorderedTabs)

      // Save the reordered tabs to storage
      await setStorageItem(STORAGE_KEYS.TABS, reorderedTabs)
    }
  }

  async function handleCheckedChange(checked: boolean) {
    try {
      //Verify if exist at least two tabs to start the auto refresh
      if (tabs.length <= 1) {
        toast({
          title: t('toastLeastOneTab.title'),
          description: t('toastLeastOneTab.description'),
          variant: 'destructive',
        })

        return
      }

      // Send message to background script
      const message: BackgroundMessage = checked
        ? { status: true, tabs }
        : { status: false }
      chrome.runtime.sendMessage(message)

      // Save the switch state to storage
      await setStorageItem(STORAGE_KEYS.SWITCH, checked)

      // Update the switch state
      setActiveSwitch(checked)
    } catch {
      toast({
        title: t('toastNotInstalled.title'),
        description: t('toastNotInstalled.description'),
        variant: 'destructive',
      })
    }
  }

  function exportTabs() {
    const data = new Blob([JSON.stringify(tabs)], { type: 'application/json' })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')

    a.href = url
    a.download = 'tabs.json'
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
    input.accept = '.json'
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

            setTabs(result.data as TabSchema[])

            // Save the form data to storage
            await setStorageItem(STORAGE_KEYS.TABS, result.data)

            toast({
              title: t('toastImportSuccess.title'),
              description: `${result.data.length} ${t('toastImportSuccess.description')}`,
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
  }, [])

  return {
    tabs,
    methods,
    activeSwitch,
    importTabs,
    exportTabs,
    handleSubmit,
    handleDragEnd,
    handleCheckedChange,
  }
}
