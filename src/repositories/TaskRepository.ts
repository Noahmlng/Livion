import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import { ITaskRepository, Task } from './interfaces';

/**
 * Task Repository实现
 */
export class TaskRepository extends BaseRepository<Task> implements ITaskRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'tasks', 'task_id', 'user_id');
  }

  /**
   * 根据目标ID获取任务列表
   */
  async getByGoal(goalId: string, userId: string): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('goal_id', goalId)
      .eq(this.userIdField, userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * 根据状态获取任务列表
   */
  async getByStatus(status: string, userId: string): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('status', status)
      .eq(this.userIdField, userId)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * 切换任务完成状态
   */
  async toggleComplete(id: number, userId: string): Promise<void> {
    // 首先获取当前状态
    const task = await this.getById(id, userId);
    if (!task) {
      throw new Error('Task not found');
    }

    // 切换状态
    const newStatus = task.status === 'ongoing' ? 'completed' : 'ongoing';
    await this.update(id, { status: newStatus }, userId);
  }

  /**
   * 获取所有任务（重写以添加排序）
   */
  async getAll(userId: string): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq(this.userIdField, userId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
} 