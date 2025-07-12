import { SupabaseClient } from '@supabase/supabase-js';
import { 
  IUserRepository, 
  ITaskRepository, 
  IScheduleRepository, 
  INoteRepository, 
  IGoalRepository, 
  ITemplateRepository 
} from './interfaces';
import { UserRepository } from './UserRepository';
import { TaskRepository } from './TaskRepository';
import { ScheduleRepository } from './ScheduleRepository';
import { NoteRepository } from './NoteRepository';
import { GoalRepository } from './GoalRepository';
import { TemplateRepository } from './TemplateRepository';

/**
 * Repository工厂类
 * 负责创建和管理所有Repository实例
 */
export class RepositoryFactory {
  private supabase: SupabaseClient;
  
  // Repository实例缓存
  private userRepository?: IUserRepository;
  private taskRepository?: ITaskRepository;
  private scheduleRepository?: IScheduleRepository;
  private noteRepository?: INoteRepository;
  private goalRepository?: IGoalRepository;
  private templateRepository?: ITemplateRepository;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * 获取用户Repository
   */
  getUserRepository(): IUserRepository {
    if (!this.userRepository) {
      this.userRepository = new UserRepository(this.supabase);
    }
    return this.userRepository;
  }

  /**
   * 获取任务Repository
   */
  getTaskRepository(): ITaskRepository {
    if (!this.taskRepository) {
      this.taskRepository = new TaskRepository(this.supabase);
    }
    return this.taskRepository;
  }

  /**
   * 获取日程Repository
   */
  getScheduleRepository(): IScheduleRepository {
    if (!this.scheduleRepository) {
      this.scheduleRepository = new ScheduleRepository(this.supabase);
    }
    return this.scheduleRepository;
  }

  /**
   * 获取笔记Repository
   */
  getNoteRepository(): INoteRepository {
    if (!this.noteRepository) {
      this.noteRepository = new NoteRepository(this.supabase);
    }
    return this.noteRepository;
  }

  /**
   * 获取目标Repository
   */
  getGoalRepository(): IGoalRepository {
    if (!this.goalRepository) {
      this.goalRepository = new GoalRepository(this.supabase);
    }
    return this.goalRepository;
  }

  /**
   * 获取模板Repository
   */
  getTemplateRepository(): ITemplateRepository {
    if (!this.templateRepository) {
      this.templateRepository = new TemplateRepository(this.supabase);
    }
    return this.templateRepository;
  }
}

/**
 * 依赖注入容器
 */
export class DIContainer {
  private static instance: DIContainer;
  private repositoryFactory?: RepositoryFactory;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * 注册Repository工厂
   */
  registerRepositoryFactory(factory: RepositoryFactory): void {
    this.repositoryFactory = factory;
  }

  /**
   * 获取Repository工厂
   */
  getRepositoryFactory(): RepositoryFactory {
    if (!this.repositoryFactory) {
      throw new Error('RepositoryFactory not registered');
    }
    return this.repositoryFactory;
  }

  /**
   * 便捷方法：获取用户Repository
   */
  getUserRepository(): IUserRepository {
    return this.getRepositoryFactory().getUserRepository();
  }

  /**
   * 便捷方法：获取任务Repository
   */
  getTaskRepository(): ITaskRepository {
    return this.getRepositoryFactory().getTaskRepository();
  }

  /**
   * 便捷方法：获取日程Repository
   */
  getScheduleRepository(): IScheduleRepository {
    return this.getRepositoryFactory().getScheduleRepository();
  }

  /**
   * 便捷方法：获取笔记Repository
   */
  getNoteRepository(): INoteRepository {
    return this.getRepositoryFactory().getNoteRepository();
  }

  /**
   * 便捷方法：获取目标Repository
   */
  getGoalRepository(): IGoalRepository {
    return this.getRepositoryFactory().getGoalRepository();
  }

  /**
   * 便捷方法：获取模板Repository
   */
  getTemplateRepository(): ITemplateRepository {
    return this.getRepositoryFactory().getTemplateRepository();
  }
} 