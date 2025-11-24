/**
 * Initialize theme before React renders to prevent flash of unstyled content (FOUC)
 * This file is loaded as a module script in index.html to apply theme immediately
 * Compatible with Content Security Policy (CSP) - no inline scripts
 */
const isChromeExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id && !!chrome.storage

const getSystemTheme = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: string) {
  const root = document.documentElement
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme
  if (effectiveTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

if (isChromeExtension) {
  chrome.storage.local.get('theme', (result) => {
    const theme = (result.theme as string) || 'system'
    applyTheme(theme)
  })
} else {
  try {
    const savedTheme = localStorage.getItem('theme')
    const theme = savedTheme ? JSON.parse(savedTheme) : 'system'
    applyTheme(theme)
  } catch {
    applyTheme('system')
  }
}
