export const maxLength = 1000; // Example max length for truncating

export const startOptions = [
  // { text: "Generate Prompt", next: "generatePrompt", type: "button", id: "generate-prompt", visibility: true, stepToBeCalledOnNextIsAI: false },
  { text: "Summarize Content", next: "summarizeContent", type: "button", id: "summarize-content", visibility: true, stepToBeCalledOnNextIsAI: false },
  { text: "Summarize YouTube Video", next: "summarizeYtVideo", type: "button", id: "summarize-video", visibility: true, stepToBeCalledOnNextIsAI: false },
  // { text: "Write with AI", next: "write", type: "button", id: "write-with-ai", visibility: true, stepToBeCalledOnNextIsAI: false },
  { text: "Shop with AI", next: "shop", type: "button", id: "shop-with-ai", visibility: true, stepToBeCalledOnNextIsAI: false }];

export const chatbotGraph = {
    start: {
      message: "Hello! How can I help you today? Click on Reset to change the flow",
      options: [...startOptions],
      stepToBeCalledOnSendIsAI: false,
      stepToBeCalledOnSend: "start"
    },
    generatePrompt: {
      message: "Please provide the context in input box below or you can just speak the context by pressing the mic icon",
      options: [],
      stepToBeCalledOnSend: "generatePromptAI",
      stepToBeCalledOnSendIsAI: true
    },
    summarizeContent: {
      message: "Can you please help me with content which needs to be summarized?",
      options: [
        { text: "Current Page", next: "summarizeAIContentCurrentPage", type: "button", visibility: true, stepToBeCalledOnNextIsAI: true },
        { text: "Provide the input that has to be summarized if not the current Page", next: "summarizeAIContent", type: "text", visibility: true, stepToBeCalledOnNextIsAI: true },
      ],
      stepToBeCalledOnSend: "summarizeAIContent",
      stepToBeCalledOnSendIsAI: true
    },
    summarizeYtVideo: {
      message: "Go to the Youtube Video Page which you want to Summarize",
      options: [
        { text: "Summarize Video", next: "", type: "button", visibility: true, next: "summarizeYTAIContent", stepToBeCalledOnNextIsAI: true },
      ],
      stepToBeCalledOnSendIsAI: false,
      stepToBeCalledOnSend: "start"
    },
    summarizeContentBackgroundOption: {
      message: 'Once you are finished then click on send Icon to summarize the content',
      options: [],
      stepToBeCalledOnSend: "summarizeAIContent",
      stepToBeCalledOnSendIsAI: true
    },
    // write: {
    //   message: "Please provide the input in box below or you can just speak the content by pressing the mic icon",
    //   options: [],
    //   stepToBeCalledOnSend: "contentWriteAI",
    //   stepToBeCalledOnSendIsAI: true
    // },
    shop: {
      message: "Go to the Product page so that the AI can Check product description and all reviews and comments before you buy the Product",
      options: [
        { text: "Check the Product", next: "", type: "button", visibility: true, next: "shopWithAI", stepToBeCalledOnNextIsAI: true },
      ],
      stepToBeCalledOnSendIsAI: false,
      stepToBeCalledOnSend: "start"
    },
  };