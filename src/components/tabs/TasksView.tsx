import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useValhallaTaskContext } from '../../context/ValhallaTaskContext';
import ReactCropperPro from 'react-cropper-pro';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import defaultTaskImage from '../../assets/ac-valhalla-settlement.avif';

const TasksView = () => {
  const { categories, toggleTaskCompletion, updateTask, deleteTask } = useValhallaTaskContext();
  
  // State for UI management
  const [selectedTask, setSelectedTask] = useState<any>(null);
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
  
  // Refs for editable elements
  const titleRef = useRef<HTMLHeadingElement>(null);
  const rewardRef = useRef<HTMLSpanElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  
  // Filter to just get the side quests / challenges tasks
  const challengeTasks = categories.find(cat => cat.id === 'side')?.tasks || [];
  
  // Initialize selected task when component mounts
  useEffect(() => {
    if (challengeTasks.length > 0 && !selectedTask) {
      setSelectedTask(challengeTasks[0]);
    }
  }, [challengeTasks]);
  
  // Set focus when entering edit mode
  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      placeCursorAtEnd(titleRef.current);
    }
  }, [editingTitle]);
  
  useEffect(() => {
    if (editingReward && rewardRef.current) {
      rewardRef.current.focus();
      placeCursorAtEnd(rewardRef.current);
    }
  }, [editingReward]);
  
  useEffect(() => {
    if (editingDescription && descriptionRef.current) {
      descriptionRef.current.focus();
      placeCursorAtEnd(descriptionRef.current);
    }
  }, [editingDescription]);
  
  // Helper function to place cursor at the end of content
  const placeCursorAtEnd = (element: HTMLElement) => {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false); // false means collapse to end
    selection?.removeAllRanges();
    selection?.addRange(range);
  };
  
  // Handlers for editing task fields
  const startEditingTitle = () => {
    if (!selectedTask) return;
    setEditingValues(prev => ({ ...prev, title: selectedTask.title }));
    setEditingTitle(true);
  };
  
  const startEditingReward = () => {
    if (!selectedTask) return;
    // Convert reward to number, assuming it's a numeric value stored in the reward_points field
    setEditingValues(prev => ({ ...prev, reward: selectedTask.reward_points || 0 }));
    setEditingReward(true);
  };
  
  const startEditingDescription = () => {
    if (!selectedTask) return;
    setEditingValues(prev => ({ ...prev, description: selectedTask.description }));
    setEditingDescription(true);
  };
  
  const saveTitle = () => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, 'side', { title: editingValues.title });
    setEditingTitle(false);
  };
  
  const saveReward = () => {
    if (!selectedTask) return;
    // Update reward_points field with the numeric value
    updateTask(selectedTask.id, 'side', { 
      reward_points: editingValues.reward 
    });
    setEditingReward(false);
  };
  
  const saveDescription = () => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, 'side', { description: editingValues.description });
    setEditingDescription(false);
  };
  
  // Handler for updating priority
  const increasePriority = (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const task = challengeTasks.find(t => t.id === taskId);
    if (task) {
      const newDifficulty = (task.difficulty < 3) ? 
        (task.difficulty + 1) as (1 | 2 | 3) : 
        task.difficulty;
      updateTask(taskId, 'side', { difficulty: newDifficulty });
    }
  };
  
  // Handler for completing task with effect
  const completeTask = () => {
    if (!selectedTask) return;
    toggleTaskCompletion(selectedTask.id, 'side');
    
    // Add any completion effects here
    // ...
  };
  
  // Handlers for delete confirmation
  const confirmDelete = () => {
    setShowDeleteConfirm(true);
  };
  
  const handleDelete = () => {
    if (!selectedTask) return;
    deleteTask(selectedTask.id, 'side');
    setShowDeleteConfirm(false);
    if (challengeTasks.length > 0) {
      setSelectedTask(challengeTasks[0]);
    } else {
      setSelectedTask(null);
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
  
  const handleCropComplete = (croppedImageUrl: string) => {
    if (!selectedTask) return;
    
    // In a real implementation, you would upload the cropped image to storage
    // For now, we'll just update the task with the data URL
    updateTask(selectedTask.id, 'side', { imageUrl: croppedImageUrl });
    setShowCropper(false);
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Left Column - Task List */}
        <div className="w-64 valhalla-panel overflow-auto">
          <h3 className="font-display text-xl text-accent-gold mb-4 pb-2 border-b border-border-metal">
            Challenges
          </h3>
          
          <div className="space-y-2">
            {challengeTasks.map(task => (
              <motion.div
                key={task.id}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedTask(task)}
                className={`p-3 cursor-pointer ${
                  selectedTask?.id === task.id 
                    ? 'bg-bg-panel text-accent-gold border-l-2 border-accent-gold'
                    : 'hover:bg-bg-panel'
                } ${task.completed ? 'line-through opacity-60' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold">{task.title}</span>
                  <div 
                    className="flex cursor-pointer"
                    onClick={(e) => increasePriority(task.id, e)}
                  >
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-3 h-3 mx-0.5 rounded-sm ${
                          i < task.difficulty ? 'bg-accent-gold' : 'bg-border-metal'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-wheat-300">
                  Rewards: {task.reward_points}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Middle Column - Task Details */}
        <div className="flex-1 valhalla-panel overflow-auto">
          {selectedTask ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTask.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col"
              >
                <div className="flex justify-between mb-4 pb-3 border-b border-border-metal">
                  {editingTitle ? (
                    <h2 
                      className="text-2xl font-display text-accent-gold outline-none"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={() => {
                        saveTitle();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      onInput={(e) => {
                        const value = e.currentTarget.textContent || '';
                        setEditingValues(prev => ({ ...prev, title: value }));
                      }}
                      ref={titleRef}
                    >
                      {editingValues.title}
                    </h2>
                  ) : (
                    <h2 
                      className="text-2xl font-display text-accent-gold cursor-pointer"
                      onClick={() => {
                        startEditingTitle();
                      }}
                    >
                      {selectedTask.title}
                    </h2>
                  )}
                  
                  {editingReward ? (
                    <div className="flex items-center">
                      <span className="text-wheat-300 mr-1">Rewards:</span>
                      <span
                        className="text-accent-gold font-display outline-none"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={() => {
                          saveReward();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        onInput={(e) => {
                          const value = parseInt(e.currentTarget.textContent || '0') || 0;
                          setEditingValues(prev => ({ ...prev, reward: value }));
                        }}
                        ref={rewardRef}
                      >
                        {editingValues.reward}
                      </span>
                    </div>
                  ) : (
                    <div 
                      className="text-accent-gold font-display cursor-pointer"
                      onClick={() => {
                        startEditingReward();
                      }}
                    >
                      Rewards: {selectedTask.reward_points}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 mb-4 overflow-auto">
                  {editingDescription ? (
                    <div 
                      className="prose prose-invert max-w-none outline-none"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={() => {
                        saveDescription();
                      }}
                      onInput={(e) => {
                        const value = e.currentTarget.textContent || '';
                        setEditingValues(prev => ({ ...prev, description: value }));
                      }}
                      ref={descriptionRef}
                    >
                      {editingValues.description}
                    </div>
                  ) : (
                    <div 
                      className="prose prose-invert max-w-none cursor-pointer"
                      onClick={() => {
                        startEditingDescription();
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedTask.description}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 mt-auto pt-3 border-t border-border-metal">
                  {!showDeleteConfirm ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-transparent text-red-800 border border-red-800 font-display uppercase tracking-wider text-sm rounded-md"
                        onClick={confirmDelete}
                      >
                        删除
                      </motion.button>
                      
                      {selectedTask.completed ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 bg-transparent text-emerald-500 border border-emerald-500 font-display tracking-wider text-sm rounded-md"
                          onClick={completeTask}
                        >
                          恢复任务
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 bg-emerald-600 text-white font-display tracking-wider text-sm rounded-md shadow-md"
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
                      className="px-4 py-2 bg-red-800/90 text-white font-display uppercase tracking-wider text-sm rounded-md"
                      onClick={handleDelete}
                    >
                      Confirm Delete
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex items-center justify-center h-full text-text-secondary">
              Select a challenge to view details
            </div>
          )}
        </div>
        
        {/* Right Column - Image */}
        <div className="w-80 valhalla-panel overflow-auto flex flex-col items-center justify-center">
          {selectedTask && (
            <>
              <div 
                className="w-full h-full flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={handleImageClick}
              >
                {selectedTask.imageUrl ? (
                  <img 
                    src={selectedTask.imageUrl} 
                    alt={selectedTask.title}
                    className="max-w-full max-h-full object-contain hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <img 
                    src={defaultTaskImage} 
                    alt="Default task background"
                    className="max-w-full max-h-full object-cover hover:opacity-80 transition-opacity"
                  />
                )}
              </div>
              
              {showCropper && imageFile && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                  <div className="bg-bg-dark p-4 rounded-lg max-w-3xl w-full">
                    <h3 className="text-xl font-display text-accent-gold mb-4">
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
                        className="px-4 py-2 bg-border-metal text-text-primary rounded"
                        onClick={() => setShowCropper(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksView; 