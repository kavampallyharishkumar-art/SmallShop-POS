import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import app from './app.js';
import env from './config/env.js';
import db from './db/connection.js';

// Auto-migrate on startup so a fresh clone works without running npm run migrate first.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
db.exec(schema);

app.listen(env.PORT, () => {
  console.log(`[POS] Server running on port ${env.PORT} (${env.NODE_ENV})`);
});
