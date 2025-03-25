/*
    主线任务
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
  FloatingButton
} from '../ui/StyledElements';
import { useTask } from '../../context/TaskContext';
import { Task } from '../../types/task';
import TaskForm from '../ui/TaskForm';

const MainQuestTab: React.FC = () => {
  const { tasks, completeTask, updateTask, deleteTask } = useTask();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Filter main quests
  const mainQuests = useMemo(() => {
    return tasks.filter(task => task.category === 'main');
  }, [tasks]);

  // Sort main quests
  const sortedMainQuests = useMemo(() => {
    return [...mainQuests].sort((a, b) => {
      // Completed tasks go to the bottom
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      
      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      // Sort by creation date (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [mainQuests]);

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

  return (
    <TaskListContainer>
      {/* Main Quests List */}
      {sortedMainQuests.length > 0 ? (
        sortedMainQuests.map((task) => (
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
              {task.dueDate && (
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  {formatDate(task.dueDate)}
                </div>
              )}
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
          <p style={{ marginBottom: '1rem' }}>无主线任务，开始一个新的冒险！</p>
          <Button onClick={() => setIsFormVisible(true)}>创建主线任务</Button>
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
                  <img src={`/task-images/main.jpg`} alt={selectedTask.title} />
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
                category: 'main', 
                status: 'todo', 
                createdAt: new Date(),
                tags: ['main']
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

export default MainQuestTab; 