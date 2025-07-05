// apps/app-manager/routes.js
const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');

const APPS_DIR = path.join(__dirname, '..');
const SERVER_JS_PATH = path.join(__dirname, '..', '..', 'server.js');
const PROTECTED_APPS = ['app-builder', 'app-manager', 'md-chat', 'pic-chat']; // Apps that cannot be managed

// Helper function to build the context string
const buildContextString = (slug, files) => {
    return `Below are the complete files for the app named **\`${slug}\`**.

--- START OF FILE apps/${slug}/routes.js ---
${files.routes}
--- END OF FILE apps/${slug}/routes.js ---

--- START OF FILE apps/${slug}/public/index.html ---
${files.html}
--- END OF FILE apps/${slug}/public/index.html ---

--- START OF FILE apps/${slug}/public/script.js ---
${files.script}
--- END OF FILE apps/${slug}/public/script.js ---

--- START OF FILE apps/${slug}/public/style.css ---
${files.style}
--- END OF FILE apps/${slug}/public/style.css ---
`;
};


// GET /api/appmanager/apps - List all manageable apps
router.get('/apps', async (req, res) => {
    try {
        const entries = await fs.readdir(APPS_DIR, { withFileTypes: true });
        const appDirs = entries
            .filter(entry => entry.isDirectory() && !PROTECTED_APPS.includes(entry.name))
            .map(entry => entry.name);
        res.json(appDirs);
    } catch (error) {
        console.error('Failed to list apps:', error);
        res.status(500).json({ error: 'Failed to list apps.' });
    }
});

// GET /api/appmanager/app/:slug - Get the content of a specific app's files
router.get('/app/:slug', async (req, res) => {
    const { slug } = req.params;
    if (PROTECTED_APPS.includes(slug)) {
        return res.status(403).json({ error: 'This is a protected app and cannot be edited.' });
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
        console.error(`Failed to read files for app ${slug}:`, error);
        res.status(500).json({ error: `Failed to read files for app: ${slug}` });
    }
});

// POST /api/appmanager/app/:slug/context - NEW: Generate context file and return content
router.post('/app/:slug/context', async (req, res) => {
    const { slug } = req.params;
    if (PROTECTED_APPS.includes(slug)) {
        return res.status(403).json({ error: 'Cannot generate context for a protected app.' });
    }
    const appPath = path.join(APPS_DIR, slug);
    const publicPath = path.join(appPath, 'public');
    const contextFilePath = path.join(appPath, 'app-context.txt');

    try {
        const files = {
            routes: await fs.readFile(path.join(appPath, 'routes.js'), 'utf-8'),
            html: await fs.readFile(path.join(publicPath, 'index.html'), 'utf-8'),
            script: await fs.readFile(path.join(publicPath, 'script.js'), 'utf-8'),
            style: await fs.readFile(path.join(publicPath, 'style.css'), 'utf-8'),
        };

        const contextString = buildContextString(slug, files);
        
        // Write the file to the app's directory
        await fs.writeFile(contextFilePath, contextString, 'utf-8');

        // Return the generated content in the response
        res.json({
            message: `Context file generated at apps/${slug}/app-context.txt`,
            context: contextString
        });

    } catch (error) {
        console.error(`Failed to generate context for app ${slug}:`, error);
        res.status(500).json({ error: `Failed to generate context: ${error.message}` });
    }
});


// PUT /api/appmanager/app/:slug - Update the files of an existing app
router.put('/app/:slug', async (req, res) => {
    const { slug } = req.params;
    const { files } = req.body;

    if (PROTECTED_APPS.includes(slug)) {
        return res.status(403).json({ error: 'This is a protected app and cannot be edited.' });
    }
     if (!files) {
        return res.status(400).json({ error: 'File content is required.' });
    }

    const appPath = path.join(APPS_DIR, slug);
    const publicPath = path.join(appPath, 'public');

    try {
        await fs.writeFile(path.join(appPath, 'routes.js'), files.routes);
        await fs.writeFile(path.join(publicPath, 'index.html'), files.html);
        await fs.writeFile(path.join(publicPath, 'script.js'), files.script);
        await fs.writeFile(path.join(publicPath, 'style.css'), files.style);
        res.json({ message: `App '${slug}' updated successfully. Restart server if backend was changed.` });
    } catch (error) {
        console.error(`Failed to update app ${slug}:`, error);
        res.status(500).json({ error: `Failed to update app: ${slug}` });
    }
});


// DELETE /api/appmanager/app/:slug - Delete an entire application
router.delete('/app/:slug', async (req, res) => {
    const { slug } = req.params;
    if (PROTECTED_APPS.includes(slug)) {
        return res.status(403).json({ error: 'This is a protected app and cannot be deleted.' });
    }

    const appPath = path.join(APPS_DIR, slug);

    try {
        // 1. Remove the app's directory
        await fs.rm(appPath, { recursive: true, force: true });

        // 2. Remove the routes from server.js
        const serverContent = await fs.readFile(SERVER_JS_PATH, 'utf-8');
        
        // Regex to find the entire block of code for mounting the app's routes
        const appBlockRegex = new RegExp(`// --- Routes for ${slug} ---[\\s\\S]*?app\\.use\\('/api/${slug}',[^;]*\\);`, 'g');
        
        if (appBlockRegex.test(serverContent)) {
            const newServerContent = serverContent.replace(appBlockRegex, '');
            await fs.writeFile(SERVER_JS_PATH, newServerContent, 'utf-8');
            res.json({ message: `App '${slug}' and its routes have been deleted. Server should be restarting.` });
        } else {
            res.json({ message: `App '${slug}' directory deleted, but no corresponding routes were found in server.js.` });
        }

    } catch (error) {
        console.error(`Failed to delete app ${slug}:`, error);
        res.status(500).json({ error: `Failed to delete app: ${error.message}` });
    }
});


module.exports = router;