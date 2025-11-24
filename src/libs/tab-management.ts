/**
 * Tab management utilities for Chrome extension
 * Handles creation, removal, and querying of browser tabs
 */

import type { TabSchema } from '@/containers/home/home.schema'
import { promisifyChromeApi, safeChromeOperation } from '@/utils/chrome-api'
import { rateLimiters } from '@/utils/rate-limiter'
import { validateUrlForTabCreation } from '@/utils/url-security'
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
 * Normalizes a URL for comparison (removes trailing slashes, normalizes protocol)
 * @param url - URL to normalize
 * @returns Normalized URL string
 */
function normalizeUrlForComparison(url: string): string {
  try {
    const urlObj = new URL(url)
    // Normalize: remove trailing slash from pathname, lowercase hostname
    const normalizedPath = urlObj.pathname.replace(/\/$/, '') || '/'
    return `${urlObj.protocol}//${urlObj.hostname.toLowerCase()}${normalizedPath}${urlObj.search}${urlObj.hash}`
  } catch {
    // If URL is invalid, return as-is for comparison
    return url.toLowerCase()
  }
}

/**
 * Finds an existing tab with the same URL
 * @param url - URL to search for
 * @param existingTabs - Array of existing tabs to search in
 * @returns Tab ID if found, null otherwise
 */
function findExistingTabByUrl(url: string, existingTabs: chrome.tabs.Tab[]): number | null {
  const normalizedUrl = normalizeUrlForComparison(url)

  for (const tab of existingTabs) {
    if (tab.url && tab.id !== undefined) {
      const normalizedTabUrl = normalizeUrlForComparison(tab.url)
      if (normalizedTabUrl === normalizedUrl) {
        logger.debug(`Found existing tab for ${url}: ID ${tab.id}`)
        return tab.id
      }
    }
  }

  return null
}

/**
 * Creates a single browser tab or reuses existing one
 * @param tab - Tab configuration (name, url, interval)
 * @param existingTabs - Array of existing tabs to check for reuse
 * @returns Promise resolving to tab ID and interval, or null if creation failed
 */
async function createOrReuseTab(
  tab: TabSchema,
  existingTabs: chrome.tabs.Tab[]
): Promise<TabWithInterval | null> {
  try {
    // Validate URL security before creating tab
    if (!validateUrlForTabCreation(tab.url)) {
      logger.warn(`URL failed security check: ${tab.url}`)
      return null
    }

    // Check if a tab with this URL already exists
    const existingTabId = findExistingTabByUrl(tab.url, existingTabs)
    if (existingTabId !== null) {
      logger.debug(`Reusing existing tab: ${tab.name || tab.url} (ID: ${existingTabId})`)
      return { id: existingTabId, interval: tab.interval }
    }

    // No existing tab found, create a new one
    const createdTab = await promisifyChromeApi<chrome.tabs.Tab>((callback) =>
      chrome.tabs.create({ url: tab.url }, callback)
    )

    if (createdTab?.id) {
      logger.debug(`Created new tab: ${tab.name || tab.url} (ID: ${createdTab.id})`)
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
 * Reuses existing tabs when they have the same URL to avoid closing and reopening
 * @param tabConfigs - Array of tab configurations to create
 * @returns Promise resolving to creation result with successful tabs and errors
 */
export async function createTabs(tabConfigs: TabSchema[]): Promise<TabCreationResult> {
  const result: TabCreationResult = {
    tabs: [],
    errors: [],
  }

  // Check rate limiting
  if (!rateLimiters.tabCreation.isAllowed()) {
    const error: TabCreationError = {
      tab: 'all',
      error: 'Rate limit exceeded. Please wait before creating more tabs.',
    }
    result.errors.push(error)
    logger.warn(error.error)
    return result
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

  // Get all existing tabs to check for reuse
  const existingTabs = await promisifyChromeApi<chrome.tabs.Tab[]>((callback) =>
    chrome.tabs.query({}, callback)
  )

  if (!existingTabs) {
    logger.warn('Failed to query existing tabs, will create new ones')
  }

  // Create or reuse tabs
  const creationResults = await Promise.all(
    tabConfigs.map(async (tab) => {
      const created = await createOrReuseTab(tab, existingTabs || [])
      if (created) {
        return { success: true, tab: created } as const
      }
      return {
        success: false,
        error: {
          tab: tab.name || tab.url,
          error: `Failed to create or reuse tab: ${tab.name || tab.url}`,
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
 * Only removes tabs that are not part of the rotation
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

    // Filter tabs that are not in the rotation
    // Keep tabs that are in keepTabIds (rotation tabs)
    const tabsToRemove = allTabs.filter(
      (tab) => tab.id !== undefined && !keepTabIds.includes(tab.id)
    )

    if (tabsToRemove.length === 0) {
      logger.debug('No tabs to remove - all tabs are in rotation')
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
