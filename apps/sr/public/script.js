document.addEventListener('DOMContentLoaded', () => {
    const riseButton = document.getElementById('riseButton');
    const apiMessageElement = document.getElementById('apiMessage');
    const body = document.body;

    riseButton.addEventListener('click', async () => {
        // Disable the button to prevent multiple triggers
        riseButton.disabled = true;
        riseButton.textContent = 'Rising...';

        try {
            // As per the architecture, all fetch requests MUST be prefixed with /api/sr
            const response = await fetch('/api/sr/start');
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            const data = await response.json();

            // Display the message from the API
            apiMessageElement.textContent = data.message;

            // Trigger the animation by adding a class to the body
            body.classList.add('sunrise-active');

            // Hide the controls after the animation starts
            setTimeout(() => {
                document.getElementById('controls').style.opacity = '0';
            }, 1000);

        } catch (error) {
            console.error('Failed to start sunrise:', error);
            apiMessageElement.textContent = 'Could not contact the server to start the sun.';
            // Re-enable the button if the API call fails
            riseButton.disabled = false;
            riseButton.textContent = 'Make the Sun Rise';
        }
    });
});