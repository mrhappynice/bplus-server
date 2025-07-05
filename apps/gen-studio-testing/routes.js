
// apps/gen-studio-testing/routes.js
require('dotenv').config({ path: '../../.env' });
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const LM_STUDIO_URL = 'http://localhost:1234/v1/chat/completions';
const LM_STUDIO_MODELS_URL = 'http://localhost:1234/v1/models';
const APPS_DIR = path.join(__dirname, '..');
const PROTECTED_APPS = ['app-builder', 'app-manager', 'md-chat', 'pic-chat', 'gen-studio'];

function parseAiResponse(aiResponse) {
    const files = { routes: '', html: '', script: '', style: '' };
    const fileMappings = { 'routes.js': 'routes', 'index.html': 'html', 'script.js': 'script', 'style.css': 'style' };
    const regex = /--- START OF FILE apps\/[a-zA-Z0-9_-]+\/(public\/)?(routes\.js|index\.html|script\.js|style\.css) ---\n([\s\S]*?)\n--- END OF FILE/g;
    let match;
    while ((match = regex.exec(aiResponse)) !== null) {
        const fileName = match[2];
        const fileKey = fileMappings[fileName];
        if (fileKey) { files[fileKey] = match[3].trim(); }
    }
    return files;
}

router.get('/apps', async (req, res) => {
    try {
        const entries = await fs.readdir(APPS_DIR, { withFileTypes: true });
        const appDirs = entries
            .filter(entry => entry.isDirectory() && !PROTECTED_APPS.includes(entry.name))
            .map(entry => entry.name);
        res.json(appDirs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list apps.' });
    }
});

router.get('/app/:slug', async (req, res) => {
    const { slug } = req.params;
    if (PROTECTED_APPS.includes(slug)) {
        return res.status(403).json({ error: 'This is a protected app.' });
    }
    const appPath = path.join(APPS_DIR, slug);
    const publicPath = path.join(appPath, 'public');
    try {
        const files = {
            routes: await fs.readFile(path.join(appPath, 'routes.js'), 'utf-8'),
            html: await fs.readFile(path.join(publicPath, 'index.html'), 'utf-8'),
            script: await fs.readFile(path.join(publicPath, 'script.js'), 'utf-8'),
            style: await fs.readFile(path.join(publicPath, 'style.css'), 'utf-8'),
        };
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: `Failed to read files for app: ${slug}` });
    }
});

router.get('/gemini-models', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set.");
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
        const response = await axios.get(url);
        const compatibleModels = response.data.models.filter(model => 
            model.supportedGenerationMethods.includes('generateContent') 
        );
        res.json(compatibleModels.map(model => ({
            name: model.displayName,
            id: model.name.replace('models/', '')
        })));
    } catch (error) {
        console.error('Failed to fetch Gemini models:', error.message);
        res.status(500).json({ error: 'Failed to fetch Gemini models.' });
    }
});

