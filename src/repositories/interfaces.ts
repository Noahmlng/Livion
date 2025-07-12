// Repository接口定义
export interface Repository<T, K = number> {
  getAll(userId: string): Promise<T[]>;
  getById(id: K, userId: string): Promise<T | null>;
  create(data: any, userId: string): Promise<T>;
  update(id: K, data: Partial<T>, userId: string): Promise<void>;
  delete(id: K, userId: string): Promise<void>;
}

// User Repository Interface
export interface IUserRepository {
  getByPassword(password: string): Promise<User | null>;
  getById(userId: string): Promise<User | null>;
  create(user: Omit<User, 'user_id' | 'created_at'>): Promise<User>;
  update(userId: string, updates: Partial<User>): Promise<void>;
}

// Task Repository Interface
export interface ITaskRepository extends Repository<Task> {
  getByGoal(goalId: string, userId: string): Promise<Task[]>;
  getByStatus(status: string, userId: string): Promise<Task[]>;
  toggleComplete(id: number, userId: string): Promise<void>;
}

// Schedule Repository Interface
export interface IScheduleRepository extends Repository<ScheduleEntry> {
  getByDate(date: Date | string, userId: string): Promise<ScheduleEntry[]>;
  getByDateRange(startDate: Date | string, endDate: Date | string, userId: string): Promise<ScheduleEntry[]>;
}

// Note Repository Interface
export interface INoteRepository extends Repository<Note> {
  search(query: string, userId: string): Promise<Note[]>;
  togglePin(id: number, pinned: boolean, userId: string): Promise<void>;
}

// Goal Repository Interface
export interface IGoalRepository extends Repository<Goal> {
  // 可以在这里添加目标特定的方法
}

// Template Repository Interface
export interface ITemplateRepository extends Repository<TaskTemplate> {
  // 可以在这里添加模板特定的方法
}

// 数据模型接口
export interface User {
  user_id: number;
  password: string;
  total_points: number;
  created_at: string;
}

export interface Task {
  task_id: number;
  user_id: number;
  goal_id?: number;
  name: string;
  description: string;
  created_at: string;
  priority: number;
  status: 'ongoing' | 'completed' | 'deleted';
  reward_points: number;
  image_path?: string;
}

export interface ScheduleEntry {
  entry_id: number;
  user_id: number;
  date: Date | string;
  slot: string;
  status: 'ongoing' | 'completed' | 'deleted';
  task_type: string;
  ref_task_id?: number;
  ref_template_id?: number;
  custom_name?: string;
  description?: string;
  reward_points: number;
  created_at: string;
}

export interface Note {
  note_id: number;
  user_id: number;
  goal_id?: number;
  content: string;
  created_at: string;
  updated_at: string;
  pinned?: boolean;
}

export interface Goal {
  goal_id: number;
  user_id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface TaskTemplate {
  template_id: number;
  user_id: number;
  name: string;
  description?: string;
  default_points: number;
  created_at: string;
} 