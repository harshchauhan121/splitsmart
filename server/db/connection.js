const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure db directory exists
const dbDir = __dirname;
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// In case DATABASE_URL is relative, resolve it relative to the root
const dbPath = process.env.DATABASE_URL 
    ? path.resolve(process.cwd(), process.env.DATABASE_URL)
    : path.join(__dirname, 'splitsmart.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

module.exports = db;
