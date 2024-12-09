import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { DragEndEvent } from '@dnd-kit/core'
import { useToast } from '@/hooks/use-toast'

import { newTabSchema, TabSchema } from './home.schema'

export function useHome() {
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
      console.log('checked', checked)

      if (checked) {
        //Verify if exist +1 tab configured
        if (tabs.length === 0) {
          toast({
            title: 'Please add at least one tab!',
            description: 'You need to add at least one tab to start the auto refresh.',
            variant: 'destructive',
          })

          return
        }

        // Send message to background script
        chrome.runtime.sendMessage({ status: checked, tabs }, (response) => {
          if (response?.status === 'success') {
            console.log('Message sent successfully!')
          } else {
            console.error('Failed to send message!')
          }
        })
      }

      // Save the switch state to local storage
      localStorage.setItem('switch', JSON.stringify(checked))

      // Update the switch state
      setActiveSwitch(checked)
    } catch {
      toast({
        title: 'Install the extension!',
        description: 'You need to install the extension to use this feature.',
        variant: 'destructive',
      })
    }
  }

  useEffect(() => {
    loadTabs()
  }, [])

  return {
    tabs,
    methods,
    activeSwitch,
    handleSubmit,
    handleDragEnd,
    handleRemoveTab,
    handleCheckedChange,
  }
}
