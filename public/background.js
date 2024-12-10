/**
 *  @description This variable is used to stop the rotation of the tabs
 *  @type {boolean}
 */
let stopRotation = false

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(async (message, _, sendResponse) => {
  if (!message.status) {
    stopRotation = true
    sendResponse({ status: 'Rotation stopped' })
    return
  }

  const tabs = await createTabs(message.tabs)
  rotateTabs(tabs)
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
 */
async function createTabs(tabs) {
  // Array to store the tab ids with the time interval
  const tabIds = []

  // Create new tabs and wait for all to be created
  await Promise.all(
    tabs.map((tab) => {
      return new Promise((resolve) => {
        chrome.tabs.create({ url: tab.url }, (createdTab) => {
          tabIds.push({ id: createdTab.id, interval: tab.interval })
          resolve()
        })
      })
    })
  )

  //Remove other tabs
  chrome.tabs.query({}, (allTabs) => {
    allTabs.forEach((tab) => {
      if (!tabIds.find((tabId) => tabId.id === tab.id)) {
        chrome.tabs.remove(tab.id)
      }
    })
  })

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
  let currentTab = 0

  const rotate = () => {
    if (stopRotation) {
      stopRotation = false
      return
    }

    chrome.tabs.update(tabs[currentTab].id, { active: true })
    currentTab = currentTab === tabs.length - 1 ? 0 : currentTab + 1

    setTimeout(rotate, tabs[currentTab].interval)
  }

  rotate()
}
