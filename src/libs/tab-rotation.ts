/**
 * Tab rotation management
 * Handles the rotation logic for switching between tabs at configured intervals
 */

import { promisifyChromeApi } from '@/utils/chrome-api'
import { logger } from './logger'
import type { TabWithInterval } from './tab-management'

/**
 * State management for tab rotation
 */
class RotationState {
  private stopRotation = false
  private isPaused = false
  private currentRotationTabs: TabWithInterval[] | null = null
  private rotationTimeout: ReturnType<typeof setTimeout> | null = null
  private currentTabIndex = 0

  /**
   * Gets the current pause state
   */
  getPaused(): boolean {
    return this.isPaused
  }

  /**
   * Sets the pause state
   */
  setPaused(paused: boolean): void {
    this.isPaused = paused
  }

  /**
   * Gets the current rotation tabs
   */
  getCurrentTabs(): TabWithInterval[] | null {
    return this.currentRotationTabs
  }

  /**
   * Sets the current rotation tabs
   */
  setCurrentTabs(tabs: TabWithInterval[] | null): void {
    this.currentRotationTabs = tabs
  }

  /**
   * Gets the current tab index
   */
  getCurrentIndex(): number {
    return this.currentTabIndex
  }

  /**
   * Sets the current tab index
   */
  setCurrentIndex(index: number): void {
    this.currentTabIndex = index
  }

  /**
   * Resets rotation state
   */
  reset(): void {
    this.stopRotation = false
    this.isPaused = false
    this.currentRotationTabs = null
    this.currentTabIndex = 0
    this.clearTimeout()
  }

  /**
   * Stops the rotation
   */
  stop(): void {
    this.stopRotation = true
    this.isPaused = false
    this.currentRotationTabs = null
    this.clearTimeout()
  }

  /**
   * Checks if rotation should stop
   */
  shouldStop(): boolean {
    return this.stopRotation
  }

  /**
   * Clears the rotation timeout
   */
  clearTimeout(): void {
    if (this.rotationTimeout) {
      clearTimeout(this.rotationTimeout)
      this.rotationTimeout = null
    }
  }

  /**
   * Sets the rotation timeout
   */
  setTimeout(callback: () => void, delay: number): void {
    this.clearTimeout()
    this.rotationTimeout = setTimeout(callback, delay)
  }
}

// Global rotation state instance
const rotationState = new RotationState()

/**
 * Activates a tab by ID
 * @param tabId - ID of the tab to activate
 * @returns Promise resolving to true if successful, false otherwise
 */
async function activateTab(tabId: number): Promise<boolean> {
  try {
    const result = await promisifyChromeApi<chrome.tabs.Tab | undefined>((callback) =>
      chrome.tabs.update(tabId, { active: true }, callback)
    )
    return result !== undefined && result !== null
  } catch (error) {
    logger.error(`Failed to activate tab ${tabId}:`, error)
    return false
  }
}

/**
 * Rotates to the next tab in the sequence
 * @param tabs - Array of tabs with IDs and intervals
 * @returns Cleanup function to stop rotation, or undefined if rotation cannot start
 */
export function rotateTabs(tabs: TabWithInterval[]): (() => void) | undefined {
  if (!tabs || tabs.length === 0) {
    logger.error('Cannot rotate: no tabs provided')
    return undefined
  }

  // Reset index if starting new rotation (not resuming)
  if (!rotationState.getPaused() || !rotationState.getCurrentTabs()) {
    rotationState.setCurrentIndex(0)
  }

  const rotate = async (): Promise<void> => {
    if (rotationState.shouldStop()) {
      rotationState.reset()
      return
    }

    // Check if rotation is paused
    if (rotationState.getPaused()) {
      // Don't clear timeout, just don't schedule next rotation
      // This allows us to resume from the same point
      return
    }

    const currentIndex = rotationState.getCurrentIndex()
    const currentTabs = rotationState.getCurrentTabs() || tabs

    // Validate current tab index
    if (currentIndex < 0 || currentIndex >= currentTabs.length) {
      logger.error(`Invalid tab index: ${currentIndex}. Resetting to 0.`)
      rotationState.setCurrentIndex(0)
      rotate()
      return
    }

    const tab = currentTabs[currentIndex]
    if (!tab || !tab.id) {
      logger.error(`Invalid tab at index ${currentIndex}. Skipping.`)
      const nextIndex = currentIndex === currentTabs.length - 1 ? 0 : currentIndex + 1
      rotationState.setCurrentIndex(nextIndex)
      const nextTab = currentTabs[nextIndex]
      const interval = nextTab?.interval || 5000
      rotationState.setTimeout(rotate, interval)
      return
    }

    // Check if we have permission to update tabs
    if (!chrome.tabs || typeof chrome.tabs.update !== 'function') {
      logger.error('Missing tabs permission. Stopping rotation.')
      rotationState.stop()
      return
    }

    // Activate the current tab
    const success = await activateTab(tab.id)
    if (!success) {
      // Try to continue with next tab
      const nextIndex = currentIndex === currentTabs.length - 1 ? 0 : currentIndex + 1
      rotationState.setCurrentIndex(nextIndex)
      const nextTab = currentTabs[nextIndex]
      const interval = nextTab?.interval || 5000
      rotationState.setTimeout(rotate, interval)
      return
    }

    // Move to next tab
    const nextIndex = currentIndex === currentTabs.length - 1 ? 0 : currentIndex + 1
    rotationState.setCurrentIndex(nextIndex)

    // Schedule next rotation
    const nextTab = currentTabs[nextIndex]
    const nextInterval = nextTab?.interval || 5000
    rotationState.setTimeout(rotate, nextInterval)
  }

  // Start rotation
  rotate()

  // Return cleanup function
  return () => {
    rotationState.stop()
  }
}

/**
 * Pauses the current rotation
 */
export function pauseRotation(): void {
  rotationState.setPaused(true)
  rotationState.clearTimeout()
}

/**
 * Resumes a paused rotation
 * @returns true if rotation was resumed, false if there was nothing to resume
 */
export function resumeRotation(): boolean {
  if (!rotationState.getPaused() || !rotationState.getCurrentTabs()) {
    return false
  }

  rotationState.setPaused(false)
  const tabs = rotationState.getCurrentTabs()
  if (tabs) {
    rotateTabs(tabs)
  }
  return true
}

/**
 * Stops the current rotation
 */
export function stopRotation(): void {
  rotationState.stop()
}

/**
 * Initializes rotation with new tabs
 * @param tabs - Array of tabs with IDs and intervals to rotate
 */
export function startRotation(tabs: TabWithInterval[]): void {
  rotationState.setPaused(false)
  rotationState.setCurrentIndex(0)
  rotationState.setCurrentTabs(tabs)
  rotateTabs(tabs)
}

/**
 * Gets the current rotation state
 */
export function getRotationState(): {
  isPaused: boolean
  currentTabs: TabWithInterval[] | null
  currentIndex: number
} {
  return {
    isPaused: rotationState.getPaused(),
    currentTabs: rotationState.getCurrentTabs(),
    currentIndex: rotationState.getCurrentIndex(),
  }
}
