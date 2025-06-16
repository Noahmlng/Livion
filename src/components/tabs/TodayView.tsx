import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useValhallaTaskContext } from '../../context/ValhallaTaskContext';
import { useDb } from '../../context/DbContext';
import { useAppState } from '../../context/AppStateContext';
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
import './optimizedTextarea.css';
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
  createdAt: Date | string;
  updatedAt: Date | string;
  pinned?: boolean;
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
  priority?: number;  // 添加priority字段
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
    
    // 直接用JS的Date解析 - 数据库已经存储的是北京时间
    const date = new Date(isoDateString);
    
    // 如果日期解析正确，直接返回
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // 处理特殊格式
    if (typeof isoDateString === 'string') {
      // 仅日期格式: 2025-05-11
      const dateOnlyMatch = isoDateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnlyMatch) {
        const [_, year, month, day] = dateOnlyMatch;
        
        // 创建本地日期对象
        const newDate = new Date();
        newDate.setFullYear(parseInt(year));
        newDate.setMonth(parseInt(month) - 1); // 月份从0开始
        newDate.setDate(parseInt(day));
        newDate.setHours(0, 0, 0, 0);
        
        return newDate;
      }
    }
    
    // 最后的回退选项
    return new Date();
  } catch (error) {
    console.error('Date parsing error:', error);
    return new Date(); // 返回当前时间作为备选
  }
};

// 自定义日期格式化函数，直接处理字符串，避免时区问题
const formatDateTime = (date: Date | string): string => {
  try {
    // 如果传入的是字符串
    if (typeof date === 'string') {
      // PostgreSQL格式: 2023-04-15 10:30:45.123456+08
      if (date.includes(' ') && !date.includes('T')) {
        // 这种格式已经是北京时间，直接提取年月日时分即可
        const parts = date.split(' ');
        const datePart = parts[0]; // YYYY-MM-DD
        const timePart = parts[1].split('.')[0].substring(0, 5); // 只取HH:MM
        return `${datePart} ${timePart}`;
      }
      
      // ISO格式: 2023-04-15T10:30:00.000Z
      if (date.includes('T')) {
        const parts = date.split('T');
        const datePart = parts[0]; // YYYY-MM-DD
        const timePart = parts[1].split('.')[0].substring(0, 5); // 只取HH:MM
        return `${datePart} ${timePart}`;
      }
      
      // 如果已经是 YYYY-MM-DD 格式
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return `${date} 00:00`;
      }
      
      // 其他未知格式，返回原始字符串
      return date;
    }

    // 如果是无效的日期对象
    if (!date || isNaN(date.getTime())) {
      return '未知时间';
    }

    // 如果是Date对象，直接使用本地时间格式化（不进行任何时区转换）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('日期格式化错误:', error, date);
    return String(date);
  }
};

