/*
    支线任务
*/

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TaskListContainer, 
  TaskCard, 
  PriorityIndicator,
  TaskModal,
  TaskModalHeader,
  TaskModalContent,
  TaskModalLeft,
  TaskModalRight,
  TaskModalFooter,
  Button,
  Overlay,
  FloatingButton,
  UpvoteButton
} from '../ui/StyledElements';
import { useTask } from '../../context/TaskContext';
import { Task } from '../../types/task';
import TaskForm from '../ui/TaskForm';

const SideQuestTab: React.FC = () => {
  const { tasks, completeTask, updateTask, deleteTask, upvoteTask } = useTask();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Filter side quests
  const sideQuests = useMemo(() => {
    return tasks.filter(task => task.category === 'side');
  }, [tasks]);

  // Sort side quests
  const sortedSideQuests = useMemo(() => {
    return [...sideQuests].sort((a, b) => {
      // Completed tasks go to the bottom
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      
      // Sort by upvotes
      const aUpvotes = a.upvotes || 0;
      const bUpvotes = b.upvotes || 0;
      if (aUpvotes !== bUpvotes) {
        return bUpvotes - aUpvotes;
      }
      
      // Sort by creation date (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [sideQuests]);

  // Format date for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  // Handle task click
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  // Handle task completion
  const handleCompleteTask = (id: string) => {
    completeTask(id);
    if (selectedTask && selectedTask.id === id) {
      setSelectedTask({ ...selectedTask, status: 'completed', completedAt: new Date() });
    }
  };

  // Handle task deletion
  const handleDeleteTask = (id: string) => {
    deleteTask(id);
    setSelectedTask(null);
  };

  // Handle upvote
  const handleUpvote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    upvoteTask(id);
    
    // Update the selected task if it's the one being upvoted
    if (selectedTask && selectedTask.id === id) {
      setSelectedTask({
        ...selectedTask,
        upvotes: (selectedTask.upvotes || 0) + 1
      });
    }
  };

  return (
    <TaskListContainer>
      {/* Side Quests List */}
      {sortedSideQuests.length > 0 ? (
        sortedSideQuests.map((task) => (
          <TaskCard 
            key={task.id} 
            onClick={() => handleTaskClick(task)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ opacity: task.status === 'completed' ? 0.6 : 1 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <PriorityIndicator priority={task.priority} />
                <span 
                  style={{ 
                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                    fontWeight: 500
                  }}
                >
                  {task.title}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UpvoteButton onClick={(e) => handleUpvote(task.id, e)}>
                  <span>陶片 x {task.upvotes || 0}</span>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M12 2L2 22h20L12 2z" />
                  </svg>
                </UpvoteButton>
                
                {task.dueDate && (
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {formatDate(task.dueDate)}
                  </div>
                )}
              </div>
            </div>
          </TaskCard>
        ))
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '50vh',
          opacity: 0.7
        }}>
          <p style={{ marginBottom: '1rem' }}>无支线任务，创建一个新的支线任务吧！</p>
          <Button onClick={() => setIsFormVisible(true)}>创建支线任务</Button>
        </div>
      )}

      {/* Task Modal */}
      <AnimatePresence>
        {selectedTask && (
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTask(null)}
          >
            <TaskModal
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <TaskModalHeader>
                <h2>{selectedTask.title}</h2>
                <Button 
                  variant="danger" 
                  size="small" 
                  onClick={() => setSelectedTask(null)}
                >
                  ×
                </Button>
              </TaskModalHeader>
              <TaskModalContent>
                <TaskModalLeft>
                  <p style={{ marginBottom: '1rem' }}>{selectedTask.description}</p>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>优先级：</strong>
                    <PriorityIndicator priority={selectedTask.priority} />
                    {selectedTask.priority === 'high' && '高优先级'}
                    {selectedTask.priority === 'medium' && '中等优先级'}
                    {selectedTask.priority === 'low' && '低优先级'}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>陶片值：</strong> {selectedTask.upvotes || 0}
                    <Button 
                      variant="secondary" 
                      size="small" 
                      onClick={() => upvoteTask(selectedTask.id)}
                      style={{ marginLeft: '8px', padding: '2px 6px' }}
                    >
                      +1
                    </Button>
                  </div>
                  {selectedTask.dueDate && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>截止日期：</strong> {formatDate(selectedTask.dueDate)}
                    </div>
                  )}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>状态：</strong> {selectedTask.status === 'completed' ? '已完成' : '待完成'}
                  </div>
                  {selectedTask.completedAt && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>完成时间：</strong> {formatDate(selectedTask.completedAt)}
                    </div>
                  )}
                  {selectedTask.tags && selectedTask.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      {selectedTask.tags.map((tag, index) => (
                        <span 
                          key={index}
                          style={{
                            backgroundColor: 'rgba(224, 166, 57, 0.2)',
                            color: '#e0a639',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.8rem'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </TaskModalLeft>
                <TaskModalRight>
                  <img src={`/task-images/side.jpg`} alt={selectedTask.title} />
                </TaskModalRight>
              </TaskModalContent>
              <TaskModalFooter>
                <Button 
                  variant="danger" 
                  onClick={() => handleDeleteTask(selectedTask.id)}
                >
                  删除
                </Button>
                {selectedTask.status !== 'completed' ? (
                  <Button 
                    variant="success" 
                    onClick={() => handleCompleteTask(selectedTask.id)}
                  >
                    完成
                  </Button>
                ) : (
                  <Button 
                    variant="secondary" 
                    onClick={() => updateTask(selectedTask.id, { status: 'todo', completedAt: undefined })}
                  >
                    恢复
                  </Button>
                )}
              </TaskModalFooter>
            </TaskModal>
          </Overlay>
        )}
      </AnimatePresence>

      {/* Task Form Modal */}
      <AnimatePresence>
        {isFormVisible && (
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFormVisible(false)}
          >
            <TaskForm 
              onClose={() => setIsFormVisible(false)} 
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              task={{ 
                id: '', 
                title: '', 
                description: '', 
                priority: 'medium', 
                category: 'side', 
                status: 'todo', 
                createdAt: new Date(),
                upvotes: 0,
                tags: ['side']
              } as Task}
            />
          </Overlay>
        )}
      </AnimatePresence>

      {/* Floating Button to Add Task */}
      <FloatingButton 
        onClick={() => setIsFormVisible(true)}
        variant="primary"
      >
        +
      </FloatingButton>
    </TaskListContainer>
  );
};

export default SideQuestTab; 