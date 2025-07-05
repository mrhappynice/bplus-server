document.addEventListener('DOMContentLoaded', () => {
    const appNameInput = document.getElementById('appName');
    const routesJsText = document.getElementById('routesJs');
    const indexHtmlText = document.getElementById('indexHtml');
    const scriptJsText = document.getElementById('scriptJs');
    const styleCssText = document.getElementById('styleCss');
    const form = document.getElementById('app-builder-form');
    const statusDiv = document.getElementById('status-message');
    const createAppBtn = document.getElementById('create-app-btn');

    // NEW: Elements for AI prompt generation
    const generateAiPromptBtn = document.getElementById('generate-ai-prompt-btn');
    const promptDisplaySection = document.getElementById('prompt-display-section');
    const finalPromptDisplay = document.getElementById('final-prompt-display');

    // NEW: Template for generating a new app with an LLM
    const LLM_PROMPT_FOR_CREATION = `You are an expert full-stack developer specializing in Node.js, Express, and vanilla JavaScript. Your task is to **create** a new self-contained application from scratch to be run in a unified server environment. You must adhere strictly to the architecture and file structure described below.

### System Architecture & Rules

The server (\`server.js\`) acts as a central hub that hosts multiple "mini-apps." Each app follows a consistent and simple file structure.

1.  **Main Server (\`server.js\`):** This file is NOT provided and MUST NOT be modified by you. It is responsible for mounting each app's routes.

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

4.  **Client-Server Interaction:** The frontend \`script.js\` file MUST use the correct API prefix when making \`fetch\` requests to its own backend. For an app named \`{APP_SLUG}\`, any fetch request must be pointed to \`/api/{APP_SLUG}/my-endpoint\`. This is critical.

### Your Task

**My Request:** I want to create a new application. Here is my idea:
"{USER_REQUEST}"

Please generate the complete code for all four standard files for an application named **\`{APP_SLUG}\`**. The application should be fully functional and implement the idea described above.

### Output Format

Your response MUST be only the complete, generated files, formatted exactly as shown below. Provide all four files in your response. Briefly explain your design choices in the "Reasoning" section at the end.

--- START OF FILE apps/{APP_SLUG}/routes.js ---
(Your generated code for routes.js here)
--- END OF FILE apps/{APP_SLUG}/routes.js ---

--- START OF FILE apps/{APP_SLUG}/public/index.html ---
(Your generated code for index.html here)
--- END OF FILE apps/{APP_SLUG}/public/index.html ---

--- START OF FILE apps/{APP_SLUG}/public/script.js ---
(Your generated code for script.js here)
--- END OF FILE apps/{APP_SLUG}/public/script.js ---

--- START OF FILE apps/{APP_SLUG}/public/style.css ---
(Your generated code for style.css here)
--- END OF FILE apps/{APP_SLUG}/public/style.css ---

--- REASONING ---
(Your brief explanation of the changes made.)`;


    const templates = {
        routesJs: (slug) => `
// apps/${slug}/routes.js
const express = require('express');
const router = express.Router();

// Example API endpoint
router.get('/hello', (req, res) => {
    res.json({ message: 'Hello from the ${slug} app!' });
});

module.exports = router;
`,
        indexHtml: (name, slug) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to the ${name} App!</h1>
        <p>You can access the backend at <a href="/api/${slug}/hello" target="_blank">/api/${slug}/hello</a></p>
        <p id="message-from-js"></p>
    </div>
    <script src="script.js"></script>
</body>
</html>
`,
        scriptJs: () => `
document.addEventListener('DOMContentLoaded', () => {
    console.log('New app script loaded!');
    document.getElementById('message-from-js').textContent = 'This message was set by script.js.';
});
`,
        styleCss: () => `
body { font-family: sans-serif; background-color: #eef; color: #333; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
.container { text-align: center; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
h1 { color: #6a0dad; }
`
    };

    function populateTemplates() {
        const name = appNameInput.value || "New App";
        const slug = name.trim().toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        routesJsText.value = templates.routesJs(slug);
        indexHtmlText.value = templates.indexHtml(name, slug);
        scriptJsText.value = templates.scriptJs();
        styleCssText.value = templates.styleCss();
    }
    
    appNameInput.addEventListener('input', populateTemplates);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        createAppBtn.disabled = true;
        setStatus('working', 'Creating application...');

        const payload = {
            appName: appNameInput.value,
            files: {
                routes: routesJsText.value,
                html: indexHtmlText.value,
                script: scriptJsText.value,
                style: styleCssText.value
            }
        };

        try {
            const response = await fetch('/api/appbuilder/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'An unknown error occurred.');
            }

            setStatus('success', result.message);
        } catch (error) {
            setStatus('error', `Error: ${error.message}`);
        } finally {
            createAppBtn.disabled = false;
        }
    });

    // NEW: Function to handle AI prompt generation
    function handleGeneratePrompt() {
        const name = appNameInput.value.trim();
        if (!name) {
            alert("Please enter an App Name first.");
            appNameInput.focus();
            return;
        }
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const userRequest = prompt("Describe the application you want to build:", "A simple to-do list app where I can add and remove items.");

        if (userRequest === null || userRequest.trim() === "") {
            setStatus('error', 'AI prompt generation cancelled.');
            setTimeout(() => setStatus('hidden', ''), 3000);
            return;
        }

        const finalPrompt = LLM_PROMPT_FOR_CREATION
            .replace(/{APP_SLUG}/g, slug)
            .replace('{USER_REQUEST}', userRequest);

        finalPromptDisplay.value = finalPrompt;
        promptDisplaySection.classList.remove('hidden');
        setStatus('success', 'AI prompt generated below. After getting the code, paste it into the text areas.');
        promptDisplaySection.scrollIntoView({ behavior: 'smooth' });
    }

    generateAiPromptBtn.addEventListener('click', handleGeneratePrompt);


    function setStatus(type, message) {
        statusDiv.className = `status-${type}`;
        statusDiv.textContent = message;
    }

    // Initial population
    populateTemplates();
});