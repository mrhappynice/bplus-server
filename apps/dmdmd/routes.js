const express = require('express');
const router = express.Router();

let crazinessLevel = 0;
const messages = [
    "Just a little bit off...",
    "Feeling a twitch...",
    "Is that a faint hum?",
    "The walls are breathing...",
    "I think I saw something move!",
    "My brain feels like static!",
    "Okay, this is getting weird.",
    "The colors are too bright!",
    "Can you hear that ringing?",
    "I'm losing my marbles!",
    "DEFINITELY DRIVING ME CRAZY!",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAH!"
];

router.get('/crazy-status', (req, res) => {
    // Increment craziness level, cycling through messages
    crazinessLevel = (crazinessLevel + 1) % messages.length;
    res.json({
        message: messages[crazinessLevel],
        level: crazinessLevel
    });
});

module.exports = router;