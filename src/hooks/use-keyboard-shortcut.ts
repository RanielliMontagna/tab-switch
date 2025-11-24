import { useEffect } from 'react'

/**
 * Hook for keyboard shortcuts
 * @param key - Key combination (e.g., 'ctrl+k', 'alt+s')
 * @param callback - Function to call when shortcut is pressed
 * @param options - Additional options
 */
export function useKeyboardShortcut(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: {
    enabled?: boolean
    preventDefault?: boolean
  } = {}
) {
  const { enabled = true, preventDefault = true } = options

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const keys = key
        .toLowerCase()
        .split('+')
        .map((k) => k.trim())

      // Normalize key pressed - handle Space key and other special keys
      let keyPressed = event.key.toLowerCase()
      if (keyPressed === ' ' || keyPressed === 'space') {
        keyPressed = 'space'
      }

      // Check modifiers
      const needsCtrl = keys.includes('ctrl')
      const needsAlt = keys.includes('alt')
      const needsShift = keys.includes('shift')
      const needsMeta = keys.includes('meta')

      const ctrlMatch = needsCtrl === event.ctrlKey
      const altMatch = needsAlt === event.altKey
      const shiftMatch = needsShift === event.shiftKey
      const metaMatch = needsMeta === event.metaKey

      // Check main key - normalize space in the key string too
      let mainKey = keys.find((k) => !['ctrl', 'alt', 'shift', 'meta'].includes(k))
      if (mainKey === ' ') {
        mainKey = 'space'
      }

      const mainKeyMatch = mainKey === keyPressed

      // Only check modifiers that are required
      const modifierMatch =
        (!needsCtrl || ctrlMatch) &&
        (!needsAlt || altMatch) &&
        (!needsShift || shiftMatch) &&
        (!needsMeta || metaMatch)

      if (modifierMatch && mainKeyMatch) {
        if (preventDefault) {
          event.preventDefault()
        }
        callback(event)
      }
    }

    // Add listener to both window and document for better compatibility
    // (especially in Chrome extension popups)
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [key, callback, enabled, preventDefault])
}
