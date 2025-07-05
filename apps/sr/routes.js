const express = require('express');
const router = express.Router();

// A simple API endpoint for the sunrise app.
// The frontend will call this when the user initiates the sunrise.
router.get('/start', (req, res) => {
    const messages = [
        "The sun begins its ascent.",
        "A new day dawns.",
        "Let there be light!",
        "The horizon glows with a warm light.",
        "Morning has broken."
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];

    res.json({
        success: true,
        message: message,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;