function enableSidePanelLauncher() {
  if (!chrome.sidePanel?.setPanelBehavior) {
    return;
  }

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
    console.warn("Unable to enable Airplane Arcade side panel launcher", error);
  });
}

chrome.runtime.onInstalled.addListener(enableSidePanelLauncher);
chrome.runtime.onStartup.addListener(enableSidePanelLauncher);
enableSidePanelLauncher();
