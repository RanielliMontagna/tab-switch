/**
 *  @description This variable is used to stop the rotation of the tabs
 *  @type {boolean}
 */
let stopRotation = false

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(async (message, _, sendResponse) => {
  try {
    if (!message.status) {
      stopRotation = true
      sendResponse({ status: 'Rotation stopped', success: true })
      return true
    }

    const tabs = await createTabs(message.tabs)
    if (tabs.length === 0) {
      sendResponse({
        status: 'error',
        message: 'Failed to create tabs. Please check permissions and URLs.',
        success: false,
      })
      return true
    }

    rotateTabs(tabs)
    sendResponse({ status: 'Rotation started', success: true })
    return true
  } catch (error) {
    console.error('Error in background script:', error)
    sendResponse({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false,
    })
    return true
  }
})

/**
 * @typedef {Object} RawTab
 * @property {string} name
 * @property {string} url
 * @property {string} interval
 */

/**
 * @description Create new tabs based on the tabs array
 * @param {Array<RawTab>} tabs
 * @returns {Promise<Array<{id: number, interval: number}>>}
 */
async function createTabs(tabs) {
  // Array to store the tab ids with the time interval
  const tabIds = []
  const errors = []

  // Check if we have permission to create tabs
  if (!chrome.tabs || typeof chrome.tabs.create !== 'function') {
    throw new Error('Missing tabs permission. Please check extension permissions.')
  }

  // Create new tabs and wait for all to be created
  await Promise.all(
    tabs.map((tab) => {
      return new Promise((resolve) => {
        try {
          chrome.tabs.create({ url: tab.url }, (createdTab) => {
            if (chrome.runtime.lastError) {
              console.error(
                `Failed to create tab for ${tab.name || tab.url}:`,
                chrome.runtime.lastError.message
              )
              errors.push({
                tab: tab.name || tab.url,
                error: chrome.runtime.lastError.message,
              })
              resolve()
              return
            }

            if (createdTab?.id) {
              tabIds.push({ id: createdTab.id, interval: tab.interval })
            } else {
              errors.push({
                tab: tab.name || tab.url,
                error: 'Tab was created but no ID was returned',
              })
            }
            resolve()
          })
        } catch (error) {
          console.error(`Error creating tab for ${tab.name || tab.url}:`, error)
          errors.push({
            tab: tab.name || tab.url,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          resolve()
        }
      })
    })
  )

  // Log errors if any
  if (errors.length > 0) {
    console.warn('Some tabs failed to create:', errors)
  }

  // If no tabs were created successfully, throw an error
  if (tabIds.length === 0) {
    throw new Error(
      `Failed to create any tabs. Errors: ${errors.map((e) => `${e.tab}: ${e.error}`).join(', ')}`
    )
  }

  // Remove other tabs only if we have permission
  try {
    chrome.tabs.query({}, (allTabs) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to query tabs:', chrome.runtime.lastError.message)
        return
      }

      allTabs.forEach((tab) => {
        if (!tabIds.find((tabId) => tabId.id === tab.id)) {
          chrome.tabs.remove(tab.id, () => {
            if (chrome.runtime.lastError) {
              console.warn(`Failed to remove tab ${tab.id}:`, chrome.runtime.lastError.message)
            }
          })
        }
      })
    })
  } catch (error) {
    console.warn('Error removing tabs:', error)
    // Don't throw - we can continue even if we can't remove old tabs
  }

  return tabIds
}

/**
 * @typedef {Object} Tab
 * @property {number} id
 * @property {string} interval
 */

/**
 * @description Rotate between tabs based on the time interval
 * @param {Array<Tab>} tabs
 */
function rotateTabs(tabs) {
  if (!tabs || tabs.length === 0) {
    console.error('Cannot rotate: no tabs provided')
    return
  }

  let currentTab = 0
  let rotationTimeout = null

  const rotate = () => {
    if (stopRotation) {
      stopRotation = false
      if (rotationTimeout) {
        clearTimeout(rotationTimeout)
        rotationTimeout = null
      }
      return
    }

    // Validate current tab index
    if (currentTab < 0 || currentTab >= tabs.length) {
      console.error(`Invalid tab index: ${currentTab}. Resetting to 0.`)
      currentTab = 0
    }

    const tab = tabs[currentTab]
    if (!tab || !tab.id) {
      console.error(`Invalid tab at index ${currentTab}. Skipping.`)
      currentTab = currentTab === tabs.length - 1 ? 0 : currentTab + 1
      rotationTimeout = setTimeout(rotate, tabs[currentTab]?.interval || 5000)
      return
    }

    // Check if we have permission to update tabs
    if (!chrome.tabs || typeof chrome.tabs.update !== 'function') {
      console.error('Missing tabs permission. Stopping rotation.')
      stopRotation = true
      return
    }

    // Update the active tab
    chrome.tabs.update(tab.id, { active: true }, (_updatedTab) => {
      if (chrome.runtime.lastError) {
        console.error(`Failed to activate tab ${tab.id}:`, chrome.runtime.lastError.message)
        // Try to continue with next tab
        currentTab = currentTab === tabs.length - 1 ? 0 : currentTab + 1
        rotationTimeout = setTimeout(rotate, tabs[currentTab]?.interval || 5000)
        return
      }

      // Move to next tab
      currentTab = currentTab === tabs.length - 1 ? 0 : currentTab + 1

      // Schedule next rotation
      const nextInterval = tabs[currentTab]?.interval || 5000
      rotationTimeout = setTimeout(rotate, nextInterval)
    })
  }

  rotate()

  // Return cleanup function
  return () => {
    if (rotationTimeout) {
      clearTimeout(rotationTimeout)
      rotationTimeout = null
    }
    stopRotation = true
  }
}
