// apps/pic-chat/routes.js
const express = require('express');
const router = express.Router();
// Corrected paths for service imports
const photoService = require('./services/photoService');
const aiService = require('./services/aiService');

// GET /photos - Get all photos and their data
// Mounted at /api/picchat/photos by the root server
router.get('/photos', (req, res) => {
    try {
        const photos = photoService.getAllPhotos();
        res.json(photos);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve photos' });
    }
});

// GET /themes - Get all unique tags for the themes view
router.get('/themes', (req, res) => {
    try {
        const themes = photoService.getThemes();
        res.json(themes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve themes' });
    }
});

// PUT /photos/:id - Update photo details
router.put('/photos/:id', (req, res) => {
    try {
        const success = photoService.updatePhotoDetails(req.params.id, req.body);
        if (success) {
            res.json({ message: 'Photo updated successfully' });
        } else {
            res.status(404).json({ error: 'Photo not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update photo' });
    }
});

// POST /photos/:id/tags - Add a tag to a photo
router.post('/photos/:id/tags', (req, res) => {
    try {
        const { tagName, tagCategory } = req.body;
        if (!tagName || !tagCategory) {
            return res.status(400).json({ error: 'tagName and tagCategory are required' });
        }
        photoService.addTagToPhoto(req.params.id, { tagName, tagCategory });
        res.status(201).json({ message: 'Tag added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add tag' });
    }
});

// DELETE /photos/:id/tags - Remove a tag from a photo
router.delete('/photos/:id/tags', (req, res) => {
    try {
        const { tagName, tagCategory } = req.body;
        if (!tagName || !tagCategory) {
            return res.status(400).json({ error: 'tagName and tagCategory are required' });
        }
        const success = photoService.removeTagFromPhoto(req.params.id, { tagName, tagCategory });
        if (success) {
            res.json({ message: 'Tag removed successfully' });
        } else {
            res.status(404).json({ error: 'Tag or photo not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove tag' });
    }
});

// POST /ask-ai - Send a natural language query to the AI
router.post('/ask-ai', async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }
        const aiResponse = await aiService.askAI(question);
        res.json(aiResponse);
    } catch (error) {
        console.error("AI route error:", error);
        res.status(500).json({ error: 'An error occurred with the AI service.' });
    }
});


module.exports = router;