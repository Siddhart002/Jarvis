import { Readability } from '@mozilla/readability';
import { marked } from 'marked';
import { fetchTranscript, parseVideoIdFromCurrentURL } from './youtube';
import { maxLength, chatbotGraph } from './constants.js';

// Define the max length for truncation

  let currentWorkflow = "start";  // Initial state
  let completeChatHistoryMap = new Map();
  let userChatHistory = new Map();
  let userChatProcessed = [];
  let stepToBeCalledOnSendButton = 'start';
  let stepToBeCalledOnSendButtonIsAI = false;
  let currentAIModel = '';
  let recognition = null; 
  let isListening = false;
  let promptAISession = null;
  let chatId = 1;
  let lastUserInputChatId;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "summarizeText") {
      const selectedText = message.selectedText;
      summarizeContent(selectedText); // Call summarize function (if any)
    }
  });
  
  // Function to summarize the selected content
  function summarizeContent(selectedText) {
    try {
      const chatbotWindow = document.getElementById('chat-container');
      if(chatbotWindow.style.display !=='flex'){
        chatbotWindow.style.display = 'flex';
      };
      if(currentWorkflow !== 'summarizeContentBackgroundOption'){
        currentWorkflow = 'summarizeContentBackgroundOption';
        renderWorkflow('summarizeContentBackgroundOption');
      }
      let currentUserInput = '';
      const textArea = document.getElementById('user-input-text-area');
        // Get the value from the textarea
        const inputValue = textArea.value;
        if(!inputValue || !inputValue?.trim()){
          currentUserInput = '';
        } 
        else {
          currentUserInput = inputValue;
        }
        textArea.value = currentUserInput.concat(selectedText);

    } catch (error) {
      renderErrorMessage(error?.message || 'Something went wrong, try again later');
    }
  }

  function renderChatMessage(message, isUserMessage = false, renderMessageAsHtml = false, context = '') {
    const messageDiv = document.createElement('div');
    const messagePTag = document.createElement('p');
    messageDiv.classList.add("message");

    completeChatHistoryMap.set(chatId, { 'role': isUserMessage ? 'user' : 'assistant', 'content': message, 'contextOfContent': context });
    if(isUserMessage){
      userChatHistory.set(chatId, { 'role': isUserMessage ? 'user' : 'assistant', 'content': message, 'contextOfContent': context });
      lastUserInputChatId = chatId;
    }

    // Add appropriate classes for user or bot messages
    if (isUserMessage) {
        messageDiv.classList.add('user-message');
    } else {
        messageDiv.classList.add('bot-message');
    }

    // Set message content based on whether it's HTML or plain text
    if (renderMessageAsHtml) {
        messagePTag.innerHTML = message;
    } else {
        messagePTag.textContent = message;
    }
    // Store the full content in the data attribute for later use
    messagePTag.setAttribute('data-chat-id', chatId);
    messagePTag.setAttribute('data-full-text', message);
    messagePTag.setAttribute('data-render-html', renderMessageAsHtml);

    // Check if the message exceeds max length and truncate if necessary
    if (message.length > maxLength) {
        const truncatedText = message.slice(0, maxLength);
        if (renderMessageAsHtml) {
          messagePTag.innerHTML = truncatedText;
        } else {
            messagePTag.textContent = truncatedText;
        }
        
        // Create the "Show More" link
        const showMoreSpan = document.createElement('span');
        showMoreSpan.classList.add('show-more');
        showMoreSpan.textContent = 'Show More';
        messagePTag.appendChild(showMoreSpan);
        // Add event listener to toggle between Show More and Show Less
        showMoreSpan.addEventListener('click', function () {
            const fullText = messagePTag.getAttribute('data-full-text');
            const renderMessageAsHtmlDataAttribute = messagePTag.getAttribute('data-render-html');
            if (messagePTag.classList.contains('expanded')) {
                // Collapse the message back to truncated form
                if(renderMessageAsHtmlDataAttribute === 'true'){
                  messagePTag.innerHTML = fullText.slice(0, maxLength);
                } else {
                  messagePTag.textContent = fullText.slice(0, maxLength);
                }
                showMoreSpan.textContent = 'Show More';
                messagePTag.classList.remove('expanded');
            } else {
                // Expand the message to show full content
                if(renderMessageAsHtmlDataAttribute === 'true'){
                  messagePTag.innerHTML = fullText;
                } else {
                  messagePTag.textContent = fullText;
                }
                showMoreSpan.textContent = 'Show Less';
                messagePTag.classList.add('expanded');
            }
        });
    } 
    messageDiv.append(messagePTag);

    // Append the message div to the chat area
    const chatArea = document.getElementById('chat-area');
    chatArea.appendChild(messageDiv);

    // Scroll to the latest message
    chatArea.scrollTop = chatArea.scrollHeight;
    chatId++;
}

    // Render a error chat message
    function renderErrorMessage(message, renderRetryCta = true, retryCount = 3) {
      const messageDiv = document.createElement('div');
      const messagePTag = document.createElement('p');
      messageDiv.classList.add("message");
      messageDiv.classList.add('error-message');
      messagePTag.textContent = message;
      messageDiv.append(messagePTag);
      const chatArea = document.getElementById('chat-area');
      chatArea.appendChild(messageDiv);
      if(renderRetryCta){
        renderOptions([{ text: "Retry", next:currentAIModel, type: "button", id: "error-in-ai", visibility: true, stepToBeCalledOnNextIsAI: true, isRetry: true, retryCount: retryCount }])
      }
  
      // Scroll to the latest message
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    // Render options buttons
    function renderOptions(options) {
        const chatActionItems = document.createElement('div');
        chatActionItems.classList.add("action-buttons-chat-area");
        options.forEach(option => {
            if(option?.visibility){
              if (option.type === 'button') {
                  const optionButton = document.createElement('button');
                  optionButton.classList.add('option');
                  optionButton.textContent = option.text;
                  optionButton.classList.add('pill-button');
                  optionButton.id = option.id;
                  optionButton.onclick = () => handleOptionClick(option.next, option.stepToBeCalledOnNextIsAI, { ...option });
                  chatActionItems.append(optionButton);
              } else if (option.type === 'input') {
                  const inputField = document.createElement('input');
                  inputField.type = 'text';
                  inputField.placeholder = option.text;
                  inputField.onkeydown = (e) => {
                      if (e.key === 'Enter') {
                          handleOptionClick(option.next, inputField.value);
                      }
                  };
                  chatActionItems.appendChild(inputField);
              } else if (option.type === 'text') {
                  const spanField = document.createElement('span');
                  spanField.textContent = option.text;
                  spanField.classList.add("chat-action-text");
                  chatActionItems.append(spanField);
              }
            }
        });
        if(options.length > 0){
            const chatArea = document.getElementById('chat-area');
            chatArea.append(chatActionItems);
        }
    }

    // Handle the user's option click (navigate to the next step)
  function handleOptionClick(nextWorkflow, stepToBeCalledOnNextIsAI = false, optionData) {
    // Render next workflow message
    if(!stepToBeCalledOnNextIsAI) {
      currentWorkflow = nextWorkflow;
      renderWorkflow(currentWorkflow);
    } else {
      if(optionData?.isRetry){
        triggerAIModel(nextWorkflow, '', true, optionData?.retryCount -1);
      } else {
        triggerAIModel(nextWorkflow);
      }
    }
  }

  // Render the current workflow (message and options)
  function renderWorkflow(workflowKey) {
    const workflow = chatbotGraph[workflowKey];
    renderChatMessage(workflow.message, false, false);

    if (workflow.options.length > 0) {
      renderOptions(workflow.options);
    }
    if(workflow?.stepToBeCalledOnSend){
      stepToBeCalledOnSendButton = workflow?.stepToBeCalledOnSend;
      stepToBeCalledOnSendButtonIsAI = workflow?.stepToBeCalledOnSendIsAI || false;
    } else {
      stepToBeCalledOnSendButton = 'start';
      stepToBeCalledOnSendButtonIsAI = false;
    }
  }

  function showFadeScreen() {
    const overlay = document.getElementById('fade-overlay');
    overlay.classList.add('visible');
  }
  
  // Function to hide the fade screen
  function hideFadeScreen() {
    const overlay = document.getElementById('fade-overlay');
    overlay.classList.remove('visible');
  }

  // Function to adjust the textarea height based on input
  function adjustTextareaHeight() {
      // Reset the height to auto first to shrink when needed
      const textarea = document.getElementById('user-input-text-area');
      textarea.style.height = 'auto';
      // Set the height based on the scrollHeight
      textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function resetGlobalVariables() {
    currentWorkflow = "start";  // Initial state
    completeChatHistoryMap = new Map();
    userChatHistory = new Map();
    userChatProcessed = [];
    stepToBeCalledOnSendButton = 'start';
    stepToBeCalledOnSendButtonIsAI = false;
    currentAIModel = '';
    recognition = null; 
    isListening = false;
    promptAISession = null;
    chatId = 1;
    lastUserInputChatId = undefined;
  }

  function resetUI(){
    const chatArea = document.getElementById("chat-area");
    if(chatArea){
      chatArea.innerHTML = '';
      renderWorkflow('start');
    }
  }

  function resetChatbot() {
    resetGlobalVariables();
    resetUI();
  }

  async function summarizeAI(contentToBeSummarized = '', contextOfTheContentToBeSummarized = '', customOptions = null) {
    if(!contentToBeSummarized) {
      renderErrorMessage('No Content Found', false);
      return;
    }
    const available = (await self.ai.summarizer.capabilities()).available;
    let summarizer;
    if (available === 'no') {
      renderErrorMessage('The AI system is not available');
      console.log('The AI system is not available');
      // The Summarizer API isn't usable.
      return;
    }
    else if (available === 'readily') {
      // The Summarizer API can be used immediately .
      const options = {
        sharedContext: 'Please provide a concise summary of the text or webpage, highlighting the key points, main ideas, and most relevant information. Exclude any non-text elements such as code snippets, flow diagrams, images, videos, or other multimedia content. Focus on extracting and presenting the essential details, while omitting redundant or irrelevant information. The summary should be clear, easy to understand, and capture the core message of the content without unnecessary elaboration.',
        type: 'key-points',
        length: 'medium',
        format: 'markdown'
      };
      summarizer = await self.ai.summarizer.create(customOptions ? { ...customOptions } : options);
      console.log('The AI system is available and ready to be used');
    }
    try {
      // The maximum chunk size (4000 characters) for the article text
      const chunkSize = 11000;
      let currentIndex = 0;
      let summary = ''; // This will store the final summary
      let previousSummary = ''; // This will store the context from the previous summary
  
      // Process the article in chunks of 11000 characters
      while (currentIndex < contentToBeSummarized.length) {
          const chunk = contentToBeSummarized.slice(currentIndex, currentIndex + chunkSize);
          currentIndex += chunkSize; // Move the pointer forward for the next chunk
  
          try {
              const stream = await summarizer.summarizeStreaming(chunk, {
                  context: summary + ' ' + contextOfTheContentToBeSummarized, // Add previous context here
              });
  
              let chunkSummary = '';
              let previousLength = 0;
              for await (const segment of stream) {
                  const newContent = segment.slice(previousLength);
                  previousLength = segment.length;
                  chunkSummary += newContent; // Append the summary of the current chunk
              }
  
              // Append the current chunk's summary to the final summary
              summary += chunkSummary;
              // Render the partial summary (for each iteration)
              renderModelOutput(chunkSummary);
              // Set the current summary as context for the next iteration
              previousSummary = chunkSummary;
  
          } catch (error) {
              throw error;
          }
      }
      return summary;
    } catch (error) {
      console.log('error ', error);
        throw error
    }
  }

  // async function writeAI() {

  // }

  function makeBulletPoints(content) {
    // Replace newline characters with <br> to ensure proper line breaks in HTML
    // content = content.replace(/\n/g, '<br>');
  
    // This regex matches a number followed by a period, optionally followed by a space, then captures the content after it (the actual point).
    const regex = /(\d+\.\s?)(.*?)(?=\d+\.\s?|$)/g;
  
    // Replace each match with a <li> element
    let modifiedContent = content.replace(regex, function(match, number, content) {
      return `<li class="list-item">${content}</li>`;  // Wrap both the number and content inside the <li> tag
    });
  
    return modifiedContent;
  }       

// Function to render the summary with Markdown
function renderModelOutput(content) {
  const processedContent = makeBulletPoints(content);
  const processedMarkedContent = marked(processedContent);
  renderChatMessage(processedMarkedContent,false,true);
}

function extractContentFromWebPage() {
  const doc = document.cloneNode(true);;
  const reader = new Readability(doc, {
    ignore: ['.chat-container', '.chatbot-icon']  // Ignore elements with this class
});
  const article = reader.parse();
  return { ...article };
}
  async function summarizeAIWrapper(content = '', context = '', customOptions = null, retryCount) {
    try {
      await summarizeAI(content, context, { ...customOptions });
      renderChatMessage('Hope I was able to help You');
      stepToBeCalledOnSendButton = 'generatePromptAI';
      stepToBeCalledOnSendButtonIsAI = true;
    } catch (error) {
      renderErrorMessage(error?.message || 'Error occured', true, retryCount);
    }
  }

  // Function to get the last 5 messages
  function getLastFiveMessages(chatHistoryMap) {
    // Convert the Map to an array of its values (messages)
    const messages = Array.from(chatHistoryMap.values());

    // Get the last 5 messages (slice the last 4 entries from the array)
    const lastFiveMessages = messages.slice(-4);

    return lastFiveMessages;
  }

  async function runPrompt(prompt, params = null, retryCount) {
    if(!prompt) {
      renderErrorMessage('No prompt Found', false);
      return;
    }
    try {
      if(!promptAISession){
        const available = (await window.ai.languageModel.capabilities()).available;
        if (available === 'no') {
          // The languageModel API isn't usable.
          return;
        }
        else if (available === 'readily') {
          // The languageModel API can be used immediately .
          const lastFiveMessages = getLastFiveMessages(completeChatHistoryMap);
          lastFiveMessages.unshift({
            "role": "system",
            "content": "You are an AI model designed to assist with various tasks, including summarizing data, answering questions, summarizing video transcripts, and analyzing product reviews.\n\n1. **Summarizing Data:**\n- Condense large texts, articles, or reports into key points while maintaining context and relevance.\n\n2. **Answering Questions:**\n- Provide direct answers based on provided data, documents, or context. Request additional info if necessary.\n\n3. **Summarizing Video Transcripts:**\n- Extract and summarize key details from video transcripts, highlighting main points, quotes, and conclusions.\n\n4. **Product Review Analysis:**\n- Analyze product reviews or comments to identify common sentiments, strengths, and weaknesses.\n- Provide a summary of customer feedback, including key insights or recurring issues, and offer recommendations if needed.\n\n5. **General Instructions:**\n- Ensure clarity and precision in responses, offering the most relevant information first.\n- Tailor responses based on context and focus on the user's needs, whether summarizing, answering questions, or analyzing feedback."
          });
          promptAISession = await window.ai.languageModel.create({
            initialPrompts: lastFiveMessages,
          });
          const promptOutput = await promptAISession?.prompt(prompt);
          renderModelOutput(promptOutput);
        }
      } else {
        const promptOutput = await promptAISession?.prompt(prompt);
        renderModelOutput(promptOutput);
      }
    } catch (error) {
      renderErrorMessage(error?.message || 'Error Occured', true, retryCount);
    }
  }

  async function triggerAIModel(modelKey, userInputValue = '', isRetry = false, retryCount = 3) {
    currentAIModel = modelKey;
    if(retryCount <=0){
      renderErrorMessage('Something went wrong, please try again later', false);
      return;
    }
    switch (modelKey) {
      case 'generatePromptAI':
        try {
          showFadeScreen();
          await runPrompt(userInputValue, null, retryCount);
        } catch (error) {
          renderErrorMessage(error?.message || 'Error occured', true, retryCount-1);
        } finally {
          hideFadeScreen();
        }
        break;
      case 'summarizeAIContentCurrentPage':
        try {
          const article = extractContentFromWebPage();
          if(!isRetry) {
            renderChatMessage(article.textContent, true, false, article.title);
          }
          showFadeScreen();
          await summarizeAIWrapper(article.textContent, article.title);
        } catch (error) {
          renderErrorMessage(error?.message || 'Error occured', true, retryCount-1);
        } finally {
          hideFadeScreen();
        }
        break;
      case 'summarizeYTAIContent':
        try {
          showFadeScreen();
          const videoId = parseVideoIdFromCurrentURL();
          const transcriptOptions = await  fetchTranscript(videoId);
          const languageContext = `Transcripts Language is ${transcriptOptions?.language}`;
          if(!isRetry) {
            renderChatMessage(transcriptOptions?.transcript, true, false, languageContext);
          }
          const options = {
            sharedContext: `${languageContext} Summarize the following transcript in a concise, coherent, and comprehensive manner. Ensure the summary captures the key ideas, critical details, and any action items, including important names, dates, events, and relationships between concepts. Emphasize the context behind significant points, while avoiding unnecessary details or repetition. Structure the summary to be both easy to read and informative, ensuring that it provides a clear overview without losing the essence of the original conversation. Additionally, make sure to include any conclusions, decisions, or implications that were discussed.Please also pay attention to the language of the transcript. If the transcript contains informal or complex language, adjust the summary to match the tone and clarity of the original. If technical or specialized terminology is used, ensure it is properly explained in a way that is accessible without losing accuracy. The summary should be tailored to the language style and complexity of the transcript.`,
            type: 'key-points',
            length: 'long',
            format: 'markdown'
          };
          await summarizeAIWrapper(transcriptOptions?.transcript, languageContext, { ...options });
        } catch (error) {
          renderErrorMessage(error?.message || 'Error occured', true, retryCount-1);
        } finally {
          hideFadeScreen();
        }
        break;
      case 'summarizeAIContent':
        try {
          showFadeScreen();
          const options = {
            sharedContext: `You are an AI model designed to assist with evaluating and summarizing product descriptions, reviews, ratings, and customer comments. Your task is to extract useful information to help users make informed decisions based on the product feedback.\n\n1. **Product Description Summary:**\n- Provide a concise summary of the product description, highlighting key features, benefits, and specifications.\n- Focus on explaining what the product does, who it's for, and its unique selling points.\n\n2. **Review and Rating Analysis:**\n- Analyze product reviews and ratings to identify the overall sentiment (positive or negative).\n- Summarize the main advantages and disadvantages mentioned by users in their reviews.\n- Highlight any recurring issues or commonly praised features from the reviews.\n\n3. **Comments and Sentiment Summary:**\n- Extract insights from user comments to gauge the product’s reception.\n- Summarize the sentiment (positive, neutral, negative) of the comments, focusing on trends and major feedback points.\n- If there are any specific features or aspects that users repeatedly comment on (such as durability, usability, etc.), highlight them.\n\n4. **Key Insights:**\n- Provide a brief overview of the product’s reception from customers, covering both strengths and weaknesses.\n- Offer actionable insights or suggestions based on the feedback to help users with their purchasing decisions.\n\n5. **General Instructions:**\n- Ensure clarity and precision in responses. Be concise but thorough.\n- If necessary, provide recommendations or flag any important issues identified in the product reviews or descriptions.\n- Focus on summarizing and analyzing the data to help users make an informed decision, without overwhelming them with excessive details.`,
            type: 'key-points',
            length: 'medium',
            format: 'markdown'
          };
          await summarizeAIWrapper(userInputValue, '', { ...options });
        } catch (error) {
          renderErrorMessage(error?.message || 'Error occured', true, retryCount-1);
        } finally {
          hideFadeScreen();
        }
        break;
      // case 'contentWriteAI':
      //   console.log('modelKey ', modelKey);
      //   break;
      case 'shopWithAI':
        try {
          const article = extractContentFromWebPage();
          if(!isRetry) {
            renderChatMessage(article.textContent, true, false, article.title);
          }
          showFadeScreen();
          const options = {
            sharedContext: `You are an AI model designed to assist with evaluating and summarizing product descriptions, reviews, ratings, and customer comments. Your task is to extract useful information to help users make informed decisions based on the product feedback.\n\n1. **Product Description Summary:**\n- Provide a concise summary of the product description, highlighting key features, benefits, and specifications.\n- Focus on explaining what the product does, who it's for, and its unique selling points.\n\n2. **Review and Rating Analysis:**\n- Analyze product reviews and ratings to identify the overall sentiment (positive or negative).\n- Summarize the main advantages and disadvantages mentioned by users in their reviews.\n- Highlight any recurring issues or commonly praised features from the reviews.\n\n3. **Comments and Sentiment Summary:**\n- Extract insights from user comments to gauge the product’s reception.\n- Summarize the sentiment (positive, neutral, negative) of the comments, focusing on trends and major feedback points.\n- If there are any specific features or aspects that users repeatedly comment on (such as durability, usability, etc.), highlight them.\n\n4. **Key Insights:**\n- Provide a brief overview of the product’s reception from customers, covering both strengths and weaknesses.\n- Offer actionable insights or suggestions based on the feedback to help users with their purchasing decisions.\n\n5. **General Instructions:**\n- Ensure clarity and precision in responses. Be concise but thorough.\n- If necessary, provide recommendations or flag any important issues identified in the product reviews or descriptions.\n- Focus on summarizing and analyzing the data to help users make an informed decision, without overwhelming them with excessive details.`,
            type: 'key-points',
            length: 'medium',
            format: 'markdown'
          };
          await summarizeAIWrapper(article.textContent, article.title, { ...options }, retryCount);
        } catch (error) {
          renderErrorMessage(error?.message || 'Error occured', true, retryCount-1);
        } finally {
          hideFadeScreen();
        }
        break;
      default:
        renderErrorMessage('Something went wrong, please try again later', false);
        break;
    }
    // After successfully running the model change the values to prompt so that user can chat with AI
    // renderChatMessage(modelKey);
  }

(function () {
    // Create and inject the chatbot UI into the page
    const chatbotContainer = document.createElement('div');
    chatbotContainer.id = 'floating-chatbot';
    document.body.appendChild(chatbotContainer);
    // const sendIconURL = chrome.runtime.getURL('images/sendMessageIcon32.png');
    // const micIconURL = chrome.runtime.getURL('images/voiceIcon32.png');
    // Chatbot UI structure
    chatbotContainer.innerHTML = `
      <div id="chatbot-icon">
        <span>Jarvis</span>
      </div>
        <div id="chat-container">
            <div id="fade-overlay" class="hidden">
                <!-- Optional: Spinner while the fade screen is active -->
                <div class="loading-spinner"></div>
            </div>
            <!-- Header (Jarvis Name & Action Buttons) -->
            <div id="chat-header">
                <span>Jarvis</span>
                <div id="chat-actions">
                    <button id="minimize-btn" title="Minimize">&#x2193</button>
                    <button id="maximize-btn" title="Maximize">&#x2922;</button>
                    <button id="close-btn" title="Close">&#x274C;</button>
                    <button id="reset-btn" title="Reset">&#x21bb;</button> <!-- Reset Button -->
                </div>
            </div>
            
            <!-- Chat Messages Area -->
            <div id="chat-area">
              <!-- Fade Screen Overlay inside the chatbot container -->
            </div>

           <!-- Input and Send Button Area -->
          <div id="input-area">
              <div id="input-container">
                  <span id="mic-icon" title="Speak" class="icon">&#x1F3A4;</span>
                  <textarea id="user-input-text-area" placeholder="Type your text here..." rows="1"></textarea>
                  <button id="user-input" title="Send Message" class="icon">&#x2709;</button>
              </div>
          </div>
        </div>`;
  

    // Show chatbot window when icon is clicked
    const chatbotIcon = document.getElementById('chatbot-icon');
    const chatbotWindow = document.getElementById('chat-container');
    const minimizeChatbotWindow = document.getElementById('minimize-btn');
    const closeChatbotWindow = document.getElementById('close-btn');
    const maximizeChatbotWindow = document.getElementById('maximize-btn');
    const resetChatbotWindow = document.getElementById('reset-btn');
    const userInput = document.getElementById("user-input");
      // Get the textarea element and send button
    const textarea = document.getElementById('user-input-text-area');
    const micIcon = document.getElementById('mic-icon');
    // Event listener to resize the textarea on input
    textarea.addEventListener('input', adjustTextareaHeight);
    resetChatbotWindow.addEventListener('click', resetChatbot);
   // Mic Icon event listener for toggling recognition
    micIcon.addEventListener('click', function() {
      if (isListening) {
          // Stop recognition
          if (recognition) {
              recognition.stop();
              playPeepSound();
          }
          micIcon.style.backgroundColor  = 'red'; // Change mic color to red when stopped
          isListening = false; // Update the listening state
      } else {
          // Start recognition
          recognition = initializeSpeechRecognition();
          recognition.start(); // Start recording
          micIcon.style.backgroundColor  = 'green'; // Change mic color to green when recording
          playPeepSound();
          isListening = true; // Update the listening state
      }
    });
      
    chatbotIcon.addEventListener('click', function () {
      // Only open window on click
      chatbotWindow.style.display = 'flex';
      return;
    });

    minimizeChatbotWindow.addEventListener('click', function () {
        chatbotWindow.style.display = 'none';
        return;
    });

    closeChatbotWindow.addEventListener('click', function () {
        chatbotWindow.style.display = 'none';
        // clear the state as well.
        return;
    });

    maximizeChatbotWindow.addEventListener('click', function () {
        chatbotWindow.classList.toggle("maxmimize");
        return;
    });

    userInput.addEventListener('click', function () {
        const textArea = document.getElementById('user-input-text-area');
        // Get the value from the textarea
        const inputValue = textArea.value;
        if(!inputValue || !inputValue?.trim()){
          return;
        } 
        // else {
        //   userInputValue = inputValue;
        // }
        textArea.value = '';
        adjustTextareaHeight();
        renderChatMessage(inputValue, true);
        if(stepToBeCalledOnSendButtonIsAI){
          triggerAIModel(stepToBeCalledOnSendButton, inputValue);
        } else {
          renderWorkflow(stepToBeCalledOnSendButton);
        }
    })

    function playPeepSound() {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
  
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
  
      oscillator.type = 'sine'; // Sine wave for smooth sound
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime); // Frequency (1000Hz)
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Volume (0.1)
  
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1); // Duration of the beep (0.1 seconds)
  }

    // Function to initialize and handle Speech Recognition
    function initializeSpeechRecognition() {
      // Check if browser supports SpeechRecognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true; // Allow continuous speech recognition
      recognition.interimResults = true; // Show results as the user speaks

      // Set up the event listener for when speech is recognized
      recognition.onresult = function(event) {
        let finalTranscript = '';
        let interimTranscript = '';
    
        // Loop through all the results for the current recognition
        for (let i = event.resultIndex; i < event.results.length; i++) {
            let result = event.results[i][0].transcript;
    
            // If the result is final, append it to finalTranscript
            if (event.results[i].isFinal) {
                finalTranscript += result;
            } else {
                // Otherwise, append it to interimTranscript
                interimTranscript = result;
            }
        }
    
        // Update the textarea with the final transcript once it's finished
        if (finalTranscript) {
            textarea.value = finalTranscript; // Update with final result
        } else {
            textarea.value = interimTranscript; // Show interim result
        }
    
        adjustTextareaHeight(); // Adjust height after input
    };     

      // Handle when recognition starts and stops
      recognition.onstart = function() {
          console.log("Speech recognition started.");
      };

      recognition.onend = function() {
          console.log("Speech recognition ended.");
      };

      return recognition; // Return the recognition instance to use it elsewhere if needed
    }
    renderWorkflow(currentWorkflow);
    stepToBeCalledOnSendButton = 'generatePromptAI';
    stepToBeCalledOnSendButtonIsAI = true;
  })();
  