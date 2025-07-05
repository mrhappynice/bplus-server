const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ message: 'Flip app is running!' });
});

module.exports = router;