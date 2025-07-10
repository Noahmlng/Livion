import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Button, 
  Input, 
  Textarea, 
  Tabs, 
  Tab, 
  Chip, 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  useDisclosure,
  Divider,
  ScrollShadow,
  Switch,
  Badge,
  Avatar,
  Spacer
} from '@heroui/react';
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
    // 首先检查输入是否为空或未定义
    if (!date || date === 'null' || date === 'undefined') {
      console.warn('[formatDateTime] 输入为空或未定义:', date);
      return getCurrentDateTimeString();
    }
    
    // 如果传入的是字符串
    if (typeof date === 'string') {
      // 如果已经是我们的目标格式，直接返回
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date)) {
        return date;
      }
      
      // PostgreSQL格式: 2023-04-15 10:30:45.123456+08
      if (date.includes(' ') && !date.includes('T')) {
        // 这种格式已经是北京时间，直接提取年月日时分即可
        const parts = date.split(' ');
        const datePart = parts[0]; // YYYY-MM-DD
        const timePart = parts[1].split('.')[0].substring(0, 5); // 只取HH:MM
        return `${datePart} ${timePart}`;
      }
      
      // ISO格式: 2023-04-15T10:30:00.000Z (需要修正服务器错误存储的时区)
      if (date.includes('T')) {
        // 服务器存储的UTC时间实际上是北京时间，需要减去8小时修正
        const serverDate = new Date(date);
        if (isNaN(serverDate.getTime())) {
          console.warn('[formatDateTime] 无效的ISO日期字符串:', date);
          return getCurrentDateTimeString();
        }
        const correctedDate = new Date(serverDate.getTime() - 8 * 60 * 60 * 1000);
        
        const year = correctedDate.getFullYear();
        const month = String(correctedDate.getMonth() + 1).padStart(2, '0');
        const day = String(correctedDate.getDate()).padStart(2, '0');
        const hours = String(correctedDate.getHours()).padStart(2, '0');
        const minutes = String(correctedDate.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      }
      
      // 如果已经是 YYYY-MM-DD 格式
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return `${date} 00:00`;
      }
      
      // 尝试直接解析字符串
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        const hours = String(parsedDate.getHours()).padStart(2, '0');
        const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      }
      
      // 其他未知格式，返回当前时间
      console.warn('[formatDateTime] 未知的日期字符串格式:', date);
      return getCurrentDateTimeString();
    }

    // 如果是Date对象但无效
    if (date instanceof Date && isNaN(date.getTime())) {
      console.warn('[formatDateTime] 无效的Date对象:', date);
      return getCurrentDateTimeString();
    }

    // 如果是有效的Date对象，确保使用真正的本地时间（北京时间）
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    // 未知类型，返回当前时间
    console.warn('[formatDateTime] 未知的输入类型:', typeof date, date);
    return getCurrentDateTimeString();
  } catch (error) {
    console.error('[formatDateTime] 日期格式化错误:', error, date);
    return getCurrentDateTimeString();
  }
};

