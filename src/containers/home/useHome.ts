import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'

import { DragEndEvent } from '@dnd-kit/core'
import { useToast } from '@/hooks/use-toast'

import { newTabSchema, TabSchema } from './home.schema'

export function useHome() {
  const { t } = useTranslation()

  const { toast } = useToast()
  const [tabs, setTabs] = useState<TabSchema[]>([])
  const [activeSwitch, setActiveSwitch] = useState(localStorage.getItem('switch') === 'true')

  const methods = useForm<TabSchema>({
    resolver: zodResolver(newTabSchema),
    defaultValues: { name: '', url: '', interval: 5000, saved: false },
  })

  function handleSubmit(data: TabSchema) {
    const newTabs = [...tabs, data]
    setTabs(newTabs)

    // Save the form data to local storage
    localStorage.setItem('tabs', JSON.stringify(newTabs))

    // Clear the form
    methods.reset()
  }

  function loadTabs() {
    const tabs = localStorage.getItem('tabs')

    if (tabs) {
      setTabs(JSON.parse(tabs))
    }
  }

  function handleRemoveTab(index: number) {
    const newTabs = tabs.filter((_, i) => i !== index)

    setTabs(newTabs)

    // Save the form data to local storage
    localStorage.setItem('tabs', JSON.stringify(newTabs))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    const idDelete = (event.activatorEvent.target as HTMLElement).id

    if (idDelete === 'delete') {
      handleRemoveTab(tabs.findIndex((tab) => tab.name === active.id))
      return
    }

    if (event.over?.id === 'delete') {
      handleRemoveTab(tabs.findIndex((tab) => tab.name === active.id))
      return
    }

    if (active.id !== over?.id) {
      const oldIndex = tabs.findIndex((tab) => tab.name === active.id)
      const newIndex = tabs.findIndex((tab) => tab.name === over?.id)

      const reorderedTabs = Array.from(tabs)
      const [removed] = reorderedTabs.splice(oldIndex, 1)
      reorderedTabs.splice(newIndex, 0, removed)

      setTabs(reorderedTabs)

      // Save the reordered tabs to local storage
      localStorage.setItem('tabs', JSON.stringify(reorderedTabs))
    }
  }

  function handleCheckedChange(checked: boolean) {
    try {
      //Verify if exist at least two tabs to start the auto refresh
      if (tabs.length <= 1) {
        toast({
          title: 'Please add at least one tab!',
          description: 'You need to add at least one tab to start the auto refresh.',
          variant: 'destructive',
        })

        return
      }

      // Send message to background script
      chrome.runtime.sendMessage({ status: checked, tabs })

      // Save the switch state to local storage
      localStorage.setItem('switch', JSON.stringify(checked))

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
          const content = e.target?.result as string
          const parsed = JSON.parse(content)

          setTabs(parsed)

          // Save the form data to local storage
          localStorage.setItem('tabs', JSON.stringify(parsed))

          toast({
            title: t('toastImportSuccess.title'),
            description: `${parsed.length} ${t('toastImportSuccess.description')}`,
            variant: 'success',
          })
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
