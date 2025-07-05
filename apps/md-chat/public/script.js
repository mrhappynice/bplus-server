// apps/md-chat/public/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- URLs and Constants ---
    // UPDATED: The API URL now points to the specific mdchat route prefix
    const API_URL = 'http://localhost:3000/api/mdchat';
    const WS_URL = `ws://${window.location.host}`;

    // --- WebSocket Setup ---
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => console.log('WebSocket connection established.');
    ws.onerror = (err) => console.error('WebSocket Error:', err);
    ws.onclose = () => console.log('WebSocket connection closed.');

    // --- Element References ---
    const chatPanel = document.getElementById('chat-panel');
    // Master List Elements
    const masterListSection = document.getElementById('master-list-section');
    const masterListDisplay = document.getElementById('master-list-display');
    const masterListEditor = document.getElementById('master-list-editor');
    const masterListEditControls = document.getElementById('master-list-edit-controls');
    const editMasterListBtn = document.getElementById('edit-master-list-btn');
    const saveMasterListBtn = document.getElementById('save-master-list-btn');
    const cancelEditMasterListBtn = document.getElementById('cancel-edit-master-list-btn');
    const toggleMasterListSizeBtn = document.getElementById('toggle-master-list-size-btn');

    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatRecordBtn = document.getElementById('chat-record-btn');
    const statusIndicator = document.getElementById('status-indicator');
    const thinkingToggle = document.getElementById('thinking-toggle');
    const transcribeBtn = document.getElementById('transcribe-btn');
    // Transcription Panel
    const transcriptionPanel = document.getElementById('transcription-panel');
    const closeTranscriptionPanelBtn = document.getElementById('close-transcription-panel-btn');
    const panelRecordBtn = document.getElementById('panel-record-btn');
    const panelStatus = document.getElementById('panel-status');
    const transcriptionOutput = document.getElementById('transcription-output');
    const copyTranscriptionBtn = document.getElementById('copy-transcription-btn');
    // Settings Panel
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const closeSettingsPanelBtn = document.getElementById('close-settings-panel-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const refreshModelsBtn = document.getElementById('refresh-models-btn');
    const localModelSelect = document.getElementById('local-model-select');
    const geminiModelSelect = document.getElementById('gemini-model-select');
    const llmProviderRadios = document.querySelectorAll('input[name="llmProvider"]');
    const speechProviderRadios = document.querySelectorAll('input[name="speechProvider"]');

    const markdownConverter = new showdown.Converter();
    markdownConverter.setOption('strikethrough', 'true');

    // --- State Management ---
    let chatHistory = [];
    let currentContextDocuments = [];
    let isRecording = false;
    let recordingPurpose = null; // 'llm' or 'panel'
    // Local Speech State
    let mediaRecorder;
    let audioChunks = [];
    // Browser Speech State
    let browserRecognition;
    // TTS State
    let audioContext;
    let audioQueue = [];
    let isPlaying = false;
    // Settings State
    let settings = {};

    // --- REWRITTEN Master List Logic ---
    async function initializeMasterList() {
        await fetchAndRenderMasterList();

        editMasterListBtn.addEventListener('click', enterMasterListEditMode);
        saveMasterListBtn.addEventListener('click', saveMasterList);
        cancelEditMasterListBtn.addEventListener('click', exitMasterListEditMode);
        toggleMasterListSizeBtn.addEventListener('click', () => {
            masterListSection.classList.toggle('fullscreen');
            const isFullscreen = masterListSection.classList.contains('fullscreen');
            toggleMasterListSizeBtn.textContent = isFullscreen ? 'Shrink View' : 'Enlarge View';
        });
    }

    async function fetchAndRenderMasterList() {
        try {
            masterListDisplay.innerHTML = '<p>Loading list from server...</p>';
            const response = await fetch(`${API_URL}/master-list`);
            if (!response.ok) throw new Error('Failed to fetch master list from server.');
            const data = await response.json();
            renderMasterList(data.content);
            masterListEditor.value = data.content; // Keep editor in sync
        } catch (error) {
            console.error(error);
            masterListDisplay.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }

    function renderMasterList(content) {
        masterListDisplay.innerHTML = markdownConverter.makeHtml(content);
    }

    function enterMasterListEditMode() {
        // The editor's value is already kept in sync by fetchAndRenderMasterList
        masterListDisplay.hidden = true;
        editMasterListBtn.hidden = true;

        masterListEditor.hidden = false;
        masterListEditControls.hidden = false;
        masterListEditor.focus();
    }

    function exitMasterListEditMode() {
        masterListDisplay.hidden = false;
        editMasterListBtn.hidden = false;

        masterListEditor.hidden = true;
        masterListEditControls.hidden = true;
        // Re-fetch to ensure we have the latest version in case of a conflict
        fetchAndRenderMasterList();
    }

    async function saveMasterList() {
        const newContent = masterListEditor.value;
        try {
            const response = await fetch(`${API_URL}/master-list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newContent })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to save list.');
            }
            renderMasterList(newContent);
            exitMasterListEditMode();
        } catch (error) {
            alert(`Error saving list: ${error.message}`);
        }
    }


    // --- Helper Functions ---
    const setStatus = (status, text) => {
        statusIndicator.className = `status-${status}`;
        statusIndicator.textContent = text;
    };

    // --- Settings Logic (Unchanged) ---
    function initializeSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('mdChatSettings'));
        settings = {
            llmProvider: 'gemini',
            geminiModel: 'gemini-pro',
            localModel: '',
            speechProvider: 'browser',
            ...savedSettings
        };

        document.querySelector(`input[name="llmProvider"][value="${settings.llmProvider}"]`).checked = true;
        document.querySelector(`input[name="speechProvider"][value="${settings.speechProvider}"]`).checked = true;
        geminiModelSelect.value = settings.geminiModel;
        if (settings.localModel) {
            let option = localModelSelect.querySelector(`option[value="${settings.localModel}"]`);
            if (!option) {
                option = new Option(settings.localModel, settings.localModel, true, true);
                localModelSelect.add(option);
            }
            localModelSelect.value = settings.localModel;
        }

        settingsBtn.addEventListener('click', () => settingsPanel.classList.remove('panel-closed'));
        closeSettingsPanelBtn.addEventListener('click', () => settingsPanel.classList.add('panel-closed'));
        saveSettingsBtn.addEventListener('click', saveAndApplySettings);
        refreshModelsBtn.addEventListener('click', fetchLocalModels);
        llmProviderRadios.forEach(radio => radio.addEventListener('change', toggleProviderSections));

        toggleProviderSections();
        fetchLocalModels();
        applySettings();
    }

    function toggleProviderSections() {
        const selectedProvider = document.querySelector('input[name="llmProvider"]:checked').value;
        document.getElementById('gemini-settings-section').style.display = selectedProvider === 'gemini' ? 'block' : 'none';
        document.getElementById('local-llm-settings-section').style.display = selectedProvider === 'local' ? 'block' : 'none';
    }

    async function fetchLocalModels() {
        try {
            localModelSelect.innerHTML = '<option>Fetching...</option>';
            const response = await fetch(`${API_URL}/local-models`);
            if (!response.ok) throw new Error('Failed to fetch models');
            const models = await response.json();
            localModelSelect.innerHTML = '';
            models.forEach(model => {
                const option = new Option(model.id, model.id);
                localModelSelect.add(option);
            });
            if (settings.localModel && localModelSelect.querySelector(`option[value="${settings.localModel}"]`)) {
                localModelSelect.value = settings.localModel;
            }
        } catch (error) {
            console.error('Error fetching local models:', error);
            localModelSelect.innerHTML = `<option>${error.message}</option>`;
        }
    }

    function saveAndApplySettings() {
        settings.llmProvider = document.querySelector('input[name="llmProvider"]:checked').value;
        settings.speechProvider = document.querySelector('input[name="speechProvider"]:checked').value;
        settings.geminiModel = geminiModelSelect.value;
        settings.localModel = localModelSelect.value;

        localStorage.setItem('mdChatSettings', JSON.stringify(settings));
        alert('Settings saved!');
        settingsPanel.classList.add('panel-closed');
        applySettings();
    }

    function applySettings() {
        console.log("Applying settings:", settings);
        if (browserRecognition) browserRecognition.abort();
        if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();

        if (settings.speechProvider === 'browser') {
            setupBrowserRecognition();
        } else {
            browserRecognition = null;
        }
    }

    // --- Speech Recognition (STT) (Unchanged) ---
    function setupBrowserRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Browser Speech Recognition not supported.");
            if (settings.speechProvider === 'browser') {
                chatRecordBtn.disabled = true; panelRecordBtn.disabled = true;
                chatRecordBtn.title = "Not supported in this browser.";
                panelRecordBtn.title = "Not supported in this browser.";
            }
            return;
        }
        browserRecognition = new SpeechRecognition();
        browserRecognition.continuous = false;
        browserRecognition.interimResults = false;
        browserRecognition.lang = 'en-US';

        browserRecognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            if (recordingPurpose === 'llm') chatInput.value = transcript;
            else if (recordingPurpose === 'panel') transcriptionOutput.value += transcript + ' ';
        };
        browserRecognition.onerror = (event) => console.error('Browser speech recognition error', event.error);
        browserRecognition.onend = () => {
            isRecording = false;
            recordingPurpose = null;
            chatRecordBtn.classList.remove('recording');
            panelRecordBtn.classList.remove('recording');
            setStatus('idle', 'Idle');
            panelStatus.textContent = 'Idle';
        };
    }
    const startRecording = async (purpose) => {
        if (isRecording) return;
        isRecording = true;
        recordingPurpose = purpose;
        if (purpose === 'llm') setStatus('recording', 'Recording...'); else panelStatus.textContent = 'Recording...';
        if (purpose === 'llm') chatRecordBtn.classList.add('recording'); else panelRecordBtn.classList.add('recording');

        if (settings.speechProvider === 'browser' && browserRecognition) {
            browserRecognition.start();
        } else { // Local STT
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    if (audioBlob.size > 100) {
                        ws.send(JSON.stringify({ type: 'audio_config', purpose: recordingPurpose }));
                        ws.send(audioBlob);
                    }
                    audioChunks = [];
                    if (purpose === 'llm') setStatus('processing', 'Processing...'); else panelStatus.textContent = 'Processing...';
                };
                audioChunks = [];
                mediaRecorder.start();
            } catch (err) {
                console.error('Error accessing microphone for local STT:', err);
                isRecording = false;
                if (purpose === 'llm') setStatus('idle', 'Mic Error'); else panelStatus.textContent = 'Mic Error';
            }
        }
    };
    const stopRecording = () => {
        if (!isRecording) return;
        if (settings.speechProvider === 'browser' && browserRecognition) {
            browserRecognition.stop();
        } else if (mediaRecorder) {
            mediaRecorder.stop();
        }
        isRecording = false;
    };

    // --- WebSocket Message Handler (Unchanged) ---
    ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
            const arrayBuffer = await event.data.arrayBuffer();
            audioQueue.push(arrayBuffer);
            if (!isPlaying) playNextInQueue();
        } else if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            switch (message.type) {
                case 'llm_transcription_result':
                    chatInput.value = message.text;
                    setStatus('idle', 'Idle');
                    break;
                case 'panel_transcription_result':
                    transcriptionOutput.value += message.text + ' ';
                    panelStatus.textContent = 'Idle';
                    break;
                case 'error':
                    alert(`Server Error: ${message.data}`);
                    setStatus('idle', 'Error');
                    panelStatus.textContent = 'Error';
                    break;
            }
        }
    };

    // --- Text-to-Speech (TTS) & Audio Playback (Unchanged) ---
    function speakText(text) {
        if (settings.speechProvider === 'browser') {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                window.speechSynthesis.speak(utterance);
            } else {
                alert('Browser Text-to-Speech not supported.');
            }
        } else {
            ws.send(JSON.stringify({ type: 'request_tts', text: text }));
        }
    }

    async function playNextInQueue() {
        if (audioQueue.length === 0) { isPlaying = false; return; }
        isPlaying = true;
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioData = audioQueue.shift();
        try {
            const audioBuffer = await audioContext.decodeAudioData(audioData);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
            source.onended = playNextInQueue;
        } catch (e) { console.error("Error decoding audio data:", e); playNextInQueue(); }
    }

    // --- UI Event Listeners (Unchanged) ---
    transcribeBtn.addEventListener('click', () => transcriptionPanel.classList.remove('panel-closed'));
    closeTranscriptionPanelBtn.addEventListener('click', () => {
        if (isRecording && recordingPurpose === 'panel') stopRecording();
        transcriptionPanel.classList.add('panel-closed');
    });
    copyTranscriptionBtn.addEventListener('click', () => {
        if (transcriptionOutput.value) {
            navigator.clipboard.writeText(transcriptionOutput.value).then(() => alert('Copied!')).catch(err => alert('Failed to copy.'));
        }
    });
    chatRecordBtn.addEventListener('mousedown', () => startRecording('llm'));
    chatRecordBtn.addEventListener('mouseup', stopRecording);
    chatRecordBtn.addEventListener('mouseleave', () => { if (isRecording && recordingPurpose === 'llm') stopRecording(); });
    panelRecordBtn.addEventListener('mousedown', () => startRecording('panel'));
    panelRecordBtn.addEventListener('mouseup', stopRecording);
    panelRecordBtn.addEventListener('mouseleave', () => { if (isRecording && recordingPurpose === 'panel') stopRecording(); });

    // --- Document and Chat Functions (Minor Changes) ---
    async function loadDocuments() {
        const thumbnailGrid = document.getElementById('thumbnail-grid');
        try {
            const response = await fetch(`${API_URL}/documents`);
            const documents = await response.json();
            thumbnailGrid.innerHTML = '';
            if (documents.length === 0) {
                thumbnailGrid.innerHTML = '<p>No documents found. Upload a file to get started!</p>'; return;
            }
            documents.forEach(doc => {
                const thumb = document.createElement('div');
                thumb.className = 'thumbnail'; thumb.dataset.id = doc.id;
                thumb.innerHTML = `<input type="checkbox" class="thumbnail-checkbox" data-id="${doc.id}"><div class="thumbnail-icon">📝</div><span>${doc.filename}</span>`;
                thumb.addEventListener('click', (e) => { if (e.target.type !== 'checkbox') { showPreview(doc.id); } });
                thumb.querySelector('.thumbnail-checkbox').addEventListener('change', (e) => { thumb.classList.toggle('selected', e.target.checked); });
                thumbnailGrid.appendChild(thumb);
            });
        } catch (error) { console.error('Failed to load documents:', error); thumbnailGrid.innerHTML = '<p>Error loading documents. Is the server running?</p>'; }
    }

    async function showPreview(docId) {
        const previewPanel = document.getElementById('preview-panel');
        try {
            const response = await fetch(`${API_URL}/document/${docId}`);
            const doc = await response.json();
            previewPanel.innerHTML = markdownConverter.makeHtml(doc.content);
        } catch (error) { console.error('Failed to load preview:', error); previewPanel.innerHTML = '<p>Could not load document preview.</p>'; }
    }

    document.getElementById('file-upload').addEventListener('change', async (event) => {
        const file = event.target.files[0]; if (!file) return;
        const formData = new FormData(); formData.append('markdownFile', file);
        try {
            const response = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
            if (response.ok) { alert('File uploaded successfully!'); loadDocuments(); }
            else { const errorData = await response.json(); alert(`Upload failed: ${errorData.error}`); }
        } catch (error) { console.error('Upload error:', error); alert('An error occurred during upload.'); }
        finally { event.target.value = ''; }
    });

    document.getElementById('upload-btn').addEventListener('click', () => {
        document.getElementById('file-upload').click();
    });
    document.getElementById('clear-selection-btn').addEventListener('click', () => { document.querySelectorAll('.thumbnail-checkbox:checked').forEach(cb => { cb.checked = false; cb.closest('.thumbnail').classList.remove('selected'); }); });
    document.getElementById('toggle-preview-size-btn').addEventListener('click', () => { const previewSection = document.getElementById('preview-section'); previewSection.classList.toggle('fullscreen'); const isFullscreen = previewSection.classList.contains('fullscreen'); document.getElementById('toggle-preview-size-btn').textContent = isFullscreen ? 'Shrink View' : 'Enlarge View'; });
    document.getElementById('new-chat-btn').addEventListener('click', () => { if (confirm('Are you sure? This will clear the conversation and context.')) { chatHistory = []; currentContextDocuments = []; chatPanel.innerHTML = ''; document.getElementById('context-status').innerHTML = ''; chatInput.value = ''; alert('New chat started.'); } });
    document.getElementById('remove-context-btn').addEventListener('click', () => { if (currentContextDocuments.length > 0) { currentContextDocuments = []; document.getElementById('context-status').innerHTML = '<span style="color: #c0392b;">Context has been cleared.</span>'; } else { alert('No context is currently active.'); } });
    document.getElementById('add-to-query-btn').addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('.thumbnail-checkbox:checked');
        if (selectedCheckboxes.length === 0) { alert('Please select at least one document to add as context.'); return; }
        const contextStatus = document.getElementById('context-status');
        contextStatus.textContent = 'Loading context...';
        const fetchPromises = Array.from(selectedCheckboxes).map(cb => fetch(`${API_URL}/document/${cb.dataset.id}`).then(res => res.json()));
        try {
            const docs = await Promise.all(fetchPromises);
            docs.forEach(doc => { if (!currentContextDocuments.some(d => d.id === doc.id)) { currentContextDocuments.push(doc); } });
            contextStatus.innerHTML = `<strong>Active Context:</strong> ${currentContextDocuments.map(d => d.filename).join(', ')}`;
        } catch (error) { console.error('Error fetching context documents:', error); contextStatus.textContent = 'Error loading context.'; }
    });

    async function sendChat() {
        const originalQuery = chatInput.value.trim();
        if (!originalQuery) return;

        sendBtn.disabled = true;
        chatInput.disabled = true;

        let queryToSend = originalQuery;
        if (thinkingToggle.checked && settings.llmProvider === 'local') {
            queryToSend += ' /think';
        } else {
            queryToSend += ' /no_think';
        }

        const contextFilenames = currentContextDocuments.map(d => d.filename);
        displayMessage(originalQuery, 'user', contextFilenames);
        const aiMessageElement = displayMessage('AI is thinking...', 'ai');
        chatInput.value = '';

        try {
            const model = settings.llmProvider === 'gemini' ? settings.geminiModel : settings.localModel;
            if (settings.llmProvider === 'local' && !model) {
                throw new Error("No local model selected. Please choose one in settings.");
            }

            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: queryToSend,
                    contextDocuments: currentContextDocuments,
                    history: chatHistory,
                    provider: settings.llmProvider,
                    model: model
                }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `Network response was not ok: ${response.statusText}`);
            }
            const data = await response.json();

            if (data.updatedListContent) {
                renderMasterList(data.updatedListContent);
                masterListEditor.value = data.updatedListContent;
            }

            aiMessageElement.innerHTML = markdownConverter.makeHtml(data.response);
            addTtsButton(aiMessageElement, data.response);

            chatHistory.push({ role: "user", parts: [{ text: originalQuery }] });
            chatHistory.push({ role: "model", parts: [{ text: data.response }] });
        } catch (error) {
            console.error('Chat error:', error);
            aiMessageElement.innerHTML = `Sorry, something went wrong: ${error.message}`;
        } finally {
            sendBtn.disabled = false;
            chatInput.disabled = false;
            chatInput.focus();
        }
    }

    function addTtsButton(element, textToSpeak) {
        const ttsButton = document.createElement('span');
        ttsButton.className = 'tts-button';
        ttsButton.title = 'Read this text aloud';
        ttsButton.textContent = '🔊';
        ttsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            speakText(textToSpeak);
        });
        element.appendChild(ttsButton);
    }

    function displayMessage(text, sender, context = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        const isPlaceholder = (sender === 'ai' && text === 'AI is thinking...');

        let htmlContent = (sender === 'ai' && !isPlaceholder)
            ? markdownConverter.makeHtml(text)
            : text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        if (sender === 'user' && context.length > 0) {
            htmlContent += `<div class="message-context"><strong>Context for this query:</strong> ${context.join(', ')}</div>`;
        }
        messageDiv.innerHTML = htmlContent;
        if (sender === 'ai' && !isPlaceholder) {
            addTtsButton(messageDiv, text);
        }
        chatPanel.appendChild(messageDiv);
        chatPanel.scrollTop = chatPanel.scrollHeight;
        return messageDiv;
    }

    // Wire up chat send button
    sendBtn.addEventListener('click', sendChat);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChat();
        }
    });

    // --- Initial Load ---
    loadDocuments();
    initializeSettings();
    initializeMasterList();
});