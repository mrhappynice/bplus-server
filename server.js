// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const port = 3000;

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes - good practice
app.use(express.json()); // To parse JSON bodies

// --- ROUTES ---

// 1. Serve the main website (static files)
app.use(express.static(path.join(__dirname, 'site')));

// 2. Serve the front-end of the MD-Chat App
app.use('/md-chat', express.static(path.join(__dirname, 'apps', 'md-chat', 'public')));

// 3. Serve the front-end of the Pic-Chat App
app.use('/pic-chat', express.static(path.join(__dirname, 'apps', 'pic-chat', 'public')));
// Special route for pic-chat original images
app.use('/originals', express.static(path.join(__dirname, 'apps', 'pic-chat', 'photos_library')));

// 4. Mount the API routes for MD-Chat
const mdChatRoutes = require('./apps/md-chat/routes');
app.use('/api/mdchat', mdChatRoutes);

// 5. Mount the API routes for Pic-Chat
const picChatRoutes = require('./apps/pic-chat/routes');
app.use('/api/picchat', picChatRoutes);

// --- Routes for app-builder --- (NEW)
app.use('/app-builder', express.static(path.join(__dirname, 'apps', 'app-builder', 'public')));
const appBuilderRoutes = require('./apps/app-builder/routes');
app.use('/api/appbuilder', appBuilderRoutes);


// // // // // // // // // // // // // 


// --- Routes for app-manager ---
app.use('/app-manager', express.static(path.join(__dirname, 'apps', 'app-manager', 'public')));
const appmanagerRoutes = require('./apps/app-manager/routes');
app.use('/api/appmanager', appmanagerRoutes);




// --- Routes for gen-studio ---
app.use('/gen-studio', express.static(path.join(__dirname, 'apps', 'gen-studio', 'public')));
const genstudioRoutes = require('./apps/gen-studio/routes');
app.use('/api/gen-studio', genstudioRoutes);



// --- Routes for ish ---
app.use('/ish', express.static(path.join(__dirname, 'apps', 'ish', 'public')));
const ishRoutes = require('./apps/ish/routes');
app.use('/api/ish', ishRoutes);





// --- Routes for flip ---
app.use('/flip', express.static(path.join(__dirname, 'apps', 'flip', 'public')));
const flipRoutes = require('./apps/flip/routes');
app.use('/api/flip', flipRoutes);





// --- Routes for asas ---
app.use('/asas', express.static(path.join(__dirname, 'apps', 'asas', 'public')));
const asasRoutes = require('./apps/asas/routes');
app.use('/api/asas', asasRoutes);


// --- Routes for dmdmd ---
app.use('/dmdmd', express.static(path.join(__dirname, 'apps', 'dmdmd', 'public')));
const dmdmdRoutes = require('./apps/dmdmd/routes');
app.use('/api/dmdmd', dmdmdRoutes);





// --- Routes for pol ---
app.use('/pol', express.static(path.join(__dirname, 'apps', 'pol', 'public')));
const polRoutes = require('./apps/pol/routes');
app.use('/api/pol', polRoutes);


// --- Routes for gm ---
app.use('/gm', express.static(path.join(__dirname, 'apps', 'gm', 'public')));
const gmRoutes = require('./apps/gm/routes');
app.use('/api/gm', gmRoutes);


// --- Routes for gen-studio-testing ---
app.use('/gen-studio-testing', express.static(path.join(__dirname, 'apps', 'gen-studio-testing', 'public')));
const genstudiotestingRoutes = require('./apps/gen-studio-testing/routes');
app.use('/api/gen-studio-testing', genstudiotestingRoutes);








// --- Routes for stopwatch ---
app.use('/stopwatch', express.static(path.join(__dirname, 'apps', 'stopwatch', 'public')));
const stopwatchRoutes = require('./apps/stopwatch/routes');
app.use('/api/stopwatch', stopwatchRoutes);




// --- Routes for sr ---
app.use('/sr', express.static(path.join(__dirname, 'apps', 'sr', 'public')));
const srRoutes = require('./apps/sr/routes');
app.use('/api/sr', srRoutes);






// --- Routes for rpiso ---
app.use('/rpiso', express.static(path.join(__dirname, 'apps', 'rpiso', 'public')));
const rpisoRoutes = require('./apps/rpiso/routes');
app.use('/api/rpiso', rpisoRoutes);







// {{APP_MOUNT_POINT}}

// --- WebSocket Initialization ---
// The WebSocket server from md-chat needs to attach to THIS http server.
const { initializeWebSocket } = require('./apps/md-chat/server/websocket');
initializeWebSocket(server);

// --- Database & Startup Logic ---
// You can initialize databases here if needed, or let the routes handle it.
// Example for Pic-Chat's scan on startup:
const { initDb, scanPhotos } = require('./apps/pic-chat/services/photoService');

// --- Start Server ---
server.listen(port, async () => {
    console.log(`Unified Server running at http://localhost:${port}`);
    
    // Initialize Pic-Chat DB and scan photos
    try {
        await initDb();
        await scanPhotos();
        console.log('Pic-Chat photo library initialized.');
    } catch (error) {
        console.error('Failed to initialize Pic-Chat DB:', error);
    }
    
    // The md-chat database is initialized on-demand by its routes.
    console.log('Application ready!');
    console.log(`Main Site: http://localhost:${port}`);
    console.log(`MD-Chat App: http://localhost:${port}/md-chat`);
    console.log(`Pic-Chat App: http://localhost:${port}/pic-chat`);
    console.log(`App Builder:   http://localhost:${port}/app-builder`); // (NEW)
});