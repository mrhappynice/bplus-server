// apps/md-chat/routes.js
const express = require('express');
const router = express.Router();
require('dotenv').config();
const multer = require('multer');
const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Corrected paths for module imports
const { setupDatabase } = require('./database');
const fileManager = require('./server/fileManager');

// --- LLM Configurations (Copied from original server.js) ---
const LM_STUDIO_URL = 'http://localhost:1234/v1/chat/completions';
const LM_STUDIO_MODELS_URL = 'http://localhost:1234/v1/models';
let genAI;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
    console.warn("GEMINI_API_KEY not found. Gemini features will be disabled.");
}

// --- Function Calling Tool Schemas (Copied from original server.js) ---
const geminiTools = [{
    functionDeclarations: [
        { name: "get_current_list", description: "Gets the entire current content of the master list markdown file." },
        {
            name: "update_master_list",
            description: "Updates the master list markdown file. A safety check is performed using the old content.",
            parameters: {
                type: "OBJECT",
                properties: {
                    newContent: { type: "STRING", description: "The complete, new markdown content for the entire file." },
                    oldContent: { type: "STRING", description: "The entire markdown content of the file as it was when you last read it." }
                },
                required: ["newContent", "oldContent"]
            }
        }
    ]
}];

const openAITools = [
    { type: "function", function: { name: "get_current_list", description: "Gets the entire current content of the master list markdown file.", parameters: { type: "object", properties: {} } } },
    {
        type: "function",
        function: {
            name: "update_master_list",
            description: "Updates the master list markdown file. A safety check is performed using the old content.",
            parameters: {
                type: "object",
                properties: {
                    newContent: { type: "string", description: "The complete, new markdown content for the entire file." },
                    oldContent: { type: "string", description: "The entire markdown content of the file as it was when you last read it." }
                },
                required: ["newContent", "oldContent"]
            }
        }
    }
];

// --- Multer Setup ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- API Routes for Documents ---
// Note: The path is now relative to the mount point (e.g., /api/mdchat/documents)
router.get('/documents', async (req, res) => {
    const db = await setupDatabase();
    const docs = await db.all('SELECT id, filename FROM documents ORDER BY createdAt DESC');
    res.json(docs);
});

router.get('/document/:id', async (req, res) => {
    const db = await setupDatabase();
    const doc = await db.get('SELECT id, filename, content FROM documents WHERE id = ?', [req.params.id]);
    if (doc) res.json(doc);
    else res.status(404).json({ error: 'Document not found' });
});

router.post('/upload', upload.single('markdownFile'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const filename = req.file.originalname;
    const content = req.file.buffer.toString('utf-8');
    const db = await setupDatabase();
    const result = await db.run('INSERT INTO documents (filename, content) VALUES (?, ?)', [filename, content]);
    res.status(201).json({ message: 'File uploaded!', id: result.lastID, filename: filename });
});

