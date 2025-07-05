// apps/md-chat/database.js
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path'); // <-- Import path module

let db;

async function setupDatabase() {
    if (db) return db;

    db = await open({
        // Corrected path to ensure DB is created in the same folder
        filename: path.join(__dirname, 'documents.db'),
        driver: sqlite3.Database
    });

    // Create the documents table if it doesn't exist
    await db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            content TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('Database connected and table is ready.');
    return db;
}

module.exports = { setupDatabase };