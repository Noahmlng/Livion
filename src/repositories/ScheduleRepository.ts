import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import { ITaskRepository, Task } from './interfaces';

/**
 * Task Repository实现 (formerly Schedule)
 */
export class TaskRepository extends BaseRepository<Task> implements ITaskRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'task', 'entry_id', 'user_id');
  }

  /**
   * 根据日期获取日程安排
   */
  async getByDate(date: Date | string, userId: string): Promise<Task[]> {
    const dateStr = this.formatDateForDB(date);
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq(this.userIdField, userId)
      .eq('date', dateStr);

    if (error) throw error;
    return data || [];
  }

  /**
   * 根据日期范围获取日程安排
   */
  async getByDateRange(startDate: Date | string, endDate: Date | string, userId: string): Promise<Task[]> {
    const startDateStr = this.formatDateForDB(startDate);
    const endDateStr = this.formatDateForDB(endDate);
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq(this.userIdField, userId)
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    if (error) throw error;
    return data || [];
  }

  /**
   * 创建日程安排（重写以处理日期格式）
   */
  async create(data: any, userId: string): Promise<Task> {
    const formattedData = {
      ...data,
      date: this.formatDateForDB(data.date)
    };

    return super.create(formattedData, userId);
  }

  /**
   * 更新日程安排（重写以处理日期格式）
   */
  async update(id: number, data: Partial<Task>, userId: string): Promise<void> {
    const formattedData = { ...data };
    if (data.date) {
      formattedData.date = this.formatDateForDB(data.date);
    }

    await super.update(id, formattedData, userId);
  }
} 