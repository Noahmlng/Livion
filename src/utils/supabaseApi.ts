import supabase from './supabase';
import { User, Task, ScheduleEntry, Note, TaskTemplate, Goal } from '../types/supabase';

/**
 * 格式化日期为 YYYY-MM-DD 字符串
 * 不再需要时区转换，因为系统已经是UTC+8
 */
const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    // 如果已经是字符串且符合 YYYY-MM-DD 格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // 如果是ISO格式字符串，解析为Date对象再处理
    return new Date(date).toISOString().split('T')[0];
  }
  
  // 对于Date对象，使用本地时间格式化日期，避免时区转换
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Supabase API 封装
 * 统一处理所有与 Supabase 数据库的交互
 */
export const supabaseApi = {
  /**
   * 用户相关 API
   */
  users: {
    /**
     * 通过密码登录
     */
    async getByPassword(password: string): Promise<User> {
      console.log('Getting user by password:', password);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('password', password)
        .single();
      
      if (error) {
        console.error('Error getting user by password:', error);
        throw error;
      }
      
      return data;
    },
    
    /**
     * 获取用户信息
     */
    async getById(userId: string | number): Promise<User> {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error getting user by ID:', error);
        throw error;
      }
      
      return data;
    },
    
    /**
     * 创建新用户
     */
    async create(user: Omit<User, 'user_id' | 'created_at'>): Promise<User> {
      const { data, error } = await supabase
        .from('users')
        .insert(user)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating user:', error);
        throw error;
      }
      
      return data;
    },
    
    /**
     * 更新用户信息
     */
    async update(userId: string | number, updates: Partial<User>): Promise<void> {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    }
  },
  
  /**
   * 任务相关 API
   */
  tasks: {
    /**
     * 获取用户的所有任务
     */
    async getAll(userId: string | number): Promise<Task[]> {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error getting tasks:', error);
        throw error;
      }
      
      return data || [];
    },
    
    /**
     * 获取指定目标下的任务
     */
    async getByGoal(userId: string | number, goalId: string | number): Promise<Task[]> {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('goal_id', goalId);
      
      if (error) {
        console.error('Error getting tasks by goal:', error);
        throw error;
      }
      
      return data || [];
    },
    
    /**
     * 创建新任务
     */
    async create(task: Omit<Task, 'task_id' | 'created_at'>): Promise<Task> {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating task:', error);
        throw error;
      }
      
      return data;
    },
    
    /**
     * 更新任务
     */
    async update(taskId: string | number, updates: Partial<Task>, userId: string | number): Promise<void> {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('task_id', taskId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating task:', error);
        throw error;
      }
    },
    
    /**
     * 删除任务
     */
    async delete(taskId: string | number, userId: string | number): Promise<void> {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }
    }
  },
  
  /**
   * 日程安排相关 API
   */
  schedules: {
    /**
     * 获取指定日期的日程安排
     */
    async getByDate(date: Date | string, userId: string | number): Promise<ScheduleEntry[]> {
      console.log(`Fetching schedule entries for date: ${formatDate(date)} and user: ${userId}`);
      
      const { data, error } = await supabase
        .from('schedule_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', formatDate(date));
      
      if (error) {
        console.error('Error fetching schedule entries:', error);
        throw error;
      }
      
      return data || [];
    },
    
    /**
     * 获取日期范围内的日程安排
     */
    async getByDateRange(startDate: Date | string, endDate: Date | string, userId: string | number): Promise<ScheduleEntry[]> {
      const formattedStartDate = formatDate(startDate);
      const formattedEndDate = formatDate(endDate);
      
      console.log(`Fetching schedule entries from ${formattedStartDate} to ${formattedEndDate} for user: ${userId}`);
      
      const { data, error } = await supabase
        .from('schedule_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', formattedStartDate)
        .lte('date', formattedEndDate);
      
      if (error) {
        console.error('Error fetching schedule entries by date range:', error);
        throw error;
      }
      
      return data || [];
    },
    
    /**
     * 创建新的日程安排
     */
    async create(entry: Omit<ScheduleEntry, 'entry_id' | 'created_at'>): Promise<ScheduleEntry> {
      console.log('Creating schedule entry - 原始数据:', JSON.stringify(entry, null, 2));
      console.log('Date value before formatting:', entry.date, 'Type:', typeof entry.date);
      
      // 确保日期格式正确 & 移除entry_id字段，让数据库自动生成
      const { entry_id, created_at, ...entryWithoutIdAndTimestamp } = entry as any;
      const entryToInsert = {
        ...entryWithoutIdAndTimestamp,
        date: formatDate(entryWithoutIdAndTimestamp.date)
      };
      
      console.log('Formatted date for database:', entryToInsert.date);
      console.log('Final data to insert into database (without entry_id):', JSON.stringify(entryToInsert, null, 2));
      
      const { data, error } = await supabase
        .from('schedule_entries')
        .insert(entryToInsert)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating schedule entry:', error);
        throw error;
      }
      
      console.log('Entry created in database with data:', JSON.stringify(data, null, 2));
      
      return data;
    },
    
    /**
     * 更新日程安排
     */
    async update(entryId: string | number, updates: Partial<ScheduleEntry>, userId: string | number): Promise<void> {
      console.log(`Updating schedule entry: ${entryId}`, updates);
      
      // 处理日期字段
      if (updates.date) {
        updates = {
          ...updates,
          date: formatDate(updates.date)
        };
      }
      
      const { error } = await supabase
        .from('schedule_entries')
        .update(updates)
        .eq('entry_id', entryId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating schedule entry:', error);
        throw error;
      }
    },
    
    /**
     * 删除日程安排
     */
    async delete(entryId: string | number, userId: string | number): Promise<void> {
      console.log(`Deleting schedule entry: ${entryId}`);
      
      const { error } = await supabase
        .from('schedule_entries')
        .delete()
        .eq('entry_id', entryId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deleting schedule entry:', error);
        throw error;
      }
    }
  },
  
  /**
   * 笔记相关 API
   */
  notes: {
    /**
     * 获取所有笔记
     */
    async getAll(userId: string | number): Promise<Note[]> {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error getting notes:', error);
        throw error;
      }
      
      return data || [];
    },
    
    /**
     * 创建新笔记
     */
    async create(note: Omit<Note, 'note_id' | 'created_at' | 'updated_at'>): Promise<Note> {
      // 创建笔记时，不需要手动设置 updated_at，让数据库自动设置为当前时间
      const { data, error } = await supabase
        .from('notes')
        .insert(note)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating note:', error);
        throw error;
      }
      
      return data;
    },
    
    /**
     * 更新笔记
     */
    async update(noteId: string | number, content: string, userId: string | number): Promise<void> {
      // 不手动设置 updated_at，让数据库触发器自动处理
      // 这样可以确保时间戳的一致性和准确性
      
      const { error } = await supabase
        .from('notes')
        .update({ 
          content
          // updated_at 将由数据库触发器自动设置
        })
        .eq('note_id', noteId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating note:', error);
        throw error;
      }
    },
    
    /**
     * 删除笔记
     */
    async delete(noteId: string | number, userId: string | number): Promise<void> {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('note_id', noteId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deleting note:', error);
        throw error;
      }
    },

    /**
     * 切换笔记置顶状态
     */
    async togglePin(noteId: string | number, pinned: boolean, userId: string | number): Promise<void> {
      const { error } = await supabase
        .from('notes')
        .update({ pinned })
        .eq('note_id', noteId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error toggling note pin:', error);
        throw error;
      }
    }
  },
  
  /**
   * 目标/项目相关 API
   */
  goals: {
    /**
     * 获取用户的所有目标
     */
    async getAll(userId: string | number): Promise<Goal[]> {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error getting goals:', error);
        throw error;
      }
      
      return data || [];
    },
    
    /**
     * 创建新目标
     */
    async create(goal: Omit<Goal, 'goal_id' | 'created_at'>): Promise<Goal> {
      const { data, error } = await supabase
        .from('goals')
        .insert(goal)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating goal:', error);
        throw error;
      }
      
      return data;
    },
    
    /**
     * 更新目标
     */
    async update(goalId: string | number, updates: Partial<Goal>, userId: string | number): Promise<void> {
      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('goal_id', goalId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating goal:', error);
        throw error;
      }
    },
    
    /**
     * 删除目标
     */
    async delete(goalId: string | number, userId: string | number): Promise<void> {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('goal_id', goalId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deleting goal:', error);
        throw error;
      }
    }
  },
  
  /**
   * 任务模板相关 API
   */
  templates: {
    /**
     * 获取用户的所有任务模板
     */
    async getAll(userId: string | number): Promise<TaskTemplate[]> {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error getting task templates:', error);
        throw error;
      }
      
      return data || [];
    },
    
    /**
     * 创建新任务模板
     */
    async create(template: Omit<TaskTemplate, 'template_id' | 'created_at'>): Promise<TaskTemplate> {
      const { data, error } = await supabase
        .from('task_templates')
        .insert(template)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating task template:', error);
        throw error;
      }
      
      return data;
    },
    
    /**
     * 更新任务模板
     */
    async update(templateId: string | number, updates: Partial<TaskTemplate>, userId: string | number): Promise<void> {
      const { error } = await supabase
        .from('task_templates')
        .update(updates)
        .eq('template_id', templateId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating task template:', error);
        throw error;
      }
    },
    
    /**
     * 删除任务模板
     */
    async delete(templateId: string | number, userId: string | number): Promise<void> {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('template_id', templateId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deleting task template:', error);
        throw error;
      }
    }
  }
}; 