// Helper function to generate a date string with current time (确保使用本地时间)
function getCurrentDateTimeString(): string {
  const now = new Date();
  // 直接使用本地时间，不做任何时区转换
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

  // Notes专用的时间格式化函数
const formatNoteTime = (date: Date | string): string => {
  try {
    console.log('[formatNoteTime] 函数被调用，输入:', date, typeof date);
    
    // 首先检查输入是否为空、未定义或特殊值
    if (!date || date === 'null' || date === 'undefined' || date === '未知时间') {
      console.warn('[formatNoteTime] 输入为空或特殊值:', date);
      // 返回当前时间的HH:MM格式
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    let noteDate: Date;
    
    // 处理字符串格式的日期
    if (typeof date === 'string') {
      // formatDateTime生成的格式: YYYY-MM-DD HH:MM (这个已经是本地时间，不需要转换)
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date)) {
        console.log('[formatNoteTime] 处理本地格式:', date);
        const parts = date.split(' ');
        const datePart = parts[0]; // YYYY-MM-DD
        const timePart = parts[1]; // HH:MM
        
        console.log('[formatNoteTime] datePart:', datePart, 'timePart:', timePart);
        
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        
        console.log('[formatNoteTime] 解析的数值:', { year, month, day, hour, minute });
        
        // 验证解析出的数值是否有效
        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute) ||
            year < 1970 || month < 1 || month > 12 || day < 1 || day > 31 || 
            hour < 0 || hour > 23 || minute < 0 || minute > 59) {
          console.error('[formatNoteTime] 解析出的数值无效:', { year, month, day, hour, minute });
          // 返回当前时间的HH:MM格式
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        }
        
        // 这个时间已经是本地时间，直接使用
        noteDate = new Date(year, month - 1, day, hour, minute, 0);
        console.log('[formatNoteTime] 创建的Date对象:', noteDate);
        console.log('[formatNoteTime] Date对象是否有效:', !isNaN(noteDate.getTime()));
      }
      // PostgreSQL格式: 2023-04-15 10:30:45.123456+08
      else if (date.includes(' ') && !date.includes('T')) {
        // 数据库中已经是UTC+8时间，直接解析即可
        const parts = date.split(' ');
        const datePart = parts[0]; // YYYY-MM-DD
        const timePart = parts[1].split('.')[0]; // HH:MM:SS
        
        // 直接使用这个时间，不做时区转换
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);
        
        // 验证解析出的数值是否有效
        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
          console.error('[formatNoteTime] PostgreSQL格式解析失败:', { year, month, day, hour, minute });
          // 返回当前时间的HH:MM格式
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        }
        
        noteDate = new Date(year, month - 1, day, hour, minute, second || 0);
      }
      // ISO格式: 2023-04-15T10:30:00.000Z (需要修正服务器错误存储的时区)
      else if (date.includes('T')) {
        console.log('[formatNoteTime] 处理ISO格式:', date);
        // 服务器存储的UTC时间实际上是北京时间，需要减去8小时修正
        const serverDate = new Date(date);
        console.log('[formatNoteTime] 原始serverDate:', serverDate);
        console.log('[formatNoteTime] serverDate.getTime():', serverDate.getTime());
        console.log('[formatNoteTime] serverDate 是否有效:', !isNaN(serverDate.getTime()));
        
        if (isNaN(serverDate.getTime())) {
          console.error('[formatNoteTime] ISO格式日期无效:', date);
          // 返回当前时间的HH:MM格式
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        }
        
        noteDate = new Date(serverDate.getTime() - 8 * 60 * 60 * 1000);
        console.log('[formatNoteTime] 修正后的时间:', noteDate);
        console.log('[formatNoteTime] 修正后时间是否有效:', !isNaN(noteDate.getTime()));
        console.log('[formatNoteTime] 修正后的 getHours():', noteDate.getHours());
      }
      // 如果已经是 YYYY-MM-DD 格式
      else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          console.error('[formatNoteTime] YYYY-MM-DD格式解析失败:', { year, month, day });
          // 返回当前时间的HH:MM格式
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        }
        noteDate = new Date(year, month - 1, day);
      }
      // 其他格式尝试直接解析
      else {
        noteDate = new Date(date);
        if (isNaN(noteDate.getTime())) {
          console.error('[formatNoteTime] 字符串直接解析失败:', date);
          // 返回当前时间的HH:MM格式
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        }
      }
    } else if (date instanceof Date) {
      noteDate = date;
    } else {
      console.error('[formatNoteTime] 未知的输入类型:', typeof date, date);
      // 返回当前时间的HH:MM格式
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    // 如果是无效的日期对象
    if (!noteDate || isNaN(noteDate.getTime())) {
      console.error('[formatNoteTime] 日期无效！noteDate:', noteDate, '输入:', date);
      // 返回当前时间的HH:MM格式
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    // 获取当前日期（用于比较）
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    // 获取笔记日期（仅日期部分）
    const noteDay = new Date(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate());
    
    // 判断是今天、昨天还是更早
    if (noteDay.getTime() === today.getTime()) {
      // 今天：显示 HH:MM
      const hours = String(noteDate.getHours()).padStart(2, '0');
      const minutes = String(noteDate.getMinutes()).padStart(2, '0');
      const result = `${hours}:${minutes}`;
      console.log('[formatNoteTime] 最终结果:', result);
      return result;
    } else if (noteDay.getTime() === yesterday.getTime()) {
      // 昨天：显示 Yesterday
      return 'Yesterday';
    } else {
      // 前天及之前：显示 MM-DD
      const month = String(noteDate.getMonth() + 1).padStart(2, '0');
      const day = String(noteDate.getDate()).padStart(2, '0');
      return `${month}-${day}`;
    }
  } catch (error) {
    console.error('[formatNoteTime] 笔记时间格式化错误:', error, date);
    // 发生错误时返回当前时间的HH:MM格式
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
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
  
  // 笔记详细编辑弹窗状态
  const { isOpen: isNoteModalOpen, onOpen: onNoteModalOpen, onOpenChange: onNoteModalOpenChange } = useDisclosure();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [modalNoteContent, setModalNoteContent] = useState('');
  const [originalModalContent, setOriginalModalContent] = useState(''); // 保存原始内容用于比较
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);
  
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
    
    // 强制重新渲染拖拽上下文
    setForceUpdateKey(prev => prev + 1);
    
    // 添加拖拽功能增强
    const enhanceDraggableElements = () => {
      console.log('[拖拽修复] 开始增强拖拽元素');
      
      // 查找所有拖拽相关元素
      const draggables = document.querySelectorAll('[data-rbd-draggable-id], [data-rbd-drag-handle-draggable-id]');
      console.log(`[拖拽修复] 找到 ${draggables.length} 个拖拽元素`);
      
      // 确保它们可以被拖拽
      draggables.forEach((el, index) => {
        if (el instanceof HTMLElement) {
          el.setAttribute('draggable', 'true');
          el.style.cursor = 'grab';
          
          // 添加唯一标识符以便调试
          el.setAttribute('data-drag-enhanced', 'true');
          
          // 添加视觉反馈
          const handleMouseDown = () => {
            console.log(`[拖拽修复] 鼠标按下，元素 ${index + 1}`);
            el.style.cursor = 'grabbing';
          };
          
          const handleMouseUp = () => {
            console.log(`[拖拽修复] 鼠标释放，元素 ${index + 1}`);
            el.style.cursor = 'grab';
          };
          
          // 移除旧的事件监听器（如果存在）
          el.removeEventListener('mousedown', handleMouseDown);
          el.removeEventListener('mouseup', handleMouseUp);
          
          // 添加新的事件监听器
          el.addEventListener('mousedown', handleMouseDown);
          el.addEventListener('mouseup', handleMouseUp);
        }
      });
      
      console.log('[拖拽修复] 拖拽元素增强完成');
    };
    
    // 初始化后执行增强，并延迟执行以确保 DOM 完全渲染
    const initializeEnhancement = () => {
      enhanceDraggableElements();
      
      // 再次延迟执行，确保所有动态内容都已渲染
      setTimeout(() => {
        enhanceDraggableElements();
        console.log('[拖拽修复] 延迟增强完成');
      }, 500);
    };
    
    setTimeout(initializeEnhancement, 100);
    
    // 改进的 MutationObserver - 只在必要时触发
    let enhancementTimeout: NodeJS.Timeout;
    const debouncedEnhancement = () => {
      clearTimeout(enhancementTimeout);
      enhancementTimeout = setTimeout(() => {
        console.log('[拖拽修复] MutationObserver 触发增强');
        enhanceDraggableElements();
      }, 300); // 300ms 防抖
    };
    
    const observer = new MutationObserver((mutations) => {
      let shouldEnhance = false;
      
      mutations.forEach((mutation) => {
        // 只有当添加了拖拽相关元素时才触发增强
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const hasDragElements = node.querySelector('[data-rbd-draggable-id], [data-rbd-drag-handle-draggable-id]') ||
                                    node.hasAttribute('data-rbd-draggable-id') ||
                                    node.hasAttribute('data-rbd-drag-handle-draggable-id');
              
              if (hasDragElements) {
                console.log('[拖拽修复] 检测到新的拖拽元素被添加');
                shouldEnhance = true;
              }
            }
          });
        }
      });
      
      if (shouldEnhance) {
        debouncedEnhancement();
      }
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: false // 不监听属性变化，减少触发频率
    });
    
    // 选择性阻止原生拖拽
    const preventNativeDrag = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      
      // 检查是否是拖拽相关元素
      if (
        target.hasAttribute('draggable') || 
        target.closest('[draggable="true"]') || 
        target.closest('[data-rbd-draggable-id]') || 
        target.closest('[data-rbd-drag-handle-draggable-id]')
      ) {
        // 如果是拖拽元素，允许拖拽
        console.log('[拖拽修复] 允许拖拽元素的原生拖拽');
        return true;
      }
      
      // 只禁用非拖拽元素的拖拽行为
      e.preventDefault();
      return false;
    };
    
    // 添加全局拖拽事件监听器
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
      console.log('[拖拽修复] 清理事件监听器和观察者');
      
      // 清理超时
      clearTimeout(enhancementTimeout);
      
      // 清理observer
      observer.disconnect();
      
      // 移除全局拖拽事件监听器
      document.removeEventListener('dragstart', preventNativeDrag);
      
      // 清理所有增强的拖拽元素
      const enhancedElements = document.querySelectorAll('[data-drag-enhanced="true"]');
      enhancedElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.removeAttribute('data-drag-enhanced');
          el.style.cursor = '';
        }
      });
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
      // 如果当前没有排序信息，直接使用新任务列表
      if (!currentSlotOrder || currentSlotOrder.length === 0) {
        return newSlotTasks;
      }
      
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
      console.log(`[笔记加载] 开始加载笔记, page=${page}, reset=${reset}, 每页20条`);
      
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
        const dbNotes = notes.slice(0, 20).map(note => {
          // 确保笔记对象符合预期类型
          const typedNote = note as { 
            note_id: number, 
            content: string, 
            created_at: string, 
            updated_at: string,
            pinned?: boolean
          };
          
          const noteId = typedNote.note_id ? String(typedNote.note_id) : String(Date.now());
          
          // 处理时间，使用formatDateTime确保正确的时区转换
          const createdAt = typedNote.created_at ? formatDateTime(typedNote.created_at) : getCurrentDateTimeString();
          const updatedAt = typedNote.updated_at ? formatDateTime(typedNote.updated_at) : createdAt;
          
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
        const hasMore = notes.length > 20;
        setHasMoreNotes(hasMore);
      } else {
        // 加载更多笔记（分页）
        const pageSize = 20;
        const startIndex = (page - 1) * pageSize;
        console.log(`[笔记加载] 加载更多: 第${page}页, startIndex=${startIndex}, 总数=${notes.length}`);
        
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
          .slice(startIndex, startIndex + pageSize)
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
            
            // 处理时间，使用formatDateTime确保正确的时区转换
            const createdAt = typedNote.created_at ? formatDateTime(typedNote.created_at) : getCurrentDateTimeString();
            const updatedAt = typedNote.updated_at ? formatDateTime(typedNote.updated_at) : createdAt;
            
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
        setHasMoreNotes(notes.length > startIndex + pageSize);
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
    // 只在笔记标签页激活时、有更多笔记时、非搜索模式下添加监听
    if (activeTab !== 'notes' || !hasMoreNotes || isSearching) return;

    let scrollTimeout: NodeJS.Timeout;

    // 全局滚动事件处理函数（带防抖）
    const handleGlobalScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // 计算滚动位置
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const clientHeight = window.innerHeight || document.documentElement.clientHeight;
        
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        
        // 当距离底部200px以内时加载更多（增加触发距离，提前加载）
        if (distanceToBottom < 200 && !notesLoading && hasMoreNotes && !isSearching) {
          console.log('[自动加载] 滚动接近底部，自动加载更多笔记');
          const nextPage = notesPage + 1;
          setNotesPage(nextPage);
          loadNotesData(nextPage, false);
        }
      }, 100); // 100ms防抖
    };
    
    // 添加滚动事件监听
    window.addEventListener('scroll', handleGlobalScroll, { passive: true });
    
    // 清理函数
    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleGlobalScroll);
    };
  }, [activeTab, notesPage, hasMoreNotes, notesLoading, isSearching]);
  
  // 点击加载更多笔记
  const handleLoadMoreClick = () => {
    if (!notesLoading && hasMoreNotes && !isSearching) {
      console.log('[手动加载] 点击加载更多按钮，加载20条笔记');
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
              // 替换为服务器返回的数据，使用formatDateTime处理时间字符串
              return {
                id: result.note_id.toString(),
                content: result.content,
                createdAt: result.created_at ? formatDateTime(result.created_at) : formattedNow,
                updatedAt: result.updated_at ? formatDateTime(result.updated_at) : formattedNow,
                pinned: result.pinned || false
              };
            }
            return note;
          });
        });
        
        console.log('[笔记创建] 笔记创建完成，使用乐观更新');
        
        // 强制刷新拖拽上下文（如果页面有拖拽元素）
        setTimeout(() => {
          forceRefreshDragContext();
        }, 100);
        
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
    const createdAt = dbNote.created_at ? formatDateTime(dbNote.created_at) : getCurrentDateTimeString();
    const updatedAt = dbNote.updated_at ? formatDateTime(dbNote.updated_at) : createdAt;
    
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
    
    // 只更新本地状态，不重新加载数据
    setScheduledTasks(prev => 
      prev.map(task => task.id === taskId ? { ...task, completed: newCompletedState } : task)
    );
    
    // 更新数据库 - 转换为数据库格式的字段名
    await updateScheduleEntry(taskId, { 
      status: newCompletedState ? 'completed' : 'ongoing' 
    });
    
    // 强制刷新拖拽上下文
    setTimeout(() => {
      forceRefreshDragContext();
    }, 50);
    
    // 不再调用 loadTodayScheduleEntries()，避免重新排序
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
    
    // 强制刷新拖拽上下文
    setTimeout(() => {
      forceRefreshDragContext();
    }, 50);
    // 确认：不调用 loadTodayScheduleEntries()，避免重新排序
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
    
    // 保存当前输入的文本
    const title = newTaskText[timeSlot].trim();
    
    // 立即清空输入框，提供更好的用户体验
    setNewTaskText({ ...newTaskText, [timeSlot]: '' });
    
    // 系统时间日志
    const now = new Date(); 
    console.log('=== 系统时间日志 ===');
    console.log(`系统时间: ${now.toString()}`);
    console.log(`系统ISO时间: ${now.toISOString()}`);
    console.log(`系统日期部分: ${now.toISOString().split('T')[0]}`);
    console.log('=====================');
    
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
    
    try {
      const result = await createScheduleEntry(createData);
      
      if (result) {
        // 创建新任务对象并添加到本地状态
        const newTask: ScheduledTask = {
          id: result.entry_id.toString(),
          title: result.custom_name || title,
          timeSlot: result.slot as TimeSlot,
          sourceType: 'custom',
          sourceId: undefined,
          reward: result.reward_points,
          completed: false
        };
        
        // 更新本地状态
        setScheduledTasks(prev => [...prev, newTask]);
        
        // 更新临时排序状态，将新任务添加到末尾
        const updatedOrder = {
          ...temporaryTaskOrder,
          [timeSlot]: [...temporaryTaskOrder[timeSlot], newTask.id]
        };
        setTemporaryTaskOrder(updatedOrder);
        
        // 强制刷新拖拽上下文
        setTimeout(() => {
          forceRefreshDragContext();
        }, 100);
      }
    } catch (error) {
      console.error('创建任务失败:', error);
      // 如果创建失败，可以选择恢复输入框内容
      // setNewTaskText({ ...newTaskText, [timeSlot]: title });
    }
    
    // 不再调用 loadTodayScheduleEntries()，避免重新排序
  };
  
  // 删除任务
  const handleDeleteTask = async (taskId: string) => {
    // 先从本地状态中移除任务
    const taskToDelete = scheduledTasks.find(task => task.id === taskId);
    if (!taskToDelete) return;
    
    // 更新本地状态
    setScheduledTasks(prev => prev.filter(task => task.id !== taskId));
    
    // 从临时排序中移除
    const newOrder = { ...temporaryTaskOrder };
    // 在所有时间段中查找并移除该任务ID
    Object.keys(newOrder).forEach(slot => {
      newOrder[slot as TimeSlot] = newOrder[slot as TimeSlot].filter((id: string) => id !== taskId);
    });
    setTemporaryTaskOrder(newOrder);
    
    // 然后从数据库中删除
    await deleteScheduleEntry(taskId);
    
    // 强制刷新拖拽上下文
    setTimeout(() => {
      forceRefreshDragContext();
    }, 100);
    
    // 不再调用 loadTodayScheduleEntries()，避免重新排序
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
    const orderedTaskIds = temporaryTaskOrder[slot] || [];
    const orderedTasks = orderedTaskIds
      .map(taskId => allTasksInSlot.find(task => task.id === taskId))
      .filter(task => task !== undefined) as ScheduledTask[];
    
    // 确保所有任务都在显示（以防有新任务但临时状态未更新）
    const unseenTasks = allTasksInSlot.filter(task => !orderedTaskIds.includes(task.id));
    const tasksInSlot = [...orderedTasks, ...unseenTasks];
    
    console.log(`Rendering slot ${slot}:`, {
      allTasksInSlot: allTasksInSlot.map(t => ({ id: t.id, title: t.title })),
      orderedTaskIds,
      orderedTasks: orderedTasks.map(t => ({ id: t.id, title: t.title })),
      unseenTasks: unseenTasks.map(t => ({ id: t.id, title: t.title })),
      finalTasksInSlot: tasksInSlot.map(t => ({ id: t.id, title: t.title }))
    });
    
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
          <Card className="relative text-center py-12 bg-content1 border border-default/50">
            <CardBody>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-2 border-dashed border-default/50 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-default/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
          </div>
                <p className="text-default-600 text-lg font-mono font-bold">NO_HISTORY_DATA</p>
                <p className="text-default-500 text-sm font-mono tracking-wider">暂无历史任务记录</p>
              </div>
            </CardBody>
          </Card>
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
            <Card key={day.date.toISOString()} className="relative bg-content1 border border-primary/30 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-success"></div>
              <CardHeader className="border-b border-divider bg-content2/50">
                <div className="flex items-center gap-3 w-full">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <div className="w-3 h-3 bg-secondary rounded-full"></div>
                    <div className="w-3 h-3 bg-success rounded-full"></div>
                  </div>
                  <h3 className="font-mono font-bold text-primary tracking-wider text-sm">{day.formattedDate}</h3>
                </div>
              </CardHeader>
              <CardBody className="p-4">
                <div className="space-y-3">
                {/* 按照时间段排序任务 */}
                {[...day.tasks]
                  .sort((a, b) => {
                    const timeSlotOrder = { 'morning': 0, 'afternoon': 1, 'evening': 2 };
                    return timeSlotOrder[a.timeSlot] - timeSlotOrder[b.timeSlot];
                  })
                    .map((task) => {
                      const slotColors = {
                        morning: { dot: 'bg-warning', text: 'text-warning' },
                        afternoon: { dot: 'bg-primary', text: 'text-primary' },
                        evening: { dot: 'bg-secondary', text: 'text-secondary' }
                      };
                      const colorScheme = slotColors[task.timeSlot];
                      
                      return (
                    <div 
                      key={task.id} 
                          className="flex items-center p-3 rounded-lg bg-content2 border border-divider hover:border-primary/50 transition-colors duration-200"
                    >
                          <div className={`w-3 h-3 rounded-full mr-3 ${task.completed ? 'bg-success' : 'bg-danger'}`}></div>
                          <span className={`flex-1 text-sm font-mono font-bold ${task.completed ? 'text-foreground' : 'text-danger'}`}>
                        {task.title}
                      </span>
                          <Chip
                            color={task.timeSlot === 'morning' ? 'warning' : task.timeSlot === 'afternoon' ? 'primary' : 'secondary'}
                            variant="flat"
                            size="sm"
                            className="font-mono text-xs tracking-wider font-bold ml-2"
                          >
                        {TIME_SLOTS.find(s => s.id === task.timeSlot)?.name}
                          </Chip>
                    </div>
                      );
                    })
                }
              </div>
              </CardBody>
            </Card>
          ))}
        </div>
        {loading && (
          <Card className="relative text-center py-8 bg-content1 border border-primary/30">
            <CardBody>
              <div className="flex items-center justify-center gap-3">
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-secondary rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-success rounded-full animate-bounce delay-200"></div>
                <p className="text-primary font-mono tracking-wider ml-3 font-bold">LOADING_DATA...</p>
          </div>
            </CardBody>
          </Card>
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
        
        if (result) {
          // 创建新任务对象并添加到本地状态
          const newScheduledTask: ScheduledTask = {
            id: result.entry_id.toString(),
            title: result.custom_name || task.title,
            timeSlot: result.slot as TimeSlot,
            sourceType: taskType as 'challenge' | 'template' | 'custom',
            sourceId: taskType === 'challenge' ? task.id : task.id,
            reward: result.reward_points,
            completed: false
          };
          
          // 更新本地状态
          setScheduledTasks(prev => [...prev, newScheduledTask]);
          
          // 更新临时排序状态，将新任务添加到目标时间段的指定位置
          const updatedOrder = { ...temporaryTaskOrder };
          const destSlotTasks = [...updatedOrder[destination.droppableId as TimeSlot]];
          destSlotTasks.splice(destination.index, 0, newScheduledTask.id);
          updatedOrder[destination.droppableId as TimeSlot] = destSlotTasks;
          setTemporaryTaskOrder(updatedOrder);
        }
        
        // 不再调用 loadTodayScheduleEntries()，避免重新排序
        
      } catch (error) {
        console.error('Error in drag-and-drop operation:', error);
      }
      return;
    }
    
    // 时间段内的任务重新排序或者在时间段之间移动
    if (['morning', 'afternoon', 'evening'].includes(source.droppableId) &&
        ['morning', 'afternoon', 'evening'].includes(destination.droppableId)) {
      
      try {
        // 从draggableId中提取任务ID（格式：task-{id}-{slot}）
        const taskIdMatch = draggableId.match(/^task-(\d+)-/);
        if (!taskIdMatch) {
          console.error('Invalid draggableId format:', draggableId);
          return;
        }
        
        const taskIdToMove = taskIdMatch[1];
        const sourceSlot = source.droppableId as TimeSlot;
        const destSlot = destination.droppableId as TimeSlot;
        
        console.log('Moving task:', { 
          taskIdToMove,
          sourceSlot, 
          destSlot,
          sourceIndex: source.index,
          destIndex: destination.index
        });
        
        // 获取当前的临时排序状态的副本
        const newOrder = { ...temporaryTaskOrder };
        
        if (sourceSlot === destSlot) {
          // 在同一时间段内重新排序
          const items = [...newOrder[sourceSlot]];
          
          // 从源位置移除任务
          const [removed] = items.splice(source.index, 1);
          
          // 在目标位置插入任务
          items.splice(destination.index, 0, removed);
          
          // 更新排序状态
          newOrder[sourceSlot] = items;
          
          console.log('Same slot reordering completed:', {
            slot: sourceSlot,
            oldOrder: temporaryTaskOrder[sourceSlot],
            newOrder: items
          });
        } else {
          // 在不同时间段之间移动
          
          // 从源时间段移除任务
          const sourceItems = [...newOrder[sourceSlot]];
          sourceItems.splice(source.index, 1);
          newOrder[sourceSlot] = sourceItems;
          
          // 添加到目标时间段
          const destItems = [...newOrder[destSlot]];
          destItems.splice(destination.index, 0, taskIdToMove);
          newOrder[destSlot] = destItems;
          
          // 更新数据库中的时间段
          await moveTaskBetweenSlots(taskIdToMove, destSlot);
        }
        
        // 更新临时排序状态
        setTemporaryTaskOrder(newOrder);
        
        // 强制刷新拖拽上下文以确保拖拽功能继续工作
        setTimeout(() => {
          forceRefreshDragContext();
        }, 200);
        
      } catch (error) {
        console.error('Error moving task:', error);
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

  // 将调试函数暴露到全局，方便在控制台调用
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugDragAndDrop = () => {
        console.log('=== 拖拽功能调试 ===');
        
        // 检查拖拽元素
        const draggables = document.querySelectorAll('[data-rbd-draggable-id]');
        console.log(`发现 ${draggables.length} 个拖拽元素`);
        
        // 检查每个拖拽元素的状态
        draggables.forEach((el, index) => {
          if (el instanceof HTMLElement) {
            console.log(`拖拽元素 ${index + 1}:`, {
              id: el.getAttribute('data-rbd-draggable-id'),
              draggable: el.getAttribute('draggable'),
              cursor: el.style.cursor,
              enhanced: el.getAttribute('data-drag-enhanced')
            });
          }
        });
        
        // 强制刷新拖拽上下文
        console.log('强制刷新拖拽上下文...');
        forceRefreshDragContext();
        
        // 延迟再次检查
        setTimeout(() => {
          const updatedDraggables = document.querySelectorAll('[data-rbd-draggable-id]');
          console.log(`刷新后发现 ${updatedDraggables.length} 个拖拽元素`);
          console.log('=== 调试完成 ===');
        }, 500);
      };
      (window as any).forceRefreshDragContext = forceRefreshDragContext;
    }
  }, []);

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

  // 打开笔记详细编辑弹窗
  const openNoteModal = (note: Note) => {
    setSelectedNote(note);
    setModalNoteContent(note.content);
    setOriginalModalContent(note.content); // 保存原始内容
    onNoteModalOpen();
    
    // 聚焦到弹窗文本框
    setTimeout(() => {
      if (modalTextareaRef.current) {
        modalTextareaRef.current.focus();
        // 将光标移到文本末尾
        const len = modalTextareaRef.current.value.length;
        modalTextareaRef.current.setSelectionRange(len, len);
      }
    }, 100);
  };

  // 自动保存弹窗中的笔记内容（检查是否有变化）
  const autoSaveModalNote = async () => {
    if (!selectedNote || !modalNoteContent.trim()) return false;

    // 检查内容是否有变化，避免不必要的保存
    if (modalNoteContent.trim() === originalModalContent.trim()) {
      console.log('[笔记自动保存] 内容无变化，跳过保存');
      return true; // 内容无变化也算成功
    }

    try {
      console.log('[笔记自动保存] 检测到内容变化，开始保存:', selectedNote.id);
      
      // 构建更新数据
      const updateData = {
        content: modalNoteContent.trim(),
        updated_at: getCurrentDateTimeString()
      };

      // 调用数据库更新
      const { error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('note_id', selectedNote.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error auto-saving note:', error);
        return false;
      }

      // 更新本地状态
      setNotesState(prevNotes => 
        prevNotes.map(note => 
          note.id === selectedNote.id 
            ? { ...note, content: modalNoteContent.trim(), updatedAt: updateData.updated_at }
            : note
        )
      );

      // 如果有搜索状态，也更新搜索结果
      if (filteredNotes.length > 0) {
        setFilteredNotes(prevFiltered => 
          prevFiltered.map(note => 
            note.id === selectedNote.id 
              ? { ...note, content: modalNoteContent.trim(), updatedAt: updateData.updated_at }
              : note
          )
        );
      }

      // 更新原始内容，避免重复保存
      setOriginalModalContent(modalNoteContent.trim());
      console.log('[笔记自动保存] 保存成功');
      return true;

    } catch (error) {
      console.error('Error auto-saving modal note:', error);
      return false;
    }
  };

  // 关闭笔记弹窗（带自动保存）
  const closeNoteModal = async () => {
    // 先尝试自动保存
    if (selectedNote && modalNoteContent.trim()) {
      console.log('[弹窗关闭] 尝试自动保存笔记');
      await autoSaveModalNote();
    }

    // 清理状态并关闭弹窗
    setSelectedNote(null);
    setModalNoteContent('');
    setOriginalModalContent('');
    onNoteModalOpenChange();
  };

  // 处理弹窗的开关状态变化（用于自动保存）
  const handleNoteModalOpenChange = async (isOpen: boolean) => {
    if (!isOpen) {
      // 弹窗关闭时，执行自动保存
      await closeNoteModal();
    } else {
      // 弹窗打开时，使用原有逻辑
      onNoteModalOpenChange();
    }
  };

  // 保存弹窗中的笔记内容
  const saveModalNote = async () => {
    if (!selectedNote || !modalNoteContent.trim()) return;

    try {
      console.log('[笔记手动保存] 开始更新笔记:', selectedNote.id);
      
      // 构建更新数据
      const updateData = {
        content: modalNoteContent.trim(),
        updated_at: getCurrentDateTimeString()
      };

      // 调用数据库更新
      const { error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('note_id', selectedNote.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating note:', error);
        return;
      }

      // 更新本地状态
      setNotesState(prevNotes => 
        prevNotes.map(note => 
          note.id === selectedNote.id 
            ? { ...note, content: modalNoteContent.trim(), updatedAt: updateData.updated_at }
            : note
        )
      );

      // 如果有搜索状态，也更新搜索结果
      if (filteredNotes.length > 0) {
        setFilteredNotes(prevFiltered => 
          prevFiltered.map(note => 
            note.id === selectedNote.id 
              ? { ...note, content: modalNoteContent.trim(), updatedAt: updateData.updated_at }
              : note
          )
        );
      }

      // 更新原始内容
      setOriginalModalContent(modalNoteContent.trim());
      
      // 关闭弹窗
      closeNoteModal();

    } catch (error) {
      console.error('Error saving modal note:', error);
    }
  };

  // 从弹窗删除笔记
  const deleteModalNote = async () => {
    if (!selectedNote) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('note_id', selectedNote.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting note:', error);
        return;
      }

      // 更新本地状态
      setNotesState(prevNotes => prevNotes.filter(note => note.id !== selectedNote.id));
      
      // 如果有搜索状态，也更新搜索结果
      if (filteredNotes.length > 0) {
        setFilteredNotes(prevFiltered => prevFiltered.filter(note => note.id !== selectedNote.id));
      }

      // 关闭弹窗（删除时不保存）
      setSelectedNote(null);
      setModalNoteContent('');
      setOriginalModalContent('');
      onNoteModalOpenChange();

    } catch (error) {
      console.error('Error deleting modal note:', error);
    }
  };

  // 从弹窗切换置顶状态
  const toggleModalNotePin = async () => {
    if (!selectedNote) return;

    try {
      const newPinnedState = !selectedNote.pinned;
      
      const { error } = await supabase
        .from('notes')
        .update({ 
          pinned: newPinnedState,
          updated_at: getCurrentDateTimeString()
        })
        .eq('note_id', selectedNote.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error toggling note pin:', error);
        return;
      }

      // 更新本地状态
      const updatedNote = { ...selectedNote, pinned: newPinnedState };
      setSelectedNote(updatedNote);
      
      setNotesState(prevNotes => 
        prevNotes.map(note => 
          note.id === selectedNote.id 
            ? updatedNote
            : note
        )
      );

      // 如果有搜索状态，也更新搜索结果
      if (filteredNotes.length > 0) {
        setFilteredNotes(prevFiltered => 
          prevFiltered.map(note => 
            note.id === selectedNote.id 
              ? updatedNote
              : note
          )
        );
      }

    } catch (error) {
      console.error('Error toggling modal note pin:', error);
    }
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

  // 新增：强制重新渲染拖拽上下文的方法
  const forceRefreshDragContext = () => {
    console.log('[拖拽修复] 强制刷新拖拽上下文');
    
    // 重置服务器上下文
    resetServerContext();
    
    // 强制重新渲染
    setForceUpdateKey(prev => prev + 1);
    
    // 延迟重新增强拖拽元素
    setTimeout(() => {
      const draggables = document.querySelectorAll('[data-rbd-draggable-id], [data-rbd-drag-handle-draggable-id]');
      console.log(`[拖拽修复] 重新增强 ${draggables.length} 个拖拽元素`);
      
      draggables.forEach(el => {
        if (el instanceof HTMLElement) {
          el.setAttribute('draggable', 'true');
          el.style.cursor = 'grab';
          el.setAttribute('data-drag-enhanced', 'true');
        }
      });
    }, 100);
  };

      return (
      <DragDropContext 
        key={forceUpdateKey}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
      <div 
        className="flex flex-col gap-6 pb-40 hide-scrollbar"
      >
        {/* 上方时间段和任务源区域 - 清晰版本 */}
        <div className={`flex mb-8 ${challengesCollapsed && templatesCollapsed ? 'gap-2' : 'gap-6'}`}>
          {/* 左侧三个时间段 - Mission Control */}
          <div className={`flex flex-col gap-6 ${challengesCollapsed && templatesCollapsed ? 'flex-1' : 'flex-1'}`}>
            <div className="relative">
              <Card className={`relative bg-content1 border border-primary/50 shadow-lg overflow-hidden ${challengesCollapsed && templatesCollapsed ? 'h-[512px]' : 'h-[512px]'}`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-success"></div>

                <CardBody className="p-0 h-full">
                  <div className="grid grid-cols-1 gap-0 h-full">
                    {(['morning','afternoon','evening'] as TimeSlot[]).map((slot, index) => {
                      const slotConfig = TIME_SLOTS.find(s => s.id === slot);
                      const slotColors = {
                        morning: { bg: 'bg-warning/15', border: 'border-warning/50', accent: 'bg-warning' },
                        afternoon: { bg: 'bg-primary/15', border: 'border-primary/50', accent: 'bg-primary' },
                        evening: { bg: 'bg-secondary/15', border: 'border-secondary/50', accent: 'bg-secondary' }
                      };
                      const colorScheme = slotColors[slot];
                      
                      return (
                        <div 
                          key={slot} 
                          className={`relative flex-1 ${index !== 2 ? 'border-b border-divider' : ''}`}
                          onMouseEnter={() => setHoveredSlot(slot)}
                          onMouseLeave={() => setHoveredSlot(null)}
                        >
                          <div className="relative flex items-stretch h-full min-h-[140px]">
                            {/* 时间段标识 */}
                            <div className={`w-24 flex flex-col items-center justify-center ${colorScheme.bg} ${colorScheme.border} border-r`}>
                              <div className={`w-4 h-4 rounded-full mb-2 ${colorScheme.accent}`}></div>
                              <span className="font-mono text-sm font-bold tracking-widest text-center text-foreground">
                                {slotConfig?.name}
                              </span>
                              <div className="text-xs text-default-600 font-mono mt-1 font-bold">
                                {slot === 'morning' ? '06:00' : slot === 'afternoon' ? '13:00' : '19:00'}
                              </div>
                            </div>
                            
                            {/* 任务区域 */}
                            <div className="flex-1 p-4 bg-content1">
                              <Droppable droppableId={slot} direction="vertical">
                                {(provided: any, snapshot: any) => {
                                  // 使用正确的排序逻辑
                                  const allTasksInSlot = scheduledTasks.filter(task => task.timeSlot === slot);
                                  const orderedTaskIds = temporaryTaskOrder[slot] || [];
                                  const orderedTasks = orderedTaskIds
                                    .map(taskId => allTasksInSlot.find(task => task.id === taskId))
                                    .filter(task => task !== undefined) as ScheduledTask[];
                                  const unseenTasks = allTasksInSlot.filter(task => !orderedTaskIds.includes(task.id));
                                  const tasksInSlot = [...orderedTasks, ...unseenTasks];
                                  
                                  return (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={`space-y-2 min-h-[100px] ${
                                        snapshot.isDraggingOver ? 'bg-primary/20 border-2 border-dashed border-primary rounded-lg p-3' : ''
                                      }`}
                                    >
                                      {tasksInSlot.map((task, taskIndex) => (
                                      <Draggable key={`task-${task.id}-${slot}`} draggableId={`task-${task.id}-${slot}`} index={taskIndex}>
                                        {(provided: any, snapshot: any) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`group relative p-3 rounded-lg border transition-all duration-200 cursor-grab ${
                                              snapshot.isDragging 
                                                ? 'bg-primary/30 border-primary shadow-xl scale-105 z-50' 
                                                : 'bg-content2 border-divider hover:border-primary hover:bg-content2/70'
                                            }`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className={`w-3 h-3 rounded-full ${task.completed ? 'bg-success' : 'bg-default-400'}`}></div>
                                              
                                              {editingTaskId === task.id ? (
                                                <Input
                                                  ref={editInputRef}
                                                  size="sm"
                                                  variant="underlined"
                                                  value={editingText}
                                                  onChange={(e) => setEditingText(e.target.value)}
                                                  onKeyDown={handleEditKeyDown}
                                                  onBlur={saveEditedTask}
                                                  className="flex-1"
                                                  classNames={{
                                                    input: "text-sm font-mono text-foreground",
                                                    inputWrapper: "bg-transparent"
                                                  }}
                                                />
                                              ) : (
                                                <span 
                                                  className={`flex-1 text-sm font-mono cursor-pointer font-bold ${
                                                    task.completed ? 'line-through text-default-500' : 'text-foreground hover:text-primary'
                                                  }`}
                                                  onClick={(e) => {e.stopPropagation(); startEditing(task.id, task.title);}}
                                                >
                                                  {task.title}
                                                </span>
                                              )}
                                              
                                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                  isIconOnly
                                                  size="sm"
                                                  variant="flat"
                                                  color={task.completed ? "success" : "default"}
                                                  onClick={(e) => {e.stopPropagation(); toggleComplete(task.id);}}
                                                  className="w-6 h-6 min-w-0"
                                                >
                                                  ✓
                                                </Button>
                                                <Button
                                                  isIconOnly
                                                  size="sm"
                                                  variant="flat"
                                                  color="danger"
                                                  onClick={(e) => {e.stopPropagation(); handleDeleteTask(task.id);}}
                                                  className="w-6 h-6 min-w-0"
                                                >
                                                  ✕
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                    
                                    {/* 添加新任务区域 */}
                                    {hoveredSlot === slot && (
                                      <div className="mt-3 p-3 bg-content2 border border-dashed border-primary rounded-lg">
                                        <div className="flex gap-2">
                                          <Input
                                            size="sm"
                                            placeholder="新任务..."
                                            value={newTaskText[slot] || ''}
                                            onChange={(e) => setNewTaskText({ ...newTaskText, [slot]: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateTask(slot)}
                                            variant="bordered"
                                            classNames={{
                                              input: "font-mono text-sm text-foreground",
                                              inputWrapper: "bg-content1"
                                            }}
                                          />
                                          <Button
                                            size="sm"
                                            color="primary"
                                            onClick={() => handleCreateTask(slot)}
                                            className="font-mono font-bold"
                                          >
                                            添加
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  );
                                }}
                              </Droppable>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
          
          {/* 右侧任务源面板 - 清晰版本 */}
          <div className={`flex flex-col gap-6 transition-all duration-300 ${
            challengesCollapsed && templatesCollapsed 
              ? 'w-20' 
              : challengesCollapsed || templatesCollapsed 
                ? 'w-64' 
                : 'w-80'
          }`}>
            {/* 支线任务 */}
            <Card className={`relative bg-danger/15 border border-danger/60 shadow-lg transition-all duration-300 ${challengesCollapsed ? 'w-16 ml-auto' : 'w-full'}`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-danger"></div>
              {challengesCollapsed ? (
                <CardBody className="py-6 px-2 flex items-center justify-center h-full min-h-[200px]">
                  <Button
                    variant="light"
                    onClick={toggleChallengesCollapse}
                    className="h-full w-full writing-mode-vertical-rl"
                  >
                    <div className="flex flex-col items-center gap-3 h-full justify-center">
                      <div className="w-2 h-2 bg-danger rounded-full"></div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-mono text-danger font-bold">C</span>
                        <span className="text-sm font-mono text-danger font-bold">H</span>
                        <span className="text-sm font-mono text-danger font-bold">A</span>
                        <span className="text-sm font-mono text-danger font-bold">L</span>
                        <span className="text-sm font-mono text-danger font-bold">L</span>
                        <span className="text-sm font-mono text-danger font-bold">E</span>
                        <span className="text-sm font-mono text-danger font-bold">N</span>
                        <span className="text-sm font-mono text-danger font-bold">G</span>
                        <span className="text-sm font-mono text-danger font-bold">E</span>
                        <span className="text-sm font-mono text-danger font-bold">S</span>
                      </div>
                      <div className="w-2 h-2 bg-danger rounded-full"></div>
                    </div>
                  </Button>
                </CardBody>
              ) : (
                <>
                  <CardHeader className="border-b border-danger/30 bg-danger/10">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-danger rounded-full"></div>
                        <h3 className="font-mono font-bold text-danger tracking-wider">CHALLENGES</h3>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        onClick={toggleChallengesCollapse}
                        className="text-danger"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                      </Button>
                    </div>
                  </CardHeader>
                  <ScrollShadow className="h-48">
                    <CardBody className="p-4 space-y-3 bg-content1">
                      <Droppable droppableId="challenges">
                        {(provided: any, snapshot: any) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                            {challengeTasks.map((task, index) => (
                              <Draggable key={getSafeDraggableId('challenge', task.id)} draggableId={getSafeDraggableId('challenge', task.id)} index={index}>
                                {(provided: any, snapshot: any) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-3 rounded-lg border transition-all cursor-grab ${
                                      snapshot.isDragging 
                                        ? 'bg-danger/30 border-danger shadow-xl scale-105' 
                                        : 'bg-danger/20 border-danger hover:border-danger/80 hover:bg-danger/25'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-danger rounded-full"></div>
                                      <span className="text-sm font-mono text-foreground flex-1 font-bold">{task.title}</span>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </CardBody>
                  </ScrollShadow>
                </>
              )}
            </Card>
            
            {/* 日常任务 */}
            <Card className={`relative bg-success/15 border border-success/60 shadow-lg transition-all duration-300 ${templatesCollapsed ? 'w-16 ml-auto' : 'w-full'}`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-success"></div>
              {templatesCollapsed ? (
                <CardBody className="py-6 px-2 flex items-center justify-center h-full min-h-[200px]">
                  <Button
                    variant="light"
                    onClick={toggleTemplatesCollapse}
                    className="h-full w-full writing-mode-vertical-rl"
                  >
                    <div className="flex flex-col items-center gap-3 h-full justify-center">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-mono text-success font-bold">K</span>
                        <span className="text-sm font-mono text-success font-bold">E</span>
                        <span className="text-sm font-mono text-success font-bold">E</span>
                        <span className="text-sm font-mono text-success font-bold">P</span>
                        <span className="text-sm font-mono text-success font-bold">•</span>
                        <span className="text-sm font-mono text-success font-bold">O</span>
                        <span className="text-sm font-mono text-success font-bold">N</span>
                      </div>
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                    </div>
                  </Button>
                </CardBody>
              ) : (
                <>
                  <CardHeader className="border-b border-success/30 bg-success/10">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-success rounded-full"></div>
                        <h3 className="font-mono font-bold text-success tracking-wider">KEEP ON</h3>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        onClick={toggleTemplatesCollapse}
                        className="text-success"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                      </Button>
                    </div>
                  </CardHeader>
                  <ScrollShadow className="h-48">
                    <CardBody className="p-4 space-y-3 bg-content1">
                      <Droppable droppableId="templates">
                        {(provided: any, snapshot: any) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                            {templateTasks.map((task, index) => (
                              <Draggable key={getSafeDraggableId('template', task.id)} draggableId={getSafeDraggableId('template', task.id)} index={index}>
                                {(provided: any, snapshot: any) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-3 rounded-lg border transition-all cursor-grab ${
                                      snapshot.isDragging 
                                        ? 'bg-success/30 border-success shadow-xl scale-105' 
                                        : 'bg-success/20 border-success hover:border-success/80 hover:bg-success/25'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-success rounded-full"></div>
                                      <span className="text-sm font-mono text-foreground flex-1 font-bold">{task.title}</span>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </CardBody>
                  </ScrollShadow>
                </>
              )}
            </Card>
          </div>
        </div>
        
        {/* 标签选择器 - Capsule Style */}
        <div className="flex items-center justify-between mb-6">
          <div className="bg-content2 p-1 rounded-full border border-divider shadow-sm">
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as 'history' | 'notes')}
              variant="solid"
              classNames={{
                base: "w-auto",
                tabList: "gap-1 bg-transparent border-0 rounded-full p-0",
                cursor: "bg-primary shadow-md rounded-full",
                tab: "px-6 py-2 h-10 rounded-full",
                tabContent: "text-default-600 data-[selected=true]:text-white font-mono text-sm font-bold tracking-wider relative z-10"
              }}
              color="primary"
            >
              <Tab key="history" title="HISTORY" />
              <Tab key="notes" title="NOTES" />
            </Tabs>
          </div>
          
          {/* 搜索框 - 独立右侧 */}
          {activeTab === 'notes' && (
            <div className="flex-shrink-0">
              <Input
                placeholder="搜索笔记..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e)}
                variant="flat"
                size="sm"
                classNames={{
                  base: "w-64",
                  mainWrapper: "h-10",
                  input: "text-sm",
                  inputWrapper: "bg-default-100 hover:bg-default-200 group-data-[focus=true]:bg-background border border-default-200 group-data-[focus=true]:border-primary transition-colors duration-200"
                }}
                startContent={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-default-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
                endContent={
                  searchQuery ? (
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onClick={clearSearch}
                      className="min-w-unit-4 w-4 h-4 text-default-400 hover:text-danger"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  ) : null
                }
              />
            </div>
          )}
        </div>

        {/* 标签页内容 */}
        {activeTab === 'history' ? (
          <div className="relative">
            <Card className="relative bg-content1 border border-primary/30 shadow-lg">
              <CardHeader className="border-b border-divider bg-content2">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-danger rounded-full animate-pulse"></div>
                    <div className="w-3 h-3 bg-warning rounded-full animate-pulse delay-75"></div>
                    <div className="w-3 h-3 bg-success rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                {renderHistoryTab()}
              </CardBody>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 新建笔记区域 - 清晰版本 */}
            <div className="relative group">
              <Card className="relative bg-content1 border border-primary/40 shadow-lg overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary"></div>
                <CardHeader className="border-b border-divider bg-content2/50">
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                      <div className="w-3 h-3 bg-warning rounded-full animate-pulse delay-75"></div>
                      <div className="w-3 h-3 bg-danger rounded-full animate-pulse delay-150"></div>
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-primary font-mono text-sm tracking-widest font-bold">TERMINAL</span>
                    </div>

                  </div>
                </CardHeader>
                <CardBody className="p-6 bg-content1">
                  <Textarea
                    ref={newNoteTextareaRef}
                    placeholder="> 输入数据记录..."
                    value={newNote}
                    onValueChange={(value) => setNewNote(value)}
                    variant="bordered"
                    minRows={3}
                    maxRows={8}
                    classNames={{
                      base: "w-full",
                      input: "text-foreground leading-relaxed font-mono",
                      inputWrapper: "bg-content2 border-primary/30 data-[focus=true]:border-primary",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        createNewNote();
                      }
                    }}
                    onFocus={handleNewNoteFocus}
                    onBlur={handleNewNoteBlur}
                    endContent={
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-default-500 font-mono font-bold">
                          {newNote.length} chars
                        </div>
                        <Button
                          isIconOnly
                          variant="flat"
                          size="sm"
                          className={`${
                            newNote.trim() 
                              ? 'text-white bg-primary hover:bg-primary/80' 
                              : 'text-default-400 cursor-not-allowed bg-default-100'
                          } border border-primary/50`}
                          onClick={createNewNote}
                          isDisabled={!newNote.trim()}
                          title={newNote.trim() ? "上传数据 (Cmd + Enter)" : "输入内容后可上传"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </Button>
                      </div>
                    }
                  />
                </CardBody>
              </Card>
            </div>
            
            {/* 笔记显示区域 - 高对比度版本 */}
            <div className="space-y-6">
              {(() => {
                const displayNotes = getDisplayNotes();
                const pinnedNotes = displayNotes.filter(note => note.pinned);
                const regularNotes = displayNotes.filter(note => !note.pinned);

                return (
                  <>
                    {/* 置顶笔记 - 全宽显示，高对比度 */}
                    {pinnedNotes.map((note) => (
                      <div key={`pinned-${note.id}`} className="relative group">
                        <Card className="relative bg-warning/20 border-2 border-warning shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                          <div className="absolute top-0 left-0 w-full h-1 bg-warning"></div>
                          <CardHeader className="border-b border-warning/30 bg-warning/10">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="w-4 h-4 bg-warning rounded-full"></div>
                                </div>
                                <Chip
                                  color="warning"
                                  variant="solid"
                                  size="sm"
                                  className="font-mono text-xs tracking-wider font-bold"
                                  startContent={
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M16 12V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v8H6a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2v5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-5h2a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-2z"/>
                                    </svg>
                                  }
                                >
                                  PIN
                                </Chip>
                              </div>
                              <div className="text-xs text-foreground font-mono tracking-wider font-bold">
                                {formatNoteTime(note.updatedAt)}
                              </div>
                            </div>
                          </CardHeader>
                          {editingNoteId === note.id ? (
                            <CardBody className="p-6 bg-content1">
                              <Textarea
                                ref={noteTextareaRef}
                                value={editingNoteContent}
                                onValueChange={setEditingNoteContent}
                                variant="bordered"
                                minRows={4}
                                maxRows={15}
                                classNames={{
                                  base: "w-full",
                                  input: "text-foreground leading-relaxed font-mono",
                                  inputWrapper: "bg-content1 border-warning/30",
                                }}
                                onKeyDown={handleNoteKeyDown}
                              />
                              <div className="flex justify-end mt-4 gap-3">
                                <Button 
                                  variant="bordered"
                                  size="sm"
                                  className="border-default-300"
                                  onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}
                                >
                                  取消
                                </Button>
                                <Button 
                                  color="warning"
                                  size="sm"
                                  variant="solid"
                                  className="shadow-lg font-bold"
                                  onClick={saveEditedNote}
                                >
                                  保存数据
                                </Button>
                              </div>
                            </CardBody>
                          ) : (
                            <CardBody 
                              className="p-6 cursor-pointer hover:bg-warning/10 transition-colors bg-content1"
                              onClick={() => openNoteModal(note)}
                            >
                              <div className="whitespace-pre-wrap leading-relaxed text-foreground font-mono text-sm">
                                {note.content}
                              </div>
                              <Divider className="my-4 bg-warning/50" />
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="flat"
                                  size="sm"
                                  color="warning"
                                  onClick={(e) => { e.stopPropagation(); toggleNotePinHandler(note.id, note.pinned || false); }}
                                  className="min-w-0 px-3 h-6 text-xs font-mono font-bold"
                                >
                                  取消置顶
                                </Button>
                                <Button 
                                  variant="flat"
                                  size="sm"
                                  color="primary"
                                  onClick={(e) => { e.stopPropagation(); startEditingNote(note); }}
                                  className="min-w-0 px-3 h-6 text-xs font-mono font-bold"
                                >
                                  编辑
                                </Button>
                                <Button 
                                  variant="flat"
                                  size="sm"
                                  color="danger"
                                  onClick={(e) => { e.stopPropagation(); deleteNoteHandler(note.id); }}
                                  className="min-w-0 px-3 h-6 text-xs font-mono font-bold"
                                >
                                  删除
                                </Button>
                              </div>
                            </CardBody>
                          )}
                        </Card>
                      </div>
                    ))}

                    {/* 普通笔记 - 网格布局，高对比度 */}
                    {regularNotes.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {regularNotes.map((note, index) => {
                          return (
                            <div key={`regular-${note.id}`} className="relative group">
                              <Card className="relative h-48 bg-content1 border border-default-200 hover:border-primary shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer sticky-note z-10 hover:z-20">
                                <div className="absolute top-0 left-0 w-full h-1 bg-default-300 group-hover:bg-primary transition-colors duration-300"></div>
                                {editingNoteId === note.id ? (
                                  <CardBody className="p-4 flex flex-col h-full bg-content1">
                                    <Textarea
                                      ref={noteTextareaRef}
                                      value={editingNoteContent}
                                      onValueChange={setEditingNoteContent}
                                      variant="bordered"
                                      minRows={3}
                                      maxRows={6}
                                      classNames={{
                                        base: "flex-1",
                                        input: "text-foreground leading-relaxed text-sm",
                                        inputWrapper: "bg-content1 border-default-200",
                                      }}
                                      onKeyDown={handleNoteKeyDown}
                                    />
                                    <div className="flex justify-end mt-2 gap-1">
                                      <Button 
                                        isIconOnly
                                        variant="flat"
                                        size="sm"
                                        className="w-6 h-6 min-w-0"
                                        onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}
                                      >
                                        ✕
                                      </Button>
                                      <Button 
                                        isIconOnly
                                        color="primary"
                                        variant="solid"
                                        size="sm"
                                        className="w-6 h-6 min-w-0"
                                        onClick={saveEditedNote}
                                      >
                                        ✓
                                      </Button>
                                    </div>
                                  </CardBody>
                                ) : (
                                  <CardBody 
                                    className="p-4 flex flex-col h-full justify-between bg-content1"
                                    onClick={() => openNoteModal(note)}
                                  >
                                    <div className="whitespace-pre-wrap leading-relaxed text-foreground text-sm flex-1 overflow-hidden font-mono">
                                      {note.content.length > 100 ? note.content.substring(0, 100) + '...' : note.content}
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-divider">
                                      <div className="flex justify-between items-center">
                                        <div className="text-xs text-default-600 font-mono font-bold">
                                          {formatNoteTime(note.updatedAt)}
                                        </div>
                                        <div className="flex gap-1">
                                          <Button 
                                            isIconOnly
                                            variant="flat"
                                            size="sm"
                                            className="w-5 h-5 min-w-0 opacity-70 hover:opacity-100"
                                            onClick={(e) => { e.stopPropagation(); toggleNotePinHandler(note.id, note.pinned || false); }}
                                          >
                                            📌
                                          </Button>
                                          <Button 
                                            isIconOnly
                                            variant="flat"
                                            size="sm"
                                            className="w-5 h-5 min-w-0 opacity-70 hover:opacity-100"
                                            onClick={(e) => { e.stopPropagation(); deleteNoteHandler(note.id); }}
                                          >
                                            🗑
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </CardBody>
                                )}
                              </Card>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* 加载和空状态 - 清晰版本 */}
              {notesLoading && (
                <Card className="relative text-center py-8 bg-content1 border border-primary/30">
                  <CardBody>
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-secondary rounded-full animate-bounce delay-100"></div>
                      <div className="w-3 h-3 bg-success rounded-full animate-bounce delay-200"></div>
                      <p className="text-primary font-mono tracking-wider ml-3 font-bold">LOADING_DATA...</p>
                    </div>
                  </CardBody>
                </Card>
              )}
              
              {!notesLoading && getDisplayNotes().length === 0 && (
                <Card className="relative text-center py-12 bg-content1 border border-default/50">
                  <CardBody>
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 border-2 border-dashed border-default/50 rounded-lg flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-default/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      {isSearching ? (
                        <>
                          <p className="text-default-600 text-lg font-mono font-bold">NO_DATA_FOUND</p>
                          <p className="text-default-500 text-sm font-mono tracking-wider">检索条件无匹配项</p>
                        </>
                      ) : (
                        <>
                          <p className="text-default-600 text-lg font-mono font-bold">DATABASE_EMPTY</p>
                          <p className="text-default-500 text-sm font-mono tracking-wider">使用上方终端创建数据记录</p>
                        </>
                      )}
                    </div>
                  </CardBody>
                </Card>
              )}
              
              {/* 加载更多按钮 - 清晰版本 */}
              {hasMoreNotes && !isSearching && (
                <Card 
                  isPressable
                  onPress={handleLoadMoreClick}
                  className="relative text-center cursor-pointer hover:scale-105 transition-all duration-300 bg-success/10 border border-success/50 hover:border-success"
                >
                  <CardBody className="py-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-2 h-2 bg-success rounded-full animate-ping"></div>
                      <p className="text-success font-mono tracking-widest font-bold">LOAD_MORE_DATA</p>
                      <div className="w-2 h-2 bg-success rounded-full animate-ping delay-300"></div>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

            {/* 笔记详细编辑弹窗 */}
      <Modal 
        isOpen={isNoteModalOpen} 
        onOpenChange={handleNoteModalOpenChange}
        scrollBehavior="inside"
        size="2xl"
        classNames={{
          base: "shadow-lg rounded-lg overflow-hidden",
          header: "border-b bg-[#3f3f46] border-[#f5a524] rounded-t-lg",
          body: "py-6 bg-[#3f3f46]",
          footer: "border-t bg-[#3f3f46] border-[#f5a524] rounded-b-lg"
        }}
        style={{
          backgroundColor: '#3f3f46',
          border: '1px solid #f5a524',
          borderRadius: '8px'
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-[#f5a524] rounded-full"></div>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  </div>
                  <h2 className="text-[#f5a524] font-mono text-sm tracking-widest font-bold">
                    编辑笔记
                  </h2>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedNote?.pinned && (
                    <Chip
                      style={{ backgroundColor: '#f5a524', color: '#000' }}
                      variant="solid"
                      size="sm"
                      className="font-mono text-xs tracking-wider font-bold"
                    >
                      置顶
                    </Chip>
                  )}
                  <div className="text-xs text-white font-mono tracking-wider font-bold">
                    {selectedNote && formatNoteTime(selectedNote.updatedAt)}
                  </div>
                </div>
              </ModalHeader>
              
              <ModalBody>
                <Textarea
                  ref={modalTextareaRef}
                  value={modalNoteContent}
                  onValueChange={setModalNoteContent}
                  variant="bordered"
                  minRows={12}
                  maxRows={25}
                  placeholder="输入笔记内容..."
                  classNames={{
                    base: "w-full",
                    input: "text-white leading-relaxed font-mono resize-none placeholder:text-gray-400",
                    inputWrapper: "bg-[#2a2a2e] border-[#f5a524]/50 data-[focus=true]:border-[#f5a524] transition-colors duration-200"
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      saveModalNote();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      closeNoteModal();
                    }
                  }}
                />
              </ModalBody>

            </>
          )}
        </ModalContent>
      </Modal>
    </DragDropContext>
  );
};

export default TodayView;