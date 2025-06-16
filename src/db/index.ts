import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
interface LiveDBSchema extends DBSchema {
  schedule_entries: {
    key: string;
    value: {
      id: string;
      user_id: string;
      task_id?: string;
      template_id?: string;
      title: string;
      time_slot: string;
      scheduled_date: Date;
      completed_at?: Date;
      is_completed: boolean;
      source_type: string;
      created_at: Date;
    };
    indexes: { 'by-user': string; 'by-date': Date };
  };
  notes: {
    key: string;
    value: {
      id: string;
      user_id: string;
      content: string;
      created_at: Date;
      updated_at: Date;
    };
    indexes: { 'by-user': string };
  };
}

// Database version
const DB_VERSION = 1;

// Database instance
let dbPromise: Promise<IDBPDatabase<LiveDBSchema>> | null = null;

// Get or initialize the database
export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LiveDBSchema>('livion-db', DB_VERSION, {
      upgrade(db) {
        // Create tables if they don't exist
        if (!db.objectStoreNames.contains('schedule_entries')) {
          const scheduleStore = db.createObjectStore('schedule_entries', { keyPath: 'id' });
          scheduleStore.createIndex('by-user', 'user_id');
          scheduleStore.createIndex('by-date', 'scheduled_date');
        }
        
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('by-user', 'user_id');
        }
      },
    });
  }
  
  return dbPromise;
}

// Helper for generating unique IDs
export function generateId(prefix: string = '') {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Future migrations and schema changes will be handled with drizzle-kit
// Run `npx drizzle-kit generate:sqlite` to generate migrations 