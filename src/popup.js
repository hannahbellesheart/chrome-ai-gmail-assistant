document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("modifyButton").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTabId = tabs[0].id;

      // Dynamically inject content script
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTabId },
          files: ["content.js"]
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Injection Error:", chrome.runtime.lastError.message);
          } else {
            // Send the message after injecting the content script
            chrome.tabs.sendMessage(activeTabId, { action: "summarize" }, (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error:", chrome.runtime.lastError.message);
              } else {
                console.log(response.status);
              }
            });
          }
        }
      );
    });
  });

  document.getElementById("replyButton").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTabId = tabs[0].id;

      // Dynamically inject content script
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTabId },
          files: ["content.js"]
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Injection Error:", chrome.runtime.lastError.message);
          } else {
            // Send the message after injecting the content script
            chrome.tabs.sendMessage(activeTabId, { action: "replyFormal" }, (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error:", chrome.runtime.lastError.message);
              } else {
                console.log(response.status);
              }
            });
          }
        }
      );
    });
  });

  document.getElementById("mailButton").addEventListener("click", () => {
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTabId = tabs[0].id;

      // Dynamically inject content script
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTabId },
          files: ["content.js"]
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Injection Error:", chrome.runtime.lastError.message);
          } else {
            // Send the message after injecting the content script
            const emailPrompt = document.getElementById("mailPrompt").value;
            chrome.tabs.sendMessage(activeTabId, { action: "composeFormalMail",  emailPrompt: emailPrompt}, (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error:", chrome.runtime.lastError.message);
              } else {
                console.log(response.status);
              }
            });
          }
        }
      );
    });
  });
});