router.post('/create', async (req, res) => {
    const { appName, userRequest, provider, model: modelId } = req.body;
    const appSlug = appName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // CORRECTED: Restored the full, detailed prompt.
    const creationPrompt = `You are an expert full-stack developer specializing in Node.js, Express, and vanilla JavaScript. Your task is to **create** a new self-contained application from scratch.

### System Architecture
The server hosts multiple "mini-apps." Each app has a simple structure:
\`\`\`
apps/
└── <app-slug>/
    ├── routes.js
    └── public/
        ├── index.html
        ├── script.js
        └── style.css
\`\`\`
The main server mounts the frontend at \`/<app-slug>\` and the backend at \`/api/<app-slug>\`. Therefore, any \`fetch\` request in \`script.js\` MUST be prefixed with \`/api/${appSlug}\`.

### My Request
I want to create a new application named **\`${appName}\`** (slug: \`${appSlug}\`). Here is my idea:
"${userRequest}"

### Output Format
Generate the complete code for all four standard files. Your response MUST be only the code, formatted exactly as shown below.

--- START OF FILE apps/${appSlug}/routes.js ---
(Your generated code for routes.js here)
--- END OF FILE apps/${appSlug}/routes.js ---

--- START OF FILE apps/${appSlug}/public/index.html ---
(Your generated code for index.html here)
--- END OF FILE apps/${appSlug}/public/index.html ---

--- START OF FILE apps/${appSlug}/public/script.js ---
(Your generated code for script.js here)
--- END OF FILE apps/${appSlug}/public/script.js ---

--- START OF FILE apps/${appSlug}/public/style.css ---
(Your generated code for style.css here)
--- END OF FILE apps/${appSlug}/public/style.css ---`;

    try {
        let aiResponse;
        if (provider === 'gemini') {
            const model = genAI.getGenerativeModel({ model: modelId || "gemini-pro" });
            const result = await model.generateContent(creationPrompt);
            aiResponse = result.response.text();
        } else {
            const payload = { model: modelId, messages: [{ role: "user", content: creationPrompt }], stream: false, max_tokens: 4096 };
            const lmResponse = await axios.post(LM_STUDIO_URL, payload);
            aiResponse = lmResponse.data.choices[0].message.content;
        }
        const files = parseAiResponse(aiResponse);
        res.json({ files });
    } catch (error) {
        console.error("AI Generation Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: `Failed to get response from AI: ${error.message}` });
    }
});

router.post('/mount', async (req, res) => {
    const { appName, files } = req.body;
    const appSlug = appName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const appRootPath = path.join(__dirname, '..', '..');
    const newAppPath = path.join(appRootPath, 'apps', appSlug);
    const newAppPublicPath = path.join(newAppPath, 'public');
    const mainServerPath = path.join(appRootPath, 'server.js');

    try {
        await fs.access(newAppPath);
        return res.status(409).json({ error: `App '${appSlug}' already exists.` });
    } catch (e) { /* App doesn't exist, proceed. */ }

    try {
        await fs.mkdir(newAppPublicPath, { recursive: true });
        await fs.writeFile(path.join(newAppPath, 'routes.js'), files.routes);
        await fs.writeFile(path.join(newAppPublicPath, 'index.html'), files.html);
        await fs.writeFile(path.join(newAppPublicPath, 'script.js'), files.script);
        await fs.writeFile(path.join(newAppPublicPath, 'style.css'), files.style);
        
        const serverContent = await fs.readFile(mainServerPath, 'utf-8');
        const injectionMarker = '// {{APP_MOUNT_POINT}}';
        const newRoutesCode = `
// --- Routes for ${appSlug} ---
app.use('/${appSlug}', express.static(path.join(__dirname, 'apps', '${appSlug}', 'public')));
const ${appSlug.replace(/-/g, '')}Routes = require('./apps/${appSlug}/routes');
app.use('/api/${appSlug}', ${appSlug.replace(/-/g, '')}Routes);
`;
        const newServerContent = serverContent.replace(injectionMarker, `${newRoutesCode}\n${injectionMarker}`);
        await fs.writeFile(mainServerPath, newServerContent, 'utf-8');
        res.status(201).json({ 
            message: `App '${appSlug}' created successfully! Nodemon should be restarting the server.`,
            appSlug: appSlug 
        });
    } catch (error) {
        res.status(500).json({ error: `Failed to mount app: ${error.message}` });
    }
});

router.post('/edit', async (req, res) => {
    const { appSlug, userRequest, provider, model: modelId } = req.body;
    try {
        const appPath = path.join(APPS_DIR, appSlug);
        const publicPath = path.join(appPath, 'public');
        const existingFiles = {
            routes: await fs.readFile(path.join(appPath, 'routes.js'), 'utf-8'),
            html: await fs.readFile(path.join(publicPath, 'index.html'), 'utf-8'),
            script: await fs.readFile(path.join(publicPath, 'script.js'), 'utf-8'),
            style: await fs.readFile(path.join(publicPath, 'style.css'), 'utf-8'),
        };

        // CORRECTED: Restored the full, detailed prompt.
        const editPrompt = `You are an expert full-stack developer. Your task is to **modify** an existing self-contained application.

### My Request
For the app named **\`${appSlug}\`**, I want to make the following changes:
"${userRequest}"

### Provided Files
Here are the complete current files for the app. Modify them according to my request.

--- START OF FILE apps/${appSlug}/routes.js ---
${existingFiles.routes}
--- END OF FILE apps/${appSlug}/routes.js ---

--- START OF FILE apps/${appSlug}/public/index.html ---
${existingFiles.html}
--- END OF FILE apps/${appSlug}/public/index.html ---

--- START OF FILE apps/${appSlug}/public/script.js ---
${existingFiles.script}
--- END OF FILE apps/${appSlug}/public/script.js ---

--- START OF FILE apps/${appSlug}/public/style.css ---
${existingFiles.style}
--- END OF FILE apps/${appSlug}/public/style.css ---

### Output Format
Your response MUST be only the complete, modified files, formatted exactly as shown in the "Provided Files" section. If a file is unchanged, include it as-is.`;
        
        let aiResponse;
        if (provider === 'gemini') {
            const model = genAI.getGenerativeModel({ model: modelId || "gemini-pro" });
            const result = await model.generateContent(editPrompt);
            aiResponse = result.response.text();
        } else {
            const payload = { model: modelId, messages: [{ role: "user", content: editPrompt }], stream: false, max_tokens: 4096 };
            const lmResponse = await axios.post(LM_STUDIO_URL, payload);
            aiResponse = lmResponse.data.choices[0].message.content;
        }
        const files = parseAiResponse(aiResponse);
        res.json({ files });
    } catch (error) {
        console.error("AI Edit Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: `Failed to get response from AI: ${error.message}` });
    }
});

router.put('/save', async (req, res) => {
    const { appSlug, files } = req.body;
    if (PROTECTED_APPS.includes(appSlug)) {
        return res.status(403).json({ error: 'This is a protected app and cannot be edited.' });
    }
    const appPath = path.join(APPS_DIR, appSlug);
    const publicPath = path.join(appPath, 'public');
    try {
        await fs.writeFile(path.join(appPath, 'routes.js'), files.routes);
        await fs.writeFile(path.join(publicPath, 'index.html'), files.html);
        await fs.writeFile(path.join(publicPath, 'script.js'), files.script);
        await fs.writeFile(path.join(publicPath, 'style.css'), files.style);
        res.json({ message: `App '${appSlug}' updated successfully.` });
    } catch (error) {
        res.status(500).json({ error: `Failed to update app: ${appSlug}` });
    }
});

router.get('/local-models', async (req, res) => {
    try {
        const response = await axios.get(LM_STUDIO_MODELS_URL);
        res.json(response.data.data);
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({ error: 'Connection to LM Studio failed.' });
        }
        res.status(500).json({ error: 'Failed to get models from LM Studio.' });
    }
});

module.exports = router;
