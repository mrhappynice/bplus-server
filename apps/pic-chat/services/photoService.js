// apps/pic-chat/services/photoService.js
const fs = require('fs').promises;
const path = require('path');
const Database = require('better-sqlite3');
const exifParser = require('exif-parser');

// These paths are robust and correct for the new structure.
const photoLibraryDir = path.join(__dirname, '..', 'photos_library');
const dbPath = path.join(__dirname, '..', 'gallery.db');

// Function to establish a database connection
const getDb = () => {
  // The 'fileMustExist' option can be useful in production
  return new Database(dbPath);
};

// Initializes the database schema
const initDb = async () => {
  const db = getDb();
  // Use SAFE to prevent errors if tables already exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      book TEXT, -- Represents a category or grouping
      author TEXT,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL -- e.g., 'People', 'Places', 'Events'
    );
    CREATE TABLE IF NOT EXISTS photo_tags (
      photo_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (photo_id, tag_id),
      FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
    );
  `);
  db.close();
};

// Scans the photo library and adds new files to the database
const scanPhotos = async () => {
  const db = getDb();
  try {
    const files = await fs.readdir(photoLibraryDir);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));

    const insertStmt = db.prepare('INSERT OR IGNORE INTO photos (filename) VALUES (?)');
    const checkStmt = db.prepare('SELECT 1 FROM photos WHERE filename = ?');

    for (const file of imageFiles) {
      const exists = checkStmt.get(file);
      if (!exists) {
        insertStmt.run(file);
        console.log(`Added new photo to database: ${file}`);
      }
    }
  } finally {
    db.close();
  }
};


// Retrieves all photos with their associated tags
const getAllPhotos = () => {
  const db = getDb();
  try {
    // The ORDER BY CASE statement provides a custom sort order for categories.
    const stmt = db.prepare(`
      SELECT p.id, p.filename, p.book, p.author, p.description, 
             GROUP_CONCAT(t.name || ':' || t.category, ';') as tags
      FROM photos p
      LEFT JOIN photo_tags pt ON p.id = pt.photo_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      GROUP BY p.id
      ORDER BY
        CASE p.book
          WHEN 'Tools' THEN 1 WHEN 'Research' THEN 2 WHEN 'Rumors' THEN 3 
          ELSE 4
        END, p.id
    `);
    return stmt.all();
  } finally {
    db.close();
  }
};

// Updates details for a specific photo. Handles partial updates.
const updatePhotoDetails = (id, data) => {
    const db = getDb();
    try {
        const updates = [];
        const params = [];
        const allowedFields = ['book', 'author', 'description'];

        for (const field of allowedFields) {
            if (data.hasOwnProperty(field)) {
                updates.push(`${field} = ?`);
                params.push(data[field] || null);
            }
        }

        if (updates.length === 0) {
            return true; // No changes, but operation is successful.
        }

        params.push(id); // For the WHERE clause
        const stmt = db.prepare(`UPDATE photos SET ${updates.join(', ')} WHERE id = ?`);
        const result = stmt.run(...params);
        return result.changes > 0;
    } finally {
        db.close();
    }
};

// Adds a tag to a photo
const addTagToPhoto = (photoId, { tagName, tagCategory }) => {
    const db = getDb();
    try {
        // Find or create the tag
        let tag = db.prepare('SELECT id FROM tags WHERE name = ? AND category = ?').get(tagName, tagCategory);
        if (!tag) {
            const result = db.prepare('INSERT INTO tags (name, category) VALUES (?, ?)').run(tagName, tagCategory);
            tag = { id: result.lastInsertRowid };
        }
        // Associate tag with photo, ignoring if it already exists
        db.prepare('INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)').run(photoId, tag.id);
        return true;
    } finally {
        db.close();
    }
};

// Removes a tag from a photo
const removeTagFromPhoto = (photoId, { tagName, tagCategory }) => {
    const db = getDb();
    try {
        const stmt = db.prepare(`
            DELETE FROM photo_tags 
            WHERE photo_id = ? AND tag_id = (
                SELECT id FROM tags WHERE name = ? AND category = ?
            )
        `);
        const result = stmt.run(photoId, tagName, tagCategory);
        return result.changes > 0;
    } finally {
        db.close();
    }
};

// Gets all unique tags grouped by category for the "Themes" view
const getThemes = () => {
    const db = getDb();
    try {
        // We need one representative photo for each tag to use as a thumbnail
        const stmt = db.prepare(`
            WITH TagThumbnails AS (
                SELECT 
                    t.name, 
                    t.category,
                    p.filename,
                    ROW_NUMBER() OVER(PARTITION BY t.id ORDER BY p.id DESC) as rn
                FROM tags t
                JOIN photo_tags pt ON t.id = pt.tag_id
                JOIN photos p ON pt.photo_id = p.id
            )
            SELECT name, category, filename
            FROM TagThumbnails
            WHERE rn = 1
            ORDER BY category, name;
        `);
        return stmt.all();
    } finally {
        db.close();
    }
};


module.exports = {
  initDb,
  scanPhotos,
  getAllPhotos,
  updatePhotoDetails,
  addTagToPhoto,
  removeTagFromPhoto,
  getThemes,
  getDb // Export getDb for aiService
};