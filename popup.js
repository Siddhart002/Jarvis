document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('send-btn');
    const userInputField = document.getElementById('user-input');
    const messagesContainer = document.getElementById('chatbot-messages');
    const actionButtons = document.getElementById('action-buttons');

    // Add event listener to the send button
    sendButton.addEventListener('click', handleUserInput);

    // Function to append a message to the chatbot
    function appendMessage(text, sender = 'bot') {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(sender);
        messageDiv.textContent = text;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;  // Scroll to the bottom
    }

    // Function to handle the user's input
    function handleUserInput() {
        const userInput = userInputField.value.trim();
        if (userInput === "") return;

        appendMessage(userInput, 'user');
        userInputField.value = '';  // Clear input field

        // Simulate response from the chatbot
        if (userInput.toLowerCase().includes('news') || userInput.toLowerCase().includes('blog') || userInput.toLowerCase().includes('social media')) {
            classifyContent(userInput);
        } else {
            appendMessage("Sorry, I didn't understand that. Please choose a content type: News, Blog, or Social Media.", 'bot');
        }
    }

    // Function to handle content classification
    function classifyContent(input) {
        appendMessage("You selected: " + input, 'bot');
        
        // Display action buttons for News and Blog selections
        if (input.toLowerCase().includes('news') || input.toLowerCase().includes('blog')) {
            actionButtons.style.display = 'block';  // Show the action buttons
        } else if (input.toLowerCase().includes('social media')) {
            appendMessage("Only Credibility Check will be performed for Social Media posts.", 'bot');
            actionButtons.style.display = 'none';  // Hide action buttons for Social Media
        }
    }

    // Event listeners for action buttons
    document.getElementById('credibility-check').addEventListener('click', () => {
        appendMessage("Running credibility check...", 'bot');
        runCredibilityCheck();
    });

    document.getElementById('summarize-content').addEventListener('click', () => {
        appendMessage("Summarizing the content...", 'bot');
        summarizeContent();
    });

    // Simulate a Credibility Check (stub)
    function runCredibilityCheck() {
        // This would call your API for the credibility check
        appendMessage("Credibility check complete. The source is credible!", 'bot');
    }

    // Simulate Summarization (stub)
    function summarizeContent() {
        // This would call your API for summarizing content
        appendMessage("Here is a summary of the content: (Summary goes here)", 'bot');
    }
});
