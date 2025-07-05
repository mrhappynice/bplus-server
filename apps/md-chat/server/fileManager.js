// server/fileManager.js
const fs = require('fs/promises');
const path = require('path');

// The single source of truth for the master list file path.
const MASTER_LIST_PATH = path.join(__dirname, '..', 'master-list.md');

/**
 * Reads and returns the content of the master list file.
 * If the file doesn't exist, it creates a default one.
 * @returns {Promise<string>} The content of the markdown file.
 */
async function getCurrentList() {
    try {
        // console.log('[FileManager] Reading master list...');
        const content = await fs.readFile(MASTER_LIST_PATH, 'utf-8');
        return content;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn('[FileManager] Master list not found, creating a default one.');
            const defaultContent = `# 📒 Master Lists\n\n## ✅ To-Dos\n\n## 🛒 Grocery\n\n## 📝 Quick Notes\n- Look up new dentist on Monday`;
            await fs.writeFile(MASTER_LIST_PATH, defaultContent, 'utf-8');
            return defaultContent;
        }
        console.error('[FileManager] Error reading master list:', error);
        throw new Error('Could not read the master list file.');
    }
}

/**
 * Writes new content to the master list file, with a check against the old content.
 * @param {object} args - The arguments object.
 * @param {string} args.newContent - The new markdown content to write.
 * @param {string} args.oldContent - The expected current content of the file for a safe write.
 * @returns {Promise<string>} A JSON string indicating the result of the operation.
 */
async function updateMasterList({ newContent, oldContent }) {
    try {
        console.log('[FileManager] Attempting to update master list...');
        const currentContent = await getCurrentList(); // Use getCurrentList to handle file creation

        // Safety Check: Ensure the file hasn't been changed by another process.
        if (currentContent.trim() !== oldContent.trim()) {
            console.warn('[FileManager] Conflict detected! The list has changed since it was last read.');
            const conflictMessage = "CONFLICT: The list has been updated by another process since you read it. Please get the latest version and try your change again.";
            return JSON.stringify({ success: false, message: conflictMessage, finalContent: currentContent });
        }

        await fs.writeFile(MASTER_LIST_PATH, newContent, 'utf-8');
        console.log('[FileManager] Master list updated successfully.');
        return JSON.stringify({ success: true, message: "List updated successfully.", finalContent: newContent });
    } catch (error) {
        console.error('[FileManager] Error writing to master list:', error);
        return JSON.stringify({ success: false, message: `Could not write to the master list file: ${error.message}` });
    }
}

module.exports = {
    getCurrentList,
    updateMasterList,
    MASTER_LIST_PATH
};