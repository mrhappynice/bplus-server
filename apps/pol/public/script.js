document.addEventListener('DOMContentLoaded', async () => {
  const pollContainer = document.getElementById('poll-container');

  // Function to fetch and display a poll
  async function displayPoll(pollId) {
    try {
      const response = await fetch(`/api/pol/${pollId}`);
      const poll = await response.json();

      let pollHTML = `<h2>${poll.question}</h2>`;
      pollHTML += '<ul>';
      poll.options.forEach((option, index) => {
        pollHTML += `<li>
          <label>
            <input type="radio" name="vote" value="${index}">
            ${option.text} (${option.votes} votes)
          </label>
        </li>`;
      });
      pollHTML += '</ul>';
      pollHTML += '<button id="vote-button">Vote</button>';

      pollContainer.innerHTML = pollHTML;

      // Add event listener to the vote button
      document.getElementById('vote-button').addEventListener('click', async () => {
        const selectedOption = document.querySelector('input[name="vote"]:checked');
        if (selectedOption) {
          const optionIndex = parseInt(selectedOption.value);
          const response = await fetch(`/api/pol/${pollId}/vote`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ optionIndex })
          });

          if (response.ok) {
            displayPoll(pollId); // Refresh the poll after voting
          } else {
            alert('Error voting. Please try again.');
          }
        } else {
          alert('Please select an option to vote for.');
        }
      });

    } catch (error) {
      console.error('Error fetching poll:', error);
      pollContainer.innerHTML = '<p>Error loading poll.</p>';
    }
  }

  // Example: Display a poll with ID '1' (you'll need to create it first)
  displayPoll('1');
});