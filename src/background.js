// background.js
let summarizer, promptAPI;
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension Installed");

  // Summary
  const options_summary = {
    sharedContext: 'These are mails from gmail with meta data',
    type: 'headline',
    format: 'plain-text',
    length: 'short',
  };
  const available_summary = (await self.ai.summarizer.capabilities()).available;


  if (available_summary === 'no') {
    // The Summarizer API isn't usable.
    return;
  }
  if (available_summary === 'readily') {
    // The Summarizer API can be used immediately .
    summarizer = await self.ai.summarizer.create(options_summary);
  } else {
    // The Summarizer API can be used after the model is downloaded.
    summarizer = await self.ai.summarizer.create(options_summary);
    summarizer.addEventListener('downloadprogress', (e) => {
      console.log(e.loaded, e.total);
    });
    await summarizer.ready;
  }

  

  // Prompt
  const options_prompt = {
    systemPrompt:    ``
    // `You are a mail priority checker. If a mail has priority or urgency you need to tell if its important. You can respond only with true if its important or else false`
    // `Here is a list of text data with their IDs in JSON Format. Sort these text based on [urgency, importance] (e.g., relevance, sentiment, date mentioned, etc.) and return the sorted result, preserving their IDs. Only filter the english.

    // Input:
    // [
    //   {"id": "1", "text": "Email content 1"},
    //   {"id": "2", "text": "Email content 2"},
    //   {"id": "3", "text": "Email content 3"}
    // ]
    
    // Output:
    // Please return the sorted result as a list of IDs in order, like this:
    // [ "2", "1", "3" ]`
    // `Only reply true or not. True if the textcontent of the mail is important. False if its not`
  };


  const available_prompt = (await chrome.aiOriginTrial.languageModel.capabilities()).available;
  if (available_prompt === 'no') {
    // The Summarizer API isn't usable.
    return;
  }
  if (available_prompt === 'readily') {
    // The Summarizer API can be used immediately .
    promptAPI = await chrome.aiOriginTrial.languageModel.create(options_prompt);
  } else {
    // The Summarizer API can be used after the model is downloaded.
    promptAPI = await chrome.aiOriginTrial.languageModel.create(options_prompt);
    promptAPI.addEventListener('downloadprogress', (e) => {
      console.log(e.loaded, e.total);
    });
    await promptAPI.ready;
  }
});



// chrome.runtime.onMessage.addListener(function(msg,sender) {
//   if (msg.from == "content" && msg.usecase == "promptAPI") {  //get content scripts tab id
//     contentTabId = sender.tab.id;
//     //Return the prompt to content.js
//     chrome.tabs.sendMessage(contentTabId, {  //send it to content script
//       from: "background",
//       promptAPI: promptAPI,
//       usecase: "promptAPI"
//     });
//   }
//   if (msg.from == "content") {  //get content scripts tab id
//     contentTabId = sender.tab.id;
//     console.log(msg.mailArray);
    
//       //Execute the prompt and input]
//       // for (const mail of msg.mailArray) {
//       //   try{
//       //     const promptMsg =  `here is the mail - ${mail.text}`;
//       //     const isPriority= await promptAPI.prompt(promptMsg);
//       //     console.log(isPriority);
//       //   } catch(error) {
//       //     console.log(error);
//       //     continue;
//       //   }
//       // }
    

//     // `
//     //   Sort the following these by importance and urgency and return the sorted mails.
      
//     //   Input:
//     //   ${JSON.stringify(msg.mailArray)}
      
//     //   Output:
//     //   `
//     // `This is the mail content: ${msg.mail}`
   
//     // console.log(promptMsg);
      
//     // const prioritizedIDs= await promptAPI.prompt(promptMsg);
//     // console.log(prioritizedIDs);
    
//     // //Return the prompt to content.js
//     // chrome.tabs.sendMessage(contentTabId, {  //send it to content script
//     //   from: "background",
//     //   priority: prioritizedIDs,
//     // });
//   }

//   // if (msg.from == "popup" && contentTabId) {  //got message from popup
//   //   chrome.tabs.sendMessage(contentTabId, {  //send it to content script
//   //     from: "background",
//   //     first: msg.first,
//   //     second: msg.second
//   //   });
//   // }
// });

// Function to generate a hash of email content (optional: to detect changes more efficiently)
function generateContentHash(content) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))
      .then(buffer => {
          return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      });
}

// Function to summarize email content
async function summarizeEmail(content) {
  // Placeholder summarization logic. Replace with your real summarization logic.
  try {
    const summary = await summarizer.summarize(content, {
      context: 'This is gmail meta information about each mail. Need summary within 150 characters and only summarise english',
    }); 
    console.log(summary);
    
    return summary;
  } catch (error) {
    console.log(error);
    return 'Error summarizing this mail';
  }
}

// Function to store or update email summary in chrome.storage
async function storeEmailSummary(emailId, content, summary) {
  const result = await chrome.storage.local.get(['emails'])
  let emails = result.emails || {};

  // Store or update the summary for the given emailId
  emails[emailId] = {
      summary: summary,
      content: content
  };

  // Save the updated email object back to storage
  chrome.storage.local.set({ emails: emails });
}

// Function to check if email content has changed and update the summary if necessary
async function processEmail(emailId, emailContent) {
  const result = await chrome.storage.local.get(['emails']);
    let summary;
    let emails = result.emails || {};

    if (emails[emailId]) {
        // Email already exists, check if the content has changed
        const oldContent = emails[emailId].content;
        if (oldContent !== emailContent) {
            // Content has changed, update the summary
            const newSummary = await summarizeEmail(emailContent)
            console.log("Summary updated.");
            await storeEmailSummary(emailId, emailContent, newSummary);
            summary = newSummary;
            
        } else {
            console.log("No change in email content.");
            summary = emails[emailId].summary;

        }
    } else {
        // New email, summarize and store
        const newSummary = await summarizeEmail(emailContent);
        console.log("New email summarized and stored.");
        await storeEmailSummary(emailId, emailContent, newSummary);
        summary = newSummary;
    }
    return summary
}

// Listen for messages to process new or updated emails
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "processEmail") {
    (async function () {
      try {
        const summary = await processEmail(message.emailId, message.emailContent); 
        sendResponse({summary: summary});
      } catch (error) {
        console.error('Error in processEmail operation:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
      return true;
  }
});

// Listen for messages to process new or updated emails
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "readlocalKeys") {
    chrome.storage.local.get([message.key], function(result) {
      sendResponse({ emails: result[message.key] });
    });
    return true;
  }
});
