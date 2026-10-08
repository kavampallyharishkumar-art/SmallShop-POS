import { config } from 'dotenv';
config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET;

if (NODE_ENV === 'production' && !JWT_SECRET) {
  console.error('FATAL: JWT_SECRET must be set in production');
  process.exit(1);
}

export default {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV,
  JWT_SECRET: JWT_SECRET || 'dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  DB_FILE: process.env.DB_FILE || './data/pos.db',
  TAX_RATE: parseFloat(process.env.TAX_RATE || '0.05'),
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
