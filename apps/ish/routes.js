const express = require('express');
const router = express.Router();

router.get('/message', (req, res) => {
  res.json({ message: 'Hello from the ish app!' });
});

module.exports = router;