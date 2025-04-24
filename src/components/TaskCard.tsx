import React from 'react';
import { FiCheckCircle, FiXCircle, FiArrowUp, FiArrowDown, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';
import { clsx } from 'clsx';

type TaskStatus = 'Completed' | 'InProgress' | 'Canceled';
type TaskType = 'Main' | 'Challenges' | 'Daily';
type Recurrence = 'None' | 'Daily' | 'Weekly';

interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: number;
  dueDate?: Date;
  status: TaskStatus;
  createdAt: Date;
  imageUrl?: string;
  upvotes: number;
  points: number;
  recurrence: Recurrence;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onChangePriority: (id: string, increase: boolean) => void;
  variant?: 'large' | 'small';
}

export default function TaskCard({
  id,
  title,
  description,
  type,
  priority,
  dueDate,
  status,
  createdAt,
  imageUrl,
  upvotes,
  points,
  recurrence,
  onComplete,
  onCancel,
  onChangePriority,
  variant = 'large'
}: TaskCardProps) {
  // Border color based on task type
  const getBorderColor = () => {
    switch (type) {
      case 'Main':
        return 'border-indigo-600';
      case 'Challenges':
        return 'border-secondary';
      case 'Daily':
        return 'border-green-500';
      default:
        return 'border-gray-600';
    }
  };

  const getPriorityClass = () => {
    if (priority >= 8) return 'text-accent font-bold';
    if (priority >= 5) return 'text-accent-yellow font-semibold';
    return 'text-gray-300';
  };

  // Render small variant for historical/completed tasks
  if (variant === 'small') {
    return (
      <div className={clsx(
        'task-card w-full',
        getBorderColor(),
        status === 'Completed' ? 'opacity-75' : '',
        status === 'Canceled' ? 'opacity-50' : '',
      )}>
        <div className="flex items-center justify-between">
          <div className="truncate flex-1">
            <h3 className="text-sm font-semibold truncate">{title}</h3>
            <div className="flex items-center mt-1 text-xs text-gray-400">
              <span className="mr-2">{type}</span>
              {dueDate && (
                <span className="flex items-center">
                  <FiClock className="mr-1 h-3 w-3" />
                  {format(dueDate, 'MMM d')}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0">
            {status === 'Completed' && (
              <span className="text-accent-green">
                <FiCheckCircle className="h-5 w-5" />
              </span>
            )}
            {status === 'Canceled' && (
              <span className="text-accent">
                <FiXCircle className="h-5 w-5" />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Large full-width version for today's tasks
  return (
    <div className={clsx(
      'task-card w-full',
      getBorderColor(),
      status === 'Completed' ? 'opacity-75' : '',
      status === 'Canceled' ? 'opacity-50' : '',
    )}>
      <div className="flex items-start">
        <div className="flex-1">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className={clsx("ml-2 text-sm", getPriorityClass())}>
              Priority: {priority}
            </div>
          </div>
          
          {description && (
            <p className="mt-1 text-sm text-gray-300">{description}</p>
          )}
          
          <div className="flex items-center mt-2 text-sm text-gray-400">
            <span className="border border-gray-700 rounded px-2 py-0.5 text-xs">{type}</span>
            {dueDate && (
              <span className="ml-3 flex items-center">
                <FiClock className="mr-1 h-4 w-4" />
                {format(dueDate, 'MMM d, yyyy')}
              </span>
            )}
            {recurrence !== 'None' && (
              <span className="ml-3 text-xs py-0.5 px-2 bg-background-dark rounded-full">
                {recurrence}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onChangePriority(id, true)}
            className="p-1.5 rounded hover:bg-background-dark"
            aria-label="Increase priority"
          >
            <FiArrowUp className="h-4 w-4 text-gray-400 hover:text-accent-yellow" />
          </button>
          <button 
            onClick={() => onChangePriority(id, false)}
            className="p-1.5 rounded hover:bg-background-dark"
            aria-label="Decrease priority"
          >
            <FiArrowDown className="h-4 w-4 text-gray-400 hover:text-accent-yellow" />
          </button>
          <button 
            onClick={() => onComplete(id)}
            className="p-1.5 rounded hover:bg-background-dark"
            aria-label="Complete task"
          >
            <FiCheckCircle className="h-5 w-5 text-gray-400 hover:text-accent-green" />
          </button>
          <button 
            onClick={() => onCancel(id)}
            className="p-1.5 rounded hover:bg-background-dark"
            aria-label="Cancel task"
          >
            <FiXCircle className="h-5 w-5 text-gray-400 hover:text-accent" />
          </button>
        </div>
      </div>
    </div>
  );
} 