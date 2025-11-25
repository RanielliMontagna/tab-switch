/**
 * Hook for managing tab behavior preference
 */

import { useEffect, useState } from 'react'
import { getStorageItem, STORAGE_KEYS, setStorageItem } from '@/libs/storage'

export type TabBehavior = 'keep-tabs' | 'close-others'

/**
 * Hook to manage tab behavior preference
 * @returns Current tab behavior and setter function
 */
export function useTabBehavior() {
  const [tabBehavior, setTabBehaviorState] = useState<TabBehavior>('keep-tabs')
  const [isLoading, setIsLoading] = useState(true)

  // Load initial value from storage
  useEffect(() => {
    const loadTabBehavior = async () => {
      try {
        const stored = await getStorageItem<TabBehavior>(STORAGE_KEYS.TAB_BEHAVIOR)
        if (stored) {
          setTabBehaviorState(stored)
        } else {
          // Set default value if not present
          await setStorageItem(STORAGE_KEYS.TAB_BEHAVIOR, 'keep-tabs')
          setTabBehaviorState('keep-tabs')
        }
      } catch (error) {
        console.error('Error loading tab behavior:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTabBehavior()
  }, [])

  // Update storage when value changes
  const setTabBehavior = async (behavior: TabBehavior) => {
    try {
      await setStorageItem(STORAGE_KEYS.TAB_BEHAVIOR, behavior)
      setTabBehaviorState(behavior)
    } catch (error) {
      console.error('Error saving tab behavior:', error)
    }
  }

  return { tabBehavior, setTabBehavior, isLoading }
}