// --- API Routes for Master List ---
router.get('/master-list', async (req, res) => {
    try {
        const content = await fileManager.getCurrentList();
        res.json({ content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/master-list', async (req, res) => {
    try {
        const { content } = req.body;
        if (typeof content !== 'string') {
            return res.status(400).json({ error: 'Request body must contain a "content" string.' });
        }
        // Use the path from the fileManager, which is now the single source of truth
        await fs.writeFile(fileManager.MASTER_LIST_PATH, content, 'utf-8');
        res.json({ message: 'Master list updated successfully.' });
    } catch (error) {
        res.status(500).json({ error: `Failed to update master list: ${error.message}` });
    }
});

// --- API Route to get local models from LM Studio ---
router.get('/local-models', async (req, res) => {
    try {
        const response = await axios.get(LM_STUDIO_MODELS_URL);
        res.json(response.data.data);
    } catch (error) {
        console.error('Could not fetch models from LM Studio:', error.message);
        if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({ error: 'Connection to LM Studio failed. Is it running?' });
        }
        res.status(500).json({ error: 'Failed to get models from LM Studio.' });
    }
});

// --- Unified /chat route using fileManager ---
router.post('/chat', async (req, res) => {
    const { query, contextDocuments, history, provider, model: modelId } = req.body;

    if (!query || !provider) {
        return res.status(400).json({ error: 'Query and provider are required.' });
    }

    const tools = {
        get_current_list: fileManager.getCurrentList,
        update_master_list: fileManager.updateMasterList
    };

    const systemPrompt = `You are an intelligent assistant and Q&A specialist. Your purpose is to help me learn and manage my information.

You have access to four sources of knowledge to synthesize your answers:
1.  The Master List: A core markdown file containing my personal notes, to-do lists, quick facts, and ongoing information. You should treat this as my primary knowledge base.
2.  Context Documents: Specific documents I provide for a given query (RAG). Use these for detailed, in-depth answers on a particular topic.
3.  Conversation History: Our previous interactions.
4.  Your own vast knowledge.

Your operational rules:
1.  **ALWAYS get the current list first** using 'get_current_list' before making any changes. This gives you the 'oldContent' needed for the update.
2.  To add, update, or check off an item, call 'update_master_list' with the *entire*, modified markdown content.
3.  When marking a task complete, wrap the task text in Markdown strikethrough ~~...~~. Example: - ~~Renew car insurance~~
4.  Preserve all existing indentation, spacing, and headings exactly. Never delete content unless explicitly told.
5.  After you call 'update_master_list' and I return a success message, your final answer to the user MUST be ONLY the full, updated markdown content and nothing else. If the tool call failed, inform the user about the failure.`;

    let contextString = "";
    if (contextDocuments && contextDocuments.length > 0) {
        contextString = "CONTEXT DOCUMENTS:\n" + contextDocuments.map(doc => `--- START: ${doc.filename} ---\n${doc.content}\n--- END: ${doc.filename} ---`).join('\n\n') + "\n\n";
    }
    const fullQuery = `${contextString}USER QUESTION: ${query}`;

    let finalUpdatedList = null;

    try {
        if (provider === 'gemini') {
            if (!genAI) return res.status(500).json({ error: 'Gemini API key not configured.' });
            const model = genAI.getGenerativeModel({ model: modelId || "gemini-pro", tools: geminiTools, systemInstruction: { parts: [{ text: systemPrompt }] } });
            const chat = model.startChat({ history: history || [] });
            let result = await chat.sendMessage(fullQuery);

            while (true) {
                const fc = result.response.functionCalls();
                if (!fc || fc.length === 0) {
                    return res.json({ response: result.response.text(), updatedListContent: finalUpdatedList });
                }

                console.log(`[Gemini] Calling: ${fc.map(c => c.name).join(', ')}`);
                const toolResponses = [];
                for (const call of fc) {
                    const toolResult = await tools[call.name](call.args);
                    if (call.name === 'update_master_list') {
                         const parsedResult = JSON.parse(toolResult);
                         if (parsedResult.success) {
                             finalUpdatedList = parsedResult.finalContent;
                         }
                    }
                    toolResponses.push({ functionName: call.name, response: { name: call.name, content: toolResult } });
                }
                result = await chat.sendMessage(JSON.stringify({ functionResponse: { parts: toolResponses } }));
            }
        } else if (provider === 'local') {
            const formattedHistory = (history || []).map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text }));
            const messages = [{ role: "system", content: systemPrompt }, ...formattedHistory, { role: "user", content: fullQuery }];

            while (true) {
                const payload = { model: modelId, messages, tools: openAITools, tool_choice: "auto" };
                const lmResponse = await axios.post(LM_STUDIO_URL, payload);
                const choice = lmResponse.data.choices[0];
                messages.push(choice.message);

                if (!choice.message.tool_calls) {
                    return res.json({ response: choice.message.content, updatedListContent: finalUpdatedList });
                }
                
                console.log(`[LM Studio] Calling: ${choice.message.tool_calls.map(tc => tc.function.name).join(', ')}`);
                for (const toolCall of choice.message.tool_calls) {
                    const func = tools[toolCall.function.name];
                    const args = JSON.parse(toolCall.function.arguments);
                    const toolResult = await func(args);
                     if (toolCall.function.name === 'update_master_list') {
                         const parsedResult = JSON.parse(toolResult);
                         if (parsedResult.success) {
                            finalUpdatedList = parsedResult.finalContent;
                         }
                    }
                    messages.push({ tool_call_id: toolCall.id, role: "tool", name: toolCall.function.name, content: toolResult });
                }
            }
        } else {
            return res.status(400).json({ error: 'Invalid provider specified.' });
        }
    } catch (error) {
        console.error(`Error calling ${provider} API:`, error.response ? error.response.data : error.message);
        if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({ error: 'Connection to LM Studio failed. Is the server running?' });
        }
        res.status(500).json({ error: `Failed to get response from ${provider} model.` });
    }
});


module.exports = router;