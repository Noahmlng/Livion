import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ScheduleEntry as SupabaseScheduleEntry, Task as SupabaseTask, Note as SupabaseNote } from '../types/supabase';
import { ScheduleEntry, Task, Note } from '../utils/database';
import { taskService, scheduleService, noteService, goalService } from '../utils/database';
import { supabaseApi } from '../utils/supabaseApi';
import { convertSupabaseEntries, convertUpdateFields, localToSupabaseEntry, supabaseToLocalEntry } from '../utils/scheduleAdapter';
import { useAuth } from './AuthContext';
import supabase from '../utils/supabase';

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
  createNote: (content: string, skipRefresh?: boolean) => Promise<Note | null>;
  updateNote: (noteId: string, content: string, skipRefresh?: boolean) => Promise<boolean>;
  deleteNote: (noteId: string, skipRefresh?: boolean) => Promise<boolean>;
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
      // 首先尝试使用 Supabase API
      try {
        const userIdNum = parseInt(userId);
        
        if (isNaN(userIdNum)) {
          throw new Error('Invalid user ID format');
        }
        
        // 添加用户ID，不包含created_at，使用数据库默认时间
        const taskData = {
          ...data,
          user_id: userIdNum
        };
        
        const { data: result, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();
        
        if (error) {
          console.error('Supabase create task error:', error);
          throw error;
        }
        
        console.log('Task created successfully with Supabase:', result);
        await loadTasks();
        return result;
      } catch (supabaseError) {
        console.warn('Supabase API failed for task creation, falling back to taskService:', supabaseError);
      }
      
      // 回退到本地数据库
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
      // Make sure the operation completes before returning
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
      // Make sure the operation completes before returning
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
        // 确保开始日期和结束日期格式正确 (YYYY-MM-DD)
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        console.log(`正在加载日期范围: ${startDateStr} 到 ${endDateStr}`);
        
        // 将 userId 转换为数字
        const userIdNum = parseInt(userId);
        if (isNaN(userIdNum)) {
          throw new Error('Invalid user ID');
        }
        
        // 使用 Supabase API 获取日期范围内的数据
        const supabaseEntries = await supabaseApi.schedules.getByDateRange(startDate, endDate, userIdNum);
        console.log('日期范围查询结果:', supabaseEntries);
        
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
      // 日期格式验证与矫正
      let sanitizedDate = data.scheduled_date || data.date;
      
      // 日志记录原始日期值
      console.log('原始日期输入:', sanitizedDate, typeof sanitizedDate);
      
      // 如果日期是Date对象，转换为YYYY-MM-DD格式字符串
      if (sanitizedDate instanceof Date) {
        sanitizedDate = sanitizedDate.toISOString().split('T')[0];
      } else if (typeof sanitizedDate === 'string') {
        // 如果是字符串，确保是YYYY-MM-DD格式
        if (sanitizedDate.includes('T')) {
          sanitizedDate = sanitizedDate.split('T')[0];
        }
        // 确保日期格式有效
        if (!/^\d{4}-\d{2}-\d{2}$/.test(sanitizedDate)) {
          console.warn('日期格式无效，使用今天的日期:', sanitizedDate);
          sanitizedDate = new Date().toISOString().split('T')[0];
        }
      } else {
        // 如果日期无效，使用今天的日期
        console.warn('无效日期，使用今天的日期');
        sanitizedDate = new Date().toISOString().split('T')[0];
      }
      
      console.log('处理后的日期:', sanitizedDate);
      
      // 更新数据中的日期
      data = {
        ...data,
        scheduled_date: sanitizedDate,
        date: sanitizedDate
      };
      
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
        const dbFormatEntry = {
          custom_name: data.title,
          slot: data.timeSlot,
          date: sanitizedDate, // 使用处理后的日期
          task_type: data.source_type,
          status: 'ongoing' as 'ongoing' | 'completed' | 'deleted',
          ref_task_id: data.task_id ? parseInt(data.task_id) : undefined,
          ref_template_id: data.template_id ? parseInt(data.template_id) : undefined,
          description: data.description || data.custom_desc || '', // 使用description字段
          reward_points: data.reward_points || 0
        };
        
        // 准备数据并转换为 Supabase 格式
        const localEntry: Omit<ScheduleEntry, 'created_at'> = {
          entry_id: 0, // Will be removed by localToSupabaseEntry
          user_id: userIdNum,
          date: dbFormatEntry.date,
          slot: dbFormatEntry.slot,
          status: dbFormatEntry.status,
          task_type: dbFormatEntry.task_type,
          ref_task_id: dbFormatEntry.ref_task_id,
          ref_template_id: dbFormatEntry.ref_template_id,
          custom_name: dbFormatEntry.custom_name,
          description: dbFormatEntry.description, // 使用description字段
          reward_points: dbFormatEntry.reward_points
        };
        
        // 转换为 Supabase 格式 (不包含 entry_id)
        const supabaseEntry = localToSupabaseEntry(localEntry);
        
        console.log('数据转换过程:');
        console.log('- 原始UI数据:', data);
        console.log('- 转换为DB格式:', dbFormatEntry);
        console.log('- 本地格式化:', localEntry);
        console.log('- 发送到Supabase前:', supabaseEntry);
        
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
      // 确保不包含 entry_id，让数据库自动生成
      const dbFormatEntry = {
        date: sanitizedDate, // 使用处理后的日期
        slot: data.timeSlot,
        task_type: data.source_type,
        status: 'ongoing' as 'ongoing' | 'completed' | 'deleted',
        custom_name: data.title,
        description: data.description || data.custom_desc || '', // 使用description字段
        reward_points: data.reward_points || 0,
        user_id: parseInt(userId)
      };
      
      console.log('回退到本地数据库，最终数据:', dbFormatEntry);
      
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

        // If entry is being marked as completed and it has a reference to a task,
        // also update the task status if it's not already completed
        if (data.status === 'completed') {
          try {
            // Find the full entry to get the ref_task_id
            const entries = await scheduleService.getByDate(new Date(), userId);
            const updatedEntry = entries.find(entry => entry.entry_id.toString() === entryId);
            
            if (updatedEntry && updatedEntry.ref_task_id) {
              const taskId = updatedEntry.ref_task_id.toString();
              console.log(`Schedule entry completed with ref_task_id: ${taskId}`);
              
              // Get current task status
              const taskToUpdate = tasks.find(t => t.task_id.toString() === taskId);
              
              // Only update if the task exists and is not already completed
              if (taskToUpdate && taskToUpdate.status !== 'completed') {
                console.log(`Updating referenced task ${taskId} to completed status`);
                await updateTask(taskId, { status: 'completed' });
              }
            }
          } catch (taskUpdateError) {
            console.error('Error updating referenced task:', taskUpdateError);
            // Continue execution even if task update fails
          }
        }
        
        // Make sure loadScheduleEntries completes before returning
        await loadScheduleEntries();
        return true;
      } catch (supabaseError) {
        console.warn('Supabase API update failed, falling back to local DB:', supabaseError);
      }
      
      // 回退到本地数据库
      await scheduleService.update(entryId, data, userId);

      // Same task update logic for local DB workflow
      if (data.status === 'completed') {
        try {
          const entries = await scheduleService.getByDate(new Date(), userId);
          const updatedEntry = entries.find(entry => entry.entry_id.toString() === entryId);
          
          if (updatedEntry && updatedEntry.ref_task_id) {
            const taskId = updatedEntry.ref_task_id.toString();
            const taskToUpdate = tasks.find(t => t.task_id.toString() === taskId);
            
            if (taskToUpdate && taskToUpdate.status !== 'completed') {
              await updateTask(taskId, { status: 'completed' });
            }
          }
        } catch (taskUpdateError) {
          console.error('Error updating referenced task:', taskUpdateError);
        }
      }
      
      // Make sure loadScheduleEntries completes before returning
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
        // Make sure loadScheduleEntries completes before returning
        await loadScheduleEntries();
        return true;
      } catch (supabaseError) {
        console.warn('Supabase API delete failed, falling back to local DB:', supabaseError);
      }
      
      // 回退到本地数据库
      await scheduleService.delete(entryId, userId);
      // Make sure loadScheduleEntries completes before returning
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
    if (!userId) {
      console.log('Exception: No userId available when trying to load notes');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Exception: Attempting to load notes for userId:', userId);
      
      // Try to use Supabase API first
      try {
        const userIdNum = parseInt(userId);
        
        if (isNaN(userIdNum)) {
          throw new Error('Invalid user ID format');
        }
        
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', userIdNum)
          .order('updated_at', { ascending: false });
        
        if (error) {
          console.log('Exception: Supabase query error:', error.message);
          throw error;
        }
        
        console.log('Exception: Notes loaded successfully, count:', data?.length || 0);
        console.log('Exception: First note:', data && data.length > 0 ? data[0] : 'No notes');
        
        // 处理notes并加载到状态中
        setNotes(data || []);
        return;
      } catch (supabaseError) {
        console.log('Exception: Supabase API failed, falling back to local DB:', supabaseError);
      }
      
      // Fall back to noteService
      const result = await noteService.getAll(userId);
      console.log('Exception: Notes loaded via noteService, count:', result?.length || 0);
      console.log('Exception: First note from noteService:', result && result.length > 0 ? result[0] : 'No notes');
      setNotes(result);
    } catch (error) {
      console.log('Exception: Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (content: string, skipRefresh = false) => {
    if (!userId) {
      console.log('Exception: No userId available when trying to create note');
      return null;
    }
    
    setLoading(true);
    try {
      console.log('Exception: Attempting to create note for userId:', userId, 'with content:', content);
      
      // Try to use Supabase API directly first
      try {
        const userIdNum = parseInt(userId);
        
        if (isNaN(userIdNum)) {
          throw new Error('Invalid user ID format');
        }
        
        const { data, error } = await supabase
          .from('notes')
          .insert({ 
            content, 
            user_id: userIdNum
          })
          .select()
          .single();
        
        if (error) {
          console.log('Exception: Supabase create note error:', error.message);
          throw error;
        }
        
        console.log('Exception: Note created successfully:', data);
        // 只有在不跳过刷新时才重新加载笔记列表
        if (!skipRefresh) {
          await loadNotes(); // Refresh the notes list
        }
        return data;
      } catch (supabaseError) {
        console.log('Exception: Supabase API failed for note creation, falling back to noteService:', supabaseError);
      }
      
      // Fall back to noteService
      const newNote = {
        content,
        user_id: parseInt(userId)
      };
      const result = await noteService.create(newNote, userId);
      console.log('Exception: Note created via noteService:', result);
      // 只有在不跳过刷新时才重新加载笔记列表
      if (!skipRefresh) {
        await loadNotes();
      }
      return result;
    } catch (error) {
      console.log('Exception: Error creating note:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateNote = async (noteId: string, content: string, skipRefresh = false) => {
    if (!userId) {
      console.log('Exception: No userId available when trying to update note');
      return false;
    }
    
    setLoading(true);
    try {
      console.log('Exception: Attempting to update note:', noteId, 'for userId:', userId, 'with content:', content);
      
      // Try to use Supabase API directly first
      try {
        const userIdNum = parseInt(userId);
        const noteIdNum = parseInt(noteId);
        
        if (isNaN(userIdNum) || isNaN(noteIdNum)) {
          throw new Error('Invalid ID format');
        }
        
        // 让数据库触发器自动更新 updated_at 时间戳
        // 这样可以避免时区问题，确保时间戳的一致性
        const { error } = await supabase
          .from('notes')
          .update({ content })  // 不手动设置 updated_at，让数据库触发器自动处理
          .eq('note_id', noteIdNum)
          .eq('user_id', userIdNum);
        
        if (error) {
          console.log('Exception: Supabase update note error:', error.message);
          throw error;
        }
        
        console.log('Exception: Note updated successfully');
        // 只有在不跳过刷新时才重新加载笔记列表
        if (!skipRefresh) {
          await loadNotes(); // Refresh the notes list
        }
        return true;
      } catch (supabaseError) {
        console.log('Exception: Supabase API failed for note update, falling back to noteService:', supabaseError);
      }
      
      // Fall back to noteService
      await noteService.update(noteId, content, userId);
      console.log('Exception: Note updated via noteService');
      // 只有在不跳过刷新时才重新加载笔记列表
      if (!skipRefresh) {
        await loadNotes();
      }
      return true;
    } catch (error) {
      console.log('Exception: Error updating note:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string, skipRefresh = false) => {
    if (!userId) {
      console.log('Exception: No userId available when trying to delete note');
      return false;
    }
    
    setLoading(true);
    try {
      console.log('Exception: Attempting to delete note:', noteId, 'for userId:', userId);
      
      // Try to use Supabase API directly first
      try {
        const userIdNum = parseInt(userId);
        const noteIdNum = parseInt(noteId);
        
        if (isNaN(userIdNum) || isNaN(noteIdNum)) {
          throw new Error('Invalid ID format');
        }
        
        const { error } = await supabase
          .from('notes')
          .delete()
          .eq('note_id', noteIdNum)
          .eq('user_id', userIdNum);
        
        if (error) {
          console.log('Exception: Supabase delete note error:', error.message);
          throw error;
        }
        
        console.log('Exception: Note deleted successfully');
        // 只有在不跳过刷新时才重新加载笔记列表
        if (!skipRefresh) {
          await loadNotes(); // Refresh the notes list
        }
        return true;
      } catch (supabaseError) {
        console.log('Exception: Supabase API failed for note deletion, falling back to noteService:', supabaseError);
      }
      
      // Fall back to noteService
      await noteService.delete(noteId, userId);
      console.log('Exception: Note deleted via noteService');
      // 只有在不跳过刷新时才重新加载笔记列表
      if (!skipRefresh) {
        await loadNotes();
      }
      return true;
    } catch (error) {
      console.log('Exception: Error deleting note:', error);
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
        createScheduleEntry: createScheduleEntry as (data: any) => Promise<ScheduleEntry | null>,
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