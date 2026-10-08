import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import env from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../', env.DB_FILE);
const schemaPath = path.join(__dirname, 'schema.sql');

const isReset = process.argv.includes('--reset');

if (isReset && fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Database file deleted.');
}

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);
console.log('Migration complete.');
db.close();
