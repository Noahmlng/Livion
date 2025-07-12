import { RepositoryFactory } from '../repositories/RepositoryFactory';
import { 
  IUserService, 
  ITaskService, 
  IScheduleService, 
  INoteService, 
  IGoalService, 
  ITemplateService 
} from './interfaces';
import { UserService } from './UserService';
import { TaskService } from './TaskService';
import { ScheduleService } from './ScheduleService';
import { NoteService } from './NoteService';
import { GoalService } from './GoalService';
import { TemplateService } from './TemplateService';

/**
 * 服务工厂类
 * 负责创建和管理所有Service实例
 */
export class ServiceFactory {
  private repositoryFactory: RepositoryFactory;
  
  // Service实例缓存
  private userService?: IUserService;
  private taskService?: ITaskService;
  private scheduleService?: IScheduleService;
  private noteService?: INoteService;
  private goalService?: IGoalService;
  private templateService?: ITemplateService;

  constructor(repositoryFactory: RepositoryFactory) {
    this.repositoryFactory = repositoryFactory;
  }

  /**
   * 获取用户服务
   */
  getUserService(): IUserService {
    if (!this.userService) {
      this.userService = new UserService(
        this.repositoryFactory.getUserRepository()
      );
    }
    return this.userService;
  }

  /**
   * 获取任务服务
   */
  getTaskService(): ITaskService {
    if (!this.taskService) {
      this.taskService = new TaskService(
        this.repositoryFactory.getTaskRepository(),
        this.repositoryFactory.getUserRepository()
      );
    }
    return this.taskService;
  }

  /**
   * 获取日程服务
   */
  getScheduleService(): IScheduleService {
    if (!this.scheduleService) {
      this.scheduleService = new ScheduleService(
        this.repositoryFactory.getScheduleRepository()
      );
    }
    return this.scheduleService;
  }

  /**
   * 获取笔记服务
   */
  getNoteService(): INoteService {
    if (!this.noteService) {
      this.noteService = new NoteService(
        this.repositoryFactory.getNoteRepository()
      );
    }
    return this.noteService;
  }

  /**
   * 获取目标服务
   */
  getGoalService(): IGoalService {
    if (!this.goalService) {
      this.goalService = new GoalService(
        this.repositoryFactory.getGoalRepository()
      );
    }
    return this.goalService;
  }

  /**
   * 获取模板服务
   */
  getTemplateService(): ITemplateService {
    if (!this.templateService) {
      this.templateService = new TemplateService(
        this.repositoryFactory.getTemplateRepository(),
        this.repositoryFactory.getTaskRepository()
      );
    }
    return this.templateService;
  }
} 