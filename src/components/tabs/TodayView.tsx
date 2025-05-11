import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useValhallaTaskContext } from '../../context/ValhallaTaskContext';
import { useDb } from '../../context/DbContext';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  resetServerContext,
  DroppableProvided,
  DraggableProvided,
  DroppableStateSnapshot,
  DraggableStateSnapshot
} from 'react-beautiful-dnd';
import morningBg from '../../assets/morning-bg.jpg';
import afternoonBg from '../../assets/afternoon-bg.jpg';
import eveningBg from '../../assets/evening-bg.jpg';
import './hideScrollbar.css';
import './dragStyles.css';
import supabase from '../../utils/supabase';
import { useDragDropFix } from '../../utils/dragFix';

// 时间段类型
type TimeSlot = 'morning' | 'afternoon' | 'evening';

// 时间段配置
const TIME_SLOTS = [
  { id: 'morning', name: '上午', color: 'from-gray-700/20 to-gray-600/10' },
  { id: 'afternoon', name: '下午', color: 'from-emerald-700/20 to-emerald-600/10' },
  { id: 'evening', name: '晚上', color: 'from-indigo-700/20 to-indigo-600/10' },
];

// 调度任务接口
interface ScheduledTask {
  id: string;
  title: string;
  timeSlot: TimeSlot;
  sourceType: 'challenge' | 'template' | 'custom';
  sourceId?: string;
  reward?: number;
  completed: boolean;
}

// 历史任务日期分组
interface TaskHistoryDay {
  date: Date;
  formattedDate: string;
  tasks: {
    id: string;
    title: string;
    completed: boolean;
    timeSlot: TimeSlot;
  }[];
}

// 笔记接口
interface Note {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// 任务模板接口
interface TaskTemplate {
  template_id: number;
  user_id: number;
  name: string;
  description?: string;
  default_points: number;
  created_at?: string;
}

// 任务接口
interface Task {
  task_id: number;
  name: string;
  description?: string;
  due_date?: string;
  status?: string;
  reward_points?: number;
  category?: string;
  goal_id?: number;
  user_id: number;
}

// 辅助函数：检查两个日期是否在同一天（基于当地时间）
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// 辅助函数：正确处理UTC日期，避免自动时区转换导致的+8小时问题
const correctUtcDate = (isoDateString: string | undefined | Date): Date => {
  if (!isoDateString) return new Date();

  try {
    // 检查是否已经是日期对象
    if (typeof isoDateString !== 'string' && isoDateString instanceof Date) {
      return isoDateString;
    }
    
    // 如果是字符串的日期对象表示（如来自JSON的结果）
    if (typeof isoDateString === 'string' && isoDateString.includes('{"')) {
      try {
        const parsedObj = JSON.parse(isoDateString);
        if (parsedObj && typeof parsedObj === 'object' && typeof parsedObj.getFullYear === 'function') {
          return new Date(parsedObj);
        }
      } catch (e) {
        // 解析JSON失败，继续下一步
      }
    }

    // 直接用JS的Date解析，日期应该已经是UTC+8
    const date = new Date(isoDateString);
    
    // 如果日期解析正确，直接返回
    if (!isNaN(date.getTime())) {
      console.log(`Timestamp ${isoDateString} parsed successfully to: ${date.toLocaleString()}`);
      return date;
    }
    
    // 尝试格式化处理可能存在的特殊格式
    // PostgreSQL timestamptz格式: 2025-05-11 06:43:43.237+00
    const postgresMatch = isoDateString.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (postgresMatch) {
      const [_, year, month, day, hours, minutes, seconds] = postgresMatch;
      console.log(`Parsing special PostgreSQL format: ${isoDateString}`);
      
      // 创建本地日期对象
      const newDate = new Date();
      newDate.setFullYear(parseInt(year));
      newDate.setMonth(parseInt(month) - 1); // 月份从0开始
      newDate.setDate(parseInt(day));
      newDate.setHours(parseInt(hours));
      newDate.setMinutes(parseInt(minutes));
      newDate.setSeconds(parseInt(seconds));
      newDate.setMilliseconds(0);
      
      console.log(`Parsed to: ${newDate.toLocaleString()}`);
      return newDate;
    }
    
    // 标准ISO格式: 2025-05-11T06:43:43.237Z
    const isoMatch = isoDateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (isoMatch) {
      const [_, year, month, day, hours, minutes, seconds] = isoMatch;
      console.log(`Parsing ISO format: ${isoDateString}`);
      
      // 创建本地日期对象
      const newDate = new Date();
      newDate.setFullYear(parseInt(year));
      newDate.setMonth(parseInt(month) - 1); // 月份从0开始
      newDate.setDate(parseInt(day));
      newDate.setHours(parseInt(hours));
      newDate.setMinutes(parseInt(minutes));
      newDate.setSeconds(parseInt(seconds));
      newDate.setMilliseconds(0);
      
      console.log(`Parsed to: ${newDate.toLocaleString()}`);
      return newDate;
    }
    
    // 仅日期格式: 2025-05-11
    const dateOnlyMatch = isoDateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [_, year, month, day] = dateOnlyMatch;
      console.log(`Parsing date-only format: ${isoDateString}`);
      
      // 创建本地日期对象
      const newDate = new Date();
      newDate.setFullYear(parseInt(year));
      newDate.setMonth(parseInt(month) - 1); // 月份从0开始
      newDate.setDate(parseInt(day));
      newDate.setHours(0, 0, 0, 0);
      
      console.log(`Parsed to: ${newDate.toLocaleString()}`);
      return newDate;
    }
    
    // 最后尝试直接使用Date解析
    console.log(`Fallback to direct Date parsing: ${isoDateString}`);
    return new Date(isoDateString);
  } catch (error) {
    console.error('Date parsing error:', error);
    return new Date(); // 返回当前时间作为备选
  }
};

