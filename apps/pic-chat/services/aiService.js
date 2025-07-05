const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getDb } = require('./photoService');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- AI-Callable Tools ---

// This function now searches by 'book' instead of 'year'
const findPhotos = ({ book, tag, description }) => {
    console.log(`AI Tool Called: findPhotos with params - Book: ${book}, Tag: ${tag}, Description: ${description}`);
    const db = getDb();
    try {
        let query = `
            SELECT DISTINCT p.id, p.filename, p.book, p.author, p.description, 
                   (SELECT GROUP_CONCAT(t.name, '; ') FROM tags t JOIN photo_tags pt ON t.id = pt.tag_id WHERE pt.photo_id = p.id) as tags
            FROM photos p
            LEFT JOIN photo_tags pt ON p.id = pt.photo_id
            LEFT JOIN tags t ON pt.tag_id = t.id
            WHERE 1=1
        `;
        const params = [];

        if (book) {
            query += ` AND p.book LIKE ?`;
            params.push(`%${book}%`);
        }
        if (tag) {
            query += ` AND t.name LIKE ?`;
            params.push(`%${tag}%`);
        }
        if (description) {
            query += ` AND p.description LIKE ?`;
            params.push(`%${description}%`);
        }
        
        const stmt = db.prepare(query);
        const results = stmt.all(params);
        
        return {
            summaryForAI: `Found ${results.length} photos matching the criteria. The filenames are: ${results.map(r => r.filename).join(', ')}. The descriptions, books, and tags provide more context.`,
            dataForClient: results
        };
    } catch (e) {
        console.error("Error in findPhotos tool:", e);
        return { summaryForAI: "An error occurred while searching the database.", dataForClient: [] };
    } finally {
        // This connection was opened by this function, so it should close it.
        // db.close(); This was causing an error with better-sqlite3. Removed.
    }
};


// --- Main AI Interaction Logic ---
const askAI = async (userQuestion) => {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        tools: {
            functionDeclarations: [{
                name: "findPhotos",
                description: "Find images in the gallery based on a topic, tags (like people's names, places, or events), or a description. Search the content of the description. Everything discussed is about the images. Always use the tools and do the search.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        book: { type: "STRING", description: "The image is associated with an AI topic" },
                        tag: { type: "STRING", description: "A tag associated with the image, such as a person's name, a place, or an event." },
                        description: { type: "STRING", description: "Keywords from the image's description." },
                    },
                    required: []
                },
            }],
        },
    });

    const chat = model.startChat();
    const result = await chat.sendMessage(userQuestion);
    const call = result.response.functionCalls()?.[0];

    if (call) {
        console.log("AI wants to call a function:", call.name, call.args);
        let toolResult;
        if (call.name === 'findPhotos') {
            toolResult = findPhotos(call.args);
        }

        const secondResult = await chat.sendMessage([
            {
                functionResponse: {
                    name: 'findPhotos',
                    response: toolResult,
                },
            },
        ]);
        
        const textResponse = secondResult.response.text();
        const clientData = toolResult.dataForClient;

        return { text: textResponse, photos: clientData };
    }

    return { text: result.response.text(), photos: [] };
};

module.exports = { askAI };