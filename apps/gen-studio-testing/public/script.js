document.addEventListener('DOMContentLoaded', () => {
    // --- WebSocket Setup ---
    const WS_URL = `ws://${window.location.host}`;
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => console.log('WebSocket connection established.');
    ws.onerror = (err) => console.error('WebSocket Error:', err);
    ws.onclose = () => console.log('WebSocket connection closed.');

    // --- Element Selectors ---
    const statusDiv = document.getElementById('status-message');
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    // Creator Elements
    const createForm = document.getElementById('create-form');
    const appNameInput = document.getElementById('appName');
    const createRequestInput = document.getElementById('createRequest');
    const generateAppBtn = document.getElementById('generate-app-btn');
    const mountAppBtn = document.getElementById('mount-app-btn');
    const createMicBtn = document.getElementById('create-mic-btn');
    const createFileTabs = document.querySelectorAll('#creator .file-tab-link');
    const createCodeDisplays = document.querySelectorAll('#creator .code-content');

    // Editor Elements
    const editForm = document.getElementById('edit-form');
    const appSelector = document.getElementById('appSelector');
    const editRequestInput = document.getElementById('editRequest');
    const generateEditBtn = document.getElementById('generate-edit-btn');
    const saveChangesBtn = document.getElementById('save-changes-btn');
    const editMicBtn = document.getElementById('edit-mic-btn');
    const editorFileTabs = document.getElementById('editor-file-tabs');
    const editorCodeDisplay = document.getElementById('editor-code-display');

    // Settings Panel
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const closeSettingsPanelBtn = document.getElementById('close-settings-panel-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const refreshModelsBtn = document.getElementById('refresh-models-btn');
    const localModelSelect = document.getElementById('local-model-select');
    const geminiModelSelect = document.getElementById('gemini-model-select'); // New selector
    const llmProviderRadios = document.querySelectorAll('input[name="llmProvider"]');
    const speechProviderRadios = document.querySelectorAll('input[name="speechProvider"]');

    // --- State ---
    let settings = {};
    let generatedFiles = {};
    let currentEditorFiles = {};
    let editedFiles = {};
    let isRecording = false;
    let mediaRecorder;
    let audioChunks = [];
    let browserRecognition;
    let activeRecordingInput = null;

    // --- API Helper ---
    const api = {
        post: async (endpoint, body) => {
            const response = await fetch(`/api/gen-studio-testing${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'An unknown error occurred.');
            }
            return result;
        }
    };

    // --- Settings Logic ---
    function initializeSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('genStudioSettings'));
        settings = {
            llmProvider: 'gemini',
            geminiModel: 'gemini-pro', // Default value
            localModel: '',
            speechProvider: 'browser',
            ...savedSettings
        };

        document.querySelector(`input[name="llmProvider"][value="${settings.llmProvider}"]`).checked = true;
        document.querySelector(`input[name="speechProvider"][value="${settings.speechProvider}"]`).checked = true;

        if (settings.localModel) {
            let option = localModelSelect.querySelector(`option[value="${settings.localModel}"]`);
            if (!option) {
                option = new Option(settings.localModel, settings.localModel, true, true);
                localModelSelect.add(option);
            }
            localModelSelect.value = settings.localModel;
        }
        
        // This will be populated by fetchGeminiModels, but set the value if it exists
        geminiModelSelect.value = settings.geminiModel;


        settingsBtn.addEventListener('click', () => settingsPanel.classList.remove('panel-closed'));
        closeSettingsPanelBtn.addEventListener('click', () => settingsPanel.classList.add('panel-closed'));
        saveSettingsBtn.addEventListener('click', saveAndApplySettings);
        refreshModelsBtn.addEventListener('click', fetchLocalModels);
        llmProviderRadios.forEach(radio => radio.addEventListener('change', toggleProviderSections));

        toggleProviderSections();
        fetchLocalModels();
        fetchGeminiModels(); // Fetch Gemini models on init
        applySettings();
    }

    function toggleProviderSections() {
        const selectedProvider = document.querySelector('input[name="llmProvider"]:checked').value;
        document.getElementById('gemini-settings-section').style.display = selectedProvider === 'gemini' ? 'block' : 'none';
        document.getElementById('local-llm-settings-section').style.display = selectedProvider === 'local' ? 'block' : 'none';
    }

    async function fetchGeminiModels() {
        try {
            geminiModelSelect.innerHTML = '<option>Fetching...</option>';
            const response = await fetch(`/api/gen-studio-testing/gemini-models`);
            if (!response.ok) throw new Error('Failed to fetch Gemini models from server.');
            const models = await response.json();
            geminiModelSelect.innerHTML = '';
            models.forEach(model => {
                const option = new Option(model.name, model.id);
                geminiModelSelect.add(option);
            });
            // Restore saved selection
            if (settings.geminiModel && geminiModelSelect.querySelector(`option[value="${settings.geminiModel}"]`)) {
                geminiModelSelect.value = settings.geminiModel;
            }
        } catch (error) {
            console.error('Error fetching Gemini models:', error);
            geminiModelSelect.innerHTML = `<option>${error.message}</option>`;
        }
    }

    async function fetchLocalModels() {
        try {
            localModelSelect.innerHTML = '<option>Fetching...</option>';
            const response = await fetch(`/api/gen-studio-testing/local-models`);
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
        localStorage.setItem('genStudioSettings', JSON.stringify(settings));
        alert('Settings saved!');
        settingsPanel.classList.add('panel-closed');
        applySettings();
    }

    function applySettings() {
        if (browserRecognition) browserRecognition.abort();
        if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();

        if (settings.speechProvider === 'browser') {
            setupBrowserRecognition();
        } else {
            browserRecognition = null;
        }
    }

    // --- Speech Recognition (STT) Logic ---
    function setupBrowserRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Browser Speech Recognition not supported.");
            return;
        }
        browserRecognition = new SpeechRecognition();
        browserRecognition.continuous = false;
        browserRecognition.interimResults = false;
        browserRecognition.lang = 'en-US';

        browserRecognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            if (activeRecordingInput) {
                activeRecordingInput.value = transcript;
            }
        };
        browserRecognition.onerror = (event) => console.error('Browser speech recognition error', event.error);
        browserRecognition.onend = () => {
            if (!isRecording) return;
            isRecording = false;
            createMicBtn.classList.remove('recording');
            editMicBtn.classList.remove('recording');
        };
    }

    const startRecording = async (targetInput, micButton) => {
        if (isRecording) return;
        isRecording = true;
        activeRecordingInput = targetInput;
        micButton.classList.add('recording');

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
                        ws.send(JSON.stringify({ type: 'audio_config', purpose: 'llm' }));
                        ws.send(audioBlob);
                    }
                    audioChunks = [];
                };
                audioChunks = [];
                mediaRecorder.start();
            } catch (err) {
                console.error('Error accessing microphone for local STT:', err);
                isRecording = false;
                micButton.classList.remove('recording');
                alert('Could not access microphone.');
            }
        }
    };

    const stopRecording = (micButton) => {
        if (!isRecording) return;
        if (settings.speechProvider === 'browser' && browserRecognition) {
            browserRecognition.stop();
        } else if (mediaRecorder) {
            mediaRecorder.stop();
        }
        isRecording = false;
        micButton.classList.remove('recording');
    };
    
    ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        switch (message.type) {
            case 'llm_transcription_result':
                if (activeRecordingInput) {
                    activeRecordingInput.value = message.text;
                }
                break;
            case 'error':
                setStatus('error', `Server Error: ${message.data}`);
                break;
        }
    };

    // --- Tab Switching Logic ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === tab.dataset.tab);
            });
        });
    });

    // --- App Creator Logic ---
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const appName = appNameInput.value.trim();
        const userRequest = createRequestInput.value.trim();
        if (!appName || !userRequest) {
            setStatus('error', 'App Name and AI Prompt are required.');
            return;
        }

        generateAppBtn.disabled = true;
        mountAppBtn.disabled = true;
        setStatus('working', 'Generating code with AI... This may take a moment.');

        try {
            const body = {
                appName,
                userRequest,
                provider: settings.llmProvider,
                model: settings.llmProvider === 'gemini' ? settings.geminiModel : settings.localModel
            };
            const result = await api.post('/create', body);
            generatedFiles = result.files;
            displayGeneratedFiles(generatedFiles);
            mountAppBtn.disabled = false;
            setStatus('success', 'Code generated successfully. Review the files and click "Create and Mount App".');
        } catch (error) {
            setStatus('error', `Error generating code: ${error.message}`);
        } finally {
            generateAppBtn.disabled = false;
        }
    });

    // --- Diff Generator ---
    function simpleDiff(oldStr, newStr) {
        const oldLines = oldStr.split('\n');
        const newLines = newStr.split('\n');
        const M = oldLines.length;
        const N = newLines.length;
        const lcsTable = Array(M + 1).fill(null).map(() => Array(N + 1).fill(0));
        for (let i = 1; i <= M; i++) {
            for (let j = 1; j <= N; j++) {
                if (oldLines[i - 1] === newLines[j - 1]) {
                    lcsTable[i][j] = 1 + lcsTable[i - 1][j - 1];
                } else {
                    lcsTable[i][j] = Math.max(lcsTable[i - 1][j], lcsTable[i][j - 1]);
                }
            }
        }
        let i = M, j = N;
        const diff = [];
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
                diff.unshift({ type: 'unchanged', line: oldLines[i - 1] }); i--; j--;
            } else if (j > 0 && (i === 0 || lcsTable[i][j - 1] >= lcsTable[i - 1][j])) {
                diff.unshift({ type: 'added', line: newLines[j - 1] }); j--;
            } else if (i > 0 && (j === 0 || lcsTable[i][j - 1] < lcsTable[i - 1][j])) {
                diff.unshift({ type: 'removed', line: oldLines[i - 1] }); i--;
            } else { break; }
        }
        let html = '';
        diff.forEach(item => {
            const escapedLine = item.line.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>') || ' ';
            const sign = item.type === 'added' ? '+' : item.type === 'removed' ? '-' : ' ';
            html += `<div class="diff-line diff-${item.type}"><span class="sign">${sign}</span>${escapedLine}</div>`;
        });
        return `<pre><code>${html}</code></pre>`;
    }
    
    // --- App Editor Logic ---
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const appSlug = appSelector.value;
        const userRequest = editRequestInput.value.trim();

        if(!appSlug || !userRequest) {
            setStatus('error', 'Please select an app and provide a prompt.');
            return;
        }
        
        generateEditBtn.disabled = true;
        saveChangesBtn.disabled = true;
        setStatus('working', 'Generating edits with AI...');

        try {
             const body = {
                appSlug,
                userRequest,
                provider: settings.llmProvider,
                model: settings.llmProvider === 'gemini' ? settings.geminiModel : settings.localModel
            };
            const result = await api.post('/edit', body);
            editedFiles = result.files; // Store the new files
            displayEditedFiles(currentEditorFiles, editedFiles);

            saveChangesBtn.disabled = false;
            setStatus('success', 'Edits generated. Review the code and click "Save Changes".');
        } catch(error) {
            setStatus('error', `Error generating edits: ${error.message}`);
        } finally {
            generateEditBtn.disabled = false;
        }
    });
    
    // --- Other Listeners and Functions ---
    createFileTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            createFileTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            createCodeDisplays.forEach(display => {
                display.classList.toggle('active', display.dataset.file === tab.dataset.file);
            });
        });
    });
    
    function displayEditedFiles(original, edited) {
        editorFileTabs.innerHTML = '';
        editorCodeDisplay.innerHTML = '';
        const fileKeys = { routes: 'routes.js', html: 'index.html', script: 'script.js', style: 'style.css' };

        Object.keys(fileKeys).forEach((key, index) => {
            const tab = document.createElement('button');
            tab.className = `file-tab-link ${index === 0 ? 'active' : ''}`;
            tab.dataset.file = key;
            tab.textContent = fileKeys[key];
            editorFileTabs.appendChild(tab);

            const content = document.createElement('div');
            content.className = `code-content ${index === 0 ? 'active' : ''}`;
            content.dataset.file = key;
            content.innerHTML = simpleDiff(original[key], edited[key]);
            editorCodeDisplay.appendChild(content);
        });
    }

    editorFileTabs.addEventListener('click', (e) => {
        if (!e.target.matches('.file-tab-link')) return;

        const targetFile = e.target.dataset.file;
        editorFileTabs.querySelectorAll('.file-tab-link').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');

        editorCodeDisplay.querySelectorAll('.code-content').forEach(c => {
            c.classList.toggle('active', c.dataset.file === targetFile);
        });
    });

    function displayGeneratedFiles(files) {
        document.getElementById('create-routes-display').querySelector('code').textContent = files.routes;
        document.getElementById('create-html-display').querySelector('code').textContent = files.html;
        document.getElementById('create-script-display').querySelector('code').textContent = files.script;
        document.getElementById('create-style-display').querySelector('code').textContent = files.style;
    }

    mountAppBtn.addEventListener('click', async () => {
        if (Object.keys(generatedFiles).length < 4 || Object.values(generatedFiles).some(f => !f)) {
            setStatus('error', 'Not all files were generated correctly. Cannot mount.');
            return;
        }
        mountAppBtn.disabled = true;
        setStatus('working', 'Creating and mounting the new application...');
        try {
            const body = { appName: appNameInput.value, files: generatedFiles };
            const result = await api.post('/mount', body);
            
            statusDiv.className = 'status-success';
            const link = `<a href="/${result.appSlug}/" target="_blank">/${result.appSlug}/</a>`;
            statusDiv.innerHTML = `${result.message}<br>Access your new app here: ${link}`;

            createForm.reset();
            generatedFiles = {};
        } catch (error) {
            setStatus('error', `Error mounting app: ${error.message}`);
            mountAppBtn.disabled = false; // Re-enable on failure
        }
    });

    async function fetchAppsForEditor() {
        try {
            const response = await fetch('/api/gen-studio-testing/apps');
            if (!response.ok) throw new Error('Failed to load apps.');
            const apps = await response.json();
            appSelector.innerHTML = '<option value="">-- Choose an App --</option>';
            apps.forEach(app => appSelector.add(new Option(app, app)));
        } catch (error) {
            appSelector.innerHTML = `<option value="">${error.message}</option>`;
        }
    }

    appSelector.addEventListener('change', async (e) => {
        const slug = e.target.value;
        clearEditorView();
        if (!slug) return;
        
        setStatus('working', `Loading files for '${slug}'...`);
        try {
            const response = await fetch(`/api/gen-studio-testing/app/${slug}`);
            const files = await response.json();
            if(!response.ok) throw new Error(files.error);
            currentEditorFiles = files; // Store original files
            setStatus('hidden', '');
        } catch(error) {
            setStatus('error', error.message);
            clearEditorView();
        }
    });

    saveChangesBtn.addEventListener('click', async () => {
        const appSlug = appSelector.value;
        if(!appSlug || Object.keys(editedFiles).length === 0) return;

        saveChangesBtn.disabled = true;
        setStatus('working', `Saving changes for '${appSlug}'...`);
        try {
            const response = await fetch(`/api/gen-studio-testing/save`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appSlug, files: editedFiles }) // Use the stored edited files
            });
            const result = await response.json();
            if(!response.ok) throw new Error(result.error);
            setStatus('success', result.message);
            currentEditorFiles = { ...editedFiles }; // The saved files are now the current files
        } catch (error) {
            setStatus('error', `Failed to save: ${error.message}`);
        } finally {
            saveChangesBtn.disabled = false;
        }
    });
    
    function clearEditorView() {
        currentEditorFiles = {};
        editedFiles = {};
        editorFileTabs.innerHTML = '';
        editorCodeDisplay.innerHTML = `<div class="placeholder-text"><p>Generate edits to see a comparison here.</p></div>`;
        saveChangesBtn.disabled = true;
    }

    createMicBtn.addEventListener('mousedown', () => startRecording(createRequestInput, createMicBtn));
    createMicBtn.addEventListener('mouseup', () => stopRecording(createMicBtn));
    createMicBtn.addEventListener('mouseleave', () => { if(isRecording) stopRecording(createMicBtn); });

    editMicBtn.addEventListener('mousedown', () => startRecording(editRequestInput, editMicBtn));
    editMicBtn.addEventListener('mouseup', () => stopRecording(editMicBtn));
    editMicBtn.addEventListener('mouseleave', () => { if(isRecording) stopRecording(editMicBtn); });

    function setStatus(type, message) {
        statusDiv.className = `status-${type}`;
        statusDiv.textContent = message;
        // This is a small fix to allow the innerHTML to be set from mountAppBtn
        if (type === 'success' && /<[a-z][\s\S]*>/i.test(message)) {
            statusDiv.innerHTML = message;
        }
    }

    // --- Initial Load ---
    initializeSettings();
    fetchAppsForEditor();
});