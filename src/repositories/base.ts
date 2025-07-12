import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 基础Repository抽象类
 * 提供通用的CRUD操作实现
 */
export abstract class BaseRepository<T> {
  protected supabase: SupabaseClient;
  protected tableName: string;
  protected idField: string;
  protected userIdField: string;

  constructor(
    supabase: SupabaseClient,
    tableName: string,
    idField: string = 'id',
    userIdField: string = 'user_id'
  ) {
    this.supabase = supabase;
    this.tableName = tableName;
    this.idField = idField;
    this.userIdField = userIdField;
  }

  /**
   * 获取用户的所有记录
   */
  async getAll(userId: string): Promise<T[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq(this.userIdField, userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * 根据ID获取单个记录
   */
  async getById(id: number, userId: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq(this.idField, id)
      .eq(this.userIdField, userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 记录不存在
      }
      throw error;
    }
    return data;
  }

  /**
   * 创建新记录
   */
  async create(data: any, userId: string): Promise<T> {
    const { data: result, error } = await this.supabase
      .from(this.tableName)
      .insert({ ...data, [this.userIdField]: userId })
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * 更新记录
   */
  async update(id: number, data: Partial<T>, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update(data)
      .eq(this.idField, id)
      .eq(this.userIdField, userId);

    if (error) throw error;
  }

  /**
   * 删除记录
   */
  async delete(id: number, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq(this.idField, id)
      .eq(this.userIdField, userId);

    if (error) throw error;
  }

  /**
   * 格式化日期为数据库格式
   */
  protected formatDateForDB(date: Date | string): string {
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return date;
  }
} 