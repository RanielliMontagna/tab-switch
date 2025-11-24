#!/usr/bin/env tsx
/**
 * Script to validate translation files
 * Checks for missing keys across all locale files
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

interface TranslationFile {
  locale: string
  path: string
  data: Record<string, unknown>
}

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }

  return keys
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return current
}

function loadTranslationFiles(localesDir: string): TranslationFile[] {
  const files: TranslationFile[] = []

  if (!existsSync(localesDir)) {
    console.error(`❌ Locales directory not found: ${localesDir}`)
    process.exit(1)
  }

  const locales = readdirSync(localesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  for (const locale of locales) {
    const translationPath = join(localesDir, locale, 'translation.json')

    if (!existsSync(translationPath)) {
      console.warn(`⚠️  Translation file not found: ${translationPath}`)
      continue
    }

    try {
      const content = readFileSync(translationPath, 'utf-8')
      const data = JSON.parse(content) as Record<string, unknown>

      files.push({
        locale,
        path: translationPath,
        data,
      })
    } catch (error) {
      console.error(`❌ Error reading ${translationPath}:`, error)
      process.exit(1)
    }
  }

  return files
}

function validateTranslations(localesDir: string): boolean {
  const translationFiles = loadTranslationFiles(localesDir)

  if (translationFiles.length === 0) {
    console.error('❌ No translation files found')
    return false
  }

  // Use the first file as the reference (usually 'en')
  const reference = translationFiles[0]
  const referenceKeys = getAllKeys(reference.data)
  const allKeys = new Set(referenceKeys)

  // Collect all keys from all files
  for (const file of translationFiles) {
    const keys = getAllKeys(file.data)
    for (const key of keys) {
      allKeys.add(key)
    }
  }

  let hasErrors = false

  console.log(`\n📋 Validating translations in ${localesDir}`)
  console.log(`📊 Reference locale: ${reference.locale} (${referenceKeys.length} keys)`)
  console.log(`🔑 Total unique keys: ${allKeys.size}\n`)

  // Check each file against all keys
  for (const file of translationFiles) {
    const fileKeys = getAllKeys(file.data)
    const missingKeys: string[] = []

    for (const key of allKeys) {
      const value = getNestedValue(file.data, key)
      if (value === undefined) {
        missingKeys.push(key)
      }
    }

    if (missingKeys.length > 0) {
      hasErrors = true
      console.error(`❌ ${file.locale.toUpperCase()}: Missing ${missingKeys.length} key(s):`)
      for (const key of missingKeys) {
        console.error(`   - ${key}`)
      }
      console.log()
    } else {
      console.log(`✅ ${file.locale.toUpperCase()}: All keys present (${fileKeys.length} keys)`)
    }
  }

  // Check for extra keys (keys that exist in other files but not in reference)
  for (const file of translationFiles) {
    if (file.locale === reference.locale) continue

    const fileKeys = getAllKeys(file.data)
    const extraKeys = fileKeys.filter((key) => !referenceKeys.includes(key))

    if (extraKeys.length > 0) {
      console.warn(`⚠️  ${file.locale.toUpperCase()}: Extra keys not in reference:`)
      for (const key of extraKeys) {
        console.warn(`   - ${key}`)
      }
      console.log()
    }
  }

  return !hasErrors
}

// Main execution
const localesDir = join(process.cwd(), 'public', 'locales')
const isValid = validateTranslations(localesDir)

if (!isValid) {
  console.error('\n❌ Translation validation failed')
  process.exit(1)
}

console.log('\n✅ All translations are valid!')
process.exit(0)
