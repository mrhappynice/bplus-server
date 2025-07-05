document.addEventListener('DOMContentLoaded', () => {
    const popButton = document.getElementById('popButton');

    popButton.addEventListener('click', () => {
        popButton.classList.add('pop');
        setTimeout(() => {
            popButton.classList.remove('pop');
        }, 500); // Match the animation duration in style.css

        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    });
});