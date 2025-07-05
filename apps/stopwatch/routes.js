const express = require('express');
const router = express.Router();

/**
 * API for the stopwatch application.
 * A client-side stopwatch typically doesn't need a backend,
 * but this endpoint demonstrates the required API path structure
 * for potential future features like saving lap times or user preferences.
 */
router.get('/hello', (req, res) => {
    res.json({ message: 'Hello from the Stopwatch API!', timestamp: new Date().toISOString() });
});

module.exports = router;