const TodayView = () => {
  // Apply React 18 compatibility fix for drag-and-drop
  useDragDropFix();
  
  const { categories } = useValhallaTaskContext();
  const { 
    userId,
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
    tasks,
    loadTasks
  } = useDb();
  
  // 状态
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [temporaryTaskOrder, setTemporaryTaskOrder] = useState<Record<TimeSlot, string[]>>({
    morning: [],
    afternoon: [],
    evening: []
  });
  const [newTaskText, setNewTaskText] = useState({ morning: '', afternoon: '', evening: '' });
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [hoveredSlot, setHoveredSlot] = useState<TimeSlot | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  
  // 任务列表折叠状态
  const [challengesCollapsed, setChallengesCollapsed] = useState(false);
  const [templatesCollapsed, setTemplatesCollapsed] = useState(false);
  
  // 下方标签页状态
  const [activeTab, setActiveTab] = useState<'history' | 'notes'>('history');
  const [taskHistory, setTaskHistory] = useState<TaskHistoryDay[]>([]);
  const [visibleDays, setVisibleDays] = useState(8); // 从昨天开始的 7 天 + 1
  const [notesState, setNotesState] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const noteContainerRef = useRef<HTMLDivElement>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [notesPage, setNotesPage] = useState(1);
  const [hasMoreNotes, setHasMoreNotes] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 从数据库获取的任务模板
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // 用户的任务
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  // Force a rerender of the DragDropContext on mount to fix initialization issues
  useEffect(() => {
    resetServerContext();
    
    console.log('TodayView component mounted, initializing data...');
    console.log('DragDropContext initialized, handlers registered:');
    console.log('- onDragStart:', handleDragStart);
    console.log('- onDragEnd:', handleDragEnd);
    
    // Prevent native browser drag behavior to avoid interference with react-beautiful-dnd
    const preventNativeDrag = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };
    
    // Add global dragstart listener to override native browser behavior
    document.addEventListener('dragstart', preventNativeDrag);
    
    // Load today's schedule entries
    loadTodayScheduleEntries();
    
    // Load initial history data
    loadHistoryData();
    
    // Load notes data
    loadNotesData();
    
    // Load task template data
    loadTaskTemplates();
    
    // Load user tasks
    loadUserTasks();
    
    // Clean up event listeners
    return () => {
      document.removeEventListener('dragstart', preventNativeDrag);
    };
  }, []);
  
  // 当 userId 变化时重新加载任务和模板
  useEffect(() => {
    if (userId) {
      console.log('User ID changed, reloading tasks and templates...');
      loadTaskTemplates();
      loadUserTasks();
    }
  }, [userId]);
  
  // 每当 userTasks 或 taskTemplates 改变时，打印日志以便调试
  useEffect(() => {
    console.log('User tasks updated:', userTasks);
    console.log('Challenge tasks mapped:', challengeTasks);
  }, [userTasks]);
  
  useEffect(() => {
    console.log('Task templates updated:', taskTemplates);
    console.log('Template tasks mapped:', templateTasks);
  }, [taskTemplates]);
  
  // 加载用户任务
  const loadUserTasks = async () => {
    if (!userId) return;
    
    setLoadingTasks(true);
    try {
      // 直接从 Supabase 获取用户的任务，避免使用 DbContext 中的方法
      console.log('Fetching tasks for user ID:', userId);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error fetching tasks from Supabase:', error);
        throw error;
      }
      
      console.log('Fetched tasks from Supabase:', data);
      setUserTasks(data || []);
    } catch (error) {
      console.error('Error loading user tasks:', error);
      // 如果直接获取失败，回退到使用 DbContext 中的方法
      try {
        await loadTasks();
        console.log('Loaded tasks via DbContext:', tasks);
        setUserTasks(tasks);
      } catch (fallbackError) {
        console.error('Fallback load method also failed:', fallbackError);
      }
    } finally {
      setLoadingTasks(false);
    }
  };
  
  // 加载任务模板数据
  const loadTaskTemplates = async () => {
    if (!userId) return;
    
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('user_id', userId);
        
      if (error) throw error;
      console.log('Loaded task templates:', data);
      setTaskTemplates(data || []);
    } catch (error) {
      console.error('Error loading task templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };
  
  // 从数据库加载今天的任务安排
  const loadTodayScheduleEntries = async () => {
    // 获取系统当前时间（已经是UTC+8）
    const now = new Date();
    
    // 直接构造日期字符串
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份从0开始
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // 创建一个日期对象只是为了方便进行查询
    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
    
    // 使用日期范围加载数据
    const entriesByDate = await loadScheduleEntriesRange(dateObj, dateObj);
    
    // 将所有日期的条目合并为单一数组
    const allEntries: any[] = [];
    Object.values(entriesByDate).forEach(entries => {
      allEntries.push(...entries);
    });
    
    // 额外的过滤，确保只包含今天的任务
    const todayEntries = allEntries.filter(entry => {
      // 将条目的日期提取出来进行比较
      let entryDateStr: string;
      if (typeof entry.date === 'string') {
        // 如果已经是字符串，提取日期部分（可能是YYYY-MM-DD或ISO格式）
        entryDateStr = entry.date.includes('T') ? entry.date.split('T')[0] : entry.date;
      } else if (entry.date instanceof Date) {
        // 如果是Date对象，提取日期部分
        entryDateStr = entry.date.toISOString().split('T')[0];
      } else {
        console.warn('无效的日期格式:', entry.date);
        return false;
      }
      
      // 直接比较日期字符串
      return entryDateStr === dateStr;
    });
    
    // 将数据转换为UI格式并更新状态
    const mappedTasks = todayEntries.map(entry => ({
      id: entry.entry_id.toString(),
      title: entry.custom_name || '',
      timeSlot: entry.slot as TimeSlot,
      sourceType: entry.task_type as 'challenge' | 'template' | 'custom',
      sourceId: entry.ref_task_id?.toString() || entry.ref_template_id?.toString(),
      completed: entry.status === 'completed'
    }));
    
    setScheduledTasks(mappedTasks);
    
    // 初始化临时排序状态
    const morningTasks = mappedTasks.filter(task => task.timeSlot === 'morning').map(task => task.id);
    const afternoonTasks = mappedTasks.filter(task => task.timeSlot === 'afternoon').map(task => task.id);
    const eveningTasks = mappedTasks.filter(task => task.timeSlot === 'evening').map(task => task.id);
    
    setTemporaryTaskOrder({
      morning: morningTasks,
      afternoon: afternoonTasks,
      evening: eveningTasks
    });
  };
  
  // 新增方法: 从数据库加载历史任务记录
  const loadHistoryData = async (daysToLoad = 7, startFromDay = 1) => {
    setLoading(true);
    
    try {
      // 使用系统时间（已经是UTC+8）
      const now = new Date();
      
      // 处理每一天的数据
      const newHistoryData: TaskHistoryDay[] = [];
      
      // 遍历日期范围，从昨天开始（i 从 startFromDay 开始，默认为 1，表示昨天）
      for (let i = startFromDay; i < startFromDay + daysToLoad; i++) {
        // 计算历史日期
        const historyDate = new Date(now);
        historyDate.setDate(historyDate.getDate() - i);
        
        // 构造日期字符串
        const year = historyDate.getFullYear();
        const month = String(historyDate.getMonth() + 1).padStart(2, '0');
        const day = String(historyDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // 格式化日期显示（直接使用本地化设置，无需额外时区转换）
        const formattedDate = historyDate.toLocaleDateString('zh-CN', {
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        });
        
        // 使用构造的日期对象查询
        const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
        const entriesByDate = await loadScheduleEntriesRange(dateObj, dateObj);
        
        // 合并所有条目
        let entriesForDay: any[] = [];
        Object.values(entriesByDate).forEach(entries => {
          entriesForDay = entriesForDay.concat(entries);
        });
        
        console.log(`${dateStr} 的任务数: ${entriesForDay.length}`);
        
        // 将数据转换为 UI 格式
        const tasksForDay = entriesForDay.map(entry => ({
          id: entry.entry_id.toString(),
          title: entry.custom_name || '',
          completed: entry.status === 'completed',
          timeSlot: entry.slot as TimeSlot
        }));
        
        // 添加到历史记录
        newHistoryData.push({
          date: historyDate,
          formattedDate,
          tasks: tasksForDay
        });
      }
      
      // 更新历史状态
      setTaskHistory(prevHistory => {
        if (startFromDay === 1) {
          return newHistoryData;
        } else {
          return [...prevHistory, ...newHistoryData];
        }
      });
    } catch (error) {
      console.error('加载历史数据出错:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 添加加载更多历史数据的方法
  const loadMoreHistory = () => {
    // 从当前可见天数开始加载更多（visibleDays 已经包含了偏移）
    loadHistoryData(7, visibleDays);
    setVisibleDays(prev => prev + 7);
  };
  
  // 当数据库中的调度条目更改时更新本地状态
  useEffect(() => {
    if (scheduleEntries.length > 0) {
      console.log('Converting schedule entries to UI format:', scheduleEntries);
      const mappedTasks = scheduleEntries.map(entry => {
        // 处理数据库格式到UI格式的转换
        // 数据库格式: { entry_id, slot, date, status, task_type, custom_name, ... }
        // UI格式: { id, title, timeSlot, sourceType, completed, ... }
        return {
          id: entry.entry_id.toString(),
          title: entry.custom_name || '',
          timeSlot: entry.slot as TimeSlot,
          sourceType: entry.task_type as 'challenge' | 'template' | 'custom',
          sourceId: entry.ref_task_id?.toString() || entry.ref_template_id?.toString(),
          completed: entry.status === 'completed'
        };
      });
      console.log('Mapped tasks for UI:', mappedTasks);
      setScheduledTasks(mappedTasks);
    }
  }, [scheduleEntries]);
  
  // 监听历史容器的滚动事件，实现无限加载
  useEffect(() => {
    const handleScroll = () => {
      if (historyContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = historyContainerRef.current;
        // 当滚动到接近底部时，加载更多数据
        if (scrollTop + clientHeight >= scrollHeight - 50 && !loading) {
          loadMoreHistory();
        }
      }
    };
    
    const container = historyContainerRef.current;
    if (container && activeTab === 'history') {
      container.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [taskHistory, loading, activeTab]);
  
  // 加载笔记数据
  const loadNotesData = async (page = 1, reset = true) => {
    if (notesLoading) return;
    setNotesLoading(true);
    
    try {      
      // 加载数据库中的笔记
      await loadNotes();
      
      if (reset) {
        // 重置分页状态
        setNotesPage(1);
        
        // 使用数据库中的笔记
        const dbNotes = notes.slice(0, 10).map(note => {
          console.log('Exception: 处理单个笔记:', note);
          
          // 安全地获取笔记ID
          const noteId = note.note_id ? String(note.note_id) : String(Date.now());
          
          // 安全地处理日期
          let createdTime, updatedTime;
          
          try {
            // 尝试使用辅助函数处理日期，如果失败则使用当前时间
            createdTime = note.created_at ? correctUtcDate(note.created_at) : new Date();
            updatedTime = note.updated_at ? correctUtcDate(note.updated_at) : createdTime;
            
            // 再次验证日期是否有效
            if (isNaN(createdTime.getTime())) createdTime = new Date();
            if (isNaN(updatedTime.getTime())) updatedTime = createdTime;
            
          } catch (error) {
            console.log('Exception: 日期解析失败，使用当前时间', error);
            createdTime = new Date();
            updatedTime = new Date();
          }
          
          // 创建UI需要的笔记对象格式，确保所有字段都有合理的默认值
          const uiNote: Note = {
            id: noteId,
            content: note.content || '',
            createdAt: createdTime,
            updatedAt: updatedTime
          };
          
          console.log('Exception: 转换后的笔记对象:', uiNote);
          return uiNote;
        });
        
        // 确保笔记按照更新时间降序排列
        dbNotes.sort((a, b) => {
          // 防止异常：确保a.updatedAt和b.updatedAt是Date对象
          const timeA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
          const timeB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
          return timeB - timeA;
        });
        
        console.log('Exception: 重置后的笔记数量:', dbNotes.length);
        console.log('Exception: 即将更新UI的笔记列表:', JSON.stringify(dbNotes));
        
        // 使用回调形式的setState来确保是最新状态
        setNotesState(dbNotes);
        
        setHasMoreNotes(notes.length > 10);
      } else {
        // 加载更多笔记（分页）
        const startIndex = (page - 1) * 10;
        const newNotes = notes.slice(startIndex, startIndex + 10).map(note => {
          // 安全地获取笔记ID
          const noteId = note.note_id ? String(note.note_id) : String(Date.now());
          
          // 安全地处理日期
          let createdTime, updatedTime;
          
          try {
            // 使用辅助函数正确处理日期，避免时区转换问题
            createdTime = note.created_at ? correctUtcDate(note.created_at) : new Date();
            updatedTime = note.updated_at ? correctUtcDate(note.updated_at) : createdTime;
            
            // 验证日期是否有效
            if (isNaN(createdTime.getTime())) createdTime = new Date();
            if (isNaN(updatedTime.getTime())) updatedTime = createdTime;
            
          } catch (error) {
            console.log('Exception: 日期解析失败，使用当前时间', error);
            createdTime = new Date();
            updatedTime = new Date();
          }
          
          return {
            id: noteId,
            content: note.content || '',
            createdAt: createdTime,
            updatedAt: updatedTime
          };
        });
        
        console.log('Exception: 加载更多笔记 - 新增数量:', newNotes.length);
        
        setNotesState(prevNotes => {
          const updatedNotes = [...prevNotes, ...newNotes];
          // 确保所有笔记按照更新时间降序排列
          updatedNotes.sort((a, b) => {
            // 防止异常：确保a.updatedAt和b.updatedAt是Date对象
            const timeA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
            const timeB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
            return timeB - timeA;
          });
          console.log('Exception: 更新后的全部笔记数量:', updatedNotes.length);
          return updatedNotes;
        });
        
        setHasMoreNotes(notes.length > startIndex + 10);
      }
    } catch (error) {
      console.log('Exception: 加载笔记失败:', error);
    } finally {
      setNotesLoading(false);
    }
  };
  
  // 监听notesState变化
  useEffect(() => {
    console.log('Exception: notesState已更新, 当前笔记数量:', notesState.length);
    console.log('Exception: 当前笔记内容:', JSON.stringify(notesState));
  }, [notesState]);

  // 监听activeTab变化
  useEffect(() => {
    console.log('Exception: activeTab已变更为:', activeTab);
    
    // 使用try-catch包裹标签切换逻辑，防止异常传播
    try {
      if (activeTab === 'notes') {
        console.log('Exception: 切换到笔记标签，当前笔记数量:', notesState.length);
        // 每次切换到笔记标签页时，重新加载笔记
        loadNotesData(1, true);
      } else if (activeTab === 'history') {
        // 切换到历史标签时，确保历史数据已加载
        if (taskHistory.length === 0) {
          loadHistoryData();
        }
      }
    } catch (error) {
      console.error('标签页切换处理异常:', error);
    }
  }, [activeTab]);
  
  // 加载更多笔记
  const loadMoreNotes = () => {
    const nextPage = notesPage + 1;
    setNotesPage(nextPage);
    loadNotesData(nextPage, false);
  };
  
  // 监听笔记容器的滚动
  useEffect(() => {
    const handleScroll = () => {
      if (noteContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = noteContainerRef.current;
        
        // 滚动到底部时加载更多
        if (scrollTop + clientHeight >= scrollHeight - 50 && hasMoreNotes && !notesLoading) {
          loadMoreNotes();
        }
      }
    };
    
    const container = noteContainerRef.current;
    if (container && activeTab === 'notes') {
      container.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [notesState, hasMoreNotes, notesLoading, activeTab, notesPage]);
  
  // 创建新笔记
  const createNewNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      console.log('Exception: 尝试创建新笔记');
      
      // 创建新笔记到数据库
      const result = await createNote(newNote.trim());
      
      console.log('Exception: 创建笔记结果:', result);
      
      if (result) {
        // 清空输入框
        setNewNote('');
        
        // 重新加载笔记列表以确保正确排序
        console.log('重新加载笔记列表以确保正确排序');
        await loadNotesData(1, true);
      } else {
        console.log('Exception: 创建笔记失败，返回结果为空');
      }
    } catch (error) {
      console.log('Exception: 创建笔记失败:', error);
    }
  };
  
  // 开始编辑笔记
  const startEditingNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
    
    // 聚焦到编辑区域
    setTimeout(() => {
      if (noteTextareaRef.current) {
        noteTextareaRef.current.focus();
      }
    }, 10);
  };
  
  // 保存编辑的笔记
  const saveEditedNote = async () => {
    if (!editingNoteId || !editingNoteContent.trim()) return;
    
    // 发送更新到数据库
    try {
      await updateNote(editingNoteId, editingNoteContent.trim());
      
      // 清除编辑状态
      setEditingNoteId(null);
      setEditingNoteContent('');
      
      // 重新加载笔记列表确保按最新的updated_at正确排序
      console.log('重新加载笔记列表以确保正确排序');
      await loadNotesData(1, true);
      
    } catch (error) {
      console.error('保存笔记失败:', error);
      // 错误处理逻辑，例如显示错误消息
    }
  };
  
  // 处理笔记编辑时的键盘事件
  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      saveEditedNote();
    } else if (e.key === 'Escape') {
      setEditingNoteId(null);
      setEditingNoteContent('');
    }
  };
  
  // 删除笔记
  const deleteNoteHandler = async (noteId: string) => {
    try {
      // 从数据库中删除
      const success = await deleteNote(noteId);
      
      if (success) {
        // 重新加载笔记列表确保正确排序
        await loadNotesData(1, true);
      }
    } catch (error) {
      console.error('删除笔记失败:', error);
    }
  };
  
  // 背景图映射
  const SLOT_BACKGROUNDS: Record<TimeSlot, string> = {
    morning: morningBg,
    afternoon: afternoonBg,
    evening: eveningBg,
  };
  
  // 切换完成状态
  const toggleComplete = async (taskId: string) => {
    // 更新本地状态
    const taskToUpdate = scheduledTasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;
    
    const newCompletedState = !taskToUpdate.completed;
    
    // 更新本地状态
    setScheduledTasks(prev => 
      prev.map(task => task.id === taskId ? { ...task, completed: newCompletedState } : task)
    );
    
    // 更新数据库 - 转换为数据库格式的字段名
    await updateScheduleEntry(taskId, { 
      status: newCompletedState ? 'completed' : 'ongoing' 
    });
  };
  
  // 获取支线任务和日常任务
  // 改为使用用户的任务数据，而不是使用 ValhallaTaskContext 中的 challengeTasks
  const challengeTasks = userTasks.map(task => ({
    id: task.task_id?.toString() || '',
    title: task.name || '',
    description: task.description || '',
    reward_points: task.reward_points || 0,
    status: task.status
  })).filter(task => !!task.id);
  
  // 使用数据库中的任务模板替代 ValhallaTaskContext 中的模板任务
  const templateTasks = taskTemplates.map(template => ({
    id: template.template_id?.toString() || '',
    title: template.name || '',
    description: template.description || '',
    reward_points: template.default_points || 0
  })).filter(task => !!task.id);
  
  // 安全地生成拖拽 ID
  const getSafeDraggableId = (prefix: string, id: string) => {
    if (!id) return `${prefix}-unknown-${Date.now()}`;
    return `${prefix}-${id}`;
  };
  
  // 启用编辑模式
  const startEditing = (taskId: string, initialText: string) => {
    setEditingTaskId(taskId);
    setEditingText(initialText);
    // 在下一个渲染周期聚焦输入框
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 10);
  };

  // 保存编辑的任务
  const saveEditedTask = async () => {
    if (!editingTaskId || !editingText.trim()) {
      cancelEditing();
      return;
    }
    
    // 更新本地状态
    setScheduledTasks(prev => 
      prev.map(task => 
        task.id === editingTaskId 
          ? { ...task, title: editingText.trim() } 
          : task
      )
    );
    
    // 更新数据库 - 转换为数据库格式的字段名
    await updateScheduleEntry(editingTaskId, { 
      custom_name: editingText.trim() 
    });
    
    // 清除编辑状态
    setEditingTaskId(null);
    setEditingText('');
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingText('');
  };

  // 处理编辑任务时的键盘事件
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditedTask();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };
  
  // 处理新任务创建
  const handleCreateTask = async (timeSlot: TimeSlot) => {
    if (!newTaskText[timeSlot].trim()) return;
    
    // 系统时间日志
    const now = new Date(); 
    console.log('=== 系统时间日志 ===');
    console.log(`系统时间: ${now.toString()}`);
    console.log(`系统ISO时间: ${now.toISOString()}`);
    console.log(`系统日期部分: ${now.toISOString().split('T')[0]}`);
    console.log('=====================');
    
    // 创建新任务对象
    const title = newTaskText[timeSlot].trim();
    
    // 直接构造日期字符串
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    console.log('创建任务使用日期:', dateStr);
    
    // 创建任务数据
    console.log('即将发送到数据库的任务数据:');
    const createData = {
      title,
      timeSlot: timeSlot,
      scheduled_date: dateStr,
      source_type: 'custom'
    };
    console.log(JSON.stringify(createData, null, 2));
    
    const result = await createScheduleEntry(createData);
    
    // 清空输入框
    setNewTaskText({ ...newTaskText, [timeSlot]: '' });
    
    // 重新加载今天的任务
    await loadTodayScheduleEntries();
    
    // 后面执行完数据库创建后，也要更新临时排序状态
    if (result) {
      setTemporaryTaskOrder(prev => ({
        ...prev,
        [timeSlot]: [...prev[timeSlot], result.entry_id]
      }));
    }
  };
  
  // 删除任务
  const handleDeleteTask = async (taskId: string) => {
    // 先从临时排序中移除
    setTemporaryTaskOrder(prev => {
      const newOrder = { ...prev };
      // 在所有时间段中查找并移除该任务ID
      Object.keys(newOrder).forEach(slot => {
        newOrder[slot as TimeSlot] = newOrder[slot as TimeSlot].filter(id => id !== taskId);
      });
      return newOrder;
    });
    
    // 然后从数据库中删除
    await deleteScheduleEntry(taskId);
    // 重新加载数据
    await loadTodayScheduleEntries();
  };
  
  // 将任务从一个时间段移动到另一个时间段
  const moveTaskBetweenSlots = async (taskId: string, newSlot: TimeSlot) => {
    // 查找任务
    const task = scheduledTasks.find(t => t.id === taskId);
    if (!task) return;

    // 更新任务的时间段
    const updatedTask = { ...task, timeSlot: newSlot };
    
    // 更新数据库
    await updateScheduleEntry(taskId, { slot: newSlot });
    
    // 更新本地状态
    setScheduledTasks(prev => 
      prev.map(t => t.id === taskId ? updatedTask : t)
    );
  };
  
  // 渲染每个时间段的面板内容
  const renderSlot = (slot: TimeSlot) => {
    const allTasksInSlot = scheduledTasks.filter(task => task.timeSlot === slot);
    
    // 根据临时排序状态获取任务
    const orderedTasks = temporaryTaskOrder[slot]
      .map(taskId => allTasksInSlot.find(task => task.id === taskId))
      .filter(task => task !== undefined) as ScheduledTask[];
    
    // 确保所有任务都在显示（以防有新任务但临时状态未更新）
    const unseenTasks = allTasksInSlot.filter(task => !temporaryTaskOrder[slot].includes(task.id));
    const tasksInSlot = [...orderedTasks, ...unseenTasks];
    
    return (
      <div key={slot} className="flex-1 flex items-stretch">
        {/* 左侧标题区域 */}
        <div className="w-16 flex items-center justify-center">
          <span className="font-display text-accent-gold text-xl -rotate-90 whitespace-nowrap transform origin-center">
            {TIME_SLOTS.find(s => s.id === slot)?.name}
          </span>
        </div>
        
        {/* 右侧内容区域 */}
        <div 
          className="relative flex-1 valhalla-panel bg-cover bg-center"
          style={{ backgroundImage: `url(${SLOT_BACKGROUNDS[slot]})` }}
          onMouseEnter={() => setHoveredSlot(slot)}
          onMouseLeave={() => setHoveredSlot(null)}
        >
          <div className="absolute inset-0 bg-black/60"></div>
          
          <div className="relative flex-1 flex flex-col p-4 overflow-auto hide-scrollbar">
            <Droppable droppableId={slot} direction="vertical">
              {(provided: any, snapshot: any) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col gap-2 flex-1 min-h-[120px] ${
                    snapshot.isDraggingOver ? 'bg-accent-gold/10 border-2 border-dashed border-accent-gold/50 rounded-lg p-2' : ''
                  }`}
                  data-is-droppable="true"
                >
                  {tasksInSlot.map((task, index) => {
                    // 确保每个任务有唯一的ID
                    const uniqueTaskId = `task-${task.id}-${slot}`;
                    
                    return (
                      <Draggable 
                        key={uniqueTaskId} 
                        draggableId={uniqueTaskId} 
                        index={index}
                      >
                        {(provided: any, snapshot: any) => {
                          return (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`
                                group relative flex items-center w-full p-3 
                                ${snapshot.isDragging ? 'bg-bg-panel/90 shadow-lg' : 'bg-black/70'} 
                                border border-border-metal rounded 
                                transition-colors duration-200
                                hover:border-accent-gold
                              `}
                            >
                              {/* 拖拽手柄 - 改为明显的UI元素 */}
                              <div 
                                {...provided.dragHandleProps}
                                className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-12 flex items-center justify-center bg-accent-gold/70 hover:bg-accent-gold rounded-l cursor-grab group-hover:opacity-100 opacity-30"
                                title="拖拽调整位置"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                              </div>
                              
                              <input
                                type="checkbox"
                                className="mr-2"
                                checked={task.completed}
                                onChange={() => toggleComplete(task.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              
                              {editingTaskId === task.id ? (
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  className="flex-1 px-2 py-1 bg-bg-dark border border-border-metal rounded-md text-text-primary focus:outline-none focus:border-accent-gold"
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onKeyDown={handleEditKeyDown}
                                  onBlur={saveEditedTask}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span 
                                  className={`${task.completed ? 'line-through text-gray-400' : 'text-white'} flex-1 cursor-pointer`}
                                  onClick={(e) => {e.stopPropagation(); startEditing(task.id, task.title);}}
                                >
                                  {task.title}
                                </span>
                              )}
                              
                              {!editingTaskId && (
                                <button 
                                  className="ml-2 text-red-600 hover:text-red-400"
                                  onClick={(e) => {e.stopPropagation(); handleDeleteTask(task.id);}}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        }}
                      </Draggable>
                    );
                  })}
                  
                  {provided.placeholder}
                  
                  {/* 新增任务输入区 - 只在 hover 时显示 */}
                  {hoveredSlot === slot && (
                    <div className="mt-auto flex items-center gap-2 p-2 bg-black/40 rounded-md transition-opacity duration-200">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 bg-bg-dark border border-border-metal rounded-md text-text-primary focus:outline-none focus:border-accent-gold"
                        placeholder="添加新任务..."
                        value={newTaskText[slot]}
                        onChange={(e) => setNewTaskText({ ...newTaskText, [slot]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateTask(slot)}
                      />
                      <button
                        className="px-3 py-2 bg-emerald-600 text-white rounded-md"
                        onClick={() => handleCreateTask(slot)}
                      >
                        添加
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </div>
    );
  };
  
  // 渲染历史标签页内容
  const renderHistoryTab = () => {
    if (taskHistory.length === 0) {
      return (
        <div 
          ref={historyContainerRef}
          className="flex-1 p-4 hide-scrollbar flex items-center justify-center"
        >
          <div className="text-center">
            <p className="text-text-secondary text-lg">暂无历史任务记录</p>
          </div>
        </div>
      );
    }
    
    return (
      <div 
        ref={historyContainerRef}
        className="flex-1 p-4 hide-scrollbar"
      >
        <div className="grid grid-cols-2 gap-4 pb-4">
          {taskHistory.map((day) => (
            <div key={day.date.toISOString()} className="valhalla-panel p-4">
              <h3 className="font-medium text-accent-gold mb-3">{day.formattedDate}</h3>
              <div className="space-y-2">
                {/* 按照时间段排序任务 */}
                {[...day.tasks]
                  .sort((a, b) => {
                    const timeSlotOrder = { 'morning': 0, 'afternoon': 1, 'evening': 2 };
                    return timeSlotOrder[a.timeSlot] - timeSlotOrder[b.timeSlot];
                  })
                  .map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center p-2 rounded bg-bg-panel/50 border border-border-metal"
                    >
                      <div className={`w-2 h-2 rounded-full mr-2 ${task.completed ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={task.completed ? '' : 'text-red-400'}>
                        {task.title}
                      </span>
                      <span className="ml-auto text-xs opacity-70">
                        {TIME_SLOTS.find(s => s.id === task.timeSlot)?.name}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
        {loading && (
          <div className="text-center pt-4 pb-2">
            <p className="text-accent-gold">加载更多数据中...</p>
          </div>
        )}
      </div>
    );
  };
  
  // 渲染笔记标签页内容
  const renderNotesTab = () => {
    console.log('Exception: 渲染笔记标签页, 当前笔记数量:', notesState.length);
    
    return (
      <div 
        className="flex flex-col p-4"
      >
        {/* 新建笔记区域 - 简化版 */}
        <div className="mb-4">
          <div className="flex flex-col relative">
            <textarea
              className="w-full p-3 border border-border-metal rounded-md min-h-[80px] focus:outline-none focus:border-accent-gold transparent-textarea"
              placeholder="记录你的想法和灵感..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && createNewNote()}
            />
            <button 
              className="absolute bottom-3 right-3 text-accent-gold/80 hover:text-accent-gold"
              onClick={createNewNote}
              title="保存笔记 (Ctrl + Enter)"
            >
              {/* 纸飞机图标 - 顺时针旋转90度 */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* 笔记列表 */}
        <div 
          ref={noteContainerRef}
          className="overflow-y-auto flex-1 hide-scrollbar space-y-3"
          style={{ minHeight: '100px' }}
        >
          {/* 确保遍历前笔记状态有效 */}
          {Array.isArray(notesState) && notesState.map((note) => {
            console.log('Exception: 渲染单个笔记:', note);
            
            // 确保note.updatedAt是Date对象，否则尝试转换
            const updatedAt = note.updatedAt instanceof Date ? 
              note.updatedAt : 
              (typeof note.updatedAt === 'string' ? new Date(note.updatedAt) : new Date());
            
            return (
              <div
                key={note.id}
                className="valhalla-panel p-3 cursor-pointer hover:border-accent-gold/50"
                onDoubleClick={() => startEditingNote({...note, updatedAt, createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt || updatedAt)})}
              >
                {editingNoteId === note.id ? (
                  <div className="flex flex-col relative">
                    <textarea
                      ref={noteTextareaRef}
                      className="w-full p-2 border border-border-metal rounded-md min-h-[80px] focus:outline-none focus:border-accent-gold transparent-textarea"
                      value={editingNoteContent}
                      onChange={(e) => setEditingNoteContent(e.target.value)}
                      onKeyDown={handleNoteKeyDown}
                    />
                    <div className="flex justify-end mt-2">
                      <button 
                        className="px-3 py-1 bg-red-600/70 text-white rounded-md mr-2 text-sm"
                        onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}
                      >
                        取消
                      </button>
                      <button 
                        className="px-3 py-1 bg-accent-gold/80 text-white rounded-md text-sm"
                        onClick={saveEditedNote}
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="whitespace-pre-wrap mb-2">{note.content}</div>
                    <div className="flex justify-between items-center text-xs opacity-70 mt-2 pt-2 border-t border-border-metal">
                      <span>
                        {`${updatedAt.getFullYear()}-${String(updatedAt.getMonth() + 1).padStart(2, '0')}-${String(updatedAt.getDate()).padStart(2, '0')} ${String(updatedAt.getHours()).padStart(2, '0')}:${String(updatedAt.getMinutes()).padStart(2, '0')}`}
                      </span>
                      <div>
                        <button 
                          className="text-accent-gold hover:text-accent-gold/80 mr-2"
                          onClick={(e) => { e.stopPropagation(); startEditingNote({...note, updatedAt, createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt || updatedAt)}); }}
                        >
                          编辑
                        </button>
                        <button 
                          className="text-red-500 hover:text-red-400"
                          onClick={(e) => { e.stopPropagation(); deleteNoteHandler(note.id); }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          
          {notesLoading && (
            <div className="text-center py-4">
              <p className="text-accent-gold">加载更多笔记中...</p>
            </div>
          )}
          
          {!notesLoading && notesState.length === 0 && (
            <div className="text-center py-8">
              <p className="text-text-secondary text-lg">暂无笔记</p>
              <p className="text-text-secondary text-sm mt-2">点击上方输入框输入并创建新笔记</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // 切换支线任务折叠状态
  const toggleChallengesCollapse = () => {
    setChallengesCollapsed(!challengesCollapsed);
  };

  // 切换日常任务折叠状态
  const toggleTemplatesCollapse = () => {
    setTemplatesCollapsed(!templatesCollapsed);
  };
  
  // 处理任务拖拽结束
  const handleDragEnd = async (result: any) => {
    console.log('=============== DRAG END EVENT ===============');
    console.log('Full drag result:', result);
    
    const { source, destination, draggableId } = result;
    
    // Debug information
    console.log('Source:', source);
    console.log('Destination:', destination);
    console.log('DraggableId:', draggableId);
    
    // 如果没有目的地或者没有移动，则返回
    if (!destination || 
        (source.droppableId === destination.droppableId && 
         source.index === destination.index)) {
      console.log('No destination or no movement, returning');
      return;
    }
    
    // 从支线任务或模板任务列表拖到时间段
    if ((source.droppableId === 'challenges' || source.droppableId === 'templates') && 
        ['morning', 'afternoon', 'evening'].includes(destination.droppableId)) {
      
      console.log('Dragging from challenge/template to time slot');
      
      try {
        // 解析draggableId以获取原始ID
        const idParts = draggableId.split('-');
        const prefix = idParts[0]; // 'challenge' or 'template'
        const originalId = idParts.slice(1).join('-'); // 重新连接，以防ID本身包含破折号
        
        console.log(`Parsed draggable ID: prefix=${prefix}, originalId=${originalId}`);
        
        // 获取源列表和任务索引
        const sourceList = source.droppableId === 'challenges' ? challengeTasks : templateTasks;
        const taskIndex = source.index;
        
        console.log('Source list:', sourceList);
        console.log('Task index:', taskIndex);
        
        // 检查索引是否有效
        if (taskIndex >= sourceList.length) {
          console.error('Task index out of bounds:', taskIndex, 'list length:', sourceList.length);
          return;
        }
        
        // 获取要添加的任务
        const task = sourceList[taskIndex];
        
        if (!task || !task.id) {
          console.error('Invalid task:', task);
          return;
        }
        
        // 验证找到的任务ID与解析的ID是否匹配
        if (task.id !== originalId) {
          console.warn(`Task ID mismatch. Parsed ID: ${originalId}, Task ID: ${task.id}`);
          // 继续使用索引找到的任务，而不是解析的ID
        }
        
        console.log('Task to add:', task);
        
        // 获取当前日期
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        // 确定任务类型
        const taskType = source.droppableId === 'challenges' ? 'challenge' : 'template';
        
        // 创建新的条目数据
        const newEntry: Record<string, any> = {
          // UI字段
          title: task.title,
          timeSlot: destination.droppableId as TimeSlot,
          scheduled_date: dateStr,
          source_type: taskType,
          
          // 数据库字段
          custom_name: task.title,
          description: task.description || '', // 将custom_desc改为description
          reward_points: task.reward_points || 0,
          slot: destination.droppableId,
          date: dateStr,
          task_type: taskType,
          status: 'ongoing'
        };
        
        // 添加ID字段
        if (taskType === 'challenge') {
          const taskId = parseInt(task.id);
          if (isNaN(taskId)) {
            console.error('Invalid task ID for conversion to number:', task.id);
            return;
          }
          newEntry.task_id = taskId;
          newEntry.ref_task_id = taskId;
        } else {
          const templateId = parseInt(task.id);
          if (isNaN(templateId)) {
            console.error('Invalid template ID for conversion to number:', task.id);
            return;
          }
          newEntry.template_id = templateId;
          newEntry.ref_template_id = templateId;
        }
        
        console.log('Creating schedule entry with data:', newEntry);
        
        const result = await createScheduleEntry(newEntry);
        console.log('Create result:', result);
        
        // 重新加载今天的任务
        await loadTodayScheduleEntries();
        
      } catch (error) {
        console.error('Error in drag-and-drop operation:', error);
      }
      return;
    }
    
    // 时间段内的任务重新排序或者在时间段之间移动
    if (['morning', 'afternoon', 'evening'].includes(source.droppableId) &&
        ['morning', 'afternoon', 'evening'].includes(destination.droppableId)) {
      
      try {
        // 找出要移动的任务
        const sourceSlot = source.droppableId as TimeSlot;
        const destSlot = destination.droppableId as TimeSlot;
        
        // 获取当前的临时排序状态
        const currentOrder = { ...temporaryTaskOrder };
        
        // 根据临时排序获取对应的任务ID
        if (!currentOrder[sourceSlot] || source.index >= currentOrder[sourceSlot].length) {
          console.error('Invalid source index or missing task order');
          return;
        }
        
        const taskIdToMove = currentOrder[sourceSlot][source.index];
        
        console.log('Moving task:', { 
          sourceSlot, 
          destSlot, 
          taskIdToMove,
          currentOrder
        });
        
        // 从源位置移除
        currentOrder[sourceSlot] = currentOrder[sourceSlot].filter(id => id !== taskIdToMove);
        
        if (sourceSlot === destSlot) {
          // 在同一时间段内重新排序 - 只更新临时状态
          
          // 在正确的位置插入
          const newOrder = [...currentOrder[destSlot]];
          newOrder.splice(destination.index, 0, taskIdToMove);
          currentOrder[destSlot] = newOrder;
          
          // 仅更新临时排序状态
          setTemporaryTaskOrder(currentOrder);
        } else {
          // 在不同时间段之间移动 - 更新任务的时间段属性并保存到数据库
          
          // 直接在目标位置插入
          const newOrder = [...currentOrder[destSlot]];
          newOrder.splice(destination.index, 0, taskIdToMove);
          currentOrder[destSlot] = newOrder;
          
          setTemporaryTaskOrder(currentOrder);
          
          // 如果时间段发生了变化，更新数据库
          await moveTaskBetweenSlots(taskIdToMove, destSlot);
        }
      } catch (error) {
        console.error('Error moving task between slots:', error);
      }
    }
  };
  
  // 处理拖拽开始
  const handleDragStart = (start: any) => {
    console.log('%c拖拽开始 - Drag Start', 'background: #ffa500; color: #fff; padding: 2px 5px; border-radius: 3px;', {
      draggableId: start.draggableId,
      source: start.source,
      type: start.type,
      mode: start.mode
    });
  };

  // 添加一个简单的点击测试函数到每个挑战和模板任务
  const handleTaskClick = (type: string, id: string) => {
    console.log(`%c点击${type}任务 - Click ${type} task`, 'background: #4caf50; color: #fff; padding: 2px 5px; border-radius: 3px;', {
      type,
      id
    });
  };

  // 添加测试笔记
  const addTestNote = () => {
    // 添加测试笔记
    const now = new Date();
    
    const content = '这是一条测试笔记 ' + now.toLocaleTimeString();
    
    createNote(content)
      .then(result => {
        if (result) {
          console.log('测试笔记已创建, ID:', result.note_id);
          // 重新加载笔记列表
          loadNotesData();
        }
      })
      .catch(error => {
        console.error('创建测试笔记失败:', error);
      });
  };

  return (
    <DragDropContext 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6 pb-40 hide-scrollbar">
        {/* 上方时间段和任务源区域 */}
        <div className="flex gap-6 min-h-[400px]">
          {/* 左侧三个时间段 */}
          <div className="flex-1 flex flex-col gap-4 ml-4">
            {(['morning','afternoon','evening'] as TimeSlot[]).map(slot => renderSlot(slot))}
          </div>
          
          {/* 右侧任务列表（上下排列） */}
          <div className="flex flex-col gap-4 transition-all duration-300">
            {/* 支线任务列表 */}
            <div className={`valhalla-panel overflow-hidden flex-1 flex ${challengesCollapsed ? 'w-12 ml-auto' : 'w-80'} transition-all duration-300`}>
              <div className={`flex items-center justify-center ${challengesCollapsed ? 'w-full' : 'hidden'}`}>
                <button 
                  className="p-1 hover:bg-sidebar-item-hover-bg rounded"
                  onClick={toggleChallengesCollapse}
                  title="展开支线任务"
                >
                  <span className="font-display text-accent-gold text-lg -rotate-90 whitespace-nowrap transform origin-center flex items-center">
                    支线任务
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              </div>
              <div className={`flex-1 ${challengesCollapsed ? 'hidden' : 'block'}`}>
                <div className="flex justify-between items-center border-b border-border-metal mb-4 pb-2">
                  <h3 className="font-display text-lg text-accent-gold">
                    支线任务
                  </h3>
                  <button 
                    className="p-1 hover:bg-sidebar-item-hover-bg rounded"
                    onClick={toggleChallengesCollapse}
                    title="收起支线任务"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
                <Droppable droppableId="challenges" isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false}>
                  {(provided: any, snapshot: any) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 p-1"
                    >
                      {loadingTasks ? (
                        <div className="text-center py-4">
                          <p className="text-accent-gold">加载任务中...</p>
                        </div>
                      ) : challengeTasks.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-text-secondary">暂无支线任务</p>
                        </div>
                      ) : (
                        challengeTasks.filter(task => task && task.id).map((task, index) => (
                          <Draggable key={getSafeDraggableId('challenge', task.id)} draggableId={getSafeDraggableId('challenge', task.id)} index={index}>
                            {(provided: any, snapshot: any) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-2 border border-border-metal rounded-md ${snapshot.isDragging ? 'bg-accent-gold/20 shadow-lg scale-105' : 'bg-bg-panel'} cursor-grab relative transition-transform hover:border-accent-gold z-50 flex items-center`}
                                style={{
                                  ...provided.draggableProps.style,
                                  zIndex: snapshot.isDragging ? 9999 : 50
                                }}
                              >
                                <div className="flex-1 font-semibold">{task.title}</div>
                                <div 
                                  className="ml-2 opacity-50 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskClick('挑战', task.id);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
            
            {/* 日常任务模板 */}
            <div className={`valhalla-panel overflow-hidden flex-1 flex ${templatesCollapsed ? 'w-12 ml-auto' : 'w-80'} transition-all duration-300`}>
              <div className={`flex items-center justify-center ${templatesCollapsed ? 'w-full' : 'hidden'}`}>
                <button 
                  className="p-1 hover:bg-sidebar-item-hover-bg rounded"
                  onClick={toggleTemplatesCollapse}
                  title="展开日常任务"
                >
                  <span className="font-display text-accent-gold text-lg -rotate-90 whitespace-nowrap transform origin-center flex items-center">
                    日常任务
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              </div>
              <div className={`flex-1 ${templatesCollapsed ? 'hidden' : 'block'}`}>
                <div className="flex justify-between items-center border-b border-border-metal mb-4 pb-2">
                  <h3 className="font-display text-lg text-accent-gold">
                    日常任务
                  </h3>
                  <button 
                    className="p-1 hover:bg-sidebar-item-hover-bg rounded"
                    onClick={toggleTemplatesCollapse}
                    title="收起日常任务"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
                <Droppable droppableId="templates" isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false}>
                  {(provided: any, snapshot: any) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 p-1"
                    >
                      {loadingTemplates ? (
                        <div className="text-center py-4">
                          <p className="text-accent-gold">加载任务模板中...</p>
                        </div>
                      ) : templateTasks.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-text-secondary">暂无日常任务模板</p>
                        </div>
                      ) : (
                        templateTasks.filter(task => task && task.id).map((task, index) => (
                          <Draggable key={getSafeDraggableId('template', task.id)} draggableId={getSafeDraggableId('template', task.id)} index={index}>
                            {(provided: any, snapshot: any) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-2 border border-border-metal rounded-md ${snapshot.isDragging ? 'bg-accent-gold/20 shadow-lg scale-105' : 'bg-bg-panel'} cursor-grab relative transition-transform hover:border-accent-gold z-50 flex items-center`}
                                style={{
                                  ...provided.draggableProps.style,
                                  zIndex: snapshot.isDragging ? 9999 : 50
                                }}
                              >
                                <div className="flex-1 font-semibold">{task.title}</div>
                                <div 
                                  className="ml-2 opacity-50 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskClick('模板', task.id);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          </div>
        </div>
        
        {/* 下方历史和笔记标签页 */}
        <div className="valhalla-panel overflow-hidden mt-2 flex flex-col">
          {/* 标签页切换 */}
          <div className="flex border-b border-border-metal">
            <button
              className={`px-6 py-3 font-display text-lg ${activeTab === 'history' ? 'bg-accent-gold text-text-on-accent' : 'text-text-primary hover:bg-sidebar-item-hover-bg'}`}
              onClick={() => setActiveTab('history')}
            >
              历史记录
            </button>
            <button
              className={`px-6 py-3 font-display text-lg ${activeTab === 'notes' ? 'bg-accent-gold text-text-on-accent' : 'text-text-primary hover:bg-sidebar-item-hover-bg'}`}
              onClick={() => setActiveTab('notes')}
            >
              笔记
            </button>
          </div>
          
          {/* 标签页内容 */}
          <div className="flex-1 overflow-auto hide-scrollbar h-full" style={{ minHeight: '450px' }}>
            {activeTab === 'history' ? renderHistoryTab() : renderNotesTab()}
          </div>
        </div>
      </div>
    </DragDropContext>
  );
};

export default TodayView;