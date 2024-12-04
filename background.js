chrome.runtime.onInstalled.addListener(() => {
    console.log("AI Content Assistant React Extension Installed");
  });

  chrome.runtime.onInstalled.addListener(() => {
    // Create the context menu item when the extension is installed.
    chrome.contextMenus.create({
      id: "summarizeText", // Unique ID for the menu item
      title: "Summarize the selected content with AI", // Text to display in the context menu
      contexts: ["selection"], // Only show when text is selected
    });
  });
  
  // Listen for the context menu click event
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "summarizeText") {
      // Send the selected text to the content.js script via messaging
      chrome.tabs.sendMessage(tab.id, {
        action: "summarizeText",
        selectedText: info.selectionText
      });
    }
  });
  