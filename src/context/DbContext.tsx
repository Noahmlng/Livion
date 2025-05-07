import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ScheduleEntry as SupabaseScheduleEntry, Task as SupabaseTask, Note as SupabaseNote } from '../types/supabase';
import { ScheduleEntry, Task, Note } from '../utils/database';
import { taskService, scheduleService, noteService, goalService } from '../utils/database';
import { supabaseApi } from '../utils/supabaseApi';
import { convertSupabaseEntries, convertUpdateFields, localToSupabaseEntry, supabaseToLocalEntry } from '../utils/scheduleAdapter';
import { useAuth } from './AuthContext';

interface DbContextType {
  userId: string | null;
  // Tasks
  tasks: Task[];
  loadTasks: (goalId?: string) => Promise<void>;
  createTask: (data: Omit<Task, 'task_id' | 'created_at' | 'user_id'>) => Promise<Task | null>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  // Schedule entries
  scheduleEntries: ScheduleEntry[];
  loadScheduleEntries: (date?: Date) => Promise<void>;
  loadScheduleEntriesRange: (startDate: Date, endDate: Date) => Promise<Record<string, ScheduleEntry[]>>;
  createScheduleEntry: (data: any) => Promise<ScheduleEntry | null>;
  updateScheduleEntry: (entryId: string, data: Partial<ScheduleEntry>) => Promise<boolean>;
  deleteScheduleEntry: (entryId: string) => Promise<boolean>;
  // Notes
  notes: Note[];
  loadNotes: () => Promise<void>;
  createNote: (content: string) => Promise<Note | null>;
  updateNote: (noteId: string, content: string) => Promise<boolean>;
  deleteNote: (noteId: string) => Promise<boolean>;
  // Loading state
  loading: boolean;
}

const DbContext = createContext<DbContextType | undefined>(undefined);

