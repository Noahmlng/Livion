import { createContext, useContext, useState, ReactNode } from 'react';

// 任务和类别的类型定义
export interface ValhallaTask {
  id: string;
  title: string;
  description: string;
  type: 'main' | 'side' | 'daily';
  difficulty: 1 | 2 | 3;
  completed: boolean;
  imageUrl?: string;
  reward: string;
  reward_points: number;
  createdAt: string;
  dueDate?: string;
}

export interface TaskCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  tasks: ValhallaTask[];
}

// 初始任务数据
const INITIAL_CATEGORIES: TaskCategory[] = [
  {
    id: 'main',
    name: '主线任务',
    icon: '⚔️',
    color: 'border-red-500/30 text-red-400',
    tasks: [
      {
        id: 'main-1',
        title: '完成项目提案',
        description: '为客户准备详细的项目提案，包括时间线、预算和资源需求。',
        type: 'main',
        difficulty: 3,
        completed: false,
        imageUrl: 'https://placehold.co/600x400/41403c/f5f5f5?text=项目提案',
        reward: '经验值 +300',
        reward_points: 300,
        createdAt: '2023-06-01',
        dueDate: '2023-06-15'
      },
      {
        id: 'main-2',
        title: '学习React高级模式',
        description: '深入学习React的高级模式，包括Hooks、Context API和性能优化技巧。',
        type: 'main',
        difficulty: 3,
        completed: false,
        imageUrl: 'https://placehold.co/600x400/41403c/f5f5f5?text=React学习',
        reward: '经验值 +250',
        reward_points: 250,
        createdAt: '2023-05-20'
      }
    ]
  },
  {
    id: 'side',
    name: '支线任务',
    icon: '🏹',
    color: 'border-blue-500/30 text-blue-400',
    tasks: [
      {
        id: 'side-1',
        title: '整理工作空间',
        description: '清理桌面，整理文件，确保工作环境整洁有序。',
        type: 'side',
        difficulty: 1,
        completed: true,
        imageUrl: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2020/05/ac-valhalla-settlement.png?width=1200&quality=75&format=auto',
        reward: '经验值 +50',
        reward_points: 50,
        createdAt: '2023-06-02'
      },
      {
        id: 'side-2',
        title: '阅读技术文章',
        description: '阅读三篇关于前端开发的技术文章，做好笔记。',
        type: 'side',
        difficulty: 2,
        completed: false,
        imageUrl: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2020/05/ac-valhalla-settlement.png?width=1200&quality=75&format=auto',
        reward: '经验值 +100',
        reward_points: 100,
        createdAt: '2023-06-03'
      }
    ]
  },
  {
    id: 'daily',
    name: '奖励任务',
    icon: '🔄',
    color: 'border-green-500/30 text-green-400',
    tasks: [
      {
        id: 'daily-1',
        title: '每日代码练习',
        description: '完成一个算法题或编程挑战，保持编码技能。',
        type: 'daily',
        difficulty: 2,
        completed: false,
        imageUrl: 'https://placehold.co/600x400/41403c/f5f5f5?text=代码练习',
        reward: '经验值 +75',
        reward_points: 75,
        createdAt: '2023-06-05'
      },
      {
        id: 'daily-2',
        title: '回复所有邮件',
        description: '检查收件箱并回复所有待处理的邮件，保持沟通顺畅。',
        type: 'daily',
        difficulty: 1,
        completed: false,
        imageUrl: 'https://placehold.co/600x400/41403c/f5f5f5?text=邮件管理',
        reward: '经验值 +50',
        reward_points: 50,
        createdAt: '2023-06-05'
      }
    ]
  }
];

// 统计数据
export interface Stats {
  completedTasks: number;
  ongoingTasks: number;
  warriorLevel: number;
  achievementsCount: number;
}

// 成就类型
export interface Achievement {
  id: number;
  title: string;
  description: string;
  date: string;
  icon: string;
  unlocked: boolean;
}

// 上下文类型
interface ValhallaTaskContextType {
  categories: TaskCategory[];
  stats: Stats;
  achievements: Achievement[];
  addTask: (task: Omit<ValhallaTask, 'id' | 'createdAt'> & { categoryId: string }) => void;
  toggleTaskCompletion: (taskId: string, categoryId: string) => void;
  deleteTask: (taskId: string, categoryId: string) => void;
  updateTask: (taskId: string, categoryId: string, updates: Partial<ValhallaTask>) => void;
}

const ValhallaTaskContext = createContext<ValhallaTaskContextType | undefined>(undefined);

