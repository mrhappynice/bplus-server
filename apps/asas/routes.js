const express = require('express');
const router = express.Router();

// Pre-written prompts and simulated AI responses
const aiResponses = [
    { trigger: "hello", reply: "Hello there! How can I assist you today?" },
    { trigger: "hi", reply: "Hi! It's great to chat with you." },
    { trigger: "how are you", reply: "I'm just a program, so I don't have feelings, but I'm functioning perfectly! How about you?" },
    { trigger: "name", reply: "I am ASAS, your Artificial Simulated Assistant." },
    { trigger: "creator", reply: "I was created by a developer who wanted a fun little chat app." },
    { trigger: "weather", reply: "I cannot access real-time weather data, but I can tell you it's always sunny in my virtual world!" },
    { trigger: "joke", reply: "Why don't scientists trust atoms? Because they make up everything!" },
    { trigger: "help", reply: "I can simulate basic conversation. Try asking me about my name, or tell me 'hello'!" },
    { trigger: "bye", reply: "Goodbye! It was nice chatting with you." },
    { trigger: "goodbye", reply: "Farewell! Hope to chat again soon." },
    { trigger: "default", reply: "I'm not sure how to respond to that. Could you try rephrasing or ask something simpler?" }
];

// POST endpoint for chat messages
router.post('/chat', (req, res) => {
    const userMessage = req.body.message ? req.body.message.toLowerCase() : '';
    let aiReply = aiResponses.find(response => userMessage.includes(response.trigger));

    if (!aiReply) {
        aiReply = aiResponses.find(response => response.trigger === "default");
    }

    // Simulate a typing delay
    setTimeout(() => {
        res.json({ reply: aiReply.reply });
    }, Math.floor(Math.random() * 800) + 400); // Delay between 400ms and 1200ms
});

module.exports = router;