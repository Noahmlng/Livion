import React, { useState, useMemo } from 'react';
import { isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { HudContainer, HudHeader, HudTaskItem, CircleCheckbox } from './StyledElements';
import { useTask } from '../../context/TaskContext';

interface TodayTasksHUDProps {
  onOpenTodayTab: () => void;
}

const TodayTasksHUD: React.FC<TodayTasksHUDProps> = ({ onOpenTodayTab }) => {
  const { tasks, completeTask } = useTask();
  const [isHovered, setIsHovered] = useState(false);

  // Filter today's tasks
  const todayTasks = useMemo(() => {
    return tasks
      .filter(task => task.dueDate && isToday(task.dueDate) && task.status === 'todo')
      .sort((a, b) => {
        // Sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return 0;
      })
      .slice(0, 5); // Show only top 5 tasks
  }, [tasks]);

  // Truncate task title if it's too long
  const truncateTitle = (title: string, maxLength: number = 30) => {
    if (title.length <= maxLength) return title;
    return `${title.substring(0, maxLength)}...`;
  };

  // Handle task completion
  const handleCompleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    completeTask(id);
  };

  return (
    <HudContainer
      as={motion.div}
      initial={{ opacity: 0.3, x: 20 }}
      animate={{ opacity: isHovered ? 0.9 : 0.5, x: 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onOpenTodayTab}
    >
      <HudHeader>今日任务</HudHeader>
      <AnimatePresence>
        {todayTasks.length > 0 ? (
          todayTasks.map(task => (
            <HudTaskItem 
              key={task.id}
              as={motion.div}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <CircleCheckbox 
                checked={task.status === 'completed'}
                onClick={(e) => handleCompleteTask(task.id, e)}
              />
              <span>{truncateTitle(task.title)}</span>
            </HudTaskItem>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
          >
            今天没有任务，享受美好的一天！
          </motion.div>
        )}
      </AnimatePresence>
    </HudContainer>
  );
};

export default TodayTasksHUD; 