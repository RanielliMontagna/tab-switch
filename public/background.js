// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  console.log('Mensagem recebida:', message)

  if (message.status && message.tabs) {
    console.log('Status recebido:', message.status)
    console.log('Tabs recebidas:', message.tabs)
    rotateTabs(message.tabs)
  }

  sendResponse({ status: 'OK' })
})

/**
 * @typedef {Object} Tab
 * @property {string} name
 * @property {string} url
 * @property {string} interval
 */

/**
 *
 * @param {Array} tabs
 */
async function rotateTabs(tabs) {
  // Array to store the tab ids
  const tabIds = []

  // Create new tabs
  tabs.forEach((tab) => {
    chrome.tabs.create({ url: tab.url }, (tab) => {
      console.log('Tab created:', tab.id)
      tabIds.push(tab.id)
    })
  })

  //Remove other tabs
  chrome.tabs.query({}, (allTabs) => {
    allTabs.forEach((tab) => {
      if (!tabIds.includes(tab.id)) {
        chrome.tabs.remove(tab.id)
      }
    })
  })

  //TODO: implement rotate tabs
}
