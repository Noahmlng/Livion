import { ITaskService } from './interfaces';
import { ITaskRepository, IUserRepository, Task } from '../repositories/interfaces';

/**
 * 任务服务实现
 */
export class TaskService implements ITaskService {
  private taskRepository: ITaskRepository;
  private userRepository: IUserRepository;

  constructor(taskRepository: ITaskRepository, userRepository: IUserRepository) {
    this.taskRepository = taskRepository;
    this.userRepository = userRepository;
  }

  /**
   * 获取所有任务
   */
  async getAllTasks(userId: string): Promise<Task[]> {
    return await this.taskRepository.getAll(userId);
  }

  /**
   * 根据目标获取任务
   */
  async getTasksByGoal(goalId: string, userId: string): Promise<Task[]> {
    return await this.taskRepository.getByGoal(goalId, userId);
  }

  /**
   * 根据状态获取任务
   */
  async getTasksByStatus(status: string, userId: string): Promise<Task[]> {
    return await this.taskRepository.getByStatus(status, userId);
  }

  /**
   * 创建新任务
   */
  async createTask(taskData: Omit<Task, 'task_id' | 'created_at' | 'user_id'>, userId: string): Promise<Task> {
    // 可以在这里添加业务逻辑，如任务验证、默认值设置等
    const taskToCreate = {
      ...taskData,
      priority: taskData.priority || 0,
      status: taskData.status || 'ongoing' as const,
      reward_points: taskData.reward_points || 0
    };

    return await this.taskRepository.create(taskToCreate, userId);
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: number, updates: Partial<Task>, userId: string): Promise<void> {
    // 可以在这里添加业务逻辑，如权限验证、数据验证等
    await this.taskRepository.update(taskId, updates, userId);
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: number, userId: string): Promise<void> {
    await this.taskRepository.delete(taskId, userId);
  }

  /**
   * 完成任务
   */
  async completeTask(taskId: number, userId: string): Promise<void> {
    // 获取任务信息
    const task = await this.taskRepository.getById(taskId, userId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    // 更新任务状态
    await this.taskRepository.update(taskId, { status: 'completed' }, userId);

    // 增加用户积分
    if (task.reward_points > 0) {
      const user = await this.userRepository.getById(userId);
      if (user) {
        const newPoints = user.total_points + task.reward_points;
        await this.userRepository.update(userId, { total_points: newPoints });
      }
    }
  }

  /**
   * 切换任务完成状态
   */
  async toggleTaskCompletion(taskId: number, userId: string): Promise<void> {
    const task = await this.taskRepository.getById(taskId, userId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status === 'completed') {
      // 取消完成 - 减少积分
      await this.taskRepository.update(taskId, { status: 'ongoing' }, userId);
      
      if (task.reward_points > 0) {
        const user = await this.userRepository.getById(userId);
        if (user) {
          const newPoints = Math.max(0, user.total_points - task.reward_points);
          await this.userRepository.update(userId, { total_points: newPoints });
        }
      }
    } else {
      // 完成任务 - 增加积分
      await this.completeTask(taskId, userId);
    }
  }
} 