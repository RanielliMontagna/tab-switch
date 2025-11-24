/**
 * Tab management utilities for Chrome extension
 * Handles creation, removal, and querying of browser tabs
 */

import type { TabSchema } from '@/containers/home/home.schema'
import { promisifyChromeApi, safeChromeOperation } from '@/utils/chrome-api'
import { logger } from './logger'

/**
 * Interface for tab with ID and interval
 */
export interface TabWithInterval {
  id: number
  interval: number
}

/**
 * Interface for tab creation error
 */
export interface TabCreationError {
  tab: string
  error: string
}

/**
 * Result of tab creation operation
 */
export interface TabCreationResult {
  tabs: TabWithInterval[]
  errors: TabCreationError[]
}

/**
 * Creates a single browser tab
 * @param tab - Tab configuration (name, url, interval)
 * @returns Promise resolving to tab ID and interval, or null if creation failed
 */
async function createSingleTab(tab: TabSchema): Promise<TabWithInterval | null> {
  try {
    const createdTab = await promisifyChromeApi<chrome.tabs.Tab>((callback) =>
      chrome.tabs.create({ url: tab.url }, callback)
    )

    if (createdTab?.id) {
      logger.debug(`Created tab: ${tab.name || tab.url} (ID: ${createdTab.id})`)
      return { id: createdTab.id, interval: tab.interval }
    }

    logger.error(`Tab was created but no ID was returned for: ${tab.name || tab.url}`)
    return null
  } catch (error) {
    logger.error(`Error creating tab for ${tab.name || tab.url}:`, error)
    return null
  }
}

/**
 * Creates multiple browser tabs based on provided configurations
 * @param tabConfigs - Array of tab configurations to create
 * @returns Promise resolving to creation result with successful tabs and errors
 */
export async function createTabs(tabConfigs: TabSchema[]): Promise<TabCreationResult> {
  const result: TabCreationResult = {
    tabs: [],
    errors: [],
  }

  // Check if we have permission to create tabs
  if (!chrome.tabs || typeof chrome.tabs.create !== 'function') {
    const error: TabCreationError = {
      tab: 'all',
      error: 'Missing tabs permission. Please check extension permissions.',
    }
    result.errors.push(error)
    logger.error(error.error)
    return result
  }

  // Create all tabs in parallel
  const creationResults = await Promise.all(
    tabConfigs.map(async (tab) => {
      const created = await createSingleTab(tab)
      if (created) {
        return { success: true, tab: created } as const
      }
      return {
        success: false,
        error: {
          tab: tab.name || tab.url,
          error: `Failed to create tab: ${tab.name || tab.url}`,
        },
      } as const
    })
  )

  // Separate successful creations from errors
  for (const resultItem of creationResults) {
    if (resultItem.success) {
      result.tabs.push(resultItem.tab)
    } else {
      result.errors.push(resultItem.error)
    }
  }

  // Log errors if any
  if (result.errors.length > 0) {
    logger.warn('Some tabs failed to create:', result.errors)
  }

  return result
}

/**
 * Removes tabs that are not in the provided list of tab IDs
 * @param keepTabIds - Array of tab IDs to keep (all others will be removed)
 * @returns Promise resolving to number of tabs removed
 */
export async function removeOtherTabs(keepTabIds: number[]): Promise<number> {
  try {
    const allTabs = await promisifyChromeApi<chrome.tabs.Tab[]>((callback) =>
      chrome.tabs.query({}, callback)
    )

    if (!allTabs) {
      logger.warn('Failed to query tabs for removal')
      return 0
    }

    const tabsToRemove = allTabs.filter(
      (tab) => tab.id !== undefined && !keepTabIds.includes(tab.id)
    )

    if (tabsToRemove.length === 0) {
      return 0
    }

    // Remove tabs in parallel
    const removalPromises = tabsToRemove.map((tab) => {
      if (tab.id === undefined) {
        return Promise.resolve(false)
      }
      const tabId = tab.id
      return safeChromeOperation(() =>
        promisifyChromeApi<void>((callback) => chrome.tabs.remove(tabId, callback))
      )
    })

    const results = await Promise.all(removalPromises)
    const removedCount = results.filter((success) => success !== null).length

    logger.debug(`Removed ${removedCount} tabs that were not in rotation`)
    return removedCount
  } catch (error) {
    logger.warn('Error removing tabs:', error)
    return 0
  }
}

/**
 * Validates that tab creation is possible
 * @returns true if tabs can be created, false otherwise
 */
export function canCreateTabs(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.tabs && typeof chrome.tabs.create === 'function'
}
