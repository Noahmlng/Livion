import { IScheduleService } from './interfaces';
import { ITaskRepository, Task } from '../repositories/interfaces';

/**
 * 日程服务实现
 */
export class ScheduleService implements IScheduleService {
  private scheduleRepository: ITaskRepository;

  constructor(scheduleRepository: ITaskRepository) {
    this.scheduleRepository = scheduleRepository;
  }

  /**
   * 获取今日日程
   */
  async getTodaySchedule(userId: string): Promise<Task[]> {
    const today = new Date();
    const entries = await this.scheduleRepository.getByDate(today, userId);
    return entries.map(entry => ({
      ...entry,
      date: entry.date instanceof Date ? entry.date.toISOString().split('T')[0] : entry.date
    }));
  }

  /**
   * 根据日期获取日程
   */
  async getScheduleByDate(date: Date | string, userId: string): Promise<Task[]> {
    const entries = await this.scheduleRepository.getByDate(date, userId);
    return entries.map(entry => ({
      ...entry,
      date: entry.date instanceof Date ? entry.date.toISOString().split('T')[0] : entry.date
    }));
  }

  /**
   * 根据日期范围获取日程
   */
  async getScheduleByDateRange(startDate: Date | string, endDate: Date | string, userId: string): Promise<Record<string, Task[]>> {
    const entries = await this.scheduleRepository.getByDateRange(startDate, endDate, userId);
    
    // 按日期分组
    const groupedResult: Record<string, Task[]> = {};
    entries.forEach(entry => {
      const dateKey = entry.date instanceof Date 
        ? entry.date.toISOString().split('T')[0]
        : entry.date.toString().split('T')[0];
      if (!groupedResult[dateKey]) {
        groupedResult[dateKey] = [];
      }
      groupedResult[dateKey].push(entry);
    });
    
    return groupedResult;
  }

  /**
   * 创建日程条目
   */
  async createScheduleEntry(entryData: Omit<Task, 'entry_id' | 'created_at' | 'user_id'>, userId: string): Promise<Task> {
    // 添加业务逻辑验证
    if (!entryData.slot) {
      throw new Error('Time slot is required');
    }

    if (!entryData.date) {
      throw new Error('Date is required');
    }

    // 设置默认值
    const scheduleData = {
      ...entryData,
      status: entryData.status || 'ongoing' as const,
      reward_points: entryData.reward_points || 0
    };

    return await this.scheduleRepository.create(scheduleData, userId);
  }

  /**
   * 更新日程条目
   */
  async updateScheduleEntry(entryId: number, updates: Partial<Task>, userId: string): Promise<void> {
    await this.scheduleRepository.update(entryId, updates, userId);
  }

  /**
   * 删除日程条目
   */
  async deleteScheduleEntry(entryId: number, userId: string): Promise<void> {
    await this.scheduleRepository.delete(entryId, userId);
  }

  /**
   * 完成日程条目
   */
  async completeScheduleEntry(entryId: number, userId: string): Promise<void> {
    // 获取条目信息
    const entry = await this.scheduleRepository.getById(entryId, userId);
    
    if (!entry) {
      throw new Error('Schedule entry not found');
    }

    // 切换完成状态
    const newStatus = entry.status === 'completed' ? 'ongoing' : 'completed';
    await this.scheduleRepository.update(entryId, { status: newStatus }, userId);
  }
} 