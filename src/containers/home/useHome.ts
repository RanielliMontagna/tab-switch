import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { newTabSchema, TabSchema } from './home.schema'
import { useEffect, useState } from 'react'

export function useHome() {
  const [tabs, setTabs] = useState<TabSchema[]>([])

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

  useEffect(() => {
    loadTabs()
  }, [])

  return { methods, tabs, handleSubmit, handleRemoveTab }
}
