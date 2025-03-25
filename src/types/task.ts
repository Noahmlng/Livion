export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = 'main' | 'side' | 'daily';
export type TaskStatus = 'todo' | 'completed';

export interface BaseTask {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  createdAt: Date;
}

export interface Task extends BaseTask {
  dueDate?: Date;
  completedAt?: Date;
  upvotes?: number;
  tags: string[];
}

export interface TaskTemplate extends BaseTask {
  frequency: 'daily' | 'weekly' | 'monthly';
  lastGenerated?: Date;
} 