// script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- Element Selectors ---
    const mainNav = document.querySelector('.main-navigation');
    const navLinks = document.querySelectorAll('.main-navigation .nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const body = document.body;
    
    // Footer year selector
    const currentYearSpan = document.getElementById('current-year');
    
    // Navigation helper selectors (for clicking cards/buttons to navigate)
    const previewCards = document.querySelectorAll('.preview-card');
    const ctaButton = document.querySelector('.cta-button');


    // --- Initial State ---
    // This ensures only the section with the ID 'home' is visible on page load.
    contentSections.forEach(section => {
        if (section.id !== 'home') {
            section.classList.remove('active-section');
            section.classList.add('hidden');
        } else {
            section.classList.add('active-section');
            section.classList.remove('hidden');
        }
    });
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
    
    // --- App List Fetcher ---
    const fetchAndRenderApps = async () => {
        const appGrid = document.getElementById('app-grid');
        const appListStatus = document.getElementById('app-list-status');
        
        try {
            const response = await fetch('/api/appmanager/apps');
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            const apps = await response.json();

            if (appListStatus) appListStatus.style.display = 'none';
            appGrid.innerHTML = ''; // Clear loading message

            if (apps.length === 0) {
                appGrid.innerHTML = '<p>No manageable applications found.</p>';
                return;
            }

            apps.forEach(appName => {
                const card = document.createElement('a');
                card.href = `/${appName}`;
                card.className = 'app-card';
                card.target = '_blank'; // Open in new tab
                card.rel = 'noopener noreferrer';
                
                card.innerHTML = `
                    <h4>${appName}</h4>
                    <span class="app-link">Launch App <i class="fa-solid fa-arrow-up-right-from-square"></i></span>
                `;
                appGrid.appendChild(card);
            });

        } catch (error) {
            console.error('Failed to fetch applications:', error);
            if (appListStatus) {
                appListStatus.textContent = 'Failed to load applications. Is the server running?';
                appListStatus.style.color = '#e74c3c';
            }
        }
    };


    // --- Navigation ---

    /**
     * Updates the active class on navigation links.
     * @param {string} targetId The ID of the currently active section.
     */
    const setActiveLink = (targetId) => {
        navLinks.forEach(link => {
            if (link.dataset.section === targetId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    };

    /**
     * Hides all sections and shows the one with the target ID.
     * @param {string} targetId The ID of the section to show (e.g., 'home', 'architecture').
     */
    const showSection = (targetId) => {
        contentSections.forEach(section => {
            if (section.id === targetId) {
                section.classList.remove('hidden');
                section.classList.add('active-section');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                section.classList.add('hidden');
                section.classList.remove('active-section');
            }
        });
        setActiveLink(targetId);

        // Close mobile menu if it's open after a navigation click.
        if (mainNav.classList.contains('active')) {
            mainNav.classList.remove('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
            mobileMenuToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
        }
    };

    // Add click listeners to all main navigation links.
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); 
            const targetId = link.dataset.section;
            if (targetId) {
                showSection(targetId);
            }
        });
    });

     // Add click listeners to the preview cards on the homepage.
    previewCards.forEach(card => {
        const navigate = () => {
            const targetId = card.dataset.targetSection;
            if (targetId) {
                showSection(targetId);
            }
        };
        card.addEventListener('click', navigate);
        card.addEventListener('keydown', (e) => {
             if (e.key === 'Enter' || e.key === ' ') {
                 e.preventDefault();
                 navigate();
             }
        });
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
    });

    // Add click listener to the main Call-to-Action button in the hero section.
    if (ctaButton) {
        ctaButton.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = ctaButton.dataset.targetSection;
            if (targetId) {
                showSection(targetId);
            }
        });
    }


    // --- Mobile Menu Toggle ---
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            const isExpanded = mainNav.classList.toggle('active');
            mobileMenuToggle.setAttribute('aria-expanded', isExpanded);
            mobileMenuToggle.innerHTML = isExpanded ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
        });
    }
    
    // --- Initial Load ---
    fetchAndRenderApps();
    console.log("Unified Server Homepage JS Initialized!");

}); // End DOMContentLoaded