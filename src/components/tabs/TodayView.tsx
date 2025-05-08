import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useValhallaTaskContext } from '../../context/ValhallaTaskContext';
import { useDb } from '../../context/DbContext';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  resetServerContext
} from 'react-beautiful-dnd';
import morningBg from '../../assets/morning-bg.jpg';
import afternoonBg from '../../assets/afternoon-bg.jpg';
import eveningBg from '../../assets/evening-bg.jpg';
import './hideScrollbar.css';

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
}

// 辅助函数：转换UTC时间到北京时间 (UTC+8)
const toBeijingTime = (date: Date): Date => {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000);
};

// 辅助函数：从北京时间转回UTC时间
const fromBeijingTime = (date: Date): Date => {
  return new Date(date.getTime() - 8 * 60 * 60 * 1000);
};

// 辅助函数：检查两个日期是否在同一天（基于当地时间）
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const TodayView = () => {
  const { categories } = useValhallaTaskContext();
  const { 
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
    deleteNote
  } = useDb();
  
  // 状态
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
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
  
  // Force a rerender of the DragDropContext on mount to fix initialization issues
  useEffect(() => {
    resetServerContext();
    setForceUpdateKey(prev => prev + 1);
    
    // 加载今天的任务安排
    loadTodayScheduleEntries();
    
    // 加载初始历史数据
    loadHistoryData();
    
    // 加载笔记数据
    loadNotesData();
  }, []);
  
  // 从数据库加载今天的任务安排
  const loadTodayScheduleEntries = async () => {
    // 获取北京时间的今天
    const utcNow = new Date();
    const beijingNow = toBeijingTime(utcNow);
    
    // 重要：使用北京时间直接构造日期，避免时区转换错误
    const beijingYear = beijingNow.getFullYear();
    const beijingMonth = String(beijingNow.getMonth() + 1).padStart(2, '0'); // 月份从0开始
    const beijingDay = String(beijingNow.getDate()).padStart(2, '0');
    const beijingDateStr = `${beijingYear}-${beijingMonth}-${beijingDay}`;
    
    console.log('加载日期范围:', 
      `北京时间: ${beijingNow.toISOString()}`,
      `北京日期字符串: ${beijingDateStr}`
    );
    
    // 构造基于北京时间的日期（UTC+8）的开始和结束时间
    // 注意：我们在数据库中保存的是日期字符串（没有时区信息），所以直接使用北京时区的日期字符串
    // 创建一个日期对象只是为了方便进行查询
    const dateObj = new Date(`${beijingDateStr}T00:00:00.000Z`);
    
    // 使用日期范围加载数据 - 注意使用日期字符串作为查询条件
    const entriesByDate = await loadScheduleEntriesRange(dateObj, dateObj);
    
    // 将所有日期的条目合并为单一数组
    const allEntries: any[] = [];
    Object.values(entriesByDate).forEach(entries => {
      allEntries.push(...entries);
    });
    
    // 额外的过滤，确保只包含今天的任务（基于北京时间）
    const todayEntries = allEntries.filter(entry => {
      // 将条目的日期提取出来进行比较
      let entryDateStr: string;
      if (typeof entry.date === 'string') {
        // 如果已经是字符串，提取日期部分（可能是YYYY-MM-DD或ISO格式）
        entryDateStr = entry.date.includes('T') ? entry.date.split('T')[0] : entry.date;
      } else if (entry.date instanceof Date) {
        // 如果是Date对象，转换为北京时间再提取日期部分
        const entryDateBeijing = toBeijingTime(entry.date);
        entryDateStr = `${entryDateBeijing.getFullYear()}-${String(entryDateBeijing.getMonth() + 1).padStart(2, '0')}-${String(entryDateBeijing.getDate()).padStart(2, '0')}`;
      } else {
        console.warn('无效的日期格式:', entry.date);
        return false;
      }
      
      // 直接比较日期字符串，避免时区转换问题
      return entryDateStr === beijingDateStr;
    });
    
    // 手动更新scheduleEntries状态
    if (todayEntries.length > 0) {
      console.log('找到今日（北京时间）的任务:', todayEntries.length, todayEntries);
      
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
    } else {
      console.log('今日（北京时间）没有找到任务');
      setScheduledTasks([]);
    }
  };
  
  // 新增方法: 从数据库加载历史任务记录
  const loadHistoryData = async (daysToLoad = 7, startFromDay = 1) => {
    setLoading(true);
    
    try {
      // 使用北京时间作为基准
      const utcNow = new Date();
      const beijingNow = toBeijingTime(utcNow);
      
      // 处理每一天的数据
      const newHistoryData: TaskHistoryDay[] = [];
      
      // 遍历日期范围，从昨天开始（i 从 startFromDay 开始，默认为 1，表示昨天）
      for (let i = startFromDay; i < startFromDay + daysToLoad; i++) {
        // 计算北京时间的日期
        const beijingDate = new Date(beijingNow);
        beijingDate.setDate(beijingDate.getDate() - i);
        
        // 构造日期字符串 - 直接使用北京时间
        const year = beijingDate.getFullYear();
        const month = String(beijingDate.getMonth() + 1).padStart(2, '0');
        const day = String(beijingDate.getDate()).padStart(2, '0');
        const beijingDateStr = `${year}-${month}-${day}`;
        
        // 格式化日期显示（使用北京时间展示）
        const formattedDate = beijingDate.toLocaleDateString('zh-CN', {
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        });
        
        // 使用构造的日期对象查询
        const dateObj = new Date(`${beijingDateStr}T00:00:00.000Z`);
        const entriesByDate = await loadScheduleEntriesRange(dateObj, dateObj);
        
        // 合并所有条目
        let entriesForDay: any[] = [];
        Object.values(entriesByDate).forEach(entries => {
          entriesForDay = entriesForDay.concat(entries);
        });
        
        console.log(`北京时间 ${beijingDateStr} 的任务数: ${entriesForDay.length}`);
        
        // 将数据转换为 UI 格式
        const tasksForDay = entriesForDay.map(entry => ({
          id: entry.entry_id.toString(),
          title: entry.custom_name || '',
          completed: entry.status === 'completed',
          timeSlot: entry.slot as TimeSlot
        }));
        
        // 只有有任务的日期才添加到历史记录中
        if (tasksForDay.length > 0) {
          newHistoryData.push({
            date: beijingDate, // 使用北京时间存储日期
            formattedDate,
            tasks: tasksForDay
          });
        }
      }
      
      // 将新加载的历史数据添加到现有数据后面
      if (startFromDay === 1) {
        setTaskHistory(newHistoryData);
      } else {
        setTaskHistory(prevHistory => [...prevHistory, ...newHistoryData]);
      }
    } catch (error) {
      console.error('加载历史数据失败:', error);
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
          // 确保日期是有效的
          const createdTime = note.created_at ? new Date(note.created_at) : new Date();
          return {
            id: note.note_id.toString(),
            content: note.content,
            // 将UTC时间转换为北京时间
            createdAt: toBeijingTime(createdTime)
          };
        });
        
        setNotesState(dbNotes);
        setHasMoreNotes(notes.length > 10);
      } else {
        // 加载更多笔记（分页）
        const startIndex = (page - 1) * 10;
        const newNotes = notes.slice(startIndex, startIndex + 10).map(note => {
          // 确保日期是有效的
          const createdTime = note.created_at ? new Date(note.created_at) : new Date();
          return {
            id: note.note_id.toString(),
            content: note.content,
            // 将UTC时间转换为北京时间
            createdAt: toBeijingTime(createdTime)
          };
        });
        
        setNotesState(prevNotes => [...prevNotes, ...newNotes]);
        setHasMoreNotes(notes.length > startIndex + 10);
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
    } finally {
      setNotesLoading(false);
    }
  };
  
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
      // 创建新笔记到数据库
      const result = await createNote(newNote.trim());
      
      if (result) {
        // 确保日期是有效的
        const createdTime = result.created_at ? new Date(result.created_at) : new Date();
        
        // 添加到本地状态
        const newNoteObj: Note = {
          id: result.note_id.toString(),
          content: result.content,
          // 将UTC时间转换为北京时间
          createdAt: toBeijingTime(createdTime)
        };
        
        console.log('创建新笔记:', 
          `UTC时间: ${createdTime.toISOString()}`, 
          `北京时间: ${newNoteObj.createdAt.toISOString()}`
        );
        
        setNotesState([newNoteObj, ...notesState]);
        setNewNote('');
      }
    } catch (error) {
      console.error('创建笔记失败:', error);
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
    if (editingNoteId) {
      try {
        // 更新数据库中的笔记
        const success = await updateNote(editingNoteId, editingNoteContent.trim() || '');
        
        if (success) {
          // 获取当前UTC时间
          const now = new Date();
          // 转换为北京时间
          const beijingNow = toBeijingTime(now);
          
          console.log('更新笔记时间:', 
            `UTC时间: ${now.toISOString()}`, 
            `北京时间: ${beijingNow.toISOString()}`
          );
          
          // 更新本地状态
          setNotesState(notes => 
            notes.map(note => 
              note.id === editingNoteId 
                ? { ...note, content: editingNoteContent.trim() || note.content, createdAt: beijingNow } 
                : note
            )
          );
        }
      } catch (error) {
        console.error('更新笔记失败:', error);
      } finally {
        setEditingNoteId(null);
        setEditingNoteContent('');
      }
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
        // 从本地状态中删除
        setNotesState(notes => notes.filter(note => note.id !== noteId));
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
  const challengeTasks = categories.find(cat => cat.id === 'side')?.tasks || [];
  const templateTasks = categories.find(cat => cat.id === 'daily')?.tasks || [];
  
  // 安全地生成拖拽 ID
  const getSafeDraggableId = (prefix: string, id: string) => {
    return `${prefix}-${id.replace(/^side-/, '')}`;
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
    
    // 系统时间诊断
    const serverNow = new Date(); 
    console.log('=== 系统时间诊断 ===');
    console.log(`服务器时间: ${serverNow.toString()}`);
    console.log(`服务器时区: UTC${-serverNow.getTimezoneOffset()/60 > 0 ? '+' : ''}${-serverNow.getTimezoneOffset()/60}`);
    console.log(`服务器ISO时间: ${serverNow.toISOString()}`);
    console.log(`服务器ISO日期部分: ${serverNow.toISOString().split('T')[0]}`);
    console.log('=====================');
    
    // 创建新任务对象
    const title = newTaskText[timeSlot].trim();
    
    // 获取原始 UTC 时间和北京时间，用于调试
    const utcNow = new Date();
    const beijingNow = toBeijingTime(utcNow);
    
    console.log('时间诊断 - 原始时间:', 
      `UTC原始: ${utcNow.toISOString()}`, 
      `UTC日期部分: ${utcNow.toISOString().split('T')[0]}`,
      `北京原始: ${beijingNow.toISOString()}`,
      `北京日期部分: ${beijingNow.toISOString().split('T')[0]}`
    );
    
    // 重要：直接使用北京时间的日期部分（不转回UTC）
    // 因为我们需要的是北京时区的日期，而不是UTC时区的日期
    const beijingYear = beijingNow.getFullYear();
    const beijingMonth = String(beijingNow.getMonth() + 1).padStart(2, '0'); // 月份从0开始
    const beijingDay = String(beijingNow.getDate()).padStart(2, '0');
    
    // 直接构造YYYY-MM-DD格式的日期字符串
    const beijingDateStr = `${beijingYear}-${beijingMonth}-${beijingDay}`;
    
    console.log('创建任务使用日期:', 
      `北京日期字符串 (将直接使用): ${beijingDateStr}`
    );
    
    // 使用北京时间的日期直接创建任务
    console.log('即将发送到数据库的任务数据:');
    const createData = {
      title,
      timeSlot: timeSlot,
      scheduled_date: beijingDateStr, // 直接使用北京时间日期字符串
      source_type: 'custom'
    };
    console.log(JSON.stringify(createData, null, 2));
    
    const result = await createScheduleEntry(createData);
    
    // 清空输入框
    setNewTaskText({ ...newTaskText, [timeSlot]: '' });
    
    // 重新加载今天的任务
    await loadTodayScheduleEntries();
  };
  
  // 删除任务
  const handleDeleteTask = async (taskId: string) => {
    // 从本地状态中删除
    setScheduledTasks(scheduledTasks.filter(t => t.id !== taskId));
    
    // 从数据库中删除
    await deleteScheduleEntry(taskId);
  };
  
  // 将任务从一个时间段移动到另一个时间段
  const moveTaskBetweenSlots = async (taskId: string, newSlot: TimeSlot) => {
    // 更新本地状态
    setScheduledTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, timeSlot: newSlot } 
          : task
      )
    );
    
    // 更新数据库 - 使用正确的字段名
    await updateScheduleEntry(taskId, { slot: newSlot });
  };
  
  // 渲染每个时间段的面板内容
  const renderSlot = (slot: TimeSlot) => {
    const tasksInSlot = scheduledTasks.filter(task => task.timeSlot === slot);
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
            <Droppable droppableId={slot} direction="vertical" isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false}>
              {(provided: any, snapshot: any) => (
                <div 
                  ref={provided.innerRef} 
                  {...provided.droppableProps} 
                  className={`flex flex-col gap-2 flex-1 min-h-[120px] ${snapshot.isDraggingOver ? 'bg-accent-gold/10 border-2 border-dashed border-accent-gold/50 rounded-lg p-2' : ''}`}
                >
                  {tasksInSlot.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided: any, snapshot: any) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`flex items-center w-full p-3 ${snapshot.isDragging ? 'bg-bg-panel/90 shadow-lg' : 'bg-black/70'} border border-border-metal rounded`}
                        >
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={task.completed}
                            onChange={() => toggleComplete(task.id)}
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
                            />
                          ) : (
                            <span 
                              className={`${task.completed ? 'line-through text-gray-400' : 'text-white'} flex-1 cursor-pointer`}
                              onClick={() => startEditing(task.id, task.title)}
                            >
                              {task.title}
                            </span>
                          )}
                          {!editingTaskId && (
                            <button 
                              className="ml-2 text-red-600 hover:text-red-400"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
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
          {notesState.map((note) => (
            <div
              key={note.id}
              className="valhalla-panel p-3 cursor-pointer hover:border-accent-gold/50"
              onDoubleClick={() => startEditingNote(note)}
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
                      {note.createdAt.toLocaleDateString()} {note.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div>
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
          ))}
          
          {notesLoading && (
            <div className="text-center py-4">
              <p className="text-accent-gold">加载更多笔记中...</p>
            </div>
          )}
          
          {!notesLoading && notesState.length === 0 && (
            <div className="text-center py-8">
              <p className="text-text-secondary text-lg">暂无笔记</p>
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
    const { source, destination } = result;
    
    console.log('Drag result:', result);
    
    // 如果没有目的地或者没有移动，则返回
    if (!destination || 
        (source.droppableId === destination.droppableId && 
         source.index === destination.index)) {
      console.log('No valid destination or no movement');
      return;
    }
    
    // 从支线任务或模板任务列表拖到时间段
    if ((source.droppableId === 'challenges' || source.droppableId === 'templates') && 
        ['morning', 'afternoon', 'evening'].includes(destination.droppableId)) {
      console.log('Dragging from task lists to time slot');
      
      const sourceList = source.droppableId === 'challenges' ? challengeTasks : templateTasks;
      const taskToAdd = sourceList[source.index];
      console.log('Task to add:', taskToAdd);
      
      // 提取ID时去掉前缀
      const draggableId = result.draggableId;
      const prefix = source.droppableId === 'challenges' ? 'challenge-' : 'template-';
      const taskId = draggableId.startsWith(prefix) ? draggableId.substring(prefix.length) : draggableId;
      
      // 找到对应原始任务
      const originalTask = sourceList.find(t => t.id === taskId || t.id === `side-${taskId}`) || taskToAdd;
      
      // 获取原始 UTC 时间和北京时间，用于调试
      const utcNow = new Date();
      const beijingNow = toBeijingTime(utcNow);
      
      console.log('拖拽时间诊断 - 原始时间:', 
        `UTC原始: ${utcNow.toISOString()}`, 
        `北京原始: ${beijingNow.toISOString()}`
      );
      
      // 重要：直接使用北京时间的日期部分（不转回UTC）
      // 因为我们需要的是北京时区的日期，而不是UTC时区的日期
      const beijingYear = beijingNow.getFullYear();
      const beijingMonth = String(beijingNow.getMonth() + 1).padStart(2, '0'); // 月份从0开始
      const beijingDay = String(beijingNow.getDate()).padStart(2, '0');
      
      // 直接构造YYYY-MM-DD格式的日期字符串
      const beijingDateStr = `${beijingYear}-${beijingMonth}-${beijingDay}`;
      
      console.log('拖拽创建任务使用日期:', 
        `北京日期字符串 (将直接使用): ${beijingDateStr}`
      );
      
      const taskSourceType = source.droppableId === 'challenges' ? 'challenge' : 'template';
      
      // 根据数据库模型创建适当的条目数据
      console.log('拖拽创建 - 即将发送到数据库的任务数据:');
      const newEntryData = {
        title: originalTask.title,
        timeSlot: destination.droppableId as TimeSlot,
        scheduled_date: beijingDateStr, // 直接使用北京时间日期字符串
        source_type: taskSourceType as 'challenge' | 'template' | 'custom'
      };
      console.log(JSON.stringify(newEntryData, null, 2));
      
      // 根据源类型添加适当的ID字段
      if (taskSourceType === 'challenge') {
        Object.assign(newEntryData, { task_id: originalTask.id });
      } else {
        Object.assign(newEntryData, { template_id: originalTask.id });
      }
      
      console.log('添加ID后的最终数据:', JSON.stringify(newEntryData, null, 2));
      
      await createScheduleEntry(newEntryData);
      
      // 重新加载今天的任务
      await loadTodayScheduleEntries();
      return;
    }
    
    // 时间段内的任务重新排序或者在时间段之间移动
    if (['morning', 'afternoon', 'evening'].includes(source.droppableId) &&
        ['morning', 'afternoon', 'evening'].includes(destination.droppableId)) {
      console.log('Moving between time slots');
      
      // 找出要移动的任务
      const tasksInSourceSlot = scheduledTasks.filter(task => task.timeSlot === source.droppableId);
      const taskToMove = tasksInSourceSlot[source.index];
      console.log('Task to move:', taskToMove);
      
      // 如果时间段发生了变化，更新数据库
      if (source.droppableId !== destination.droppableId) {
        await moveTaskBetweenSlots(taskToMove.id, destination.droppableId as TimeSlot);
      }
    }
  };
  
  return (
    <DragDropContext key={`dnd-context-${forceUpdateKey}`} onDragEnd={handleDragEnd}>
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
                  <h3 className="font-display text-lg text-text-primary">
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
                      {challengeTasks.filter(task => task && task.id).map((task, index) => (
                        <Draggable key={getSafeDraggableId('challenge', task.id)} draggableId={getSafeDraggableId('challenge', task.id)} index={index}>
                          {(provided: any, snapshot: any) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-2 border border-border-metal rounded-md ${snapshot.isDragging ? 'bg-accent-gold/20 shadow-lg scale-105' : 'bg-bg-panel'} cursor-grab relative transition-transform hover:border-accent-gold`}
                            >
                              {snapshot.isDragging && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs text-accent-gold whitespace-nowrap">
                                  拖拽到时间段
                                </div>
                              )}
                              <div className="font-semibold">{task.title}</div>
                              <div className="text-xs text-text-secondary">
                                Rewards: {task.reward_points}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
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
                  <h3 className="font-display text-lg text-text-primary">
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
                      {templateTasks.filter(task => task && task.id).map((task, index) => (
                        <Draggable key={getSafeDraggableId('template', task.id)} draggableId={getSafeDraggableId('template', task.id)} index={index}>
                          {(provided: any, snapshot: any) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-2 border border-border-metal rounded-md ${snapshot.isDragging ? 'bg-accent-gold/20 shadow-lg scale-105' : 'bg-bg-panel'} cursor-grab relative transition-transform hover:border-accent-gold`}
                            >
                              {snapshot.isDragging && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs text-accent-gold whitespace-nowrap">
                                  拖拽到时间段
                                </div>
                              )}
                              <div className="font-semibold">{task.title}</div>
                              <div className="text-xs text-text-secondary">
                                Rewards: {task.reward_points}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
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