document.addEventListener('DOMContentLoaded', () => {
    const questionTextElement = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const resultArea = document.getElementById('result-area');
    const newQuestionBtn = document.getElementById('new-question-btn');

    let currentQuestionId = null;

    async function getQuestion() {
        optionsContainer.innerHTML = ''; // Clear previous options
        resultArea.textContent = ''; // Clear previous result
        newQuestionBtn.style.display = 'none'; // Hide next question button

        questionTextElement.textContent = 'Fetching a new AI/LLM trivia question...';

        try {
            const response = await fetch('/api/gm/question');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            currentQuestionId = data.id;
            questionTextElement.textContent = data.question;

            data.options.forEach(option => {
                const button = document.createElement('button');
                button.classList.add('option-btn');
                button.textContent = option;
                button.addEventListener('click', () => selectAnswer(option));
                optionsContainer.appendChild(button);
            });
            optionsContainer.style.display = 'block'; // Show options
        } catch (error) {
            console.error('Error fetching question:', error);
            questionTextElement.textContent = 'Failed to load question. Please try again later.';
        }
    }

    async function selectAnswer(selectedAnswer) {
        if (!currentQuestionId) {
            resultArea.textContent = 'No question loaded. Please get a new question.';
            return;
        }

        // Disable all option buttons to prevent multiple clicks
        Array.from(optionsContainer.children).forEach(button => {
            button.disabled = true;
        });

        try {
            const response = await fetch('/api/gm/answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    questionId: currentQuestionId,
                    userAnswer: selectedAnswer
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.correct) {
                resultArea.textContent = 'Correct! Great job!';
                resultArea.style.color = '#4CAF50';
            } else {
                resultArea.textContent = `Incorrect. The correct answer was: "${data.correctAnswer}"`;
                resultArea.style.color = '#F44336';
            }
            newQuestionBtn.style.display = 'block'; // Show next question button
            optionsContainer.style.display = 'none'; // Hide options after answering
        } catch (error) {
            console.error('Error submitting answer:', error);
            resultArea.textContent = 'An error occurred while checking your answer.';
            resultArea.style.color = '#FF9800';
            // Re-enable buttons if submission failed, allowing re-attempt or new question
            Array.from(optionsContainer.children).forEach(button => {
                button.disabled = false;
            });
        }
    }

    newQuestionBtn.addEventListener('click', getQuestion);

    // Load the first question when the page loads
    getQuestion();
});