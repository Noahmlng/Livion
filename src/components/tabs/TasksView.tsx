import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactCropperPro from 'react-cropper-pro';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import defaultTaskImage from '../../assets/ac-valhalla-settlement.avif';
import { useDb } from '../../context/DbContext';
import { Task } from '../../utils/database';
import TextareaAutosize from 'react-textarea-autosize';

// Norse-style completion icon component
const CompletionIcon = () => (
  <div className="absolute -top-1 -left-1 w-6 h-6 bg-cyan-900/80 rounded-full flex items-center justify-center border border-cyan-600/50 z-10">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5 text-cyan-300"
    >
      {/* A slightly Norse-inspired checkmark */}
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </div>
);

const TasksView = () => {
  const { tasks, loadTasks, updateTask, deleteTask, createTask } = useDb();
  
  // State for UI management
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingReward, setEditingReward] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingValues, setEditingValues] = useState({
    title: '',
    reward: 0,
    description: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Refs for editable elements
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Filter to just get the side quests / challenges tasks
  const challengeTasks = tasks.filter(task => 
    task.status === 'ongoing' || task.status === 'completed'
  ).sort((a, b) => {
    // First sort by status (ongoing before completed)
    if (a.status !== b.status) {
      return a.status === 'ongoing' ? -1 : 1;
    }
    
    // Then sort by priority (higher first)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    
    // Then sort by reward points (higher first)
    if ((a.reward_points || 0) !== (b.reward_points || 0)) {
      return (b.reward_points || 0) - (a.reward_points || 0);
    }
    
    // Finally sort by creation date (newer first)
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
  
  // Load tasks when component mounts
  useEffect(() => {
    loadTasks();
  }, []);
  
  // Update the selected task when tasks change or the selected task is updated
  useEffect(() => {
    if (selectedTask) {
      // Find the current task in the updated task list
      const updatedTask = tasks.find(t => t.task_id === selectedTask.task_id);
      
      // If the task still exists, update the selected task with the latest data
      if (updatedTask) {
        setSelectedTask(updatedTask);
      } else if (challengeTasks.length > 0) {
        // If the task doesn't exist, select the first task
        setSelectedTask(challengeTasks[0]);
      } else {
        setSelectedTask(null);
      }
    } else if (challengeTasks.length > 0 && !selectedTask) {
      setSelectedTask(challengeTasks[0]);
    }
  }, [tasks, challengeTasks]);
  
  // Set focus when editing begins
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [editingTitle]);
  
  useEffect(() => {
    if (editingDescription && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus();
    }
  }, [editingDescription]);
  
  // Helper function to update the task and refresh the data
  const handleTaskUpdate = async (taskId: string, data: Partial<Task>) => {
    setIsUpdating(true);
    try {
      await updateTask(taskId, data);
      // Immediately reload tasks to reflect changes
      await loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handlers for editing task fields
  const startEditingTitle = () => {
    if (!selectedTask) return;
    setEditingValues(prev => ({ ...prev, title: selectedTask.name }));
    setEditingTitle(true);
  };
  
  const startEditingReward = () => {
    if (!selectedTask) return;
    setEditingValues(prev => ({ ...prev, reward: selectedTask.reward_points || 0 }));
    setEditingReward(true);
  };
  
  const startEditingDescription = () => {
    if (!selectedTask) return;
    setEditingValues(prev => ({ ...prev, description: selectedTask.description }));
    setEditingDescription(true);
  };
  
  const saveTitle = async () => {
    if (!selectedTask) return;
    await handleTaskUpdate(selectedTask.task_id.toString(), { name: editingValues.title });
    setEditingTitle(false);
  };
  
  const saveReward = async () => {
    if (!selectedTask) return;
    await handleTaskUpdate(selectedTask.task_id.toString(), { 
      reward_points: editingValues.reward 
    });
    setEditingReward(false);
  };
  
  const saveDescription = async () => {
    if (!selectedTask) return;
    await handleTaskUpdate(selectedTask.task_id.toString(), { description: editingValues.description });
    setEditingDescription(false);
  };
  
  // Handler for updating priority
  const increasePriority = async (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const task = challengeTasks.find(t => t.task_id.toString() === taskId);
    if (task) {
      // Remove the upper limit of 3
      const newPriority = task.priority + 1;
      await handleTaskUpdate(taskId, { priority: newPriority });
    }
  };
  
  // Handler for completing task with effect
  const completeTask = async () => {
    if (!selectedTask) return;
    const newStatus = selectedTask.status === 'completed' ? 'ongoing' : 'completed';
    await handleTaskUpdate(selectedTask.task_id.toString(), { status: newStatus });
  };
  
  // Handlers for delete confirmation
  const confirmDelete = () => {
    setShowDeleteConfirm(true);
  };
  
  const handleDelete = async () => {
    if (!selectedTask) return;
    const taskId = selectedTask.task_id.toString();
    
    try {
      await deleteTask(taskId);
      // Immediately reload tasks to reflect changes
      await loadTasks();
      
      setShowDeleteConfirm(false);
      
      if (challengeTasks.length > 0) {
        // Find the next task that isn't the deleted one
        const nextTask = challengeTasks.find(task => task.task_id !== selectedTask.task_id);
        setSelectedTask(nextTask || null);
      } else {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };
  
  // Handlers for image upload and cropping
  const handleImageClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        setImageFile(target.files[0]);
        setShowCropper(true);
      }
    };
    input.click();
  };
  
  const handleCropComplete = async (croppedImageUrl: string) => {
    if (!selectedTask) return;
    
    // In a real implementation, you would upload the cropped image to storage
    // For now, we'll just update the task with the data URL
    await handleTaskUpdate(selectedTask.task_id.toString(), { image_path: croppedImageUrl });
    setShowCropper(false);
  };
  
  // Function to determine priority colors
  const getPriorityColor = (index: number, priority: number) => {
    if (index < priority && index < 6) {
      // Priority levels filled - using warm tones with distinct gradients
      return [
        'bg-amber-300', // Priority 1 - 淡黄色
        'bg-orange-400', // Priority 2 - 橙色
        'bg-rose-400', // Priority 3 - 玫瑰色
        'bg-red-500', // Priority 4 - 鲜红色
        'bg-red-600', // Priority 5 - 深红色
        'bg-red-700', // Priority 6 - 暗红色
      ][index] || 'bg-accent-gold';
    }
    
    // Empty priority indicators
    return 'bg-gray-500/20';
  };
  
  // Function to handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: 'title' | 'description' | 'reward') => {
    const value = e.target.value;
    setEditingValues(prev => ({ 
      ...prev, 
      [field]: field === 'reward' ? parseInt(value) || 0 : value 
    }));
  };
  
  // 创建新任务的处理函数
  const handleCreateTask = async () => {
    setIsUpdating(true);
    try {
      const newTask = await createTask({
        name: '新任务',
        description: '',
        priority: 1,
        status: 'ongoing',
        reward_points: 10
      });
      
      if (newTask) {
        await loadTasks();
        setSelectedTask(newTask);
      }
    } catch (error) {
      console.error('创建任务失败:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Left Column - Task List */}
        <div className="w-64 valhalla-panel overflow-auto">
          <div className="space-y-3 p-1">
            {/* 新建任务按钮 */}
            <motion.div
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateTask}
              className="p-3 cursor-pointer rounded-lg transition-all relative hover:bg-amber-100/70 text-slate-800 bg-amber-50/90 border border-amber-200/80 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <span className="font-semibold line-clamp-2 flex-1 flex items-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-2 text-amber-700" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 4v16m8-8H4" 
                    />
                  </svg>
                  新建任务
                </span>
              </div>
            </motion.div>
            
            {challengeTasks.map(task => (
              <motion.div
                key={task.task_id}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedTask(task)}
                className={`p-3 cursor-pointer rounded-lg transition-all relative ${
                  selectedTask?.task_id === task.task_id 
                    ? task.status === 'completed'
                      ? 'bg-slate-700/90 text-slate-200 border border-cyan-900/50 shadow-md'
                      : 'bg-slate-800/90 text-cyan-100 border border-cyan-800/50 shadow-md'
                    : task.status === 'completed'
                      ? 'hover:bg-slate-800/60 text-slate-300/90 bg-slate-900/30 border border-slate-700/20'
                      : 'hover:bg-slate-800/60 text-wheat-100/90 bg-slate-900/40 border border-slate-700/30'
                }`}
              >
                {/* Completion Icon */}
                {task.status === 'completed' && <CompletionIcon />}
                
                <div className="flex justify-between items-start">
                  <span className="font-semibold line-clamp-2 flex-1">
                    {task.name}
                  </span>
                  <div 
                    className="flex flex-col cursor-pointer ml-2 flex-shrink-0 mt-1 gap-1"
                    onClick={(e) => increasePriority(task.task_id.toString(), e)}
                  >
                    {/* 第一行三个指示器 */}
                    <div className="flex">
                      {[...Array(3)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-2.5 h-2.5 mx-0.5 rounded-sm ${
                            getPriorityColor(i, task.priority)
                          } flex items-center justify-center text-[6px]`}
                        />
                      ))}
                    </div>
                    {/* 第二行三个指示器 */}
                    <div className="flex">
                      {[...Array(3)].map((_, i) => (
                        <div 
                          key={i+3} 
                          className={`w-2.5 h-2.5 mx-0.5 rounded-sm ${
                            getPriorityColor(i+3, task.priority)
                          } flex items-center justify-center text-[6px]`}
                        >
                          {i === 2 && task.priority > 6 && "+"}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Right Column - Task Details with Background Image */}
        <div className="flex-1 valhalla-panel overflow-auto relative">
          {selectedTask && (
            <>
              {/* Background Image with Opacity */}
              <div className="absolute inset-0 z-0">
                <div 
                  className="w-full h-full bg-cover bg-center opacity-15"
                  style={{ 
                    backgroundImage: `url(${selectedTask.image_path || defaultTaskImage})`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/10 to-transparent"></div>
              </div>
            </>
          )}
          
          {isUpdating && (
            <div className="absolute inset-0 bg-slate-900/30 z-50 flex items-center justify-center">
              <div className="animate-pulse text-cyan-400">更新中...</div>
            </div>
          )}
          
          {selectedTask ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTask.task_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col relative z-10"
              >
                <div className="mb-4 pb-3 border-b border-cyan-800/30 px-4 pt-4">
                  {editingTitle ? (
                    <input
                      ref={titleInputRef}
                      className="text-xl font-display text-cyan-300 outline-none bg-transparent w-full border-b border-cyan-500/30 focus:border-cyan-500/50 px-1 py-2"
                      value={editingValues.title}
                      onChange={(e) => handleInputChange(e, 'title')}
                      onBlur={saveTitle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          saveTitle();
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2 py-2">
                      <h2 
                        className="text-xl font-display text-cyan-300 cursor-pointer"
                        onClick={startEditingTitle}
                      >
                        {selectedTask.name}
                      </h2>
                      
                      {selectedTask.status === 'completed' && (
                        <span className="bg-cyan-900/80 rounded-full p-1 inline-flex">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-4 h-4 text-cyan-300"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 mb-4 overflow-auto">
                  {editingDescription ? (
                    <TextareaAutosize
                      ref={descriptionTextareaRef}
                      className="w-full prose prose-invert max-w-none outline-none bg-slate-800/40 p-4 rounded-md border border-cyan-900/20 focus:border-cyan-900/40 resize-none"
                      value={editingValues.description}
                      onChange={(e) => handleInputChange(e, 'description')}
                      onBlur={saveDescription}
                      onKeyDown={(e) => {
                        // Don't save on Enter, allow multi-line input
                        if (e.key === 'Enter' && e.shiftKey) {
                          // Save only on Shift+Enter if needed
                          e.preventDefault();
                          saveDescription();
                        }
                      }}
                      minRows={4}
                      spellCheck={false}
                    />
                  ) : (
                    <div 
                      className="prose prose-invert max-w-none cursor-pointer bg-slate-800/40 p-4 rounded-md whitespace-pre-wrap"
                      onClick={startEditingDescription}
                    >
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={{
                          // Handle line breaks specifically
                          p: ({ children }: { children: React.ReactNode }) => <p className="whitespace-pre-line">{children}</p>
                        }}
                      >
                        {selectedTask.description}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 mt-auto pt-3 border-t border-cyan-800/30">
                  {!showDeleteConfirm ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-transparent text-red-400 border border-red-500/50 font-display uppercase tracking-wider text-sm rounded-md"
                        onClick={confirmDelete}
                      >
                        删除
                      </motion.button>
                      
                      {selectedTask.status === 'completed' ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 bg-cyan-800/80 text-cyan-50 font-display tracking-wider text-sm rounded-md border border-cyan-600/30"
                          onClick={completeTask}
                        >
                          恢复任务
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 bg-cyan-800/80 text-cyan-50 font-display tracking-wider text-sm rounded-md shadow-md border border-cyan-600/30"
                          onClick={completeTask}
                        >
                          完成任务
                        </motion.button>
                      )}
                    </>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-red-700/80 text-white font-display uppercase tracking-wider text-sm rounded-md"
                      onClick={handleDelete}
                    >
                      确认删除
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Select a challenge to view details
            </div>
          )}
          
          {showCropper && imageFile && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-slate-900 p-4 rounded-lg max-w-3xl w-full border border-cyan-900/30">
                <h3 className="text-xl font-display text-cyan-400 mb-4">
                  Crop Image
                </h3>
                
                <div className="mb-4">
                  <ReactCropperPro
                    src={URL.createObjectURL(imageFile)}
                    onChange={handleCropComplete}
                    aspectRatio={16/9}
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded border border-slate-700"
                    onClick={() => setShowCropper(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksView; 