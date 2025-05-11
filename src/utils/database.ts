import supabase from './supabase';

// Tasks
export interface Task {
  task_id: number;
  user_id: number;
  goal_id?: number;
  name: string;
  description: string;
  created_at?: string;
  priority: number;
  status: 'ongoing' | 'completed' | 'deleted';
  reward_points: number;
  image_path?: string;
}

// Schedule Entries
export interface ScheduleEntry {
  entry_id: number;
  user_id: number;
  date: Date | string;
  slot: string;
  status: 'ongoing' | 'completed' | 'deleted';
  task_type: string;
  ref_task_id?: number;
  ref_template_id?: number;
  custom_name?: string;
  description?: string;
  reward_points: number;
  created_at?: string;
}

// Notes
export interface Note {
  note_id: number;
  user_id: number;
  goal_id?: number;
  content: string;
  created_at?: string;
  updated_at?: string;
}

// Goal interface
export interface Goal {
  goal_id: number;
  user_id: number;
  name: string;
  description?: string;
  created_at?: string;
}

// Goals CRUD Operations
export const goalService = {
  async getAll(userId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);
      
    if (error) throw error;
    return data || [];
  },
  
  async create(goal: Omit<Goal, 'goal_id' | 'created_at'>, userId: string): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .insert({ ...goal, user_id: userId })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  
  async update(id: string, updates: Partial<Goal>, userId: string): Promise<void> {
    const { error } = await supabase
      .from('goals')
      .update(updates)
      .eq('goal_id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  },
  
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('goal_id', id)
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
  
  async getByGoal(goalId: string, userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId);
      
    if (error) throw error;
    return data || [];
  },
  
  async create(task: Omit<Task, 'task_id' | 'created_at'>, userId: string): Promise<Task> {
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
      .update(updates)
      .eq('task_id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  },
  
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('task_id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  },
  
  async toggleComplete(id: string, userId: string): Promise<void> {
    // First get the current state
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('status')
      .eq('task_id', id)
      .eq('user_id', userId)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Then toggle it
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ 
        status: data.status === 'ongoing' ? 'completed' : 'ongoing'
      })
      .eq('task_id', id)
      .eq('user_id', userId);
      
    if (updateError) throw updateError;
  }
};

// Helper function to format a date or string to YYYY-MM-DD
const formatDateForDB = (date: Date | string): string => {
  if (date instanceof Date) {
    // 使用本地日期格式化，避免时区问题
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
      .eq('date', dateStr);
      
    if (error) throw error;
    return data || [];
  },
  
  async create(entry: Omit<ScheduleEntry, 'entry_id' | 'created_at'>, userId: string): Promise<ScheduleEntry> {
    const { data, error } = await supabase
      .from('schedule_entries')
      .insert({ 
        ...entry,
        user_id: userId,
        date: formatDateForDB(entry.date)
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
    if (updates.date) {
      formattedUpdates.date = formatDateForDB(updates.date);
    }
    
    const { error } = await supabase
      .from('schedule_entries')
      .update(formattedUpdates)
      .eq('entry_id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  },
  
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('entry_id', id)
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
      .order('updated_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  },
  
  async create(note: Omit<Note, 'note_id' | 'created_at' | 'updated_at'>, userId: string): Promise<Note> {
    const { data, error } = await supabase
      .from('notes')
      .insert({ ...note, user_id: userId })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  
  async update(id: string, content: string, userId: string): Promise<void> {
    // 使用UTC+8时间
    const now = new Date();
    // 格式化为ISO字符串，保留时区信息
    const formattedTime = now.toISOString();
    
    console.log('Using UTC+8 time for local update:', formattedTime);
    
    const { error } = await supabase
      .from('notes')
      .update({ 
        content,
        updated_at: formattedTime
      })
      .eq('note_id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  },
  
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('note_id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  }
};

// TaskTemplate interface
export interface TaskTemplate {
  template_id: number;
  user_id: number;
  name: string;
  description?: string;
  default_points: number;
  created_at?: string;
}

// TaskTemplate CRUD Operations
export const templateService = {
  async getAll(userId: string): Promise<TaskTemplate[]> {
    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .eq('user_id', userId);
      
    if (error) throw error;
    return data || [];
  },
  
  async create(template: Omit<TaskTemplate, 'template_id' | 'created_at'>, userId: string): Promise<TaskTemplate> {
    const { data, error } = await supabase
      .from('task_templates')
      .insert({ ...template, user_id: userId })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  
  async update(id: string, updates: Partial<TaskTemplate>, userId: string): Promise<void> {
    const { error } = await supabase
      .from('task_templates')
      .update(updates)
      .eq('template_id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  },
  
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('template_id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
  }
}; 