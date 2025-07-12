import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import { IUserGoalRepository, UserGoal } from './interfaces';

/**
 * UserGoal Repository实现 (formerly Goal Repository)
 */
export class UserGoalRepository extends BaseRepository<UserGoal> implements IUserGoalRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'user_goals', 'goal_id', 'user_id');
  }

  /**
   * 获取用户的活跃目标
   */
  async getActiveGoals(userId: string): Promise<UserGoal[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq(this.userIdField, userId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * 根据优先级获取目标
   */
  async getByPriority(userId: string): Promise<UserGoal[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq(this.userIdField, userId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * 切换目标的活跃状态
   */
  async toggleActive(id: number, isActive: boolean, userId: string): Promise<void> {
    await this.update(id, { is_active: isActive }, userId);
  }
} 