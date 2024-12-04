// background.js
let summarizer, replyAPI;
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
  const options_reply = {
    systemPrompt: `You are a bot which helps with mails.`
  };


  const available_reply = (await chrome.aiOriginTrial.languageModel.capabilities()).available;
  if (available_reply === 'no') {
    // The Reply Formal API isn't usable.
    return;
  }
  if (available_reply === 'readily') {
    // The Reply Formal API can be used immediately .
    replyAPI = await chrome.aiOriginTrial.languageModel.create(options_reply);
  } else {
    // The Reply Formal API can be used after the model is downloaded.
    replyAPI = await chrome.aiOriginTrial.languageModel.create(options_reply);
    replyAPIFormal.addEventListener('downloadprogress', (e) => {
      console.log(e.loaded, e.total);
    });
    await replyAPI.ready;
  }
});


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

function replyBackFormal() {
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
  if (message.type === "readlocalKeys") {
    chrome.storage.local.get([message.key], function(result) {
      sendResponse({ emails: result[message.key] });
    });
    return true;
  }
  if (message.type === "replyFormal") {
    (async function () {
      try {
        const response = await replyAPI.prompt(`Reply formally to this mail with just reply content and there should not be subject in the content : ${message.emailContent}`);
        console.log(response);
        sendResponse({reply : response});
      } catch (error) {
        console.error('Error in reply back operation:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  if (message.type === "composeFormalMail") {
    (async function () {
      try {
        console.log(message.emailPrompt);
        
        const mail = await replyAPI.prompt(`Generate the formal mail for this content with just reply content and there should not be subject in the content: ${message.emailPrompt}`);
        const subject = await replyAPI.prompt(`Understand the following mail ${mail}. You should only generate subject with no extra content`);
        console.log(subject, mail);
        sendResponse({mail : mail, subject: subject});
      } catch (error) {
        console.error('Error in reply back operation:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});
