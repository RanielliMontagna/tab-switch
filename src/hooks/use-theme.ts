import { useCallback, useEffect, useState } from 'react'
import { getStorageItem, STORAGE_KEYS, setStorageItem } from '@/libs/storage'

export type Theme = 'light' | 'dark' | 'system'

/**
 * Hook to manage theme (light/dark/system)
 * Persists preference in storage and applies theme to document
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  // Get system preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [])

  // Apply theme to document
  const applyTheme = useCallback(
    (themeValue: Theme) => {
      if (typeof document === 'undefined') return

      const root = document.documentElement
      const effectiveTheme = themeValue === 'system' ? getSystemTheme() : themeValue

      if (effectiveTheme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    },
    [getSystemTheme]
  )

  // Load theme from storage on mount
  useEffect(() => {
    async function loadTheme() {
      const savedTheme = await getStorageItem<Theme>(STORAGE_KEYS.THEME)
      const initialTheme = savedTheme || 'system'
      setTheme(initialTheme)
      // Apply theme immediately on mount
      const root = document.documentElement
      const effectiveTheme = initialTheme === 'system' ? getSystemTheme() : initialTheme
      if (effectiveTheme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
      setMounted(true)
    }
    loadTheme()
  }, [getSystemTheme])

  // Listen to system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      applyTheme('system')
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    // Fallback for older browsers
    if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [theme, applyTheme])

  // Update theme when it changes
  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
  }, [theme, mounted, applyTheme])

  // Toggle between light and dark (ignores system)
  const toggleTheme = useCallback(async () => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    await setStorageItem(STORAGE_KEYS.THEME, newTheme)
    setTheme(newTheme)
  }, [theme])

  // Set specific theme
  const setThemeValue = useCallback(async (newTheme: Theme) => {
    await setStorageItem(STORAGE_KEYS.THEME, newTheme)
    setTheme(newTheme)
  }, [])

  // Get effective theme (resolved system preference)
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme

  return {
    theme,
    effectiveTheme,
    mounted,
    toggleTheme,
    setTheme: setThemeValue,
  }
}
