// apps/pic-chat/public/js/app.js
document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let allPhotos = [];
    let currentFilter = { type: 'all', value: null };
    let isSelectMode = false;
    let selectedPhotos = new Set();
    const photoCategories = [
        "Tools", "Research", "Rumors"
    ];

    // --- DOM ELEMENTS ---
    const appContainer = document.querySelector('.app-container');
    const timelineView = document.getElementById('timeline-view');
    const themesView = document.getElementById('themes-view');
    const navTimeline = document.getElementById('nav-timeline');
    const navThemes = document.getElementById('nav-themes');
    
    // Multi-Select Elements
    const timelineControls = document.getElementById('timeline-controls');
    const selectModeBtn = document.getElementById('select-mode-btn');
    const multiSelectBar = document.getElementById('multi-select-bar');
    const editSelectedBtn = document.getElementById('edit-selected-btn');
    const cancelSelectionBtn = document.getElementById('cancel-selection-btn');

    // Modal Elements
    const modal = document.getElementById('editor-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalImgContainer = document.querySelector('.modal-image-container');
    const modalImg = document.getElementById('modal-img');
    const modalPhotoId = document.getElementById('modal-photo-id');
    const modalBook = document.getElementById('modal-book');
    const modalAuthor = document.getElementById('modal-author');
    const modalDescription = document.getElementById('modal-description');
    const editorForm = document.getElementById('editor-form');
    const addTagForm = document.getElementById('add-tag-form');
    const currentTagsContainer = document.getElementById('current-tags');
    const tagsManager = document.getElementById('tags-manager');

    // NEW: Description Viewer Elements
    const enlargeDescriptionBtn = document.getElementById('enlarge-description-btn');
    const descriptionViewer = document.getElementById('description-viewer-backdrop');
    const viewerText = document.getElementById('viewer-text');
    const viewerCloseBtn = document.querySelector('.viewer-close-btn');

    // AI Elements
    const aiForm = document.getElementById('ai-form');
    const aiQuestionInput = document.getElementById('ai-question');
    const aiResponseContainer = document.getElementById('ai-response');

    // --- API FUNCTIONS ---
    // UPDATED: All API calls are now prefixed with /api/picchat/
    const api = {
        getPhotos: () => fetch('/api/picchat/photos').then(res => res.json()),
        getThemes: () => fetch('/api/picchat/themes').then(res => res.json()),
        updatePhoto: (id, data) => fetch(`/api/picchat/photos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        addTag: (id, data) => fetch(`/api/picchat/photos/${id}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        removeTag: (id, data) => fetch(`/api/picchat/photos/${id}/tags`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        askAI: (question) => fetch('/api/picchat/ask-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        }).then(res => res.json())
    };

    // --- RENDER & UI FUNCTIONS ---
    const populateCategoryDropdown = () => {
        // Clear existing options except the first one
        while (modalBook.options.length > 1) {
            modalBook.remove(1);
        }
        // Populate with new categories
        photoCategories.forEach(cat => {
            const option = new Option(cat, cat);
            modalBook.add(option);
        });
    };

    const renderTimeline = (photosToRender) => {
        const groupedByBook = photosToRender.reduce((acc, photo) => {
            const book = photo.book || 'Uncategorized';
            if (!acc[book]) acc[book] = [];
            acc[book].push(photo);
            return acc;
        }, {});

        const sortedBooks = Object.keys(groupedByBook).sort((a, b) => {
            const indexA = photoCategories.indexOf(a);
            const indexB = photoCategories.indexOf(b);
            if (a === 'Uncategorized') return 1; // Always last
            if (b === 'Uncategorized') return -1;
            if (indexA === -1) return 1; // Unrecognized categories last
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        timelineView.innerHTML = sortedBooks.map(book => `
            <div class="book-group">
                <h2>${book}</h2>
                <div class="photo-grid">
                    ${groupedByBook[book].map(photo => `
                        <div class="photo-card ${selectedPhotos.has(photo.id) ? 'selected' : ''}" data-photo-id="${photo.id}">
                            <img src="/originals/${photo.filename}" alt="${photo.description || 'Gallery image'}" loading="lazy">
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        if (photosToRender.length === 0) {
            timelineView.innerHTML = '<p class="empty-message">No images found for the current filter.</p>';
        }
    };
    
    const renderThemes = (themes) => {
        const groupedByCategory = themes.reduce((acc, theme) => {
            if (!acc[theme.category]) acc[theme.category] = [];
            acc[theme.category].push(theme);
            return acc;
        }, { 'People': [], 'Places': [], 'Events': [] });

        themesView.innerHTML = Object.entries(groupedByCategory).map(([category, tags]) => `
            <div class="theme-category">
                <h2>${category}</h2>
                ${tags.length > 0 ? `
                    <div class="theme-grid">
                        ${tags.map(tag => `
                            <div class="theme-card" data-tag-name="${tag.name}" data-tag-category="${tag.category}">
                                <img src="/originals/${tag.filename}" alt="Theme for ${tag.name}">
                                <div class="theme-name">${tag.name}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : `<p class="empty-message">No '${category}' tags yet. Go to the Gallery view to add tags to images!</p>`}
            </div>
        `).join('');
    };

    // --- MODAL LOGIC ---
    const showModal = (photoIdOrIds) => {
        editorForm.reset();
        addTagForm.reset();

        enlargeDescriptionBtn.classList.add('hidden');

        if (Array.isArray(photoIdOrIds)) { // Multi-select mode
            modalTitle.textContent = `Editing ${photoIdOrIds.length} Images`;
            modalPhotoId.value = JSON.stringify(photoIdOrIds); // Store all IDs

            modalImgContainer.classList.add('hidden');
            tagsManager.classList.remove('hidden');
            currentTagsContainer.innerHTML = `<p>Tags added here will be applied to all selected images. Existing unique tags are not shown.</p>`;

            modalBook.value = ''; // Show placeholder
            modalAuthor.placeholder = "Leave blank to keep unchanged";
            modalDescription.placeholder = "Leave blank to keep unchanged";

        } else { // Single photo mode
            const photoId = photoIdOrIds;
            const photo = allPhotos.find(p => p.id === photoId);
            if (!photo) return;

            enlargeDescriptionBtn.classList.remove('hidden');

            modalTitle.textContent = 'Edit Image Details';
            modalPhotoId.value = photo.id;

            modalImgContainer.classList.remove('hidden');
            modalImg.src = `/originals/${photo.filename}`;
            tagsManager.classList.remove('hidden');
            
            modalBook.value = photo.book || '';
            modalAuthor.value = photo.author || '';
            modalAuthor.placeholder = "Who created this image?";
            modalDescription.value = photo.description || '';
            modalDescription.placeholder = "What's happening in this image?";
            
            renderTags(photo.tags, photo.id);
        }
        modal.classList.remove('hidden');
    };

    const hideModal = () => {
        modal.classList.add('hidden');
    };

    const renderTags = (tagsString, photoId) => {
        currentTagsContainer.innerHTML = ''; // Clear previous
        if (!tagsString) {
            currentTagsContainer.innerHTML = '<p>No tags yet.</p>';
            return;
        }
        const tags = tagsString.split(';').map(t => {
            if (!t) return null;
            const [name, category] = t.split(':');
            return { name, category };
        }).filter(Boolean);

        currentTagsContainer.innerHTML = tags.map(tag => `
            <span class="tag-pill">
                ${tag.name}
                <span class="remove-tag" data-photo-id="${photoId}" data-tag-name="${tag.name}" data-tag-category="${tag.category}">&times;</span>
            </span>
        `).join('');
    };
    
    // --- MULTI-SELECT LOGIC ---
    const toggleSelectMode = () => {
        isSelectMode = !isSelectMode;
        appContainer.classList.toggle('select-mode-active', isSelectMode);
        multiSelectBar.classList.toggle('hidden', !isSelectMode);
        timelineControls.classList.toggle('hidden', isSelectMode);
        
        if (!isSelectMode) { // Exiting select mode
            selectedPhotos.clear();
            document.querySelectorAll('.photo-card.selected').forEach(card => card.classList.remove('selected'));
        }
        updateMultiSelectUI();
    };

    const updateMultiSelectUI = () => {
        const count = selectedPhotos.size;
        if (count > 0) {
            editSelectedBtn.textContent = `Edit ${count} Image(s)`;
            editSelectedBtn.disabled = false;
        } else {
            editSelectedBtn.textContent = 'Edit Selected';
            editSelectedBtn.disabled = true;
        }
    };


    // --- EVENT LISTENERS ---
    const setupEventListeners = () => {
        // View Navigation
        navTimeline.addEventListener('click', () => {
            currentFilter = { type: 'all', value: null };
            applyCurrentFilter();
            switchView('timeline');
        });
        navThemes.addEventListener('click', () => {
            switchView('themes');
            refreshThemes();
        });
        
        // Collapsible sections
        document.body.addEventListener('click', (e) => {
            if (e.target.matches('.book-group h2, .theme-category h2')) {
                e.target.parentElement.classList.toggle('collapsed');
            }
        });

        // Photo Click Logic
        timelineView.addEventListener('click', (e) => {
            const card = e.target.closest('.photo-card');
            if (!card) return;

            const photoId = parseInt(card.dataset.photoId);
            if (isSelectMode) {
                if (selectedPhotos.has(photoId)) {
                    selectedPhotos.delete(photoId);
                    card.classList.remove('selected');
                } else {
                    selectedPhotos.add(photoId);
                    card.classList.add('selected');
                }
                updateMultiSelectUI();
            } else {
                showModal(photoId);
            }
        });
        
        // Theme Click
        themesView.addEventListener('click', e => {
            const card = e.target.closest('.theme-card');
            if (card) {
                currentFilter = { type: 'tag', value: card.dataset.tagName };
                applyCurrentFilter();
                switchView('timeline');
            }
        });

        // Select Mode Controls
        selectModeBtn.addEventListener('click', toggleSelectMode);
        cancelSelectionBtn.addEventListener('click', toggleSelectMode);
        editSelectedBtn.addEventListener('click', () => {
            if (selectedPhotos.size > 0) {
                showModal(Array.from(selectedPhotos));
            }
        });

        // Modal Controls
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('.modal-close-btn')) {
                hideModal();
            }
        });

        editorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const ids = JSON.parse(modalPhotoId.value);
            const idArray = Array.isArray(ids) ? ids : [ids];

            const dataToUpdate = {};
            if (modalBook.value) dataToUpdate.book = modalBook.value;
            if (modalAuthor.value) dataToUpdate.author = modalAuthor.value;
            if (modalDescription.value) dataToUpdate.description = modalDescription.value;
            
            if (!Array.isArray(ids)) {
                 dataToUpdate.book = modalBook.value;
                 dataToUpdate.author = modalAuthor.value;
                 dataToUpdate.description = modalDescription.value;
            }

            if (Object.keys(dataToUpdate).length === 0) {
                // If only an 'uncategorized' value was selected, still save it
                if (modalBook.value === '') {
                     dataToUpdate.book = '';
                } else {
                    alert("No new details were entered to save.");
                    return;
                }
            }

            const promises = idArray.map(id => api.updatePhoto(id, dataToUpdate));
            await Promise.all(promises);
            
            alert(`Details saved for ${idArray.length} image(s)!`);
            await refreshData();
            if (isSelectMode) toggleSelectMode();
            hideModal();
        });

        addTagForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const ids = JSON.parse(modalPhotoId.value);
            const idArray = Array.isArray(ids) ? ids : [ids];
            
            const tagName = document.getElementById('new-tag-name').value;
            const tagCategory = document.getElementById('new-tag-category').value;
            const tagData = { tagName, tagCategory };
            
            const promises = idArray.map(id => api.addTag(id, tagData));
            await Promise.all(promises);

            addTagForm.reset();
            await refreshData();

            if (idArray.length > 1) {
                alert(`Tag '${tagName}' added to ${idArray.length} image(s).`);
            } else {
                showModal(idArray[0]);
            }
        });
        
        currentTagsContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('remove-tag')) {
                const { photoId, tagName, tagCategory } = e.target.dataset;
                await api.removeTag(photoId, { tagName, tagCategory });
                await refreshData();
                showModal(parseInt(photoId));
            }
        });

        // Description Viewer Listeners
        enlargeDescriptionBtn.addEventListener('click', () => {
            const text = modalDescription.value;
            viewerText.textContent = text || "No description provided.";
            descriptionViewer.classList.remove('hidden');
        });

        viewerCloseBtn.addEventListener('click', () => {
            descriptionViewer.classList.add('hidden');
        });

        descriptionViewer.addEventListener('click', (e) => {
            if (e.target === descriptionViewer) {
                 descriptionViewer.classList.add('hidden');
            }
        });

        // AI Assistant
        aiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const question = aiQuestionInput.value.trim();
            if (!question) return;

            aiResponseContainer.textContent = 'Thinking...';
            aiForm.querySelector('button').disabled = true;

            try {
                const result = await api.askAI(question);
                aiResponseContainer.textContent = result.text;
                if (result.photos && result.photos.length > 0) {
                    currentFilter = { type: 'subset', value: result.photos.map(p => p.id) };
                    applyCurrentFilter();
                    switchView('timeline');
                }
            } catch (err) {
                aiResponseContainer.textContent = 'Sorry, an error occurred.';
            } finally {
                aiForm.querySelector('button').disabled = false;
                aiQuestionInput.value = '';
            }
        });
    };

    // --- CORE LOGIC ---
    const switchView = (viewName) => {
        timelineControls.classList.toggle('hidden', viewName !== 'timeline');
        
        if (viewName === 'timeline') {
            timelineView.classList.remove('hidden');
            themesView.classList.add('hidden');
            navTimeline.classList.add('active');
            navThemes.classList.remove('active');
        } else {
            timelineView.classList.add('hidden');
            themesView.classList.remove('hidden');
            navTimeline.classList.remove('active');
            navThemes.classList.add('active');
            if(isSelectMode) toggleSelectMode(); // Exit select mode if switching away
        }
    };
    
    const applyCurrentFilter = () => {
        let photosToDisplay = allPhotos;
        if (currentFilter.type === 'tag') {
            photosToDisplay = allPhotos.filter(p => p.tags && p.tags.includes(`${currentFilter.value}:`));
        } else if (currentFilter.type === 'subset') {
            const idSet = new Set(currentFilter.value);
            photosToDisplay = allPhotos.filter(p => idSet.has(p.id));
        }
        renderTimeline(photosToDisplay);
    };

    const refreshThemes = async () => {
        const themes = await api.getThemes();
        renderThemes(themes);
    };

    const refreshData = async () => {
        allPhotos = await api.getPhotos();
        applyCurrentFilter();
    };

    // --- INITIALIZATION ---
    const init = async () => {
        populateCategoryDropdown();
        setupEventListeners();
        await refreshData();
        switchView('timeline');
    };

    init();
});