import { IGoalService } from './interfaces';
import { IGoalRepository, Goal } from '../repositories/interfaces';

/**
 * 目标服务实现
 */
export class GoalService implements IGoalService {
  private goalRepository: IGoalRepository;

  constructor(goalRepository: IGoalRepository) {
    this.goalRepository = goalRepository;
  }

  /**
   * 获取所有目标
   */
  async getAllGoals(userId: string): Promise<Goal[]> {
    return await this.goalRepository.getAll(userId);
  }

  /**
   * 创建新目标
   */
  async createGoal(goalData: Omit<Goal, 'goal_id' | 'created_at' | 'user_id'>, userId: string): Promise<Goal> {
    if (!goalData.name.trim()) {
      throw new Error('Goal name is required');
    }

    return await this.goalRepository.create(goalData, userId);
  }

  /**
   * 更新目标
   */
  async updateGoal(goalId: number, updates: Partial<Goal>, userId: string): Promise<void> {
    await this.goalRepository.update(goalId, updates, userId);
  }

  /**
   * 删除目标
   */
  async deleteGoal(goalId: number, userId: string): Promise<void> {
    await this.goalRepository.delete(goalId, userId);
  }
} 