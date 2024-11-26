import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { newTabSchema, TabSchema } from './home.schema'
import { useEffect, useState } from 'react'
import { DragEndEvent } from '@dnd-kit/core'

export function useHome() {
  const [tabs, setTabs] = useState<TabSchema[]>([])
  const [activeSwitch, setActiveSwitch] = useState(false)

  const methods = useForm<TabSchema>({
    resolver: zodResolver(newTabSchema),
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

    console.log('Load tabs:', JSON.parse(tabs!))

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

  function handleSwitchChange() {
    console.log('entrou')
    setActiveSwitch((prev) => !prev)
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
    handleSwitchChange,
  }
}
