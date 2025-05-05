import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { join } from 'path';
import * as schema from './schema';

// Determine if we're in production (Vercel) or development
const isProd = process.env.NODE_ENV === 'production';

// For development: use local SQLite database
let db: ReturnType<typeof setupDb>;

function setupDb() {
  // In production on Vercel, we'll use Vercel Postgres instead (configured separately)
  if (isProd) {
    // This is a placeholder - Vercel deployment will use Vercel Postgres
    return { schema };
  }

  // Local SQLite database for development
  const sqlite = new Database(join(process.cwd(), 'livion.db'));
  
  // Enable foreign keys
  sqlite.exec('PRAGMA foreign_keys = ON');
  
  const databaseInstance = drizzle(sqlite, { schema });

  // Run migrations in development
  try {
    // Create migrations directory if it doesn't exist
    const fs = require('fs');
    const migrationsDir = join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    migrate(databaseInstance, { migrationsFolder: migrationsDir });
    console.log('Migrations applied successfully');
  } catch (error) {
    console.error('Error applying migrations:', error);
  }

  return databaseInstance;
}

// Initialize the database
export function getDb() {
  if (!db) {
    db = setupDb();
  }
  return db;
}

// Helper for generating unique IDs
export function generateId(prefix: string = '') {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Future migrations and schema changes will be handled with drizzle-kit
// Run `npx drizzle-kit generate:sqlite` to generate migrations 