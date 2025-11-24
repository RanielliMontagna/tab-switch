import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend, { type HttpBackendOptions } from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'

const isChromeExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id

const buildLocalePath = (lng: string, ns: string) => `locales/${lng}/${ns}.json`

const backendConfig: HttpBackendOptions = {
  loadPath: (lngs: string[] | string, namespaces: string[] | string) => {
    const lng = Array.isArray(lngs) ? lngs[0] : lngs
    const ns = Array.isArray(namespaces) ? namespaces[0] : namespaces
    const path = buildLocalePath(lng, ns)

    return isChromeExtension ? chrome.runtime.getURL(path) : `/${path}`
  },
}

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(Backend)
  .init({
    backend: backendConfig,
    returnObjects: true,
    fallbackLng: ['pt', 'en'],
    supportedLngs: ['pt', 'en'],
    load: 'languageOnly',
    debug: true,
  })
