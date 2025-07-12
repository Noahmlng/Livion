import { SupabaseClient } from '@supabase/supabase-js';
import { 
  IUserRepository, 
  ITaskRepository, 
  IChallengeRepository, 
  INoteRepository, 
  IUserGoalRepository, 
  IBehaviourRepository 
} from './interfaces';
import { UserRepository } from './UserRepository';
import { TaskRepository } from './ScheduleRepository';
import { ChallengeRepository } from './TaskRepository';
import { NoteRepository } from './NoteRepository';
import { UserGoalRepository } from './GoalRepository';
import { BehaviourRepository } from './TemplateRepository';

/**
 * Repository工厂类
 * 负责创建和管理所有Repository实例
 */
export class RepositoryFactory {
  private supabase: SupabaseClient;
  
  // Repository实例缓存
  private userRepository?: IUserRepository;
  private taskRepository?: ITaskRepository;
  private challengeRepository?: IChallengeRepository;
  private noteRepository?: INoteRepository;
  private userGoalRepository?: IUserGoalRepository;
  private behaviourRepository?: IBehaviourRepository;

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
   * 获取挑战Repository
   */
  getChallengeRepository(): IChallengeRepository {
    if (!this.challengeRepository) {
      this.challengeRepository = new ChallengeRepository(this.supabase);
    }
    return this.challengeRepository;
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
   * 获取用户目标Repository
   */
  getUserGoalRepository(): IUserGoalRepository {
    if (!this.userGoalRepository) {
      this.userGoalRepository = new UserGoalRepository(this.supabase);
    }
    return this.userGoalRepository;
  }

  /**
   * 获取行为Repository
   */
  getBehaviourRepository(): IBehaviourRepository {
    if (!this.behaviourRepository) {
      this.behaviourRepository = new BehaviourRepository(this.supabase);
    }
    return this.behaviourRepository;
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
   * 便捷方法：获取挑战Repository
   */
  getChallengeRepository(): IChallengeRepository {
    return this.getRepositoryFactory().getChallengeRepository();
  }

  /**
   * 便捷方法：获取笔记Repository
   */
  getNoteRepository(): INoteRepository {
    return this.getRepositoryFactory().getNoteRepository();
  }

  /**
   * 便捷方法：获取用户目标Repository
   */
  getUserGoalRepository(): IUserGoalRepository {
    return this.getRepositoryFactory().getUserGoalRepository();
  }

  /**
   * 便捷方法：获取行为Repository
   */
  getBehaviourRepository(): IBehaviourRepository {
    return this.getRepositoryFactory().getBehaviourRepository();
  }
} 