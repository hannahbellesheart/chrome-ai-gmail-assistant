// content.js

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  const options_summary = {
    sharedContext: 'These are mails from gmail with meta data',
    type: 'headline',
    format: 'plain-text',
    length: 'short',
  };
  // const options_prompt = {
  //   systemPrompt: 'You are responsible for sorting Nodelist based on the priority of innerTextcontent of element in an array'
  // };
  const available_summary = (await self.ai.summarizer.capabilities()).available;
  // const available_prompt = (await self.ai.languageModel.capabilities()).available;
  let summarizer, promptAPI;
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

  // chrome.runtime.sendMessage({from:"content",usecase:"promptAPI",mailArray: mailArray });
  // chrome.runtime.onMessage.addListener(function(msg) {
  //   if (msg.from == "background" && msg.usecase == "promptAPI") {
  //     promptAPI = msg.promptAPI
  //   }
  // });
  // if (available_prompt === 'no') {
  //   // The Summarizer API isn't usable.
  //   return;
  // }
  // if (available_prompt === 'readily') {
  //   // The Summarizer API can be used immediately .
  //   promptAPI = await self.ai.languageModel.create(options_prompt);
  // } else {
  //   // The Summarizer API can be used after the model is downloaded.
  //   promptAPI = await self.ai.languageModel.create(options_prompt);
  //   promptAPI.addEventListener('downloadprogress', (e) => {
  //     console.log(e.loaded, e.total);
  //   });
  //   await promptAPI.ready;
  // }

  if (message.action === "summarize") {
    // if ('ai' in self && 'summarizer' in self.ai) {
    //   // The Summarizer API is supported.
    //   console.log("Summarizer Supported");
      
    // }
    chrome.runtime.sendMessage({ type: 'readlocalKeys', key:'emails'},async function(response) {
      console.log(response);
      let emails = response.emails || {};
      document.body.style.backgroundColor = "#f0f8ff";
      const metaInfo = document.querySelectorAll(".xY.a4W .xT");
      // const Info = document.querySelectorAll(".xY.a4W .xT");
      const mailArray = [];
      for (const info of metaInfo) {
        info.style.color = "blue";
        // let tempNode = info;
        let text = info.textContent;
        // console.log(text);
        
        if (text != null) {
          try {
            const emailId = await generateContentHash(text);
              console.log(emailId);
              if (emailId in emails) {
                let summary = emails[emailId].summary;
                await createNewSummaryElement(info.parentElement, emailId, summary);
              } else {
                await requestSummaryFromBackground(info, emailId);
                // chrome.runtime.sendMessage({type:"processEmail", emailId: emailId, emailContent: info.textContent });
              }
          } catch(error) {
            console.log(error);
          }
        }
        // try{
          
        //   chrome.runtime.sendMessage({type:"processEmail",emailContent: info.textContent });
        // } catch(error) {
        //   console.error(error);
        //   // mailArray.push({id: tempNode.id, text: tempNode.textContent});
        //   continue;
        // }
      }
    });


function requestSummaryFromBackground(parent, emailId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {type:"processEmail", emailId: emailId, emailContent: parent.textContent },
      (response) => {
        if (response && response.summary) {
          createNewSummaryElement(parent.parentElement, emailId, response.summary);
        }
        resolve();
      }
    );
  });
}

function createNewSummaryElement(parent, emailId, summary) {
  let childElement = document.getElementById(emailId);
  if (childElement) {
    childElement.innerHTML = summary;
  } else {
    const newElement = document.createElement("div");
    newElement.id = emailId;
    newElement.innerHTML = summary;
    // parent.insertBefore(newElement, parent.firstChild);
    parent.append(newElement);
  }
}


    // document.body.style.backgroundColor = "#f0f8ff";
    // const metaInfo = document.querySelectorAll(".xY.a4W");
    // const mailArray = [];
    // for (const info of metaInfo) {
    //   info.style.color = "blue";
    //   let tempNode = info;
    //   try{
    //     const summary = await summarizer.summarize(info.textContent, {
    //       context: 'This is gmail meta information about each mail. Need summary within 150 characters and only summarise english',
    //     });
    //     tempNode.textContent = summary;
    //     mailArray.push({id: tempNode.id, text: summary});
    //   } catch(error) {
    //     console.error(error);
    //     // mailArray.push({id: tempNode.id, text: tempNode.textContent});
    //     continue;
    //   }
    // }




    // chrome.runtime.sendMessage({from:"content",mailArray: mailArray }); //first, tell the background page that this is the tab that wants to receive the messages.

    // chrome.runtime.onMessage.addListener(function(msg) {
    //   if (msg.from == "background") {
    //     var priority = msg.priority;
    //     console.log(priority);
    //   }
    // });
    
    // console.log("#STARTING PRIORITIZING");
    
    // const prioritizedMails = await promptAPI.prompt(mailArray)
    // console.log(prioritizedMails);
    
    sendResponse({ status: "UI modified!" });
  }
});

// Function to generate a hash of email content (optional: to detect changes more efficiently)
function generateContentHash(content) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))
      .then(buffer => {
          return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      });
}