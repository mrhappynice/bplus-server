document.addEventListener('DOMContentLoaded', () => {
    const crazyButton = document.getElementById('crazyButton');
    const crazinessMessage = document.getElementById('crazinessMessage');
    const crazinessLevel = document.getElementById('crazinessLevel');
    const body = document.body;
    const container = document.querySelector('.container');

    const updateCraziness = async () => {
        try {
            // IMPORTANT: Fetch request MUST be prefixed with /api/dmdmd/
            const response = await fetch('/api/dmdmd/crazy-status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            crazinessMessage.textContent = data.message;
            crazinessLevel.textContent = `Level: ${data.level}`;

            // Apply visual effects based on the craziness level
            applyCrazyEffects(data.level);

        } catch (error) {
            console.error("Failed to get craziness status:", error);
            crazinessMessage.textContent = "Error: Can't get any crazier right now.";
            crazinessLevel.textContent = "Level: ERROR";
        }
    };

    const applyCrazyEffects = (level) => {
        // Reset previous effects to avoid accumulation
        body.style.backgroundColor = '';
        body.style.filter = '';
        container.style.transform = '';
        container.style.filter = '';
        container.style.borderColor = '';
        container.classList.remove('shake', 'pulse', 'distort');

        // Apply effects based on level
        if (level === 0) {
            // Initial state
        } else if (level === 1) {
            body.style.backgroundColor = '#fffdee'; // Slight yellow tint
        } else if (level === 2) {
            body.style.backgroundColor = '#ffeecc'; // Warmer yellow
            container.style.transform = 'rotate(0.5deg)';
        } else if (level === 3) {
            body.style.backgroundColor = '#ffd8b2'; // Light orange
            container.style.transform = 'rotate(-1deg)';
            container.style.filter = 'brightness(1.05)';
        } else if (level === 4) {
            body.style.backgroundColor = '#ffc080'; // More orange
            container.style.transform = 'rotate(1.5deg)';
            container.style.filter = 'brightness(1.1) saturate(1.2)';
            container.classList.add('shake');
        } else if (level === 5) {
            body.style.backgroundColor = '#ff9933'; // Vibrant orange
            container.style.transform = 'rotate(-2deg) scale(1.005)';
            container.style.filter = 'brightness(1.15) saturate(1.4)';
            container.classList.add('shake');
        } else if (level === 6) {
            body.style.backgroundColor = '#ff6600'; // Dark orange
            container.style.transform = 'rotate(2.5deg) scale(1.01)';
            container.style.filter = 'brightness(1.2) saturate(1.6) hue-rotate(5deg)';
            container.classList.add('shake', 'pulse');
        } else if (level === 7) {
            body.style.backgroundColor = '#cc4400'; // Orange-red
            container.style.transform = 'rotate(-3deg) scale(1.015)';
            container.style.filter = 'brightness(1.25) saturate(1.8) hue-rotate(10deg)';
            container.classList.add('shake', 'pulse');
            container.style.borderColor = '#ff4400';
        } else if (level === 8) {
            body.style.backgroundColor = '#992200'; // Deeper red
            container.style.transform = 'rotate(3.5deg) scale(1.02)';
            container.style.filter = 'brightness(1.3) saturate(2) hue-rotate(15deg)';
            container.classList.add('shake', 'pulse', 'distort');
            container.style.borderColor = '#ff0000';
        } else if (level === 9) {
            body.style.backgroundColor = '#660000'; // Very dark red
            container.style.transform = 'rotate(-4deg) scale(1.025)';
            container.style.filter = 'brightness(1.4) saturate(2.2) hue-rotate(20deg)';
            container.classList.add('shake', 'pulse', 'distort');
            container.style.borderColor = '#cc0000';
        } else if (level >= 10) { // Maximum craziness!
            body.style.backgroundColor = '#330000'; // Near black-red
            container.style.transform = 'rotate(5deg) scale(1.03)';
            container.style.filter = 'brightness(1.5) saturate(2.5) hue-rotate(25deg)';
            container.classList.add('shake', 'pulse', 'distort');
            container.style.borderColor = '#ff0000';

            // Add an intense, slightly disorienting filter to the body
            if (level % 2 === 0) {
                body.style.filter = 'invert(0.05) saturate(1.2)';
            } else {
                body.style.filter = 'invert(0) saturate(1)';
            }
        }
    };

    crazyButton.addEventListener('click', updateCraziness);

    // Call updateCraziness on initial load to set the initial message and effects
    updateCraziness();
});