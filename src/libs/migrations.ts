/**
 * Data migrations for storage schema versioning
 * Ensures backward compatibility when data structure changes
 */

import { z } from 'zod'
import { INTERVAL } from '@/constants'
import { TabSchema, tabSchema } from '@/containers/home/home.schema'
import { isValidUrl, normalizeUrl } from '@/utils/url'

// Current data version
export const CURRENT_DATA_VERSION = 1

// Storage key for version
export const STORAGE_VERSION_KEY = 'dataVersion'

// Legacy schemas for migration
const legacyTabSchemaV0 = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string().optional(),
  url: z.string(),
  interval: z.number().optional(),
  saved: z.boolean().optional(),
})

/**
 * Migrate tabs from version 0 to version 1
 * - Ensures all tabs have valid IDs (numbers)
 * - Normalizes URLs
 * - Validates and fixes intervals
 * - Ensures required fields exist
 */
function migrateTabsV0ToV1(legacyTabs: unknown): TabSchema[] {
  if (!Array.isArray(legacyTabs)) {
    return []
  }

  const migrated: TabSchema[] = []
  let nextId = 1

  for (const item of legacyTabs) {
    try {
      // Parse legacy format
      const parsed = legacyTabSchemaV0.parse(item)

      // Generate numeric ID if needed
      const id =
        typeof parsed.id === 'number'
          ? parsed.id
          : typeof parsed.id === 'string'
            ? parseInt(parsed.id, 10) || nextId++
            : nextId++

      // Ensure unique IDs
      while (migrated.some((t) => t.id === id)) {
        nextId++
      }

      // Normalize and validate URL
      let url = parsed.url || ''
      if (url && isValidUrl(url)) {
        url = normalizeUrl(url)
      } else {
        console.warn(`Skipping invalid URL: ${url}`)
        continue
      }

      // Validate and fix interval
      let interval = parsed.interval
      if (!interval || interval < INTERVAL.MIN) {
        interval = INTERVAL.MIN
      }

      // Ensure name exists
      const name = parsed.name || url || `Tab ${id}`

      // Create migrated tab
      const migratedTab: TabSchema = {
        id,
        name,
        url,
        interval,
        saved: parsed.saved ?? false,
      }

      // Validate with current schema
      const validated = tabSchema.parse(migratedTab)
      migrated.push(validated)
    } catch (error) {
      console.warn('Failed to migrate tab:', item, error)
      // Skip invalid tabs
    }
  }

  return migrated
}

/**
 * Get migration function for a specific version
 */
export function getMigration(
  fromVersion: number,
  toVersion: number
): ((data: unknown) => unknown) | null {
  if (fromVersion === toVersion) {
    return null
  }

  // Migration chain: 0 -> 1
  if (fromVersion === 0 && toVersion === 1) {
    return (data: unknown) => {
      if (Array.isArray(data)) {
        return migrateTabsV0ToV1(data)
      }
      return data
    }
  }

  // Future migrations can be added here:
  // if (fromVersion === 1 && toVersion === 2) {
  //   return migrateV1ToV2
  // }

  console.warn(`No migration path from version ${fromVersion} to ${toVersion}`)
  return null
}

/**
 * Migrate data to current version
 */
export function migrateData(data: unknown, currentVersion: number | null): unknown {
  const version = currentVersion ?? 0

  if (version === CURRENT_DATA_VERSION) {
    return data
  }

  if (version > CURRENT_DATA_VERSION) {
    console.warn(
      `Data version (${version}) is newer than current version (${CURRENT_DATA_VERSION}). This may cause issues.`
    )
    return data
  }

  // Apply migrations sequentially
  let migratedData = data
  for (let v = version; v < CURRENT_DATA_VERSION; v++) {
    const migration = getMigration(v, v + 1)
    if (migration) {
      migratedData = migration(migratedData)
    }
  }

  return migratedData
}

/**
 * Validate tabs data against current schema
 */
export function validateTabs(data: unknown): TabSchema[] {
  if (!Array.isArray(data)) {
    return []
  }

  const validated: TabSchema[] = []

  for (const item of data) {
    try {
      const validatedTab = tabSchema.parse(item)
      validated.push(validatedTab)
    } catch (error) {
      console.warn('Invalid tab data, skipping:', item, error)
    }
  }

  return validated
}
