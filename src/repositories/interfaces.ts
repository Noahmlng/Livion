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

// Challenge Repository Interface (formerly Task)
export interface IChallengeRepository extends Repository<Challenge> {
  getByGoal(goalId: string, userId: string): Promise<Challenge[]>;
  getByStatus(status: string, userId: string): Promise<Challenge[]>;
  toggleComplete(id: number, userId: string): Promise<void>;
}

// Task Repository Interface (formerly Schedule)
export interface ITaskRepository extends Repository<Task> {
  getByDate(date: Date | string, userId: string): Promise<Task[]>;
  getByDateRange(startDate: Date | string, endDate: Date | string, userId: string): Promise<Task[]>;
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

// Behaviour Repository Interface (formerly Template)
export interface IBehaviourRepository extends Repository<Behaviour> {
  // 可以在这里添加行为模板特定的方法
}

// Points History Repository Interface
export interface IPointsHistoryRepository extends Repository<PointsHistory> {
  getByTaskId(taskId: number, userId: string): Promise<PointsHistory[]>;
  getByScheduleEntryId(scheduleEntryId: number, userId: string): Promise<PointsHistory[]>;
  getByDateRange(startDate: Date | string, endDate: Date | string, userId: string): Promise<PointsHistory[]>;
  getTotalPointsEarned(userId: string): Promise<number>;
}

// User Goal Repository Interface
export interface IUserGoalRepository extends Repository<UserGoal> {
  getActiveGoals(userId: string): Promise<UserGoal[]>;
  getByPriority(userId: string): Promise<UserGoal[]>;
  toggleActive(id: number, isActive: boolean, userId: string): Promise<void>;
}

// User Skill Repository Interface
export interface IUserSkillRepository extends Repository<UserSkill> {
  getActiveSkills(userId: string): Promise<UserSkill[]>;
  getByPriority(userId: string): Promise<UserSkill[]>;
  toggleActive(id: number, isActive: boolean, userId: string): Promise<void>;
}

// 数据模型接口
export interface User {
  user_id: number;
  password: string;
  total_points: number;
  daily_pay: number;
  user_goals: string[] | null;
  user_competencies_to_develop: string[] | null;
  points_settings: Record<string, any> | null;
  created_at: string;
}

// Renamed interfaces to match new table semantics
export interface Challenge {
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
  // Points system fields
  task_record?: string;
  estimated_time?: number;
  reward_multiplier?: number;
  learning_reward?: number;
  points_calculated_at?: string;
  ai_evaluation?: Record<string, any>;
}

export interface Task {
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
  // Points system fields
  task_record?: string;
  estimated_time?: number;
  reward_multiplier?: number;
  learning_reward?: number;
  points_calculated_at?: string;
  ai_evaluation?: Record<string, any>;
}

export interface Note {
  note_id: number;
  user_id: number;
  goal_id?: number;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  pinned?: boolean;
}

export interface Goal {
  goal_id: number;
  user_id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface Behaviour {
  template_id: number;
  user_id: number;
  name: string;
  description?: string;
  reward_points: number;
  created_at: string;
}

// Points system related interfaces
export interface PointsHistory {
  history_id: number;
  user_id: number;
  task_id?: number;
  schedule_entry_id?: number;
  task_title: string;
  task_record?: string;
  points_earned: number;
  base_amount: number;
  reward_amount: number;
  reward_multiplier: number;
  learning_reward: number;
  estimated_time: number;
  daily_pay: number;
  reasoning?: string;
  provider?: string;
  api_cost?: number;
  created_at: string;
}

export interface UserGoal {
  goal_id: number;
  user_id: number;
  goal_text: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSkill {
  skill_id: number;
  user_id: number;
  skill_text: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
} 