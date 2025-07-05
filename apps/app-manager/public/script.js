document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const appSelector = document.getElementById('appSelector');
    const editorSection = document.getElementById('editor-section');
    const statusDiv = document.getElementById('status-message');
    const clipboardHelper = document.getElementById('clipboard-helper');
    const promptDisplaySection = document.getElementById('prompt-display-section');
    const finalPromptDisplay = document.getElementById('final-prompt-display');

    // Textareas
    const routesJsText = document.getElementById('routesJs');
    const indexHtmlText = document.getElementById('indexHtml');
    const scriptJsText = document.getElementById('scriptJs');
    const styleCssText = document.getElementById('styleCss');

    // Buttons
    const saveChangesBtn = document.getElementById('save-changes-btn');
    const deleteAppBtn = document.getElementById('delete-app-btn');
    const generateContextBtn = document.getElementById('generate-context-btn');
    const generatePromptBtn = document.getElementById('generate-prompt-btn');
    const copyContextBtn = document.getElementById('copy-context-btn');

    // --- State Management ---
    let currentAppSlug = null;
    let generatedContext = ''; // To store the generated context source files

    // --- NEW: LLM Prompt Template ---
    const LLM_INSTRUCTION_TEMPLATE = `You are an expert full-stack developer specializing in Node.js, Express, and vanilla JavaScript. Your task is to modify an existing self-contained application within a unified server environment. You must adhere strictly to the architecture and file structure described below.

### System Architecture & Rules

The server (\`server.js\`) acts as a central hub that hosts multiple "mini-apps." Each app follows a consistent and simple file structure.

1.  **Main Server (\`server.js\`):** This file is NOT provided and MUST NOT be modified. It is responsible for mounting each app's routes.

2.  **App Directory Structure:** Every application exists within the \`apps/\` directory and has the following structure. The \`<app-slug>\` is the unique, URL-friendly name of the app.

    \`\`\`
    apps/
    └── <app-slug>/
        ├── routes.js        (Backend API Logic for this specific app)
        └── public/          (All frontend files for this app)
            ├── index.html
            ├── script.js
            └── style.css
    \`\`\`

3.  **How Apps are Mounted & Accessed:** The main \`server.js\` file mounts each app using two specific lines of code:
    *   **Frontend:** \`app.use('/<app-slug>', express.static(...));\`
        *   This makes the \`public\` directory accessible at \`http://localhost:3000/<app-slug>\`.
    *   **Backend:** \`app.use('/api/<app-slug>', ...);\`
        *   This prefixes all backend routes from \`routes.js\` with \`/api/<app-slug>\`.

4.  **Client-Server Interaction:** The frontend \`script.js\` file MUST use the correct API prefix when making \`fetch\` requests to its own backend. For example: \`fetch('/api/<app-slug>/my-endpoint')\`.

### Your Task & Provided Files

**My Request:** {USER_REQUEST}
`;

    const LLM_OUTPUT_FORMAT = `
### Output Format

Your response MUST be only the complete, modified files.`;


    // --- Core Functions ---

    async function fetchApps() {
        try {
            const response = await fetch('/api/appmanager/apps');
            if (!response.ok) throw new Error('Failed to load apps from server.');
            const apps = await response.json();
            
            appSelector.innerHTML = '<option value="">-- Choose an App --</option>';
            apps.forEach(app => appSelector.add(new Option(app, app)));
        } catch (error) {
            setStatus('error', `Error: ${error.message}`);
        }
    }

    async function loadAppForEditing(slug) {
        // Reset UI state when changing apps
        generatedContext = '';
        copyContextBtn.disabled = true;
        generatePromptBtn.disabled = true;
        promptDisplaySection.classList.add('hidden');
        finalPromptDisplay.value = '';

        if (!slug) {
            editorSection.classList.add('hidden');
            currentAppSlug = null;
            return;
        }

        currentAppSlug = slug;
        setStatus('working', `Loading files for '${slug}'...`);

        try {
            const response = await fetch(`/api/appmanager/app/${slug}`);
            const files = await response.json();
            if (!response.ok) throw new Error(files.error || 'Unknown error.');

            routesJsText.value = files.routes;
            indexHtmlText.value = files.html;
            scriptJsText.value = files.script;
            styleCssText.value = files.style;

            editorSection.classList.remove('hidden');
            setStatus('hidden', '');
        } catch (error) {
            setStatus('error', `Error: ${error.message}`);
            editorSection.classList.add('hidden');
        }
    }
    
    // --- Context and Clipboard Functions ---
    async function generateAndStoreContext() {
        if (!currentAppSlug) return;
        
        generateContextBtn.disabled = true;
        setStatus('working', `Generating context for '${currentAppSlug}'...`);

        try {
            const response = await fetch(`/api/appmanager/app/${currentAppSlug}/context`, { method: 'POST' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            generatedContext = result.context;
            copyContextBtn.disabled = false;
            generatePromptBtn.disabled = false; // Enable the next step
            setStatus('success', result.message);

        } catch (error) {
            setStatus('error', `Error: ${error.message}`);
        } finally {
            generateContextBtn.disabled = false;
        }
    }

    function generateFullPrompt() {
        if (!generatedContext) {
            setStatus('error', 'Please generate the app context first (Step 1).');
            return;
        }

        const userRequest = prompt("Please describe the changes you want to make to this app:", "Make the h1 element in the HTML red.");

        if (userRequest === null || userRequest.trim() === "") {
            setStatus('error', 'Prompt generation cancelled. A description of changes is required.');
            return;
        }

        // Build the final prompt string
        const finalPrompt = LLM_INSTRUCTION_TEMPLATE.replace('{USER_REQUEST}', userRequest) 
                          + generatedContext 
                          + LLM_OUTPUT_FORMAT.replace(/{APP_SLUG}/g, currentAppSlug);

        finalPromptDisplay.value = finalPrompt;
        promptDisplaySection.classList.remove('hidden');
        setStatus('success', 'LLM prompt generated below. You can now copy the full text.');
        promptDisplaySection.scrollIntoView({ behavior: 'smooth' });
    }

    function copyToClipboard(textToCopy) {
        if (!textToCopy) return;
        clipboardHelper.value = textToCopy;
        clipboardHelper.select();
        clipboardHelper.setSelectionRange(0, 99999);
        try {
            navigator.clipboard.writeText(clipboardHelper.value);
            return true;
        } catch (err) {
            console.error('Clipboard API error:', err);
            return false;
        } finally {
            window.getSelection().removeAllRanges();
        }
    }


    async function saveChanges() {
        if (!currentAppSlug) return;
        saveChangesBtn.disabled = true;
        setStatus('working', `Saving changes for '${currentAppSlug}'...`);
        const payload = { files: { routes: routesJsText.value, html: indexHtmlText.value, script: scriptJsText.value, style: styleCssText.value } };
        try {
            const response = await fetch(`/api/appmanager/app/${currentAppSlug}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setStatus('success', result.message);
        } catch (error) {
            setStatus('error', `Error: ${error.message}`);
        } finally {
            saveChangesBtn.disabled = false;
        }
    }

    async function deleteApp() {
        if (!currentAppSlug) return;
        const confirmation = prompt(`This is irreversible. You will delete the files and server routes for '${currentAppSlug}'.\n\nTo confirm, type the app's name ('${currentAppSlug}') below:`);
        if (confirmation !== currentAppSlug) {
            setStatus('error', 'Deletion cancelled. The name did not match.');
            setTimeout(() => setStatus('hidden', ''), 3000);
            return;
        }
        deleteAppBtn.disabled = true;
        setStatus('working', `Deleting '${currentAppSlug}'...`);
        try {
            const response = await fetch(`/api/appmanager/app/${currentAppSlug}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setStatus('success', result.message);
            editorSection.classList.add('hidden');
            currentAppSlug = null;
            await fetchApps();
        } catch (error) {
            setStatus('error', `Error: ${error.message}`);
        } finally {
            deleteAppBtn.disabled = false;
        }
    }

    function setStatus(type, message) {
        if(type === 'hidden') {
            statusDiv.className = 'status-hidden';
            statusDiv.textContent = '';
            return;
        }
        statusDiv.className = `status-${type}`;
        statusDiv.textContent = message;
    }

    // --- Event Listeners ---
    appSelector.addEventListener('change', (e) => loadAppForEditing(e.target.value));
    saveChangesBtn.addEventListener('click', saveChanges);
    deleteAppBtn.addEventListener('click', deleteApp);
    generateContextBtn.addEventListener('click', generateAndStoreContext);
    generatePromptBtn.addEventListener('click', generateFullPrompt);
    copyContextBtn.addEventListener('click', () => {
        if (copyToClipboard(generatedContext)) {
            setStatus('success', 'Context source code copied to clipboard!');
        } else {
            setStatus('error', 'Failed to copy text. Please try again.');
        }
    });

    // --- Initial Load ---
    fetchApps();
});