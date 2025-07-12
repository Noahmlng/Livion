import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ScheduleEntry, Task, Note, TaskTemplate } from '../repositories/interfaces';
import { useAuth } from './AuthContext';
import { getServiceFactory } from '../config/di';
import { ITaskService, INoteService, IScheduleService, ITemplateService } from '../services/interfaces';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandling';

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
  searchNotes: (query: string) => Promise<Note[]>;
  createNote: (content: string, skipRefresh?: boolean) => Promise<Note | null>;
  updateNote: (noteId: string, content: string, skipRefresh?: boolean) => Promise<boolean>;
  deleteNote: (noteId: string, skipRefresh?: boolean) => Promise<boolean>;
  toggleNotePin: (noteId: string, pinned: boolean, skipRefresh?: boolean) => Promise<boolean>;
  // Templates
  templates: TaskTemplate[];
  loadTemplates: () => Promise<void>;
  createTemplate: (data: Omit<TaskTemplate, 'template_id' | 'created_at' | 'user_id'>) => Promise<TaskTemplate | null>;
  updateTemplate: (templateId: string, data: Partial<TaskTemplate>) => Promise<boolean>;
  deleteTemplate: (templateId: string) => Promise<boolean>;
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
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Get services from DI container
  const serviceFactory = getServiceFactory();
  const taskService = serviceFactory.getTaskService();
  const noteService = serviceFactory.getNoteService();
  const scheduleService = serviceFactory.getScheduleService();
  const templateService = serviceFactory.getTemplateService();

  // Initialize with data when user changes
  useEffect(() => {
    if (userId) {
      const initializeData = async () => {
        console.log('[DbContext] Initializing data for user:', userId);
        setLoading(true);
        
        try {
          // 并行加载所有数据，提高性能
          const [tasksResult, scheduleResult, notesResult, templatesResult] = await Promise.allSettled([
            taskService.getAllTasks(userId),
            scheduleService.getScheduleByDate(new Date(), userId),
            noteService.getAllNotes(userId),
            templateService.getAllTemplates(userId)
          ]);

          // 处理任务数据
          if (tasksResult.status === 'fulfilled') {
            setTasks(tasksResult.value);
            console.log('[DbContext] Tasks loaded:', tasksResult.value.length);
          } else {
            console.error('[DbContext] Failed to load tasks:', tasksResult.reason);
            ErrorHandler.handleError(tasksResult.reason);
          }

          // 处理日程数据
          if (scheduleResult.status === 'fulfilled') {
            setScheduleEntries(scheduleResult.value);
            console.log('[DbContext] Schedule entries loaded:', scheduleResult.value.length);
          } else {
            console.error('[DbContext] Failed to load schedule entries:', scheduleResult.reason);
            ErrorHandler.handleError(scheduleResult.reason);
          }

          // 处理笔记数据
          if (notesResult.status === 'fulfilled') {
            setNotes(notesResult.value);
            console.log('[DbContext] Notes loaded:', notesResult.value.length);
          } else {
            console.error('[DbContext] Failed to load notes:', notesResult.reason);
            ErrorHandler.handleError(notesResult.reason);
          }

          // 处理模板数据
          if (templatesResult.status === 'fulfilled') {
            setTemplates(templatesResult.value);
            console.log('[DbContext] Templates loaded:', templatesResult.value.length);
          } else {
            console.error('[DbContext] Failed to load templates:', templatesResult.reason);
            ErrorHandler.handleError(templatesResult.reason);
          }

        } catch (error) {
          console.error('[DbContext] Failed to initialize data:', error);
          ErrorHandler.handleError(error);
        } finally {
          setLoading(false);
        }
      };

      initializeData();
    } else {
      // Clear data when user logs out
      setTasks([]);
      setScheduleEntries([]);
      setNotes([]);
      setTemplates([]);
    }
  }, [userId]);

  // Task functions
  const loadTasks = async (goalId?: string) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = goalId 
        ? await taskService.getTasksByGoal(goalId, userId)
        : await taskService.getAllTasks(userId);
      setTasks(result);
    } catch (error) {
      ErrorHandler.handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (data: Omit<Task, 'task_id' | 'created_at' | 'user_id'>) => {
    if (!userId) return null;
    
    setLoading(true);
    try {
      const result = await taskService.createTask(data, userId);
      await loadTasks();
      return result;
    } catch (error) {
      ErrorHandler.handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId: string, data: Partial<Task>) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await taskService.updateTask(parseInt(taskId), data, userId);
      await loadTasks();
      return true;
    } catch (error) {
      ErrorHandler.handleError(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await taskService.deleteTask(parseInt(taskId), userId);
      await loadTasks();
      return true;
    } catch (error) {
      ErrorHandler.handleError(error);
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
      const result = await scheduleService.getScheduleByDate(date || new Date(), userId);
      setScheduleEntries(result);
    } catch (error) {
      ErrorHandler.handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadScheduleEntriesRange = async (startDate: Date, endDate: Date): Promise<Record<string, ScheduleEntry[]>> => {
    if (!userId) return {};
    
    setLoading(true);
    try {
      const result = await scheduleService.getScheduleByDateRange(startDate, endDate, userId);
      return result;
    } catch (error) {
      ErrorHandler.handleError(error);
      return {};
    } finally {
      setLoading(false);
    }
  };

  const createScheduleEntry = async (data: any) => {
    if (!userId) return null;
    
    setLoading(true);
    try {
      const result = await scheduleService.createScheduleEntry(data, userId);
      await loadScheduleEntries();
      return result;
    } catch (error) {
      ErrorHandler.handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateScheduleEntry = async (entryId: string, data: Partial<ScheduleEntry>) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await scheduleService.updateScheduleEntry(parseInt(entryId), data, userId);
      await loadScheduleEntries();
      return true;
    } catch (error) {
      ErrorHandler.handleError(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteScheduleEntry = async (entryId: string) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await scheduleService.deleteScheduleEntry(parseInt(entryId), userId);
      await loadScheduleEntries();
      return true;
    } catch (error) {
      ErrorHandler.handleError(error);
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
      const result = await noteService.getAllNotes(userId);
      setNotes(result);
    } catch (error) {
      ErrorHandler.handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const searchNotes = async (query: string): Promise<Note[]> => {
    if (!userId) return [];
    
    try {
      const result = await noteService.searchNotes(query, userId);
      return result;
    } catch (error) {
      ErrorHandler.handleError(error);
      return [];
    }
  };

  const createNote = async (content: string, skipRefresh = false) => {
    if (!userId) return null;
    
    setLoading(true);
    try {
      const result = await noteService.createNote(content, userId);
      
      if (!skipRefresh) {
        await loadNotes();
      }
      return result;
    } catch (error) {
      ErrorHandler.handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateNote = async (noteId: string, content: string, skipRefresh = false) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await noteService.updateNote(parseInt(noteId), content, userId);
      
      if (!skipRefresh) {
        await loadNotes();
      }
      return true;
    } catch (error) {
      ErrorHandler.handleError(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string, skipRefresh = false) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await noteService.deleteNote(parseInt(noteId), userId);
      
      if (!skipRefresh) {
        await loadNotes();
      }
      return true;
    } catch (error) {
      ErrorHandler.handleError(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleNotePin = async (noteId: string, pinned: boolean, skipRefresh = false) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await noteService.toggleNotePin(parseInt(noteId), userId);
      
      if (!skipRefresh) {
        await loadNotes();
      }
      return true;
    } catch (error) {
      ErrorHandler.handleError(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Template functions
  const loadTemplates = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await templateService.getAllTemplates(userId);
      setTemplates(result);
    } catch (error) {
      ErrorHandler.handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (data: Omit<TaskTemplate, 'template_id' | 'created_at' | 'user_id'>) => {
    if (!userId) return null;
    
    setLoading(true);
    try {
      const result = await templateService.createTemplate(data, userId);
      await loadTemplates();
      return result;
    } catch (error) {
      ErrorHandler.handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (templateId: string, data: Partial<TaskTemplate>) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await templateService.updateTemplate(parseInt(templateId), data, userId);
      await loadTemplates();
      return true;
    } catch (error) {
      ErrorHandler.handleError(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!userId) return false;
    
    setLoading(true);
    try {
      await templateService.deleteTemplate(parseInt(templateId), userId);
      await loadTemplates();
      return true;
    } catch (error) {
      ErrorHandler.handleError(error);
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
        searchNotes,
        createNote,
        updateNote,
        deleteNote,
        toggleNotePin,
        templates,
        loadTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate,
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