// 初始成就数据
const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 1, title: '早起的鸟儿', description: '连续5天在早上7点前完成一个任务', date: '2天前', icon: '🌅', unlocked: true },
  { id: 2, title: '勤劳的战士', description: '一周内完成20个任务', date: '4天前', icon: '⚒️', unlocked: true },
  { id: 3, title: '专注如神', description: '不间断完成一个估计需要2小时的任务', date: '1周前', icon: '🧠', unlocked: true },
  { id: 4, title: '任务大师', description: '完成100个任务', date: '', icon: '🏆', unlocked: false },
  { id: 5, title: '完美主义者', description: '连续30天每天完成所有计划任务', date: '', icon: '✨', unlocked: false },
];

// 初始统计数据
const calculateInitialStats = (categories: TaskCategory[]): Stats => {
  let completedTasks = 0;
  let ongoingTasks = 0;
  
  categories.forEach(category => {
    category.tasks.forEach(task => {
      if (task.completed) {
        completedTasks++;
      } else {
        ongoingTasks++;
      }
    });
  });
  
  // 简单的等级计算逻辑
  const warriorLevel = Math.floor(completedTasks / 5) + 1;
  
  return {
    completedTasks,
    ongoingTasks,
    warriorLevel,
    achievementsCount: INITIAL_ACHIEVEMENTS.filter(a => a.unlocked).length
  };
};

interface ValhallaTaskProviderProps {
  children: ReactNode;
}

export const ValhallaTaskProvider = ({ children }: ValhallaTaskProviderProps) => {
  const [categories, setCategories] = useState<TaskCategory[]>(INITIAL_CATEGORIES);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [stats, setStats] = useState<Stats>(calculateInitialStats(INITIAL_CATEGORIES));
  
  // 添加新任务
  const addTask = (taskData: Omit<ValhallaTask, 'id' | 'createdAt'> & { categoryId: string }) => {
    const { categoryId, ...task } = taskData;
    
    const newTask: ValhallaTask = {
      ...task,
      id: `${categoryId}-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setCategories(prev => prev.map(category => 
      category.id === categoryId 
        ? { ...category, tasks: [...category.tasks, newTask] }
        : category
    ));
    
    setStats(prev => ({
      ...prev,
      ongoingTasks: prev.ongoingTasks + 1
    }));
  };
  
  // 切换任务完成状态
  const toggleTaskCompletion = (taskId: string, categoryId: string) => {
    let taskWasCompleted = false;
    
    setCategories(prev => 
      prev.map(category => {
        if (category.id !== categoryId) return category;
        
        return {
          ...category,
          tasks: category.tasks.map(task => {
            if (task.id !== taskId) return task;
            
            taskWasCompleted = task.completed;
            return { ...task, completed: !task.completed };
          })
        };
      })
    );
    
    setStats(prev => ({
      ...prev,
      completedTasks: prev.completedTasks + (taskWasCompleted ? -1 : 1),
      ongoingTasks: prev.ongoingTasks + (taskWasCompleted ? 1 : -1),
      warriorLevel: Math.floor((prev.completedTasks + (taskWasCompleted ? -1 : 1)) / 5) + 1
    }));
  };
  
  // 删除任务
  const deleteTask = (taskId: string, categoryId: string) => {
    let removedTask: ValhallaTask | null = null;
    
    setCategories(prev => prev.map(category => {
      if (category.id !== categoryId) return category;
      
      const taskToRemove = category.tasks.find(task => task.id === taskId);
      if (taskToRemove) {
        removedTask = taskToRemove;
      }
      
      return {
        ...category,
        tasks: category.tasks.filter(task => task.id !== taskId)
      };
    }));
    
    if (removedTask) {
      setStats(prev => ({
        ...prev,
        completedTasks: prev.completedTasks - (removedTask?.completed ? 1 : 0),
        ongoingTasks: prev.ongoingTasks - (removedTask?.completed ? 0 : 1)
      }));
    }
  };
  
  // 更新任务
  const updateTask = (taskId: string, categoryId: string, updates: Partial<ValhallaTask>) => {
    setCategories(prev => prev.map(category => {
      if (category.id !== categoryId) return category;
      
      return {
        ...category,
        tasks: category.tasks.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        )
      };
    }));
    
    // 添加控制台日志，以便验证更新是否成功
    console.log(`Task updated: ${taskId} in category ${categoryId}`, updates);
  };
  
  const value = {
    categories,
    stats,
    achievements,
    addTask,
    toggleTaskCompletion,
    deleteTask,
    updateTask
  };
  
  return (
    <ValhallaTaskContext.Provider value={value}>
      {children}
    </ValhallaTaskContext.Provider>
  );
};

// 自定义钩子，方便使用上下文
export const useValhallaTaskContext = () => {
  const context = useContext(ValhallaTaskContext);
  if (context === undefined) {
    throw new Error('useValhallaTaskContext must be used within a ValhallaTaskProvider');
  }
  return context;
}; 