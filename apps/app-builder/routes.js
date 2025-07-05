// apps/app-builder/routes.js
const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');

router.post('/create', async (req, res) => {
    const { appName, files } = req.body;

    if (!appName || !files) {
        return res.status(400).json({ error: 'App name and files are required.' });
    }

    const appSlug = appName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!appSlug) {
        return res.status(400).json({ error: 'Invalid App Name. Results in empty slug.' });
    }

    const appRootPath = path.join(__dirname, '..', '..'); // The root 'context' directory
    const newAppPath = path.join(appRootPath, 'apps', appSlug);
    const newAppPublicPath = path.join(newAppPath, 'public');
    const mainServerPath = path.join(appRootPath, 'server.js');

    try {
        // 1. Check if app already exists to prevent overwriting
        try {
            await fs.access(newAppPath);
            return res.status(409).json({ error: `App '${appSlug}' already exists.` });
        } catch (e) {
            // Doesn't exist, which is good. Continue.
        }

        // 2. Create directory structure
        await fs.mkdir(newAppPublicPath, { recursive: true });

        // 3. Write all the files for the new app
        await fs.writeFile(path.join(newAppPath, 'routes.js'), files.routes);
        await fs.writeFile(path.join(newAppPublicPath, 'index.html'), files.html);
        await fs.writeFile(path.join(newAppPublicPath, 'script.js'), files.script);
        await fs.writeFile(path.join(newAppPublicPath, 'style.css'), files.style);
        
        // 4. Read, modify, and write the main server.js
        const serverContent = await fs.readFile(mainServerPath, 'utf-8');
        
        const injectionMarker = '// {{APP_MOUNT_POINT}}';
        if (!serverContent.includes(injectionMarker)) {
             throw new Error(`Could not find injection marker '${injectionMarker}' in server.js`);
        }
        
        const newRoutesCode = `
// --- Routes for ${appSlug} ---
app.use('/${appSlug}', express.static(path.join(__dirname, 'apps', '${appSlug}', 'public')));
const ${appSlug.replace(/-/g, '')}Routes = require('./apps/${appSlug}/routes');
app.use('/api/${appSlug}', ${appSlug.replace(/-/g, '')}Routes);
`;

        const newServerContent = serverContent.replace(injectionMarker, `${newRoutesCode}\n${injectionMarker}`);
        await fs.writeFile(mainServerPath, newServerContent, 'utf-8');

        res.status(201).json({ 
            message: `App '${appSlug}' created successfully! Nodemon should be restarting the server. Visit your new app at http://localhost:3000/${appSlug}`
        });

    } catch (error) {
        console.error('Failed to create app:', error);
        res.status(500).json({ error: `Failed to create app: ${error.message}` });
    }
});

module.exports = router;