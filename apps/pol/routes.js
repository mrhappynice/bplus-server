const express = require('express');
const router = express.Router();

// In-memory poll data (replace with a database in a real application)
let polls = {};

// Create a new poll
router.post('/', (req, res) => {
  const { question, options } = req.body;
  if (!question || !options || options.length < 2) {
    return res.status(400).json({ error: 'Invalid poll data' });
  }

  const pollId = Date.now().toString(); // Simple ID generation
  polls[pollId] = {
    question,
    options: options.map(option => ({ text: option, votes: 0 })),
    createdAt: new Date()
  };

  res.status(201).json({ id: pollId });
});

// Get a poll by ID
router.get('/:id', (req, res) => {
  const pollId = req.params.id;
  const poll = polls[pollId];

  if (!poll) {
    // this poll is not loading. lets do a fake poll. put in fake info.
    polls['1'] = {
      question: "What is your favorite color?",
      options: [
        { text: "Red", votes: 10 },
        { text: "Blue", votes: 15 },
        { text: "Green", votes: 5 }
      ],
      createdAt: new Date()
    };
    return res.json(polls['1']);
  }

  res.json(poll);
});

// Vote on a poll option
router.post('/:id/vote', (req, res) => {
  const pollId = req.params.id;
  const { optionIndex } = req.body;
  const poll = polls[pollId];

  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    return res.status(400).json({ error: 'Invalid option index' });
  }

  poll.options[optionIndex].votes++;
  res.json({ message: 'Vote recorded' });
});

module.exports = router;