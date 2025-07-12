import { SupabaseClient } from '@supabase/supabase-js';
import { IUserRepository, User } from './interfaces';

/**
 * User Repository实现
 */
export class UserRepository implements IUserRepository {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * 通过密码获取用户
   */
  async getByPassword(password: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('password', password)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 用户不存在
      }
      throw error;
    }
    return data;
  }

  /**
   * 根据ID获取用户
   */
  async getById(userId: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 用户不存在
      }
      throw error;
    }
    return data;
  }

  /**
   * 创建新用户
   */
  async create(user: Omit<User, 'user_id' | 'created_at'>): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert(user)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 更新用户信息
   */
  async update(userId: string, updates: Partial<User>): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('user_id', userId);

    if (error) throw error;
  }
} 