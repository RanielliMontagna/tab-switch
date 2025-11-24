import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { logger } from '@/libs/logger'
import { getStorageItem, STORAGE_KEYS, setStorageItem } from '@/libs/storage'

export type SupportedLanguage = 'pt' | 'en'

export function useLanguage() {
  const { i18n } = useTranslation()
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || 'en'
  )
  const [mounted, setMounted] = useState(false)

  // Load language from storage on mount
  useEffect(() => {
    async function loadLanguage() {
      try {
        const savedLanguage = await getStorageItem<SupportedLanguage>(STORAGE_KEYS.LANGUAGE)
        if (savedLanguage && (savedLanguage === 'pt' || savedLanguage === 'en')) {
          await i18n.changeLanguage(savedLanguage)
          setCurrentLanguage(savedLanguage)
        } else {
          // Use detected language or fallback
          const detected = i18n.language as SupportedLanguage
          setCurrentLanguage(detected === 'pt' || detected === 'en' ? detected : 'en')
        }
      } catch (error) {
        logger.error('Error loading language from storage:', error)
        setCurrentLanguage('en')
      } finally {
        setMounted(true)
      }
    }

    loadLanguage()
  }, [i18n])

  // Update current language when i18n language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      if (lng === 'pt' || lng === 'en') {
        setCurrentLanguage(lng)
      }
    }

    i18n.on('languageChanged', handleLanguageChange)
    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [i18n])

  const changeLanguage = useCallback(
    async (language: SupportedLanguage) => {
      try {
        await i18n.changeLanguage(language)
        await setStorageItem(STORAGE_KEYS.LANGUAGE, language)
        setCurrentLanguage(language)
      } catch (error) {
        logger.error('Error changing language:', error)
      }
    },
    [i18n]
  )

  const toggleLanguage = useCallback(async () => {
    const newLanguage: SupportedLanguage = currentLanguage === 'pt' ? 'en' : 'pt'
    await changeLanguage(newLanguage)
  }, [currentLanguage, changeLanguage])

  return {
    currentLanguage,
    changeLanguage,
    toggleLanguage,
    mounted,
  }
}