// Helper function to generate a date string with current time
function getCurrentDateTimeString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

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
    searchNotes,
    createNote,
    updateNote,
    deleteNote,
    toggleNotePin,
    tasks,
    loadTasks
  } = useDb();
  
  // 使用应用状态管理
  const {
    state,
    setChallengesCollapsed,
    setTemplatesCollapsed,
    setTemporaryTaskOrder,
    setActiveTab,
    setVisibleDays,
    setNotesPage,
    setHasMoreNotes,
    setEditingTaskId,
    setEditingNoteId,
  } = useAppState();
  
  // 从 Context 获取持久化状态
  const {
    challengesCollapsed,
    templatesCollapsed,
    temporaryTaskOrder,
    activeTab,
    visibleDays,
    notesPage,
    hasMoreNotes,
    editingTaskId,
    editingNoteId,
  } = state.todayView;
  
  // 本地状态（不需要持久化的）
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [newTaskText, setNewTaskText] = useState({ morning: '', afternoon: '', evening: '' });
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [editingText, setEditingText] = useState('');
  const [hoveredSlot, setHoveredSlot] = useState<TimeSlot | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  
  // 数据状态
  const [taskHistory, setTaskHistory] = useState<TaskHistoryDay[]>([]);
  const [notesState, setNotesState] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [newNoteFocused, setNewNoteFocused] = useState(false);
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const noteContainerRef = useRef<HTMLDivElement>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const newNoteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 笔记搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
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
    
    // 添加拖拽功能增强
    // 这个函数用来确保所有draggable元素都能正常工作
    const enhanceDraggableElements = () => {
      // 查找所有拖拽相关元素
      const draggables = document.querySelectorAll('[data-rbd-draggable-id], [data-rbd-drag-handle-draggable-id]');
      
      // 确保它们可以被拖拽
      draggables.forEach(el => {
        if (el instanceof HTMLElement) {
          el.setAttribute('draggable', 'true');
          el.style.cursor = 'grab';
          
          // 添加视觉反馈
          el.addEventListener('mousedown', () => {
            el.style.cursor = 'grabbing';
          });
          
          el.addEventListener('mouseup', () => {
            el.style.cursor = 'grab';
          });
        }
      });
    };
    
    // 初始化后执行一次增强
    setTimeout(enhanceDraggableElements, 1000);
    
    // 选择性阻止原生拖拽: 只阻止非draggable元素的拖拽
    const preventNativeDrag = (e: DragEvent) => {
      // 检查目标元素是否是可拖拽元素或者其内部元素
      const target = e.target as HTMLElement;
      if (
        target.hasAttribute('draggable') || 
        target.closest('[draggable="true"]') || 
        target.closest('[data-rbd-draggable-id]') || 
        target.closest('[data-rbd-drag-handle-draggable-id]')
      ) {
        // 如果是可拖拽元素，允许拖拽
        return true;
      }
      
      // 只禁用非拖拽元素的拖拽行为
      e.preventDefault();
      return false;
    };
    
    // 添加全局拖拽事件监听器 - 只阻止非draggable元素的拖拽
    document.addEventListener('dragstart', preventNativeDrag);
    
    // 每当有DOM变化时，重新检查并增强
    const observer = new MutationObserver(enhanceDraggableElements);
    observer.observe(document.body, { childList: true, subtree: true });
    
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
      // 清理observer
      observer.disconnect();
      // 移除全局拖拽事件监听器
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
      console.log('Fetching ongoing tasks for user ID:', userId);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'ongoing')  // 只获取状态为ongoing的任务
        .order('priority', { ascending: false });  // 按priority倒序排列
        
      if (error) {
        console.error('Error fetching tasks from Supabase:', error);
        throw error;
      }
      
      console.log('Fetched ongoing tasks from Supabase:', data);
      setUserTasks(data || []);
    } catch (error) {
      console.error('Error loading user tasks:', error);
      // 如果直接获取失败，回退到使用 DbContext 中的方法
      try {
        await loadTasks();
        // 过滤和排序从DbContext加载的任务
        const filteredTasks = tasks
          .filter(task => task.status === 'ongoing')
          .sort((a, b) => {
            const priorityA = a.priority || 0;
            const priorityB = b.priority || 0;
            return priorityB - priorityA;  // 倒序排列
          });
        console.log('Loaded and filtered tasks via DbContext:', filteredTasks);
        setUserTasks(filteredTasks);
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
    
    // 初始化临时排序状态 - 保留现有排序，只添加新任务
    const morningTasks = mappedTasks.filter(task => task.timeSlot === 'morning').map(task => task.id);
    const afternoonTasks = mappedTasks.filter(task => task.timeSlot === 'afternoon').map(task => task.id);
    const eveningTasks = mappedTasks.filter(task => task.timeSlot === 'evening').map(task => task.id);
    
    // 获取当前的临时排序状态
    const currentOrder = temporaryTaskOrder;
    
    // 为每个时间段合并排序：保留现有排序中仍然存在的任务，然后添加新任务
    const mergeTaskOrder = (currentSlotOrder: string[], newSlotTasks: string[]) => {
      // 保留现有排序中仍然存在的任务
      const existingTasks = currentSlotOrder.filter(taskId => newSlotTasks.includes(taskId));
      // 添加新任务（不在现有排序中的）
      const newTasks = newSlotTasks.filter(taskId => !currentSlotOrder.includes(taskId));
      return [...existingTasks, ...newTasks];
    };
    
    setTemporaryTaskOrder({
      morning: mergeTaskOrder(currentOrder.morning, morningTasks),
      afternoon: mergeTaskOrder(currentOrder.afternoon, afternoonTasks),
      evening: mergeTaskOrder(currentOrder.evening, eveningTasks)
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
    setVisibleDays(visibleDays + 7);
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
  
  // 当笔记状态更新时，如果正在搜索则重新搜索
  useEffect(() => {
    if (isSearching && searchQuery.trim()) {
      const performSearch = async () => {
        try {
          const searchResults = await searchNotes(searchQuery);
          const convertedResults = searchResults.map(convertDbNoteToUINote);
          setFilteredNotes(convertedResults);
        } catch (error) {
          console.error('重新搜索笔记失败:', error);
          setFilteredNotes([]);
        }
      };
      performSearch();
    }
  }, [searchQuery, isSearching]);
  
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
      console.log(`[笔记加载] 开始加载笔记, page=${page}, reset=${reset}`);
      
      // 加载数据库中的笔记（数据库已经按正确顺序排序：置顶优先，然后按更新时间倒序）
      await loadNotes();
      console.log(`[笔记加载] 从数据库加载了 ${notes.length} 条笔记`);
      
      if (notes.length > 0) {
        // 检查第一条笔记的时间格式
        const firstNote = notes[0];
        console.log('[笔记加载] 第一条笔记时间格式:');
        console.log(`- created_at: ${firstNote.created_at} (${typeof firstNote.created_at})`);
        console.log(`- updated_at: ${firstNote.updated_at} (${typeof firstNote.updated_at})`);
      }
      
      if (reset) {
        // 重置分页状态
        setNotesPage(1);
        
        // 使用数据库中的笔记，保留原始时间字符串
        const dbNotes = notes.slice(0, 10).map(note => {
          // 确保笔记对象符合预期类型
          const typedNote = note as { 
            note_id: number, 
            content: string, 
            created_at: string, 
            updated_at: string,
            pinned?: boolean
          };
          
          const noteId = typedNote.note_id ? String(typedNote.note_id) : String(Date.now());
          
          // 处理时间，确保是字符串格式
          const createdAt = typedNote.created_at || getCurrentDateTimeString();
          const updatedAt = typedNote.updated_at || createdAt;
          
          return {
            id: noteId,
            content: typedNote.content || '',
            createdAt,
            updatedAt,
            pinned: typedNote.pinned || false
          };
        });
        
        console.log(`[笔记加载] 转换后的笔记数量: ${dbNotes.length}`);
        if (dbNotes.length > 0) {
          console.log(`[笔记加载] 第一条转换后的笔记:`, {
            id: dbNotes[0].id,
            content: dbNotes[0].content.substring(0, 20) + '...',
            createdAt: dbNotes[0].createdAt,
            updatedAt: dbNotes[0].updatedAt,
            pinned: dbNotes[0].pinned,
            formattedTime: formatDateTime(dbNotes[0].updatedAt)
          });
        }
        
        // 数据库已经排序好了，直接使用，无需前端重新排序
        setNotesState(dbNotes);
        console.log('[笔记加载] 状态已更新, 完成重置加载');
        
        // 设置hasMoreNotes
        const hasMore = notes.length > 10;
        setHasMoreNotes(hasMore);
      } else {
        // 加载更多笔记（分页）
        const startIndex = (page - 1) * 10;
        console.log(`[笔记加载] 加载更多: startIndex=${startIndex}, 总数=${notes.length}`);
        
        if (startIndex >= notes.length) {
          console.log('[笔记加载] 没有更多笔记可加载');
          setHasMoreNotes(false);
          setNotesLoading(false);
          return;
        }
        
        // 获取当前已加载的笔记ID列表，用于去重
        const existingNoteIds = new Set(notesState.map(note => note.id));
        console.log(`[笔记加载] 当前已加载ID: ${Array.from(existingNoteIds).join(', ')}`);
        
        const newNotes = notes
          .slice(startIndex, startIndex + 10)
          .filter(note => {
            // 类型转换
            const typedNote = note as { note_id: number };
            return !existingNoteIds.has(String(typedNote.note_id));
          })
          .map(note => {
            // 类型转换
            const typedNote = note as { 
              note_id: number, 
              content: string, 
              created_at: string, 
              updated_at: string,
              pinned?: boolean
            };
            
            const noteId = typedNote.note_id ? String(typedNote.note_id) : String(Date.now());
            
            // 处理时间，确保是字符串格式
            const createdAt = typedNote.created_at || getCurrentDateTimeString();
            const updatedAt = typedNote.updated_at || createdAt;
            
            return {
              id: noteId,
              content: typedNote.content || '',
              createdAt,
              updatedAt,
              pinned: typedNote.pinned || false
            };
          });
        
        console.log(`[笔记加载] 新加载笔记数量: ${newNotes.length}`);
        
        if (newNotes.length === 0) {
          console.log('[笔记加载] 没有新笔记可加载');
          setHasMoreNotes(false);
          setNotesLoading(false);
          return;
        }
        
        // 直接追加新笔记到现有列表，数据库已经排序好了
        setNotesState(prevNotes => [...prevNotes, ...newNotes]);
        
        console.log('[笔记加载] 状态已更新, 完成加载更多');
        setHasMoreNotes(notes.length > startIndex + 10);
      }
    } catch (error) {
      console.error('[笔记加载] 加载失败:', error);
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
        setNotesPage(1); // 重置页码
        setHasMoreNotes(true); // 重置加载更多状态
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
  
  // 监听全局滚动事件，检测到底部时加载更多笔记
  useEffect(() => {
    // 只在笔记标签页激活时添加监听
    if (activeTab !== 'notes' || !hasMoreNotes) return;

    // 全局滚动事件处理函数
    const handleGlobalScroll = () => {
      // 计算滚动位置
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight || document.documentElement.clientHeight;
      
      console.log('Exception: 全局滚动检测:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        distanceToBottom: scrollHeight - scrollTop - clientHeight
      });
      
      // 当距离底部150px以内时加载更多
      if (scrollHeight - scrollTop - clientHeight < 150 && !notesLoading && hasMoreNotes) {
        console.log('Exception: 滚动接近底部，自动加载更多笔记');
        const nextPage = notesPage + 1;
        setNotesPage(nextPage);
        loadNotesData(nextPage, false);
      }
    };
    
    // 添加滚动事件监听
    window.addEventListener('scroll', handleGlobalScroll);
    
    // 清理函数
    return () => {
      window.removeEventListener('scroll', handleGlobalScroll);
    };
  }, [activeTab, notesPage, hasMoreNotes, notesLoading]);
  
  // 点击加载更多笔记
  const handleLoadMoreClick = () => {
    if (!notesLoading && hasMoreNotes) {
      console.log('Exception: 点击加载更多按钮');
      const nextPage = notesPage + 1;
      setNotesPage(nextPage);
      loadNotesData(nextPage, false);
    }
  };
  
  // 创建新笔记 - 使用乐观更新模式，立即显示而不等待服务器响应
  const createNewNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      console.log('[笔记创建] 开始创建新笔记');
      
      // 获取当前时间
      const now = new Date();
      const formattedNow = formatDateTime(now);
      console.log(`[笔记创建] 当前时间: ${formattedNow}`);
      
      // 创建临时ID和临时笔记对象用于立即显示
      const tempId = `temp-${Date.now()}`;
      const optimisticNote: Note = {
        id: tempId,
        content: newNote.trim(),
        createdAt: formattedNow,
        updatedAt: formattedNow,
        pinned: false  // 新创建的笔记默认不置顶
      };
      
      console.log('[笔记创建] 添加临时笔记到UI:', optimisticNote);
      
      // 立即更新UI状态，将新笔记添加到正确位置（非置顶笔记的最前面）
      setNotesState(prevNotes => {
        // 分离置顶和非置顶笔记
        const pinnedNotes = prevNotes.filter(note => note.pinned);
        const unpinnedNotes = prevNotes.filter(note => !note.pinned);
        
        // 新笔记放在非置顶笔记的最前面
        return [...pinnedNotes, optimisticNote, ...unpinnedNotes];
      });
      
      // 清空输入框
      setNewNote('');
      
      // 然后发送到服务器，跳过自动刷新以保持乐观更新
      console.log('[笔记创建] 发送数据到服务器');
      const result = await createNote(optimisticNote.content, true);
      
      if (result) {
        console.log('[笔记创建] 服务器成功返回:', result);
        console.log(`[笔记创建] 服务器返回的created_at: ${result.created_at}`);
        console.log(`[笔记创建] 服务器返回的updated_at: ${result.updated_at}`);
        
        // 用真实ID替换临时ID，并更新为服务器返回的准确数据
        setNotesState(prevNotes => {
          return prevNotes.map(note => {
            if (note.id === tempId) {
              // 替换为服务器返回的数据，保留原始时间字符串
              return {
                id: result.note_id.toString(),
                content: result.content,
                createdAt: result.created_at || formattedNow,
                updatedAt: result.updated_at || formattedNow,
                pinned: result.pinned || false
              };
            }
            return note;
          });
        });
        
        console.log('[笔记创建] 笔记创建完成，使用乐观更新');
        // 创建成功，无需重新加载，乐观更新已经处理了排序
      } else {
        console.error('[笔记创建] 创建失败，服务器返回空结果');
        // 从状态中移除乐观添加的笔记
        setNotesState(prevNotes => prevNotes.filter(note => note.id !== tempId));
      }
    } catch (error) {
      console.error('[笔记创建] 创建失败:', error);
      // 发生错误时也需要从UI中移除乐观添加的笔记
      setNotesState(prevNotes => prevNotes.filter(note => !note.id.startsWith('temp-')));
    }
  };
  
  // 统一的时间比较函数 - 修复排序问题
  const compareTimeStrings = (timeA: string | Date, timeB: string | Date): number => {
    // 将时间转换为可比较的格式
    const getComparableTime = (time: string | Date): string => {
      if (time instanceof Date) {
        // Date对象转换为ISO字符串用于比较
        return time.toISOString();
      }
      
      if (typeof time === 'string') {
        // 检查是否已经是我们格式化的时间字符串 (YYYY-MM-DD HH:MM)
        const formattedTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
        if (formattedTimeRegex.test(time)) {
          // 转换为ISO格式以便比较：YYYY-MM-DD HH:MM -> YYYY-MM-DDTHH:MM:00.000Z
          return `${time.replace(' ', 'T')}:00.000Z`;
        }
        
        // 如果是ISO格式或数据库格式，直接返回
        return time;
      }
      
      // 回退选项
      return String(time);
    };
    
    const comparableA = getComparableTime(timeA);
    const comparableB = getComparableTime(timeB);
    
    // 倒序排列：最新的在前
    return comparableB.localeCompare(comparableA);
  };
  
  // 将数据库笔记格式转换为UI格式
  const convertDbNoteToUINote = (dbNote: any): Note => {
    const noteId = dbNote.note_id ? String(dbNote.note_id) : String(Date.now());
    const createdAt = dbNote.created_at || getCurrentDateTimeString();
    const updatedAt = dbNote.updated_at || createdAt;
    
    return {
      id: noteId,
      content: dbNote.content || '',
      createdAt,
      updatedAt,
      pinned: dbNote.pinned || false
    };
  };

  // 处理搜索输入
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsSearching(!!query.trim());
    
    if (query.trim()) {
      try {
        const searchResults = await searchNotes(query);
        // 将数据库格式转换为UI格式
        const convertedResults = searchResults.map(convertDbNoteToUINote);
        setFilteredNotes(convertedResults);
      } catch (error) {
        console.error('搜索笔记失败:', error);
        setFilteredNotes([]);
      }
    } else {
      setFilteredNotes([]);
    }
  };
  
  // 清除搜索
  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setFilteredNotes([]);
  };
  
  // 获取要显示的笔记列表
  const getDisplayNotes = (): Note[] => {
    return isSearching ? filteredNotes : notesState;
  };
  
  // 保存编辑的笔记
  const saveEditedNote = async () => {
    if (!editingNoteId || !editingNoteContent.trim()) return;
    
    try {
      console.log('[笔记更新] 开始更新笔记:', editingNoteId);
      
      // 获取当前时间用于乐观更新
      const now = new Date();
      const formattedNow = formatDateTime(now);
      
      // 获取被更新笔记的置顶状态
      const editingNote = notesState.find(note => note.id === editingNoteId);
      if (!editingNote) {
        console.error('[笔记更新] 找不到要更新的笔记');
        return;
      }
      
      console.log('[笔记更新] 原始笔记:', editingNote);
      console.log('[笔记更新] 新内容:', editingNoteContent.trim());
      console.log('[笔记更新] 新更新时间:', formattedNow);
      
      // 创建更新后的笔记对象
      const updatedNote = {
        ...editingNote,
        content: editingNoteContent.trim(),
        updatedAt: formattedNow
      };
      
      console.log('[笔记更新] 更新后的笔记:', updatedNote);
      
      // 立即更新UI状态（乐观更新）- 智能排序
      setNotesState(prevNotes => {
        console.log('[笔记更新] 更新前的笔记列表:', prevNotes.length);
        console.log('[笔记更新] 更新前第一条笔记时间:', prevNotes[0]?.updatedAt);
        
        // 更新笔记内容和时间
        const updatedNotes = prevNotes.map(note => 
          note.id === editingNoteId ? updatedNote : note
        );
        
        console.log('[笔记更新] 内容更新后的笔记列表:', updatedNotes.length);
        
        // 智能重新排序：置顶的笔记在前，然后按更新时间排序
        const pinnedNotes = updatedNotes.filter(note => note.pinned);
        const unpinnedNotes = updatedNotes.filter(note => !note.pinned);
        
        // 在各自区域内按更新时间倒序排序
        const sortByTime = (a: Note, b: Note) => {
          return compareTimeStrings(a.updatedAt, b.updatedAt);
        };
        
        pinnedNotes.sort(sortByTime);
        unpinnedNotes.sort(sortByTime);
        
        const finalNotes = [...pinnedNotes, ...unpinnedNotes];
        console.log('[笔记更新] 最终排序后的笔记列表:', finalNotes.length);
        console.log('[笔记更新] 排序后第一条笔记ID:', finalNotes[0]?.id);
        console.log('[笔记更新] 排序后第一条笔记时间:', finalNotes[0]?.updatedAt);
        console.log('[笔记更新] 排序后第一条笔记内容:', finalNotes[0]?.content.substring(0, 20));
        
        return finalNotes;
      });
      
      // 立即清除编辑状态，让用户看到更新结果
      setEditingNoteId(null);
      setEditingNoteContent('');
      
      console.log('[笔记更新] UI已立即更新并退出编辑模式，发送到服务器');
      
      // 发送更新到数据库，跳过自动刷新以保持乐观更新
      const success = await updateNote(editingNoteId, editingNoteContent.trim(), true);
      
      if (success) {
        console.log('[笔记更新] 服务器更新成功');
        // 更新成功，无需重新加载，乐观更新已经处理了所有状态
      } else {
        console.error('[笔记更新] 服务器更新失败，恢复原始状态');
        // 如果服务器更新失败，恢复原始笔记状态
        setNotesState(prevNotes => {
          return prevNotes.map(note => 
            note.id === editingNoteId ? editingNote : note
          );
        });
      }
      
    } catch (error) {
      console.error('[笔记更新] 更新失败:', error);
      // 发生错误时恢复原始状态
      setNotesState(prevNotes => {
        const editingNote = prevNotes.find(note => note.id === editingNoteId);
        if (editingNote) {
          return prevNotes.map(note => 
            note.id === editingNoteId ? { ...editingNote, content: editingNote.content } : note
          );
        }
        return prevNotes;
      });
      // 清除编辑状态
      setEditingNoteId(null);
      setEditingNoteContent('');
    }
  };
  
  // 处理笔记编辑时的键盘事件
  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      saveEditedNote();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEditingNoteId(null);
      setEditingNoteContent('');
    }
  };
  
  // 删除笔记
  const deleteNoteHandler = async (noteId: string) => {
    // 保存要删除的笔记，以便在失败时恢复
    const noteToDelete = notesState.find(note => note.id === noteId);
    if (!noteToDelete) {
      console.error('[笔记删除] 找不到要删除的笔记');
      return;
    }
    
    try {
      console.log('[笔记删除] 开始删除笔记:', noteId);
      
      // 立即从UI中移除笔记（乐观更新）
      setNotesState(prevNotes => prevNotes.filter(note => note.id !== noteId));
      
      console.log('[笔记删除] UI已立即更新，发送到服务器');
      
      // 发送删除请求到数据库，跳过自动刷新以保持乐观更新
      const success = await deleteNote(noteId, true);
      
      if (success) {
        console.log('[笔记删除] 服务器删除成功');
        // 删除成功，无需重新排序，已从UI中移除
      } else {
        console.error('[笔记删除] 服务器删除失败，恢复UI状态');
        // 如果服务器删除失败，恢复笔记到UI的正确位置
        setNotesState(prevNotes => {
          // 重新插入已删除的笔记到正确位置
          const allNotes = [...prevNotes, noteToDelete];
          const pinnedNotes = allNotes.filter(note => note.pinned);
          const unpinnedNotes = allNotes.filter(note => !note.pinned);
          
          // 在各自区域内按更新时间排序，使用统一的比较函数
          const sortByTime = (a: Note, b: Note) => {
            return compareTimeStrings(a.updatedAt, b.updatedAt);
          };
          
          pinnedNotes.sort(sortByTime);
          unpinnedNotes.sort(sortByTime);
          
          return [...pinnedNotes, ...unpinnedNotes];
        });
      }
    } catch (error) {
      console.error('[笔记删除] 删除失败:', error);
      // 发生错误时恢复原始状态
      setNotesState(prevNotes => {
        // 重新插入已删除的笔记到正确位置
        const allNotes = [...prevNotes, noteToDelete];
        const pinnedNotes = allNotes.filter(note => note.pinned);
        const unpinnedNotes = allNotes.filter(note => !note.pinned);
        
        // 在各自区域内按更新时间排序，使用统一的比较函数
        const sortByTime = (a: Note, b: Note) => {
          return compareTimeStrings(a.updatedAt, b.updatedAt);
        };
        
        pinnedNotes.sort(sortByTime);
        unpinnedNotes.sort(sortByTime);
        
        return [...pinnedNotes, ...unpinnedNotes];
      });
    }
  };

  // 切换笔记置顶状态
  const toggleNotePinHandler = async (noteId: string, currentPinned: boolean) => {
    try {
      console.log('[笔记置顶] 开始切换置顶状态:', noteId, '当前状态:', currentPinned);
      
      // 保存要修改的笔记，以便在失败时恢复
      const noteToUpdate = notesState.find(note => note.id === noteId);
      if (!noteToUpdate) {
        console.error('[笔记置顶] 找不到要修改的笔记');
        return;
      }
      
      const newPinnedState = !currentPinned;
      
      // 立即更新UI（乐观更新）
      setNotesState(prevNotes => {
        const updatedNotes = prevNotes.map(note => 
          note.id === noteId ? { ...note, pinned: newPinnedState } : note
        );
        
        // 重新排序：置顶的笔记在前，然后按更新时间排序
        const pinnedNotes = updatedNotes.filter(note => note.pinned);
        const unpinnedNotes = updatedNotes.filter(note => !note.pinned);
        
        // 在各自区域内按更新时间倒序排序
        const sortByTime = (a: Note, b: Note) => {
          return compareTimeStrings(a.updatedAt, b.updatedAt);
        };
        
        pinnedNotes.sort(sortByTime);
        unpinnedNotes.sort(sortByTime);
        
        return [...pinnedNotes, ...unpinnedNotes];
      });
      
      console.log('[笔记置顶] UI已立即更新，发送到服务器');
      
      // 发送置顶状态切换请求到数据库，跳过自动刷新以保持乐观更新
      const success = await toggleNotePin(noteId, newPinnedState, true);
      
      if (success) {
        console.log('[笔记置顶] 服务器更新成功');
        // 置顶状态更新成功，无需重新加载，乐观更新已经处理了排序
      } else {
        console.error('[笔记置顶] 服务器更新失败，恢复UI状态');
        // 如果服务器更新失败，恢复笔记状态
        setNotesState(prevNotes => {
          const restoredNotes = prevNotes.map(note => 
            note.id === noteId ? { ...note, pinned: currentPinned } : note
          );
          
          // 重新排序，使用统一的比较函数
          const pinnedNotes = restoredNotes.filter(note => note.pinned);
          const unpinnedNotes = restoredNotes.filter(note => !note.pinned);
          
          const sortByTime = (a: Note, b: Note) => {
            return compareTimeStrings(a.updatedAt, b.updatedAt);
          };
          
          pinnedNotes.sort(sortByTime);
          unpinnedNotes.sort(sortByTime);
          
          return [...pinnedNotes, ...unpinnedNotes];
        });
      }
    } catch (error) {
      console.error('[笔记置顶] 切换失败:', error);
      // 发生错误时恢复原始状态
      setNotesState(prevNotes => {
        const noteToUpdate = prevNotes.find(note => note.id === noteId);
        if (noteToUpdate) {
          return prevNotes.map(note => 
            note.id === noteId ? { ...noteToUpdate, pinned: currentPinned } : note
          );
        }
        return prevNotes;
      });
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
      setTemporaryTaskOrder({
        ...temporaryTaskOrder,
        [timeSlot]: [...temporaryTaskOrder[timeSlot], result.entry_id]
      });
    }
  };
  
  // 删除任务
  const handleDeleteTask = async (taskId: string) => {
    // 先从临时排序中移除
    const newOrder = { ...temporaryTaskOrder };
    // 在所有时间段中查找并移除该任务ID
    Object.keys(newOrder).forEach(slot => {
      newOrder[slot as TimeSlot] = newOrder[slot as TimeSlot].filter((id: string) => id !== taskId);
    });
    setTemporaryTaskOrder(newOrder);
    
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
                                group relative flex items-center w-full p-3 drag-item
                                ${snapshot.isDragging ? 'bg-bg-panel/90 shadow-lg' : 'bg-black/70'} 
                                border border-border-metal rounded 
                                transition-colors duration-200
                                hover:border-accent-gold
                              `}
                              onMouseEnter={() => setHoveredTaskId(task.id)}
                              onMouseLeave={() => setHoveredTaskId(null)}
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
                              
                              {!editingTaskId && hoveredTaskId === task.id && (
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
  // 已经不再需要这个函数，笔记内容直接渲染在主布局中
  /*
  const renderNotesTab = () => {
    console.log('Exception: 渲染笔记标签页, 当前笔记数量:', notesState.length);
    
    return (
      <div 
        className="flex flex-col p-4 h-full"
      >
        // ... 原有内容已移动到主布局中
      </div>
    );
  };
  */
  
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
          
          // 对于模板任务，确保正确获取和设置奖励点数和描述
          // 查找完整的模板信息
          const templateInfo = taskTemplates.find(t => t.template_id.toString() === task.id);
          if (templateInfo) {
            newEntry.reward_points = templateInfo.default_points || 0;
            newEntry.description = templateInfo.description || '';
          }
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
          // 在同一时间段内重新排序 - 更新临时状态并保持持久化
          
          // 在正确的位置插入
          const newOrder = [...currentOrder[destSlot]];
          newOrder.splice(destination.index, 0, taskIdToMove);
          currentOrder[destSlot] = newOrder;
          
          // 更新临时排序状态
          setTemporaryTaskOrder(currentOrder);
          
          console.log('Same slot reordering completed:', {
            slot: sourceSlot,
            newOrder: currentOrder[destSlot]
          });
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

  // 自动调整textarea高度的函数
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement, targetLines?: number, minLines?: number) => {
    // 重置高度以获取正确的scrollHeight
    textarea.style.height = 'auto';
    
    // 获取最小和最大高度限制
    const defaultMinHeight = parseInt(textarea.style.minHeight) || 40;
    const maxHeight = parseInt(textarea.style.maxHeight) || 200;
    
    // 计算新高度
    let scrollHeight = textarea.scrollHeight;
    
    // 如果指定了目标行数，计算目标高度
    if (targetLines) {
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
      const padding = parseInt(getComputedStyle(textarea).paddingTop) + parseInt(getComputedStyle(textarea).paddingBottom);
      const targetHeight = (lineHeight * targetLines) + padding;
      
      // 使用目标高度和当前内容高度中的较大值
      scrollHeight = Math.max(scrollHeight, targetHeight);
    }
    
    // 如果指定了最小行数，计算最小高度
    let minHeight = defaultMinHeight;
    if (minLines) {
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
      const padding = parseInt(getComputedStyle(textarea).paddingTop) + parseInt(getComputedStyle(textarea).paddingBottom);
      const minLineHeight = (lineHeight * minLines) + padding;
      minHeight = Math.max(minLineHeight, defaultMinHeight);
    }
    
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    // 设置新高度
    textarea.style.height = newHeight + 'px';
    
    // 动态调整滚动条显示
    if (scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
      textarea.classList.add('scrollable');
    } else {
      textarea.style.overflowY = 'hidden';
      textarea.classList.remove('scrollable');
    }
  };

  // 处理新笔记输入变化
  const handleNewNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewNote(e.target.value);
    // 使用 requestAnimationFrame 确保DOM更新后再调整高度
    requestAnimationFrame(() => {
      // 如果处于聚焦状态，保持至少5行的高度
      const minLines = newNoteFocused ? 5 : undefined;
      adjustTextareaHeight(e.target, undefined, minLines);
    });
  };

  // 处理编辑笔记输入变化
  const handleEditNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingNoteContent(e.target.value);
    // 使用 requestAnimationFrame 确保DOM更新后再调整高度
    requestAnimationFrame(() => {
      adjustTextareaHeight(e.target);
    });
  };

  // 处理新建笔记聚焦
  const handleNewNoteFocus = () => {
    setNewNoteFocused(true);
    
    // 延迟执行，让CSS的聚焦样式先生效
    setTimeout(() => {
      if (newNoteTextareaRef.current) {
        const textarea = newNoteTextareaRef.current;
        
        // 计算当前行数 - 使用offsetHeight而不是scrollHeight
        const computedStyle = getComputedStyle(textarea);
        const lineHeight = parseInt(computedStyle.lineHeight) || 24;
        const paddingTop = parseInt(computedStyle.paddingTop) || 0;
        const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;
        const totalPadding = paddingTop + paddingBottom;
        
        // 使用当前显示高度计算行数
        const currentHeight = textarea.offsetHeight;
        const contentHeight = currentHeight - totalPadding;
        const currentLines = Math.ceil(contentHeight / lineHeight);
        
        console.log('聚焦时的高度信息:', {
          currentHeight,
          lineHeight,
          totalPadding,
          contentHeight,
          currentLines
        });
        
        // 如果当前行数小于5行，则展开到5行
        if (currentLines < 5) {
          adjustTextareaHeight(textarea, 5);
        }
      }
    }, 50); // 给一点时间让CSS动画类生效
  };

  // 处理新建笔记失焦
  const handleNewNoteBlur = () => {
    setNewNoteFocused(false);
    
    // 延迟恢复高度，让CSS动画先执行
    setTimeout(() => {
      if (newNoteTextareaRef.current) {
        const textarea = newNoteTextareaRef.current;
        
        // 失焦时不再有最小行数限制，让高度根据内容自适应
        adjustTextareaHeight(textarea);
      }
    }, 100); // 稍微延迟一点，让聚焦样式的动画完成
  };

  // 在组件挂载后调整初始高度
  useEffect(() => {
    if (newNoteTextareaRef.current) {
      adjustTextareaHeight(newNoteTextareaRef.current);
    }
  }, []);

  // 在编辑模式切换时调整高度
  useEffect(() => {
    if (noteTextareaRef.current && editingNoteId) {
      setTimeout(() => {
        if (noteTextareaRef.current) {
          adjustTextareaHeight(noteTextareaRef.current);
        }
      }, 10);
    }
  }, [editingNoteId, editingNoteContent]);

  return (
    <DragDropContext 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div 
        className="flex flex-col gap-6 pb-40 hide-scrollbar"
      >
        {/* 上方时间段和任务源区域 */}
        <div className="flex gap-6 min-h-[400px]">
          {/* 左侧三个时间段 */}
          <div className="flex-1 flex flex-col gap-4 ml-4">
            {(['morning','afternoon','evening'] as TimeSlot[]).map(slot => renderSlot(slot))}
          </div>
          
          {/* 右侧任务列表（上下排列） */}
          <div className="flex flex-col gap-4 transition-all duration-300">
            {/* 支线任务列表 */}
            <div className={`valhalla-panel overflow-hidden flex h-[400px] ${challengesCollapsed ? 'w-12 ml-auto' : 'w-80'} transition-all duration-300`}>
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
              <div className={`flex-1 ${challengesCollapsed ? 'hidden' : 'flex flex-col'}`}>
                <div className="flex justify-between items-center border-b border-border-metal mb-4 pb-2 flex-shrink-0">
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
                      className="space-y-2 p-1 flex-1 overflow-y-auto hide-scrollbar"
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
                                className={`p-2 border border-border-metal rounded-md ${snapshot.isDragging ? 'bg-accent-gold/20 shadow-lg scale-105' : 'bg-bg-panel'} cursor-grab relative transition-transform hover:border-accent-gold z-50 flex items-center drag-item`}
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
            <div className={`valhalla-panel overflow-hidden flex h-[400px] ${templatesCollapsed ? 'w-12 ml-auto' : 'w-80'} transition-all duration-300`}>
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
              <div className={`flex-1 ${templatesCollapsed ? 'hidden' : 'flex flex-col'}`}>
                <div className="flex justify-between items-center border-b border-border-metal mb-4 pb-2 flex-shrink-0">
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
                      className="space-y-2 p-1 flex-1 overflow-y-auto hide-scrollbar"
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
                                className={`p-2 border border-border-metal rounded-md ${snapshot.isDragging ? 'bg-accent-gold/20 shadow-lg scale-105' : 'bg-bg-panel'} cursor-grab relative transition-transform hover:border-accent-gold z-50 flex items-center drag-item`}
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
        
        {/* 标签选择器 */}
        <div className="flex justify-between items-center border-b border-border-metal mt-2">
          <div className="flex">
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
          
          {/* 搜索框 - 只在笔记标签页显示 */}
          {activeTab === 'notes' && (
            <div className="flex-shrink-0 w-80 mr-4">
              <div className="border border-border-metal rounded-md overflow-hidden transition-all duration-200 focus-within:border-accent-gold hover:border-accent-gold/50 bg-bg-panel">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-transparent text-text-primary placeholder-text-secondary text-sm"
                    placeholder="搜索笔记内容..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                  {/* 搜索图标或清除按钮 */}
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    {searchQuery ? (
                      <button
                        onClick={clearSearch}
                        className="p-1 text-text-secondary hover:text-accent-gold transition-colors"
                        title="清除搜索"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 标签页内容 - 不再有外框限制 */}
        {activeTab === 'history' ? (
          <div className="valhalla-panel overflow-hidden flex flex-col">
            {renderHistoryTab()}
          </div>
        ) : (
          <div className="flex flex-col">
            {/* 新建笔记区域 - 优化后的单一边框设计 */}
            <div className={`mb-4 flex-shrink-0 border border-border-metal rounded-md overflow-hidden transition-all duration-200 focus-within:border-accent-gold hover:border-accent-gold/50 textarea-container note-input-container ${newNoteFocused ? 'focused' : ''}`}>
              <div className="relative bg-bg-panel">
                <textarea
                  ref={newNoteTextareaRef}
                  className={`w-full p-4 pr-12 optimized-textarea auto-resize-textarea text-text-primary placeholder-text-secondary leading-relaxed ${newNoteFocused ? 'focused' : ''}`}
                  style={{ minHeight: '40px', maxHeight: '200px' }}
                  placeholder="记录你的想法和灵感..."
                  value={newNote}
                  onChange={handleNewNoteChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      createNewNote();
                    }
                  }}
                  onFocus={handleNewNoteFocus}
                  onBlur={handleNewNoteBlur}
                />
                {/* 发送按钮 - 位置优化 */}
                <button 
                  className={`absolute bottom-3 right-3 p-1 rounded-md send-button transition-all duration-200 ${
                    newNote.trim() 
                      ? 'text-accent-gold hover:text-accent-gold/80 hover:bg-accent-gold/10 scale-100 opacity-100' 
                      : 'text-text-secondary/30 scale-90 opacity-50 cursor-not-allowed'
                  }`}
                  onClick={createNewNote}
                  disabled={!newNote.trim()}
                  title={newNote.trim() ? "保存笔记 (Cmd + Enter)" : "输入内容后可保存"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* 笔记列表 - 直接在主滚动区域内，没有外框限制 */}
            <div className="space-y-3" ref={noteContainerRef}>
              {/* 确保遍历前笔记状态有效 */}
              {Array.isArray(getDisplayNotes()) && getDisplayNotes().map((note) => {
                return (
                  <div
                    key={note.id}
                    className="valhalla-panel p-3 cursor-pointer hover:border-accent-gold/50"
                    onDoubleClick={() => startEditingNote(note)}
                  >
                    {editingNoteId === note.id ? (
                      <div className="flex flex-col relative">
                        {/* 编辑模式的textarea也使用相同的优化设计 */}
                        <div className="border border-border-metal rounded-md overflow-hidden focus-within:border-accent-gold textarea-container">
                          <textarea
                            ref={noteTextareaRef}
                            className="w-full p-3 optimized-textarea auto-resize-textarea bg-bg-dark text-text-primary leading-relaxed"
                            style={{ minHeight: '80px', maxHeight: '300px' }}
                            value={editingNoteContent}
                            onChange={handleEditNoteChange}
                            onKeyDown={handleNoteKeyDown}
                          />
                        </div>
                        <div className="flex justify-end mt-3 gap-2">
                          <button 
                            className="px-3 py-1.5 bg-text-secondary/20 text-text-secondary rounded-md text-sm hover:bg-text-secondary/30 transition-colors"
                            onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}
                          >
                            取消
                          </button>
                          <button 
                            className="px-3 py-1.5 bg-accent-gold text-text-on-accent rounded-md text-sm hover:bg-accent-gold/90 transition-colors"
                            onClick={saveEditedNote}
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div className="whitespace-pre-wrap flex-1 leading-relaxed">{note.content}</div>
                          {note.pinned && (
                            <div className="ml-2 flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-accent-gold" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M16 12V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v8H6a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2v5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-5h2a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-2z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-xs opacity-70 mt-2 pt-2 border-t border-border-metal">
                          <span>
                            {formatDateTime(note.updatedAt)}
                          </span>
                          <div>
                            <button 
                              className={`mr-2 ${note.pinned ? 'text-accent-gold hover:text-accent-gold/80' : 'text-gray-400 hover:text-accent-gold'}`}
                              onClick={(e) => { e.stopPropagation(); toggleNotePinHandler(note.id, note.pinned || false); }}
                              title={note.pinned ? '取消置顶' : '置顶笔记'}
                            >
                              {note.pinned ? '取消置顶' : '置顶'}
                            </button>
                            <button 
                              className="text-accent-gold hover:text-accent-gold/80 mr-2"
                              onClick={(e) => { e.stopPropagation(); startEditingNote(note); }}
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
                <div className="text-center py-4 bg-bg-panel rounded-md border border-border-metal">
                  <p className="text-accent-gold">加载更多笔记中...</p>
                </div>
              )}
              
              {!notesLoading && getDisplayNotes().length === 0 && (
                <div className="text-center py-8 bg-bg-panel rounded-md border border-border-metal">
                  {isSearching ? (
                    <>
                      <p className="text-text-secondary text-lg">未找到匹配的笔记</p>
                      <p className="text-text-secondary text-sm mt-2">尝试调整搜索关键词</p>
                    </>
                  ) : (
                    <>
                      <p className="text-text-secondary text-lg">暂无笔记</p>
                      <p className="text-text-secondary text-sm mt-2">点击上方输入框输入并创建新笔记</p>
                    </>
                  )}
                </div>
              )}
              
              {/* 触发加载更多的元素 */}
              {hasMoreNotes && !isSearching && (
                <div 
                  className="py-2 text-center cursor-pointer hover:bg-bg-panel hover:text-accent-gold rounded-md border border-border-metal"
                  onClick={handleLoadMoreClick}
                >
                  点击加载更多笔记
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
};

export default TodayView;