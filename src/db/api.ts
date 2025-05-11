import { getDB, generateId } from './index';

// Mock user for development
const MOCK_USER_ID = 'user_1';

/**
 * Database API functions using IndexedDB
 */

// User APIs
export async function getUser(userId: string) {
  // Implementation will be added when database is properly set up
  return null;
}

export async function createUser(data: { name: string; email: string }) {
  // Implementation will be added when database is properly set up
  return { id: generateId('user_'), ...data };
}

// Task APIs
export async function getTasks(userId: string, category?: string) {
  // Implementation will be added when database is properly set up
  return [];
}

export async function createTask(data: {
  title: string;
  description?: string;
  user_id: string;
  goal_id?: string;
  reward_points?: number;
  image_url?: string;
  category?: string;
}) {
  // Implementation will be added when database is properly set up
  return { id: generateId('task_'), ...data };
}

export async function updateTask(taskId: string, data: {
  title?: string;
  description?: string;
  reward_points?: number;
  image_url?: string;
  is_completed?: boolean;
}) {
  try {
    // Implementation will be added when database is properly set up
    
    // Make sure all operations complete before returning
    await Promise.resolve();
    return true;
  } catch (error) {
    console.error('Error updating task:', error);
    return false;
  }
}

export async function deleteTask(taskId: string) {
  try {
    // Implementation will be added when database is properly set up
    
    // Make sure all operations complete before returning
    await Promise.resolve();
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    return false;
  }
}

// Schedule Entry APIs
export async function getScheduleEntries(userId: string, date?: Date) {
  try {
    const db = await getDB();
    
    // Create start and end of day timestamps for the given date
    const today = date || new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Use a cursor to find entries within the date range
    const store = db.transaction('schedule_entries', 'readonly').store;
    const index = store.index('by-user');
    const entries = [];
    
    // Get all entries for this user
    let cursor = await index.openCursor(userId);
    
    while (cursor) {
      const entry = cursor.value;
      
      // Filter by date range
      if (entry.scheduled_date >= today && entry.scheduled_date < tomorrow) {
        entries.push({
          id: entry.id,
          title: entry.title,
          timeSlot: entry.time_slot,
          sourceType: entry.source_type,
          sourceId: entry.task_id || entry.template_id,
          scheduledDate: entry.scheduled_date,
          completed: entry.is_completed
        });
      }
      
      cursor = await cursor.continue();
    }
    
    return entries;
  } catch (error) {
    console.error('Error fetching schedule entries:', error);
    return [];
  }
}

export async function createScheduleEntry(data: {
  user_id?: string;
  task_id?: string;
  template_id?: string;
  title: string;
  time_slot: string;
  scheduled_date: Date | number;
  source_type: string;
}) {
  try {
    const db = await getDB();
    
    // Generate a unique ID and set creation time
    const entryId = generateId('entry_');
    const now = new Date();
    
    // Prepare the scheduled date
    let scheduledDate: Date;
    if (data.scheduled_date instanceof Date) {
      scheduledDate = data.scheduled_date;
    } else {
      scheduledDate = new Date(data.scheduled_date);
    }
    
    // Create the entry object
    const entry = {
      id: entryId,
      user_id: data.user_id || MOCK_USER_ID,
      task_id: data.task_id,
      template_id: data.template_id,
      title: data.title,
      time_slot: data.time_slot,
      scheduled_date: scheduledDate,
      is_completed: false,
      source_type: data.source_type,
      created_at: now
    };
    
    // Add to database
    await db.add('schedule_entries', entry);
    
    return { 
      id: entryId, 
      ...data, 
      completed: false 
    };
  } catch (error) {
    console.error('Error creating schedule entry:', error);
    return { id: generateId('entry_'), ...data, completed: false };
  }
}

export async function updateScheduleEntry(entryId: string, data: {
  time_slot?: string;
  is_completed?: boolean;
  title?: string;
}) {
  try {
    const db = await getDB();
    
    // Get current entry
    const entry = await db.get('schedule_entries', entryId);
    if (!entry) {
      console.error('Entry not found:', entryId);
      return false;
    }
    
    // Update fields
    if (data.time_slot !== undefined) entry.time_slot = data.time_slot;
    if (data.is_completed !== undefined) {
      entry.is_completed = data.is_completed;
      if (data.is_completed) {
        entry.completed_at = new Date();
      } else {
        entry.completed_at = undefined;
      }
    }
    if (data.title !== undefined) entry.title = data.title;
    
    // Save to database and await completion
    await db.put('schedule_entries', entry);
    
    return true;
  } catch (error) {
    console.error('Error updating schedule entry:', error);
    return false;
  }
}

export async function deleteScheduleEntry(entryId: string) {
  try {
    const db = await getDB();
    
    // Ensure operation completes before returning
    await db.delete('schedule_entries', entryId);
    
    return true;
  } catch (error) {
    console.error('Error deleting schedule entry:', error);
    return false;
  }
}

// Note APIs - Placeholder implementations
export async function getNotes(userId: string) {
  try {
    const db = await getDB();
    const index = db.transaction('notes', 'readonly').store.index('by-user');
    return await index.getAll(userId);
  } catch (error) {
    console.error('Error getting notes:', error);
    return [];
  }
}

export async function createNote(data: {
  user_id?: string;
  content: string;
}) {
  try {
    const db = await getDB();
    const now = new Date();
    const noteId = generateId('note_');
    
    const note = {
      id: noteId,
      user_id: data.user_id || MOCK_USER_ID,
      content: data.content,
      created_at: now,
      updated_at: now
    };
    
    await db.add('notes', note);
    return note;
  } catch (error) {
    console.error('Error creating note:', error);
    return { id: generateId('note_'), ...data };
  }
}

export async function updateNote(noteId: string, data: {
  content: string;
}) {
  try {
    const db = await getDB();
    
    const note = await db.get('notes', noteId);
    if (!note) {
      console.error('Note not found:', noteId);
      return false;
    }
    
    note.content = data.content;
    note.updated_at = new Date();
    
    // Ensure operation completes before returning
    await db.put('notes', note);
    
    return true;
  } catch (error) {
    console.error('Error updating note:', error);
    return false;
  }
}

export async function deleteNote(noteId: string) {
  try {
    const db = await getDB();
    
    // Ensure operation completes before returning
    await db.delete('notes', noteId);
    
    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    return false;
  }
} 