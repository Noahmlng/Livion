import supabase from './supabase';

// Task Categories
export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  user_id?: string;
}

// Tasks
export interface Task {
  id: string;
  title: string;
  description?: string;
  category_id: string;
  difficulty: number;
  reward_points: number;
  completed: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  imageUrl?: string;
}

// Schedule Entries
export interface ScheduleEntry {
  id: string;
  title: string;
  timeSlot: string;
  scheduled_date: Date | string;
  source_type: 'challenge' | 'template' | 'custom';
  task_id?: string;
  template_id?: string;
  completed: boolean;
  created_at?: string;
  user_id?: string;
}

// Notes
export interface Note {
  id: string;
  content: string;
  createdAt: Date;
  user_id?: string;
}

// Category CRUD Operations
export const categoryService = {
  async getAll(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);
      
    if (error) throw error;
    return data || [];
  },
  
  async create(category: Omit<Category, 'id' | 'created_at'>, userId: string): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...category, user_id: userId })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  
  async update(id: string, updates: Partial<Category>, userId: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  },
  
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  }
};

// Task CRUD Operations
export const taskService = {
  async getAll(userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);
      
    if (error) throw error;
    return data || [];
  },
  
  async getByCategory(categoryId: string, userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('category_id', categoryId)
      .eq('user_id', userId);
      
    if (error) throw error;
    return data || [];
  },
  
  async create(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, user_id: userId })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  
  async update(id: string, updates: Partial<Task>, userId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  },
  
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  },
  
  async toggleComplete(id: string, userId: string): Promise<void> {
    // First get the current state
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('completed')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Then toggle it
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ 
        completed: !data.completed,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId);
      
    if (updateError) throw updateError;
  }
};

// Helper function to format a date or string to YYYY-MM-DD
const formatDateForDB = (date: Date | string): string => {
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return date;
};

// Schedule Entries CRUD Operations
export const scheduleService = {
  async getByDate(date: Date | string, userId: string): Promise<ScheduleEntry[]> {
    const dateStr = formatDateForDB(date);
    
    const { data, error } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('scheduled_date', dateStr);
      
    if (error) throw error;
    return data || [];
  },
  
  async create(entry: Omit<ScheduleEntry, 'id' | 'created_at' | 'completed'>, userId: string): Promise<ScheduleEntry> {
    const { data, error } = await supabase
      .from('schedule_entries')
      .insert({ 
        ...entry,
        user_id: userId,
        completed: false,
        scheduled_date: formatDateForDB(entry.scheduled_date)
      })
      .select()
      .single();
      
    if (error) throw error;
    
    // Return the data as is - the interface accepts both Date and string
    return data;
  },
  
  async update(id: string, updates: Partial<ScheduleEntry>, userId: string): Promise<void> {
    // Format date if it's being updated
    const formattedUpdates = { ...updates };
    if (updates.scheduled_date) {
      formattedUpdates.scheduled_date = formatDateForDB(updates.scheduled_date);
    }
    
    const { error } = await supabase
      .from('schedule_entries')
      .update(formattedUpdates)
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  },
  
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  }
};

// Notes CRUD Operations
export const noteService = {
  async getAll(userId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('createdAt', { ascending: false });
      
    if (error) throw error;
    return data || [];
  },
  
  async create(note: Omit<Note, 'id'>, userId: string): Promise<Note> {
    const { data, error } = await supabase
      .from('notes')
      .insert({ ...note, user_id: userId })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  
  async update(id: string, content: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .update({ content })
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  },
  
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  }
}; 