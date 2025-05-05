import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useValhallaTaskContext } from '../../context/ValhallaTaskContext';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  resetServerContext
} from 'react-beautiful-dnd';
import morningBg from '../../assets/morning-bg.jpg';
import afternoonBg from '../../assets/afternoon-bg.jpg';
import eveningBg from '../../assets/evening-bg.jpg';

// 时间段类型
type TimeSlot = 'morning' | 'afternoon' | 'evening';

// 时间段配置
const TIME_SLOTS = [
  { id: 'morning', name: '上午', color: 'from-amber-700/20 to-amber-600/10' },
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

const TodayView = () => {
  const { categories } = useValhallaTaskContext();
  
  // 状态
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [newTaskText, setNewTaskText] = useState({ morning: '', afternoon: '', evening: '' });
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [hoveredSlot, setHoveredSlot] = useState<TimeSlot | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  
  // 下方标签页状态
  const [activeTab, setActiveTab] = useState<'history' | 'notes'>('history');
  const [taskHistory, setTaskHistory] = useState<TaskHistoryDay[]>([]);
  const [visibleDays, setVisibleDays] = useState(7);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Force a rerender of the DragDropContext on mount to fix initialization issues
  useEffect(() => {
    resetServerContext();
    setForceUpdateKey(prev => prev + 1);
    
    // Add a listener to help debug drag events
    document.addEventListener('mousedown', () => {
      console.log('Mouse down event detected');
    });
    
    // 生成示例历史数据
    generateMockTaskHistory();
    
    // 生成示例笔记
    generateMockNotes();
  }, []);
  
  // 监听历史容器的滚动事件，实现无限加载
  useEffect(() => {
    const handleScroll = () => {
      if (historyContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = historyContainerRef.current;
        // 当滚动到接近底部时，加载更多数据
        if (scrollTop + clientHeight >= scrollHeight - 100) {
          setVisibleDays(prev => prev + 7);
        }
      }
    };
    
    const container = historyContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [taskHistory]);
  
  // 生成示例历史数据（实际应用中需要从数据库获取）
  const generateMockTaskHistory = () => {
    const mockHistory: TaskHistoryDay[] = [];
    const now = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const formattedDate = date.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
      
      // 每天 3-8 条随机任务
      const tasksCount = Math.floor(Math.random() * 6) + 3;
      const tasks = [];
      
      for (let j = 0; j < tasksCount; j++) {
        const timeSlots: TimeSlot[] = ['morning', 'afternoon', 'evening'];
        tasks.push({
          id: `history-${i}-${j}`,
          title: `历史任务 ${i+1}-${j+1}`,
          completed: Math.random() > 0.3, // 70% 完成率
          timeSlot: timeSlots[j % 3]
        });
      }
      
      mockHistory.push({ date, formattedDate, tasks });
    }
    
    setTaskHistory(mockHistory);
  };
  
  // 生成示例笔记数据
  const generateMockNotes = () => {
    const mockNotes: Note[] = [];
    const now = new Date();
    
    for (let i = 0; i < 15; i++) {
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - i);
      createdAt.setHours(Math.floor(Math.random() * 24));
      
      mockNotes.push({
        id: `note-${i}`,
        content: `这是一条示例笔记，记录了一些重要的想法和灵感。笔记 #${i+1}`,
        createdAt
      });
    }
    
    setNotes(mockNotes);
  };
  
  // 创建新笔记
  const createNewNote = () => {
    if (!newNote.trim()) return;
    
    const newNoteObj: Note = {
      id: `note-${Date.now()}`,
      content: newNote,
      createdAt: new Date()
    };
    
    setNotes([newNoteObj, ...notes]);
    setNewNote('');
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
  const saveEditedNote = () => {
    if (editingNoteId) {
      setNotes(notes.map(note => 
        note.id === editingNoteId 
          ? { ...note, content: editingNoteContent.trim() || note.content } 
          : note
      ));
      setEditingNoteId(null);
      setEditingNoteContent('');
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
  const deleteNote = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
  };
  
  // 背景图映射
  const SLOT_BACKGROUNDS: Record<TimeSlot, string> = {
    morning: morningBg,
    afternoon: afternoonBg,
    evening: eveningBg,
  };
  
  // 切换完成状态
  const toggleComplete = (taskId: string) => {
    setScheduledTasks(prev => prev.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task));
  };
  
  // 获取支线任务和日常任务
  const challengeTasks = categories.find(cat => cat.id === 'side')?.tasks || [];
  const templateTasks = categories.find(cat => cat.id === 'daily')?.tasks || [];
  
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
  const saveEditedTask = () => {
    if (editingTaskId) {
      setScheduledTasks(prev => 
        prev.map(task => 
          task.id === editingTaskId 
            ? { ...task, title: editingText.trim() || task.title } 
            : task
        )
      );
      setEditingTaskId(null);
      setEditingText('');
    }
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
  const handleCreateTask = (timeSlot: TimeSlot) => {
    if (!newTaskText[timeSlot].trim()) return;
    
    const newTask: ScheduledTask = {
      id: `custom-${Date.now()}`,
      title: newTaskText[timeSlot],
      timeSlot: timeSlot,
      sourceType: 'custom',
      completed: false,
    };
    
    setScheduledTasks([...scheduledTasks, newTask]);
    setNewTaskText({ ...newTaskText, [timeSlot]: '' });
  };
  
  // 处理任务拖拽结束
  const handleDragEnd = (result: any) => {
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
      const originalTask = sourceList.find(t => t.id === taskId) || taskToAdd;
      
      const newScheduledTask: ScheduledTask = {
        id: `scheduled-${Date.now()}`,
        title: originalTask.title,
        timeSlot: destination.droppableId as TimeSlot,
        sourceType: source.droppableId === 'challenges' ? 'challenge' : 'template',
        sourceId: originalTask.id,
        reward: originalTask.reward_points,
        completed: false,
      };
      
      console.log('Created scheduled task:', newScheduledTask);
      setScheduledTasks([...scheduledTasks, newScheduledTask]);
      return;
    }
    
    // 时间段内的任务重新排序或者在时间段之间移动
    if (['morning', 'afternoon', 'evening'].includes(source.droppableId) &&
        ['morning', 'afternoon', 'evening'].includes(destination.droppableId)) {
      console.log('Moving between time slots');
      
      const updatedTasks = [...scheduledTasks];
      
      // 找出要移动的任务
      const tasksInSourceSlot = updatedTasks.filter(task => task.timeSlot === source.droppableId);
      const taskToMove = tasksInSourceSlot[source.index];
      console.log('Task to move:', taskToMove);
      
      // 从源列表中移除
      const newTasks = updatedTasks.filter(task => task.id !== taskToMove.id);
      
      // 更新任务的时间段
      taskToMove.timeSlot = destination.droppableId as TimeSlot;
      
      // 插入到目标位置
      newTasks.splice(
        newTasks.filter(task => task.timeSlot === destination.droppableId).length, 
        0, 
        taskToMove
      );
      
      console.log('Updated task list:', newTasks);
      setScheduledTasks(newTasks);
    }
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
          <div className="relative flex-1 flex flex-col p-4 overflow-auto">
            <Droppable droppableId={slot} direction="vertical">
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
                              onClick={() => setScheduledTasks(scheduledTasks.filter(t => t.id !== task.id))}
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
    return (
      <div 
        ref={historyContainerRef}
        className="flex-1 p-4"
        style={{ height: '350px' }}
      >
        <h2 className="font-display text-xl text-accent-gold mb-4">历史任务记录</h2>
        <div className="grid grid-cols-2 gap-4">
          {taskHistory.slice(0, visibleDays).map((day) => (
            <div key={day.date.toISOString()} className="valhalla-panel p-4">
              <h3 className="font-medium text-accent-gold mb-3">{day.formattedDate}</h3>
              <div className="space-y-2">
                {day.tasks.map((task) => (
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
                ))}
              </div>
            </div>
          ))}
        </div>
        {visibleDays < taskHistory.length && (
          <div className="text-center pt-4 pb-2 opacity-70">
            <p>向下滚动加载更多...</p>
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
        style={{ height: '350px' }}
      >
        {/* 新建笔记区域 */}
        <div className="mb-4 valhalla-panel p-4">
          <h2 className="font-display text-xl text-accent-gold mb-3">新建笔记</h2>
          <div className="flex flex-col">
            <textarea
              className="w-full p-3 bg-bg-panel border border-border-metal rounded-md min-h-[100px] text-text-primary focus:outline-none focus:border-accent-gold"
              placeholder="记录你的想法和灵感..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="opacity-70">Ctrl + Enter 快速保存</span>
              <button 
                className="px-4 py-2 bg-accent-gold/80 text-white rounded-md hover:bg-accent-gold"
                onClick={createNewNote}
              >
                保存笔记
              </button>
            </div>
          </div>
        </div>
        
        {/* 笔记列表 */}
        <div className="overflow-y-auto flex-1">
          <h2 className="font-display text-lg text-accent-gold mb-3">我的笔记</h2>
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="valhalla-panel p-3 cursor-pointer hover:border-accent-gold/50"
                onDoubleClick={() => startEditingNote(note)}
              >
                {editingNoteId === note.id ? (
                  <div className="flex flex-col">
                    <textarea
                      ref={noteTextareaRef}
                      className="w-full p-2 bg-bg-panel border border-border-metal rounded-md min-h-[80px] text-text-primary focus:outline-none focus:border-accent-gold"
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
                          onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <DragDropContext key={`dnd-context-${forceUpdateKey}`} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-6 pb-40">
        {/* 上方时间段和任务源区域 */}
        <div className="flex gap-6 min-h-[400px]">
          {/* 左侧三个时间段 */}
          <div className="flex-1 flex flex-col gap-4 ml-4">
            {(['morning','afternoon','evening'] as TimeSlot[]).map(slot => renderSlot(slot))}
          </div>
          
          {/* 右侧任务列表（上下排列） */}
          <div className="w-80 flex flex-col gap-4">
            {/* 支线任务列表 */}
            <div className="valhalla-panel overflow-auto flex-1">
              <h3 className="font-display text-lg text-accent-gold mb-4 pb-2 border-b border-border-metal">
                支线任务
              </h3>
              <Droppable droppableId="challenges" isDropDisabled={false}>
                {(provided: any, snapshot: any) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 p-1"
                  >
                    {challengeTasks.map((task, index) => (
                      <Draggable key={`challenge-${task.id}`} draggableId={`challenge-${task.id}`} index={index}>
                        {(provided: any, snapshot: any) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-2 border border-border-metal rounded-md ${snapshot.isDragging ? 'bg-accent-gold/20 shadow-lg scale-105' : 'bg-bg-panel'} cursor-grab relative transition-transform`}
                          >
                            {snapshot.isDragging && (
                              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs text-accent-gold whitespace-nowrap">
                                拖拽到时间段
                              </div>
                            )}
                            <div className="font-semibold">{task.title}</div>
                            <div className="text-xs text-wheat-300">
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
            
            {/* 日常任务模板 */}
            <div className="valhalla-panel overflow-auto flex-1">
              <h3 className="font-display text-lg text-accent-gold mb-4 pb-2 border-b border-border-metal">
                日常任务
              </h3>
              <Droppable droppableId="templates" isDropDisabled={false}>
                {(provided: any, snapshot: any) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 p-1"
                  >
                    {templateTasks.map((task, index) => (
                      <Draggable key={`template-${task.id}`} draggableId={`template-${task.id}`} index={index}>
                        {(provided: any, snapshot: any) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-2 border border-border-metal rounded-md ${snapshot.isDragging ? 'bg-accent-gold/20 shadow-lg scale-105' : 'bg-bg-panel'} cursor-grab relative transition-transform`}
                          >
                            {snapshot.isDragging && (
                              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs text-accent-gold whitespace-nowrap">
                                拖拽到时间段
                              </div>
                            )}
                            <div className="font-semibold">{task.title}</div>
                            <div className="text-xs text-wheat-300">
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
            
            {/* 添加一些辅助说明，帮助理解拖拽操作 */}
            <div className="bg-bg-panel p-2 mt-2 rounded text-xs text-center opacity-70">
              <p>将任务拖放到上午、下午或晚上时间块中</p>
            </div>
          </div>
        </div>
        
        {/* 下方历史和笔记标签页 */}
        <div className="valhalla-panel overflow-hidden mt-2 min-h-[500px]">
          {/* 标签页切换 */}
          <div className="flex border-b border-border-metal">
            <button
              className={`px-6 py-3 font-display text-lg ${activeTab === 'history' ? 'text-accent-gold border-b-2 border-accent-gold' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('history')}
            >
              历史记录
            </button>
            <button
              className={`px-6 py-3 font-display text-lg ${activeTab === 'notes' ? 'text-accent-gold border-b-2 border-accent-gold' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('notes')}
            >
              笔记
            </button>
          </div>
          
          {/* 标签页内容 */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'history' ? renderHistoryTab() : renderNotesTab()}
          </div>
        </div>
      </div>
    </DragDropContext>
  );
};

export default TodayView; 