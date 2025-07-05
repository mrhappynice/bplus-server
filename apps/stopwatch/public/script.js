document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('display');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resetBtn = document.getElementById('resetBtn');
    const lapBtn = document.getElementById('lapBtn');
    const lapList = document.getElementById('lapList');

    let startTime = 0;
    let elapsedTime = 0;
    let timerInterval = null;
    let isRunning = false;
    let lapTimes = [];

    // Function to format time for display (HH:MM:SS.ms)
    function formatTime(ms) {
        const totalMilliseconds = ms;
        const hours = Math.floor(totalMilliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((totalMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((totalMilliseconds % (1000 * 60)) / 1000);
        const milliseconds = Math.floor((totalMilliseconds % 1000));

        const pad = (num) => num.toString().padStart(2, '0');
        const padMs = (num) => num.toString().padStart(3, '0');

        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${padMs(milliseconds)}`;
    }

    // Function to update the display
    function updateDisplay() {
        const currentTime = Date.now();
        elapsedTime = currentTime - startTime;
        display.textContent = formatTime(elapsedTime);
    }

    // Start button logic
    startBtn.addEventListener('click', () => {
        if (!isRunning) {
            startTime = Date.now() - elapsedTime; // Adjust startTime to account for previously elapsed time
            timerInterval = setInterval(updateDisplay, 10); // Update every 10ms for smoother millisecond display
            isRunning = true;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            resetBtn.disabled = false;
            lapBtn.disabled = false;
        }
    });

    // Stop button logic
    stopBtn.addEventListener('click', () => {
        if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
            startBtn.disabled = false;
            stopBtn.disabled = true;
            lapBtn.disabled = true;
        }
    });

    // Reset button logic
    resetBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        startTime = 0;
        elapsedTime = 0;
        isRunning = false;
        lapTimes = [];
        lapList.innerHTML = ''; // Clear lap list
        display.textContent = '00:00:00.000';
        startBtn.disabled = false;
        stopBtn.disabled = true;
        resetBtn.disabled = true;
        lapBtn.disabled = true;
    });

    // Lap button logic
    lapBtn.addEventListener('click', () => {
        if (isRunning) {
            const lapTime = elapsedTime; // Current elapsed time is the lap time
            lapTimes.push(lapTime);

            const listItem = document.createElement('li');
            listItem.textContent = `Lap ${lapTimes.length}: ${formatTime(lapTime)}`;
            lapList.appendChild(listItem);
            lapList.scrollTop = lapList.scrollHeight; // Scroll to bottom
        }
    });

    // --- Dummy API Call to demonstrate server integration ---
    // This call is not necessary for the stopwatch functionality itself,
    // but demonstrates correct API path usage as per requirements.
    fetch('/api/stopwatch/hello')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Successfully connected to API:', data.message);
        })
        .catch(error => {
            console.error('Error connecting to API:', error);
        });
});