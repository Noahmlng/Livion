import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactCropperPro from 'react-cropper-pro';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import defaultTaskImage from '../../assets/ac-valhalla-settlement.avif';
import { useDb } from '../../context/DbContext';
import { useAppState } from '../../context/AppStateContext';
import { Task } from '../../utils/database';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Divider,
  ScrollShadow,
  Progress,
  Avatar
} from '@heroui/react';

// 添加隐藏滚动条的样式
const hideScrollbarStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;

// 动态添加样式到文档头部
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = hideScrollbarStyles;
  if (!document.head.querySelector('style[data-scrollbar-hide]')) {
    styleElement.setAttribute('data-scrollbar-hide', 'true');
    document.head.appendChild(styleElement);
  }
}

// Norse-style completion icon component
const CompletionIcon = () => (
  <div className="absolute -top-1 -left-1 w-6 h-6 bg-success/80 rounded-full flex items-center justify-center border border-success/50 z-10">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5 text-white"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </div>
);

// Priority Energy Bar Component
const PriorityEnergyBar = ({ 
  priority, 
  onPriorityChange, 
  disabled = false 
}: { 
  priority: number; 
  onPriorityChange: (newPriority: number) => void;
  disabled?: boolean;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPriority, setDragPriority] = useState(priority);
  const barRef = useRef<HTMLDivElement>(null);

  const maxPriority = 10;

  const getPriorityColor = (currentPriority: number) => {
    if (currentPriority <= 2) return 'success';
    if (currentPriority <= 4) return 'warning';
    if (currentPriority <= 6) return 'danger';
    return 'primary';
  };

  const calculatePriorityFromPosition = (clientX: number) => {
    if (!barRef.current) return priority;
    
    const rect = barRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
    return Math.max(1, Math.ceil(percentage * maxPriority));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsDragging(true);
    const newPriority = calculatePriorityFromPosition(e.clientX);
    setDragPriority(newPriority);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || isDragging) return;
    
    const newPriority = calculatePriorityFromPosition(e.clientX);
    onPriorityChange(newPriority);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newPriority = calculatePriorityFromPosition(e.clientX);
      setDragPriority(newPriority);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        onPriorityChange(dragPriority);
        setIsDragging(false);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragPriority, onPriorityChange]);

  const currentPriority = isDragging ? dragPriority : priority;

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="text-xs text-default-600 font-mono font-bold tracking-wider">
        PRIORITY LEVEL
      </div>
      <div className="flex items-center gap-3">
        <Progress
          ref={barRef}
          value={(currentPriority / maxPriority) * 100}
          color={getPriorityColor(currentPriority)}
          size="lg"
          className={`w-32 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          classNames={{
            base: "max-w-md",
            track: "drop-shadow-md border border-default",
            indicator: "bg-gradient-to-r from-danger-500 to-warning-500",
            label: "tracking-wider text-default-600 font-mono",
            value: "text-foreground font-mono",
          }}
        />
        <Chip
          color={getPriorityColor(currentPriority)}
          variant="solid"
          size="sm"
          className="font-mono font-bold"
        >
          {currentPriority}
        </Chip>
      </div>
    </div>
  );
};

const TasksView = () => {
  const { tasks, loadTasks, updateTask, deleteTask, createTask } = useDb();
  
  // 使用应用状态管理
  const {
    state,
    setSelectedTaskId,
    setEditingTitle,
    setEditingReward,
    setEditingDescription,
  } = useAppState();
  
  // 从 Context 获取持久化状态
  const {
    selectedTaskId,
    editingTitle,
    editingReward,
    editingDescription,
  } = state.tasksView;
  
  // 根据 selectedTaskId 获取当前选中的任务
  const selectedTask = selectedTaskId ? tasks.find(t => t.task_id === selectedTaskId) : null;
  const [editingValues, setEditingValues] = useState({
    title: '',
    reward: 0,
    description: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // 任务详情编辑弹窗
  const { isOpen: isTaskModalOpen, onOpen: onTaskModalOpen, onOpenChange: onTaskModalOpenChange } = useDisclosure();
  const [modalTaskContent, setModalTaskContent] = useState({
    title: '',
    description: ''
  });
  
  // Refs for editable elements
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const modalTitleRef = useRef<HTMLInputElement>(null);
  const modalDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
      
      // If the task still exists, keep the current selection
      if (updatedTask) {
        // Task still exists, no need to update editing values here
      } else if (challengeTasks.length > 0) {
        // If the task doesn't exist, select the first task
        setSelectedTaskId(challengeTasks[0].task_id);
      } else {
        setSelectedTaskId(null);
      }
    } else if (challengeTasks.length > 0 && !selectedTask) {
      setSelectedTaskId(challengeTasks[0].task_id);
    }
  }, [tasks, challengeTasks]);
  
  // Initialize editing state when a new task is selected (simplified)
  useEffect(() => {
    if (selectedTask) {
      setEditingValues({
        title: selectedTask.name,
        reward: selectedTask.reward_points || 0,
        description: selectedTask.description || ''
      });
      setEditingDescription(true);
    }
  }, [selectedTask?.task_id]); // Only depend on task_id to avoid loops

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
  const handleTaskUpdate = async (taskId: string, data: Partial<Task>, showLoading: boolean = true) => {
    if (showLoading) {
      setIsUpdating(true);
    }
    try {
      await updateTask(taskId, data);
      // Immediately reload tasks to reflect changes
      await loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      if (showLoading) {
        setIsUpdating(false);
      }
    }
  };
  
  // Handlers for editing task fields
  const startEditingTitle = () => {
    if (!selectedTask) return;
    setEditingValues(prev => ({ ...prev, title: selectedTask.name }));
    setEditingTitle(true);
  };
  
  const saveTitle = async () => {
    if (!selectedTask) return;
    await handleTaskUpdate(selectedTask.task_id.toString(), { name: editingValues.title });
    setEditingTitle(false);
  };
  

  
  const saveDescription = async () => {
    if (!selectedTask) return;
    await handleTaskUpdate(selectedTask.task_id.toString(), { description: editingValues.description }, false);
    // Keep editing state active for continuous editing
  };
  
  // Handler for updating priority
  const increasePriority = async (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const task = challengeTasks.find(t => t.task_id.toString() === taskId);
    if (task) {
      const newPriority = task.priority + 1;
      await handleTaskUpdate(taskId, { priority: newPriority });
    }
  };

  // Handler for priority energy bar
  const handlePriorityChange = async (newPriority: number) => {
    if (!selectedTask) return;
    await handleTaskUpdate(selectedTask.task_id.toString(), { priority: newPriority });
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
        setSelectedTaskId(nextTask ? nextTask.task_id : null);
      } else {
        setSelectedTaskId(null);
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
        'bg-success', // Priority 1
        'bg-warning', // Priority 2
        'bg-danger', // Priority 3
        'bg-danger', // Priority 4
        'bg-danger', // Priority 5
        'bg-danger', // Priority 6
      ][index] || 'bg-danger';
    }
    
    // Empty priority indicators
    return 'bg-default-300';
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
        setSelectedTaskId(newTask.task_id);
      }
    } catch (error) {
      console.error('创建任务失败:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // 打开任务详情编辑弹窗
  const openTaskModal = (task: Task) => {
    setModalTaskContent({
      title: task.name,
      description: task.description || ''
    });
    onTaskModalOpen();
    
    // 聚焦到弹窗文本框
    setTimeout(() => {
      if (modalTitleRef.current) {
        modalTitleRef.current.focus();
      }
    }, 100);
  };

  // 保存弹窗中的任务内容
  const saveModalTask = async () => {
    if (!selectedTask) return;

    try {
      await handleTaskUpdate(selectedTask.task_id.toString(), {
        name: modalTaskContent.title.trim(),
        description: modalTaskContent.description.trim()
      });

      // 关闭弹窗
      onTaskModalOpenChange();
    } catch (error) {
      console.error('Error saving modal task:', error);
    }
  };

  // 从弹窗删除任务
  const deleteModalTask = async () => {
    if (!selectedTask) return;
    await handleDelete();
    onTaskModalOpenChange();
  };
  
  return (
    <div className="flex flex-col gap-6 overflow-hidden">
      <div className="flex gap-6 h-[600px]">
        {/* Left Column - Task List */}
        <Card className="w-80 bg-content1 border border-primary/50 shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-success"></div>
          <ScrollShadow className="h-full">
            <CardBody className="p-4 space-y-3">
              {/* 新建任务按钮 */}
              <Card 
                isPressable
                onPress={handleCreateTask}
                className="relative cursor-pointer hover:scale-105 transition-all duration-300 bg-success/10 border border-success/50 hover:border-success"
              >
                <CardBody className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-success rounded-full"></div>
                    <span className="font-mono font-bold text-success tracking-wider">
                      新建任务
                    </span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4 ml-auto text-success" 
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
                  </div>
                </CardBody>
              </Card>
              
              {challengeTasks.map(task => (
                <Card
                  key={task.task_id}
                  isPressable
                  onPress={() => setSelectedTaskId(task.task_id)}
                  className={`relative transition-all duration-300 hover:scale-105 cursor-pointer ${
                    selectedTask?.task_id === task.task_id 
                      ? task.status === 'completed'
                        ? 'bg-success/20 border-2 border-success shadow-lg'
                        : 'bg-primary/20 border-2 border-primary shadow-lg'
                      : task.status === 'completed'
                        ? 'hover:bg-success/10 bg-content2 border border-success/30'
                        : 'hover:bg-primary/10 bg-content2 border border-default/50'
                  }`}
                >
                  {/* Completion Icon */}
                  {task.status === 'completed' && <CompletionIcon />}
                  
                  <CardBody className="p-4">
                    <div className="flex justify-between items-start">
                      <span className="font-mono font-bold text-foreground line-clamp-2 flex-1">
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
                              className={`w-2.5 h-2.5 mx-0.5 rounded-sm transition-colors ${
                                i < task.priority 
                                  ? i === 0 ? 'bg-success' 
                                    : i === 1 ? 'bg-warning' 
                                    : 'bg-danger'
                                  : 'bg-default-300'
                              }`}
                            />
                          ))}
                        </div>
                        {/* 第二行三个指示器 */}
                        <div className="flex">
                          {[...Array(3)].map((_, i) => (
                            <div 
                              key={i+3} 
                              className={`w-2.5 h-2.5 mx-0.5 rounded-sm transition-colors ${
                                (i+3) < task.priority ? 'bg-danger' : 'bg-default-300'
                              } flex items-center justify-center`}
                            >
                              {i === 2 && task.priority > 6 && (
                                <span className="text-[6px] text-white font-bold">+</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                                         {/* 状态显示 */}
                     {task.status === 'completed' && (
                       <div className="mt-2">
                         <Chip
                           color="success"
                           variant="solid"
                           size="sm"
                           className="font-mono font-bold"
                         >
                           DONE
                         </Chip>
                       </div>
                     )}
                  </CardBody>
                </Card>
              ))}
            </CardBody>
          </ScrollShadow>
        </Card>
        
        {/* Right Column - Task Details */}
        <Card className="flex-1 bg-content1 border border-primary/30 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary"></div>
          
          {selectedTask && (
            <>
              {/* Background Image with Opacity */}
              <div className="absolute inset-0 z-0">
                <div 
                  className="w-full h-full bg-cover bg-center opacity-10"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent"></div>
              </div>
            </>
          )}
          
          {isUpdating && (
            <div className="absolute inset-0 bg-content1/80 z-50 flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-secondary rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-success rounded-full animate-bounce delay-200"></div>
                <span className="text-primary font-mono tracking-wider ml-3 font-bold">UPDATING...</span>
              </div>
            </div>
          )}
          
          {selectedTask ? (
            <div className="relative z-10 h-full flex flex-col">
                                              <CardBody className="flex-1 flex flex-col p-0">
                  {/* Task Title */}
                  <div className="p-6 pb-4 border-b border-divider">
                    <div className="flex items-center gap-3">
                      {editingTitle ? (
                        <Input
                          ref={titleInputRef}
                          value={editingValues.title}
                          onChange={(e) => handleInputChange(e, 'title')}
                          onBlur={saveTitle}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveTitle();
                            }
                          }}
                          variant="bordered"
                          size="lg"
                          classNames={{
                            input: "text-xl font-mono font-bold text-foreground",
                            inputWrapper: "bg-content2 border-primary/30"
                          }}
                        />
                      ) : (
                        <h2 
                          className="text-2xl font-mono font-bold text-primary cursor-pointer hover:text-primary/80 transition-colors"
                          onClick={startEditingTitle}
                        >
                          {selectedTask.name}
                        </h2>
                      )}
                      
                      {selectedTask.status === 'completed' && (
                        <Chip
                          color="success"
                          variant="solid"
                          className="font-mono font-bold"
                          startContent={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-4 h-4"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          }
                        >
                          COMPLETED
                        </Chip>
                      )}
                    </div>
                  </div>
                  
                                    {/* Task Description - 填满空间，隐藏滚动条 */}
                  <div className="flex-1 p-0" style={{ minHeight: '400px' }}>
                    <Textarea
                      ref={descriptionTextareaRef}
                      value={editingValues.description || ''}
                      onValueChange={(value) => {
                        setEditingValues(prev => ({ ...prev, description: value }));
                        // Auto-save after a short delay
                        if (autoSaveTimeoutRef.current) {
                          clearTimeout(autoSaveTimeoutRef.current);
                        }
                        autoSaveTimeoutRef.current = setTimeout(() => {
                          if (selectedTask) {
                            handleTaskUpdate(selectedTask.task_id.toString(), { description: value }, false);
                          }
                        }, 1000);
                      }}
                      variant="flat"
                      placeholder="输入任务详情..."
                      isDisabled={false}
                      minRows={20}
                      classNames={{
                        base: "w-full h-full scrollbar-hide",
                        input: "text-foreground leading-relaxed font-mono resize-none placeholder:text-default-400 p-6 bg-transparent scrollbar-hide overflow-y-auto min-h-full",
                        inputWrapper: "bg-transparent border-0 shadow-none h-full data-[focus=true]:bg-transparent data-[hover=true]:bg-transparent scrollbar-hide min-h-full"
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          saveDescription();
                        }
                      }}
                    />
                  </div>
                </CardBody>

              <Divider />

                             <div className="p-6 bg-content2/50">
                 <div className="flex justify-between items-end">
                   {/* Left side: Priority */}
                   <div className="flex items-end gap-6">
                     {/* Priority Energy Bar */}
                     <PriorityEnergyBar
                       priority={selectedTask.priority}
                       onPriorityChange={handlePriorityChange}
                       disabled={isUpdating}
                     />
                   </div>
                   
                   {/* Action buttons */}
                   <div className="flex gap-3">
                    {!showDeleteConfirm ? (
                      <>
                        <Button
                          variant="bordered"
                          color="danger"
                          onClick={confirmDelete}
                          className="font-mono font-bold tracking-wider"
                        >
                          删除任务
                        </Button>
                        
                        {selectedTask.status === 'completed' ? (
                          <Button
                            color="warning"
                            variant="solid"
                            onClick={completeTask}
                            className="font-mono font-bold tracking-wider shadow-lg"
                          >
                            恢复任务
                          </Button>
                        ) : (
                          <Button
                            color="success"
                            variant="solid"
                            onClick={completeTask}
                            className="font-mono font-bold tracking-wider shadow-lg"
                          >
                            完成任务
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        color="danger"
                        variant="solid"
                        onClick={handleDelete}
                        className="font-mono font-bold tracking-wider"
                      >
                        确认删除
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <CardBody className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-2 border-dashed border-default/50 rounded-lg flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-default/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-default-600 text-lg font-mono font-bold">SELECT_MISSION</p>
                <p className="text-default-500 text-sm font-mono tracking-wider">从左侧选择一个任务查看详情</p>
              </div>
            </CardBody>
          )}
          
          {showCropper && imageFile && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <Card className="max-w-3xl w-full m-4 border border-primary/50">
                <CardHeader className="border-b border-divider">
                  <h3 className="text-xl font-mono font-bold text-primary tracking-wider">
                    CROP IMAGE
                  </h3>
                </CardHeader>
                
                <CardBody className="p-6">
                  <ReactCropperPro
                    src={URL.createObjectURL(imageFile)}
                    onChange={handleCropComplete}
                    aspectRatio={16/9}
                  />
                </CardBody>
                
                <Divider />
                
                <div className="p-4 flex justify-end gap-3">
                  <Button
                    variant="bordered"
                    onClick={() => setShowCropper(false)}
                    className="font-mono font-bold"
                  >
                    取消
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </Card>
      </div>

      {/* 任务详情编辑弹窗 - 参考笔记编辑弹窗设计 */}
      <Modal 
        isOpen={isTaskModalOpen} 
        onOpenChange={onTaskModalOpenChange}
        scrollBehavior="inside"
        size="2xl"
        classNames={{
          base: "shadow-lg rounded-lg overflow-hidden",
          header: "border-b bg-content2 border-primary rounded-t-lg",
          body: "py-6 bg-content1",
          footer: "border-t bg-content2 border-primary rounded-b-lg"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-success rounded-full"></div>
                    <div className="w-3 h-3 bg-warning rounded-full"></div>
                    <div className="w-3 h-3 bg-danger rounded-full"></div>
                  </div>
                  <h2 className="text-primary font-mono text-sm tracking-widest font-bold">
                    编辑任务详情
                  </h2>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedTask?.status === 'completed' && (
                    <Chip
                      color="success"
                      variant="solid"
                      size="sm"
                      className="font-mono text-xs tracking-wider font-bold"
                    >
                      已完成
                    </Chip>
                  )}
                </div>
              </ModalHeader>
              
              <ModalBody className="space-y-6">
                {/* 任务标题 */}
                <div className="space-y-2">
                  <label className="text-xs text-default-600 font-mono font-bold tracking-wider">
                    任务标题
                  </label>
                  <Input
                    ref={modalTitleRef}
                    value={modalTaskContent.title}
                    onValueChange={(value) => setModalTaskContent(prev => ({ ...prev, title: value }))}
                    variant="bordered"
                    size="lg"
                    placeholder="输入任务标题..."
                    classNames={{
                      input: "font-mono font-bold text-foreground",
                      inputWrapper: "bg-content2 border-primary/30 data-[focus=true]:border-primary"
                    }}
                  />
                </div>

                

                {/* 任务描述 */}
                <div className="space-y-2">
                  <label className="text-xs text-default-600 font-mono font-bold tracking-wider">
                    任务描述
                  </label>
                  <Textarea
                    ref={modalDescriptionRef}
                    value={modalTaskContent.description}
                    onValueChange={(value) => setModalTaskContent(prev => ({ ...prev, description: value }))}
                    variant="bordered"
                    minRows={8}
                    maxRows={15}
                    placeholder="输入任务描述..."
                    classNames={{
                      base: "w-full",
                      input: "font-mono text-foreground leading-relaxed",
                      inputWrapper: "bg-content2 border-primary/30 data-[focus=true]:border-primary"
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        saveModalTask();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        onTaskModalOpenChange();
                      }
                    }}
                  />
                </div>
              </ModalBody>

              <ModalFooter className="flex justify-between">
                <Button
                  variant="bordered"
                  color="danger"
                  onClick={deleteModalTask}
                  className="font-mono font-bold"
                >
                  删除任务
                </Button>
                
                <div className="flex gap-3">
                  <Button 
                    variant="bordered"
                    onClick={onClose}
                    className="font-mono font-bold"
                  >
                    取消
                  </Button>
                  <Button 
                    color="primary"
                    variant="solid"
                    onClick={saveModalTask}
                    className="shadow-lg font-mono font-bold"
                  >
                    保存更改
                  </Button>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TasksView; 