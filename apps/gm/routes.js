const express = require('express');
const router = express.Router();

// Simple in-memory "database" of AI/LLM trivia questions
const questions = [
    {
        id: 'q101',
        question: "Which machine learning algorithm is often used for classification and regression tasks, known for its ability to handle non-linear relationships and interactions?",
        options: ["Linear Regression", "K-Means Clustering", "Support Vector Machine (SVM)", "Principal Component Analysis (PCA)"],
        correctIndex: 2
    },
    {
        id: 'q102',
        question: "What does 'LLM' stand for in the context of Artificial Intelligence?",
        options: ["Logic Learning Module", "Large Language Model", "Layered Linguistic Machine", "Latent Logic Mapping"],
        correctIndex: 1
    },
    {
        id: 'q103',
        question: "In neural networks, what is 'backpropagation' primarily used for?",
        options: ["To initialize network weights", "To calculate the error and adjust weights", "To select activation functions", "To prevent overfitting"],
        correctIndex: 1
    },
    {
        id: 'q104',
        question: "Which of these is a common 'attention mechanism' used in transformer models?",
        options: ["Recurrent Gating Unit", "Long Short-Term Memory (LSTM)", "Multi-Head Attention", "Convolutional Filter"],
        correctIndex: 2
    },
    {
        id: 'q105',
        question: "What concept in machine learning involves training a model on one task and then fine-tuning it for a different, but related, task?",
        options: ["Reinforcement Learning", "Unsupervised Learning", "Transfer Learning", "Active Learning"],
        correctIndex: 2
    }
];

// Stores the ID of the current question sent to the client.
// In a real multi-user app, this would be session-specific.
let currentQuestionId = null;

// GET a random trivia question
router.get('/question', (req, res) => {
    const randomIndex = Math.floor(Math.random() * questions.length);
    const question = questions[randomIndex];
    currentQuestionId = question.id; // Store the ID of the question we just sent
    res.json({
        id: question.id,
        question: question.question,
        options: question.options
    });
});

// POST to check the submitted answer
router.post('/answer', (req, res) => {
    const { questionId, userAnswer } = req.body;

    // Validate if the questionId matches the last sent question (simple check)
    if (questionId !== currentQuestionId) {
        return res.status(400).json({ message: "Invalid question ID or question expired." });
    }

    const question = questions.find(q => q.id === questionId);

    if (!question) {
        return res.status(404).json({ message: "Question not found." });
    }

    const isCorrect = question.options[question.correctIndex] === userAnswer;

    res.json({
        correct: isCorrect,
        correctAnswer: question.options[question.correctIndex]
    });
});

module.exports = router;