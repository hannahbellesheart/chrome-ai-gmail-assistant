// content.js

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  const options_summary = {
    sharedContext: 'These are mails from gmail with meta data',
    type: 'headline',
    format: 'plain-text',
    length: 'short',
  };

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

  if (message.action === 'summarize') {
    chrome.runtime.sendMessage(
      { type: 'readlocalKeys', key: 'emails' },
      async function (response) {
        console.log(response);
        let emails = response.emails || {};
        document.body.style.backgroundColor = '#f0f8ff';
        const metaInfo = document.querySelectorAll('.xY.a4W .xT');
        // const Info = document.querySelectorAll(".xY.a4W .xT");
        const mailArray = [];
        for (const info of metaInfo) {
          info.style.color = 'blue';
          // let tempNode = info;
          let text = info.textContent;
          // console.log(text);

          if (text != null) {
            try {
              const emailId = await generateContentHash(text);
              console.log(emailId);
              if (emailId in emails) {
                let summary = emails[emailId].summary;
                await createNewSummaryElement(
                  info.parentElement,
                  emailId,
                  summary
                );
              } else {
                await requestSummaryFromBackground(info, emailId);
                // chrome.runtime.sendMessage({type:"processEmail", emailId: emailId, emailContent: info.textContent });
              }
            } catch (error) {
              console.log(error);
            }
          }
        }
      }
    );
  }

  if (message.action === 'replyFormal') {
    console.log('Reply Triggered');

    return new Promise(async (resolve) => {
      const emailContent = document.querySelector('.ii.gt').textContent;
      const response = await chrome.runtime.sendMessage({
        type: 'replyFormal',
        emailContent: emailContent,
      });

      if (response && response.reply) {
        const replyButton = document.querySelector('.ams.bkH');
        if (replyButton != null) {
          replyButton.addEventListener('click', () => {
            setTimeout(() => {
              const textReplyBox = document.querySelector(
                '.Am.aiL.aO9.Al.editable.LW-avf.tS-tW'
              );
              if (textReplyBox != null) {
                textReplyBox.innerText = response.reply;
              }
            }, 3000);
          });
          replyButton.click();
          console.log(response);
        } else {
          const textReplyBox = document.querySelector(
            '.Am.aiL.aO9.Al.editable.LW-avf.tS-tW'
          );
          if (textReplyBox != null) {
            textReplyBox.innerText = response.reply;
          }
        }
      }
      resolve();
    });
  }

  if (message.action === 'composeFormalMail') {
    console.log('Compose Mail Triggered');

    return new Promise(async (resolve) => {
      const emailPrompt = message.emailPrompt;
      const response = await chrome.runtime.sendMessage({
        type: 'composeFormalMail',
        emailPrompt: emailPrompt,
      });

      if (response) {
        const mailButton = document.querySelector('.T-I.T-I-KE.L3');
        console.log(response);
        
        if (mailButton != null) {
          // mailButton.addEventListener('click', () => {
            
          // });
          
          mailButton.click();
          await wait(3000);
          const textMailBox = document.querySelector(
            '.Am.aiL.Al.editable.LW-avf.tS-tW'
          );
          const subjectBox = document.querySelector(
            '.aoT'
          );
          console.log(textMailBox, subjectBox);

          if (subjectBox != null) {
            subjectBox.value = response.subject;
          }

          if (textMailBox != null) {
            textMailBox.innerText = response.mail;
          }
        } else {
          const textMailBox = document.querySelector(
            '.Am.aiL.Al.editable.LW-avf.tS-tW'
          );
          const subjectBox = document.querySelector(
            '.aoT'
          );
          if (textMailBox != null) {
            textMailBox.value = response.mail;
          }
          if (subjectBox != null) {
            subjectBox.value = response.subject;
          }

        }
      }
      resolve();
    });
  }
});

// Function to generate a hash of email content (optional: to detect changes more efficiently)
function generateContentHash(content) {
  return crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(content))
    .then((buffer) => {
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    });
}

function requestSummaryFromBackground(parent, emailId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'processEmail',
        emailId: emailId,
        emailContent: parent.textContent,
      },
      (response) => {
        if (response && response.summary) {
          createNewSummaryElement(
            parent.parentElement,
            emailId,
            response.summary
          );
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
    const newElement = document.createElement('div');
    newElement.id = emailId;
    newElement.innerHTML = summary;
    parent.append(newElement);
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms); // Resolve the promise after ms milliseconds
  });
}