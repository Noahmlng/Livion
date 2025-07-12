import { User, Note, Goal, Challenge, Task, Behaviour, UserGoal } from '../repositories/interfaces';

/**
 * 用户服务接口
 */
export interface IUserService {
  login(password: string): Promise<User>;
  getCurrentUser(userId: string): Promise<User | null>;
  createUser(userData: Omit<User, 'user_id' | 'created_at'>): Promise<User>;
  updateUserPoints(userId: string, points: number): Promise<void>;
}

/**
 * 任务服务接口
 */
export interface ITaskService {
  getAllTasks(userId: string): Promise<Challenge[]>;
  getTasksByGoal(goalId: string, userId: string): Promise<Challenge[]>;
  getTasksByStatus(status: string, userId: string): Promise<Challenge[]>;
  createTask(taskData: Omit<Challenge, 'task_id' | 'created_at' | 'user_id'>, userId: string): Promise<Challenge>;
  updateTask(taskId: number, updates: Partial<Challenge>, userId: string): Promise<void>;
  deleteTask(taskId: number, userId: string): Promise<void>;
  completeTask(taskId: number, userId: string): Promise<void>;
  toggleTaskCompletion(taskId: number, userId: string): Promise<void>;
}

/**
 * 日程服务接口
 */
export interface IScheduleService {
  getTodaySchedule(userId: string): Promise<Task[]>;
  getScheduleByDate(date: Date | string, userId: string): Promise<Task[]>;
  getScheduleByDateRange(startDate: Date | string, endDate: Date | string, userId: string): Promise<Record<string, Task[]>>;
  createScheduleEntry(entryData: Omit<Task, 'entry_id' | 'created_at' | 'user_id'>, userId: string): Promise<Task>;
  updateScheduleEntry(entryId: number, updates: Partial<Task>, userId: string): Promise<void>;
  deleteScheduleEntry(entryId: number, userId: string): Promise<void>;
  completeScheduleEntry(entryId: number, userId: string): Promise<void>;
}

/**
 * 笔记服务接口
 */
export interface INoteService {
  getAllNotes(userId: string): Promise<Note[]>;
  searchNotes(query: string, userId: string): Promise<Note[]>;
  createNote(content: string, userId: string): Promise<Note>;
  updateNote(noteId: number, content: string, userId: string): Promise<void>;
  deleteNote(noteId: number, userId: string): Promise<void>;
  toggleNotePin(noteId: number, userId: string): Promise<void>;
}

/**
 * 用户目标服务接口
 */
export interface IUserGoalService {
  getAllGoals(userId: string): Promise<UserGoal[]>;
  getActiveGoals(userId: string): Promise<UserGoal[]>;
  getByPriority(userId: string): Promise<UserGoal[]>;
  createGoal(goalData: Omit<UserGoal, 'goal_id' | 'created_at' | 'updated_at' | 'user_id'>, userId: string): Promise<UserGoal>;
  updateGoal(goalId: number, updates: Partial<UserGoal>, userId: string): Promise<void>;
  deleteGoal(goalId: number, userId: string): Promise<void>;
  toggleActive(goalId: number, isActive: boolean, userId: string): Promise<void>;
}

/**
 * 模板服务接口
 */
export interface ITemplateService {
  getAllTemplates(userId: string): Promise<Behaviour[]>;
  createTemplate(templateData: Omit<Behaviour, 'template_id' | 'created_at' | 'user_id'>, userId: string): Promise<Behaviour>;
  updateTemplate(templateId: number, updates: Partial<Behaviour>, userId: string): Promise<void>;
  deleteTemplate(templateId: number, userId: string): Promise<void>;
  createTaskFromTemplate(templateId: number, userId: string): Promise<Challenge>;
} 