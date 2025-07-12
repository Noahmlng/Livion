import { IUserGoalService } from './interfaces';
import { IUserGoalRepository, UserGoal } from '../repositories/interfaces';

/**
 * 用户目标服务实现
 */
export class UserGoalService implements IUserGoalService {
  private userGoalRepository: IUserGoalRepository;

  constructor(userGoalRepository: IUserGoalRepository) {
    this.userGoalRepository = userGoalRepository;
  }

  /**
   * 获取所有目标
   */
  async getAllGoals(userId: string): Promise<UserGoal[]> {
    return await this.userGoalRepository.getAll(userId);
  }

  /**
   * 获取活跃目标
   */
  async getActiveGoals(userId: string): Promise<UserGoal[]> {
    return await this.userGoalRepository.getActiveGoals(userId);
  }

  /**
   * 根据优先级获取目标
   */
  async getByPriority(userId: string): Promise<UserGoal[]> {
    return await this.userGoalRepository.getByPriority(userId);
  }

  /**
   * 创建新目标
   */
  async createGoal(goalData: Omit<UserGoal, 'goal_id' | 'created_at' | 'updated_at' | 'user_id'>, userId: string): Promise<UserGoal> {
    if (!goalData.goal_text.trim()) {
      throw new Error('Goal text is required');
    }

    return await this.userGoalRepository.create(goalData, userId);
  }

  /**
   * 更新目标
   */
  async updateGoal(goalId: number, updates: Partial<UserGoal>, userId: string): Promise<void> {
    await this.userGoalRepository.update(goalId, updates, userId);
  }

  /**
   * 删除目标
   */
  async deleteGoal(goalId: number, userId: string): Promise<void> {
    await this.userGoalRepository.delete(goalId, userId);
  }

  /**
   * 切换目标活跃状态
   */
  async toggleActive(goalId: number, isActive: boolean, userId: string): Promise<void> {
    await this.userGoalRepository.toggleActive(goalId, isActive, userId);
  }
} 