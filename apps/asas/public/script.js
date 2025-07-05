document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // Function to append messages to the chat window
    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `sender-${sender}`);
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        // Scroll to the bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to send a message
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        appendMessage('user', message);
        userInput.value = ''; // Clear input field

        try {
            const response = await fetch('/api/asas/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            appendMessage('ai', data.reply);
        } catch (error) {
            console.error('Error sending message:', error);
            appendMessage('ai', 'Oops! My circuits are down. Please try again later.');
        }
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // Initial message from the AI
    appendMessage('ai', 'Hello! I am ASAS, your Artificial Simulated Assistant. How can I help you today?');
});