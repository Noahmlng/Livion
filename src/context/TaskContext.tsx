import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Task, TaskTemplate } from '../types/task';
import { addDays, isToday, isBefore, startOfDay } from 'date-fns';

// Define context state
interface TaskState {
  tasks: Task[];
  templates: TaskTemplate[];
}

// Define context value interface
interface TaskContextValue extends TaskState {
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  upvoteTask: (id: string) => void;
  addTemplate: (template: Omit<TaskTemplate, 'id' | 'createdAt' | 'status'>) => void;
  updateTemplate: (id: string, updates: Partial<TaskTemplate>) => void;
  deleteTemplate: (id: string) => void;
  createTaskFromTemplate: (templateId: string) => void;
}

// Define actions
type TaskAction =
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'COMPLETE_TASK'; payload: string }
  | { type: 'UPVOTE_TASK'; payload: string }
  | { type: 'ADD_TEMPLATE'; payload: TaskTemplate }
  | { type: 'UPDATE_TEMPLATE'; payload: { id: string; updates: Partial<TaskTemplate> } }
  | { type: 'DELETE_TEMPLATE'; payload: string }
  | { type: 'GENERATE_DAILY_TASKS' };

// Create the context
const TaskContext = createContext<TaskContextValue | undefined>(undefined);

// Reducer function
const taskReducer = (state: TaskState, action: TaskAction): TaskState => {
  switch (action.type) {
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...state.tasks, action.payload],
      };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload.id ? { ...task, ...action.payload.updates } : task
        ),
      };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload),
      };
    case 'COMPLETE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload
            ? { ...task, status: 'completed', completedAt: new Date() }
            : task
        ),
      };
    case 'UPVOTE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload
            ? { ...task, upvotes: (task.upvotes || 0) + 1 }
            : task
        ),
      };
    case 'ADD_TEMPLATE':
      return {
        ...state,
        templates: [...state.templates, action.payload],
      };
    case 'UPDATE_TEMPLATE':
      return {
        ...state,
        templates: state.templates.map((template) =>
          template.id === action.payload.id
            ? { ...template, ...action.payload.updates }
            : template
        ),
      };
    case 'DELETE_TEMPLATE':
      return {
        ...state,
        templates: state.templates.filter((template) => template.id !== action.payload),
      };
    case 'GENERATE_DAILY_TASKS':
      const today = startOfDay(new Date());
      const newTasks: Task[] = [];
      
      state.templates.forEach((template) => {
        // Check if template is daily and wasn't generated today
        if (
          template.frequency === 'daily' &&
          (!template.lastGenerated || !isToday(template.lastGenerated))
        ) {
          // Create a new task from the template
          const newTask: Task = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: template.title,
            description: template.description,
            priority: template.priority,
            category: template.category,
            status: 'todo',
            createdAt: new Date(),
            dueDate: addDays(today, 1), // Due tomorrow
            tags: [template.category],
          };
          
          newTasks.push(newTask);
          
          // Update template's lastGenerated
          template.lastGenerated = today;
        }
      });
      
      return {
        ...state,
        tasks: [...state.tasks, ...newTasks],
        templates: [...state.templates],
      };
    default:
      return state;
  }
};

// Initial state with some sample data
const initialState: TaskState = {
  tasks: [
    {
      id: 'task-1',
      title: '击败盗贼首领',
      description: '在阴影森林寻找盗贼营地，击败首领并夺回村民被盗的物品。',
      priority: 'high',
      category: 'main',
      status: 'todo',
      createdAt: new Date(),
      dueDate: addDays(new Date(), 2),
      tags: ['main', 'combat'],
    },
    {
      id: 'task-2',
      title: '收集魔法草药',
      description: '为村庄的药剂师收集5种魔法草药，可在南部高地找到。',
      priority: 'medium',
      category: 'side',
      status: 'todo',
      createdAt: new Date(),
      upvotes: 3,
      tags: ['side', 'gathering'],
    },
    {
      id: 'task-3',
      title: '锻炼体能',
      description: '每日体能训练，提高角色的基础属性。',
      priority: 'low',
      category: 'daily',
      status: 'todo',
      createdAt: new Date(),
      dueDate: new Date(),
      tags: ['daily', 'training'],
    },
  ],
  templates: [
    {
      id: 'template-1',
      title: '晨间训练',
      description: '完成30分钟晨间体能训练，提高体质属性。',
      priority: 'medium',
      category: 'daily',
      status: 'todo',
      createdAt: new Date(),
      frequency: 'daily',
    },
    {
      id: 'template-2',
      title: '采集资源',
      description: '收集游戏中的基础资源，用于制作和升级装备。',
      priority: 'low',
      category: 'daily',
      status: 'todo',
      createdAt: new Date(),
      frequency: 'daily',
    },
  ],
};

// Provider component
export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  // Generate daily tasks on component mount and at midnight
  useEffect(() => {
    // Generate tasks when the component mounts
    dispatch({ type: 'GENERATE_DAILY_TASKS' });

    // Set up a timer to check for new day
    const checkForNewDay = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        dispatch({ type: 'GENERATE_DAILY_TASKS' });
      }
    };

    const intervalId = setInterval(checkForNewDay, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, []);

  // Context value
  const value: TaskContextValue = {
    ...state,
    addTask: (taskData) => {
      const newTask: Task = {
        ...taskData,
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        status: 'todo',
        tags: [...(taskData.tags || []), taskData.category],
      };
      dispatch({ type: 'ADD_TASK', payload: newTask });
    },
    updateTask: (id, updates) => {
      dispatch({ type: 'UPDATE_TASK', payload: { id, updates } });
    },
    deleteTask: (id) => {
      dispatch({ type: 'DELETE_TASK', payload: id });
    },
    completeTask: (id) => {
      dispatch({ type: 'COMPLETE_TASK', payload: id });
    },
    upvoteTask: (id) => {
      dispatch({ type: 'UPVOTE_TASK', payload: id });
    },
    addTemplate: (templateData) => {
      const newTemplate: TaskTemplate = {
        ...templateData,
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        status: 'todo',
      };
      dispatch({ type: 'ADD_TEMPLATE', payload: newTemplate });
    },
    updateTemplate: (id, updates) => {
      dispatch({ type: 'UPDATE_TEMPLATE', payload: { id, updates } });
    },
    deleteTemplate: (id) => {
      dispatch({ type: 'DELETE_TEMPLATE', payload: id });
    },
    createTaskFromTemplate: (templateId) => {
      const template = state.templates.find((t) => t.id === templateId);
      if (template) {
        const newTask: Task = {
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: template.title,
          description: template.description,
          priority: template.priority,
          category: template.category,
          status: 'todo',
          createdAt: new Date(),
          tags: [template.category],
        };
        dispatch({ type: 'ADD_TASK', payload: newTask });
      }
    },
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

// Custom hook to use the task context
export const useTask = (): TaskContextValue => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
}; 