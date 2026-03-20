import Database from 'better-sqlite3';
import path from 'path';

// Store the database file in the /tmp directory in production, or locally in development
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/bitespeed.db' 
  : path.join(process.cwd(), 'bitespeed.db');

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS Contact (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phoneNumber TEXT,
    email TEXT,
    linkedId INTEGER,
    linkPrecedence TEXT CHECK(linkPrecedence IN ('primary', 'secondary')) NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    deletedAt TEXT
  )
`);

export default db;
