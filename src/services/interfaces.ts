import { User, Task, ScheduleEntry, Note, Goal, TaskTemplate } from '../repositories/interfaces';

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
  getAllTasks(userId: string): Promise<Task[]>;
  getTasksByGoal(goalId: string, userId: string): Promise<Task[]>;
  getTasksByStatus(status: string, userId: string): Promise<Task[]>;
  createTask(taskData: Omit<Task, 'task_id' | 'created_at' | 'user_id'>, userId: string): Promise<Task>;
  updateTask(taskId: number, updates: Partial<Task>, userId: string): Promise<void>;
  deleteTask(taskId: number, userId: string): Promise<void>;
  completeTask(taskId: number, userId: string): Promise<void>;
  toggleTaskCompletion(taskId: number, userId: string): Promise<void>;
}

/**
 * 日程服务接口
 */
export interface IScheduleService {
  getTodaySchedule(userId: string): Promise<ScheduleEntry[]>;
  getScheduleByDate(date: Date | string, userId: string): Promise<ScheduleEntry[]>;
  getScheduleByDateRange(startDate: Date | string, endDate: Date | string, userId: string): Promise<Record<string, ScheduleEntry[]>>;
  createScheduleEntry(entryData: Omit<ScheduleEntry, 'entry_id' | 'created_at' | 'user_id'>, userId: string): Promise<ScheduleEntry>;
  updateScheduleEntry(entryId: number, updates: Partial<ScheduleEntry>, userId: string): Promise<void>;
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
 * 目标服务接口
 */
export interface IGoalService {
  getAllGoals(userId: string): Promise<Goal[]>;
  createGoal(goalData: Omit<Goal, 'goal_id' | 'created_at' | 'user_id'>, userId: string): Promise<Goal>;
  updateGoal(goalId: number, updates: Partial<Goal>, userId: string): Promise<void>;
  deleteGoal(goalId: number, userId: string): Promise<void>;
}

/**
 * 模板服务接口
 */
export interface ITemplateService {
  getAllTemplates(userId: string): Promise<TaskTemplate[]>;
  createTemplate(templateData: Omit<TaskTemplate, 'template_id' | 'created_at' | 'user_id'>, userId: string): Promise<TaskTemplate>;
  updateTemplate(templateId: number, updates: Partial<TaskTemplate>, userId: string): Promise<void>;
  deleteTemplate(templateId: number, userId: string): Promise<void>;
  createTaskFromTemplate(templateId: number, userId: string): Promise<Task>;
} 