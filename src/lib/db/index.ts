import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import 'dotenv/config';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Database connection string from environment variables
const sql = neon(process.env.DATABASE_URL);

// Create drizzle instance
export const db = drizzle(sql);

// Export schema and types
export * from './schema';

// Export queries
export * from './queries';

