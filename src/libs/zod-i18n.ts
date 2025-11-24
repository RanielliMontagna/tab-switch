import i18next from 'i18next'
import { z } from 'zod'

/**
 * Custom error map for Zod that integrates with i18next
 * This allows validation error messages to be translated
 *
 * Uses z.config() with customError as per Zod 4 documentation:
 * https://zod.dev/error-customization#error-precedence
 */
export function setupZodI18n() {
  z.config({
    customError: (iss) => {
      // Get translation key based on error type and path
      const path = iss.path && iss.path.length > 0 ? iss.path.join('.') : 'root'
      const fieldName = iss.path && iss.path.length > 0 ? iss.path[iss.path.length - 1] : 'field'

      // Handle custom error messages (from .refine() or schema-level errors)
      if (iss.code === 'custom' && 'message' in iss && iss.message) {
        // If message is a translation key, translate it
        if (typeof iss.message === 'string' && iss.message.startsWith('validation.')) {
          const customTranslated = i18next.t(iss.message, {
            defaultValue: iss.message,
          })
          return typeof customTranslated === 'string' ? customTranslated : iss.message
        }
        // Otherwise, try to translate using the path
        const customKey = `validation.${path}.custom`
        const customMsg = i18next.t(customKey, {
          defaultValue: typeof iss.message === 'string' ? iss.message : 'Invalid input',
        })
        return typeof customMsg === 'string'
          ? customMsg
          : typeof iss.message === 'string'
            ? iss.message
            : 'Invalid input'
      }

      // Build translation key: validation.{field}.{errorCode}
      const translationKey = `validation.${path}.${String(iss.code)}`

      // Try to get translated message
      const translated = i18next.t(translationKey, {
        defaultValue: undefined,
        minimum: iss.code === 'too_small' && 'minimum' in iss ? iss.minimum : undefined,
        maximum: iss.code === 'too_big' && 'maximum' in iss ? iss.maximum : undefined,
      })

      // If translation exists, use it
      if (translated && translated !== translationKey && typeof translated === 'string') {
        return translated
      }

      // Fallback to field-specific or common translations
      switch (iss.code) {
        case 'invalid_type': {
          if ('received' in iss && iss.received === 'undefined') {
            const requiredMsg = i18next.t(`validation.${String(fieldName)}.required`, {
              defaultValue: i18next.t('validation.common.required', {
                defaultValue: 'Required',
              }) as string,
            })
            return typeof requiredMsg === 'string' ? requiredMsg : 'Required'
          }
          const invalidTypeMsg = i18next.t('validation.common.invalidType', {
            defaultValue: `Expected ${'expected' in iss ? iss.expected : 'valid type'}, received ${'received' in iss ? iss.received : 'invalid'}`,
            expected: 'expected' in iss ? iss.expected : 'valid type',
            received: 'received' in iss ? iss.received : 'invalid',
          })
          return typeof invalidTypeMsg === 'string' ? invalidTypeMsg : 'Invalid type'
        }
        case 'invalid_format': {
          if ('validation' in iss) {
            if (iss.validation === 'email') {
              const emailMsg = i18next.t('validation.common.invalidEmail', {
                defaultValue: 'Invalid email',
              })
              return typeof emailMsg === 'string' ? emailMsg : 'Invalid email'
            }
            if (iss.validation === 'url') {
              const urlMsg = i18next.t('validation.common.invalidUrl', {
                defaultValue: 'Invalid URL',
              })
              return typeof urlMsg === 'string' ? urlMsg : 'Invalid URL'
            }
          }
          const strMsg = i18next.t('validation.common.invalidString', {
            defaultValue: 'Invalid string',
          })
          return typeof strMsg === 'string' ? strMsg : 'Invalid string'
        }
        case 'too_small': {
          if ('type' in iss && 'minimum' in iss) {
            if (iss.type === 'string') {
              const strMinMsg = i18next.t(`validation.${String(fieldName)}.min`, {
                defaultValue: i18next.t('validation.common.stringTooShort', {
                  defaultValue: `String must contain at least ${iss.minimum} character(s)`,
                  minimum: iss.minimum,
                }) as string,
                minimum: iss.minimum,
              })
              return typeof strMinMsg === 'string'
                ? strMinMsg
                : `String must contain at least ${iss.minimum} character(s)`
            }
            if (iss.type === 'number') {
              const numMinMsg = i18next.t(`validation.${String(fieldName)}.min`, {
                defaultValue: i18next.t('validation.common.numberTooSmall', {
                  defaultValue: `Must be ≥ ${iss.minimum}`,
                  minimum: iss.minimum,
                }) as string,
                minimum: iss.minimum,
              })
              return typeof numMinMsg === 'string' ? numMinMsg : `Must be ≥ ${iss.minimum}`
            }
          }
          const tooSmallMsg = i18next.t('validation.common.tooSmall', {
            defaultValue: `Must be ≥ ${'minimum' in iss ? iss.minimum : 0}`,
            minimum: 'minimum' in iss ? iss.minimum : 0,
          })
          return typeof tooSmallMsg === 'string' ? tooSmallMsg : 'Value too small'
        }
        case 'too_big': {
          if ('type' in iss && 'maximum' in iss) {
            if (iss.type === 'string') {
              const strMaxMsg = i18next.t(`validation.${String(fieldName)}.max`, {
                defaultValue: i18next.t('validation.common.stringTooLong', {
                  defaultValue: `String must contain at most ${iss.maximum} character(s)`,
                  maximum: iss.maximum,
                }) as string,
                maximum: iss.maximum,
              })
              return typeof strMaxMsg === 'string'
                ? strMaxMsg
                : `String must contain at most ${iss.maximum} character(s)`
            }
            if (iss.type === 'number') {
              const numMaxMsg = i18next.t(`validation.${String(fieldName)}.max`, {
                defaultValue: i18next.t('validation.common.numberTooBig', {
                  defaultValue: `Must be ≤ ${iss.maximum}`,
                  maximum: iss.maximum,
                }) as string,
                maximum: iss.maximum,
              })
              return typeof numMaxMsg === 'string' ? numMaxMsg : `Must be ≤ ${iss.maximum}`
            }
          }
          const tooBigMsg = i18next.t('validation.common.tooBig', {
            defaultValue: `Must be ≤ ${'maximum' in iss ? iss.maximum : 0}`,
            maximum: 'maximum' in iss ? iss.maximum : 0,
          })
          return typeof tooBigMsg === 'string' ? tooBigMsg : 'Value too big'
        }
        case 'invalid_value': {
          const options =
            'options' in iss && Array.isArray(iss.options) ? iss.options.join(' | ') : 'valid value'
          const received = 'received' in iss ? String(iss.received) : 'invalid'
          const enumMsg = i18next.t('validation.common.invalidEnum', {
            defaultValue: `Invalid enum value. Expected ${options}, received ${received}`,
            options,
            received,
          })
          return typeof enumMsg === 'string' ? enumMsg : 'Invalid value'
        }
        default: {
          const invalidMsg = i18next.t('validation.common.invalid', {
            defaultValue: 'Invalid input',
          })
          return typeof invalidMsg === 'string' ? invalidMsg : 'Invalid input'
        }
      }
    },
  })
}