export function DbProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.user_id ? user.user_id.toString() : null;
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize with data when user changes
  useEffect(() => {
    if (userId) {
    const initializeData = async () => {
      await loadTasks();
      await loadScheduleEntries();
      await loadNotes();
    };

    initializeData();
    } else {
      // Clear data when user logs out
      setTasks([]);
      setScheduleEntries([]);
      setNotes([]);
    }
  }, [userId]);

  // Task functions
  const loadTasks = async (goalId?: string) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      let result: Task[];
      if (goalId) {
        result = await taskService.getByGoal(goalId, userId);
      } else {
        result = await taskService.getAll(userId);
      }
      setTasks(result);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (data: Omit<Task, 'task_id' | 'created_at' | 'user_id'>) => {
    if (!userId) return null;
    
    setLoading(true);
    try {
      // 添加用户ID
      const taskWithUserId = {
        ...data,
        user_id: parseInt(userId)
      };
      
      const result = await taskService.create(taskWithUserId, userId);
      await loadTasks();
      return result;
    } catch (error) {
      console.error('Error creating task:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId: string, data: Partial<Task>) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await taskService.update(taskId, data, userId);
      await loadTasks();
      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await taskService.delete(taskId, userId);
      await loadTasks();
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Schedule entry functions
  const loadScheduleEntries = async (date?: Date) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // 首先尝试使用 supabaseApi
      try {
        console.log('Trying supabaseApi for schedules...');
        // 将 userId 转换为数字
        const userIdNum = parseInt(userId);
        if (isNaN(userIdNum)) {
          throw new Error('Invalid user ID');
        }
        // 使用 Supabase API 获取数据
        const supabaseEntries = await supabaseApi.schedules.getByDate(date || new Date(), userIdNum);
        console.log('Supabase schedule entries:', supabaseEntries);
        
        // 转换为本地格式
        const convertedEntries = convertSupabaseEntries(supabaseEntries);
        setScheduleEntries(convertedEntries);
        return; // 如果 Supabase 成功，直接返回
      } catch (supabaseError) {
        console.warn('Supabase API failed, falling back to local DB:', supabaseError);
      }
      
      // 回退到本地数据库
      const result = await scheduleService.getByDate(date || new Date(), userId);
      setScheduleEntries(result);
    } catch (error) {
      console.error('Error loading schedule entries:', error);
    } finally {
      setLoading(false);
    }
  };

  // 新增方法: 加载日期范围内的日程安排（用于历史记录）
  const loadScheduleEntriesRange = async (startDate: Date, endDate: Date): Promise<Record<string, ScheduleEntry[]>> => {
    if (!userId) return {};
    
    setLoading(true);
    try {
      // 创建一个对象，按日期存储条目
      const entriesByDate: Record<string, ScheduleEntry[]> = {};
      
      // 首先尝试使用 supabaseApi
      try {
        console.log(`Trying supabaseApi for schedules range from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        // 将 userId 转换为数字
        const userIdNum = parseInt(userId);
        if (isNaN(userIdNum)) {
          throw new Error('Invalid user ID');
        }
        
        // 使用 Supabase API 获取日期范围内的数据
        const supabaseEntries = await supabaseApi.schedules.getByDateRange(startDate, endDate, userIdNum);
        console.log('Supabase schedule entries for date range:', supabaseEntries);
        
        // 转换为本地格式并按日期分组
        const convertedEntries = convertSupabaseEntries(supabaseEntries);
        
        // 按日期分组
        convertedEntries.forEach(entry => {
          const dateStr = typeof entry.date === 'string' 
            ? entry.date 
            : (entry.date instanceof Date 
                ? entry.date.toISOString().split('T')[0] 
                : new Date().toISOString().split('T')[0]);
          
          if (!entriesByDate[dateStr]) {
            entriesByDate[dateStr] = [];
          }
          entriesByDate[dateStr].push(entry);
        });
        
        return entriesByDate; // 如果 Supabase 成功，直接返回
      } catch (supabaseError) {
        console.warn('Supabase API failed for date range, falling back to local DB:', supabaseError);
      }
      
      // 回退到本地数据库 - 逐日获取
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const formattedDate = currentDate.toISOString().split('T')[0];
        const result = await scheduleService.getByDate(currentDate, userId);
        
        if (result.length > 0) {
          entriesByDate[formattedDate] = result;
        }
        
        // 移动到下一天
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return entriesByDate;
    } catch (error) {
      console.error('Error loading schedule entries range:', error);
      return {};
    } finally {
      setLoading(false);
    }
  };

  const createScheduleEntry = async (data: any) => {
    if (!userId) return null;
    
    setLoading(true);
    try {
      // 首先尝试使用 supabaseApi
      try {
        console.log('Trying to create entry with supabaseApi...');
        // 将 userId 转换为数字
        const userIdNum = parseInt(userId);
        if (isNaN(userIdNum)) {
          throw new Error('Invalid user ID');
        }
        
        // 将UI格式的数据转换为数据库格式
        // UI格式: { title, timeSlot, scheduled_date, source_type }
        // DB格式: { custom_name, slot, date, task_type }
        const dbFormatEntry: Omit<ScheduleEntry, 'entry_id' | 'created_at' | 'user_id'> = {
          custom_name: data.title,
          slot: data.timeSlot,
          date: data.scheduled_date,
          task_type: data.source_type,
          status: 'ongoing',
          ref_task_id: data.task_id ? parseInt(data.task_id) : undefined,
          ref_template_id: data.template_id ? parseInt(data.template_id) : undefined,
          custom_desc: '',
          reward_points: 0,
          user_id: userIdNum
        };
        
        // 准备数据并转换为 Supabase 格式
        const localEntry: ScheduleEntry = {
          entry_id: 0, // 临时 ID
          user_id: userIdNum,
          date: dbFormatEntry.date,
          slot: dbFormatEntry.slot,
          status: dbFormatEntry.status,
          task_type: dbFormatEntry.task_type,
          ref_task_id: dbFormatEntry.ref_task_id,
          ref_template_id: dbFormatEntry.ref_template_id,
          custom_name: dbFormatEntry.custom_name,
          custom_desc: dbFormatEntry.custom_desc,
          reward_points: dbFormatEntry.reward_points
        };
        
        const supabaseEntry = localToSupabaseEntry(localEntry);
        
        // 使用 Supabase API 创建数据
        const result = await supabaseApi.schedules.create(supabaseEntry);
        console.log('Supabase entry created:', result);
        
        // 转换回UI格式
        const convertedResult = {
          id: result.entry_id.toString(),
          title: result.custom_name || '',
          timeSlot: result.slot,
          scheduled_date: result.date,
          source_type: result.task_type,
          task_id: result.ref_task_id?.toString(),
          template_id: result.ref_template_id?.toString(),
          completed: result.status === 'completed',
          created_at: result.created_at,
          user_id: result.user_id.toString()
        };
        
        await loadScheduleEntries(
          typeof data.scheduled_date === 'string' 
            ? new Date(data.scheduled_date) 
            : data.scheduled_date
        );
        
        return convertedResult;
      } catch (supabaseError) {
        console.warn('Supabase API create failed, falling back to local DB:', supabaseError);
      }
      
      // 回退到本地数据库 - 转换为本地数据库格式
      const dbFormatEntry = {
        date: data.scheduled_date,
        slot: data.timeSlot,
        task_type: data.source_type,
        status: 'ongoing',
        custom_name: data.title,
        custom_desc: '',
        reward_points: 0,
        user_id: parseInt(userId)
      };
      
      const result = await scheduleService.create(dbFormatEntry, userId);
      await loadScheduleEntries();
      return result;
    } catch (error) {
      console.error('Error creating schedule entry:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateScheduleEntry = async (entryId: string, data: Partial<ScheduleEntry>) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      // 首先尝试使用 supabaseApi
      try {
        console.log('Trying to update entry with supabaseApi...');
        // 将 userId 和 entryId 转换为数字
        const userIdNum = parseInt(userId);
        const entryIdNum = parseInt(entryId);
        if (isNaN(userIdNum) || isNaN(entryIdNum)) {
          throw new Error('Invalid IDs');
        }
        
        // 转换更新字段
        const supabaseUpdateData = convertUpdateFields(data);
        
        // 使用 Supabase API 更新数据
        await supabaseApi.schedules.update(entryIdNum, supabaseUpdateData, userIdNum);
        console.log('Supabase entry updated');
        await loadScheduleEntries();
        return true;
      } catch (supabaseError) {
        console.warn('Supabase API update failed, falling back to local DB:', supabaseError);
      }
      
      // 回退到本地数据库
      await scheduleService.update(entryId, data, userId);
      await loadScheduleEntries();
      return true;
    } catch (error) {
      console.error('Error updating schedule entry:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteScheduleEntry = async (entryId: string) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      // 首先尝试使用 supabaseApi
      try {
        console.log('Trying to delete entry with supabaseApi...');
        // 将 userId 和 entryId 转换为数字
        const userIdNum = parseInt(userId);
        const entryIdNum = parseInt(entryId);
        if (isNaN(userIdNum) || isNaN(entryIdNum)) {
          throw new Error('Invalid IDs');
        }
        
        // 使用 Supabase API 删除数据
        await supabaseApi.schedules.delete(entryIdNum, userIdNum);
        console.log('Supabase entry deleted');
        await loadScheduleEntries();
        return true;
      } catch (supabaseError) {
        console.warn('Supabase API delete failed, falling back to local DB:', supabaseError);
      }
      
      // 回退到本地数据库
      await scheduleService.delete(entryId, userId);
      await loadScheduleEntries();
      return true;
    } catch (error) {
      console.error('Error deleting schedule entry:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Note functions
  const loadNotes = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await noteService.getAll(userId);
      // 确保处理created_at和createdAt的差异
      const processedNotes = result.map(note => {
        // 如果note中有created_at但没有createdAt，则添加createdAt
        if (note.created_at && !note.createdAt) {
          return {
            ...note,
            createdAt: new Date(note.created_at)
          };
        }
        return note;
      });
      setNotes(processedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (content: string) => {
    if (!userId) return null;
    
    setLoading(true);
    try {
      const newNote = {
        content,
        user_id: parseInt(userId)
      };
      const result = await noteService.create(newNote, userId);
      await loadNotes();
      return result;
    } catch (error) {
      console.error('Error creating note:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateNote = async (noteId: string, content: string) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await noteService.update(noteId, content, userId);
      await loadNotes();
      return true;
    } catch (error) {
      console.error('Error updating note:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await noteService.delete(noteId, userId);
      await loadNotes();
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <DbContext.Provider
      value={{
        userId,
        tasks,
        loadTasks,
        createTask,
        updateTask,
        deleteTask,
        scheduleEntries,
        loadScheduleEntries,
        loadScheduleEntriesRange,
        createScheduleEntry,
        updateScheduleEntry,
        deleteScheduleEntry,
        notes,
        loadNotes,
        createNote,
        updateNote,
        deleteNote,
        loading,
      }}
    >
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  const context = useContext(DbContext);
  if (context === undefined) {
    throw new Error('useDb must be used within a DbProvider');
  }
  return context;
} 