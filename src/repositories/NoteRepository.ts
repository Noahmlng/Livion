import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import { INoteRepository, Note } from './interfaces';

/**
 * Note Repository实现
 */
export class NoteRepository extends BaseRepository<Note> implements INoteRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'notes', 'note_id', 'user_id');
  }

  /**
   * 搜索笔记
   */
  async search(query: string, userId: string): Promise<Note[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq(this.userIdField, userId)
      .ilike('content', `%${query}%`)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * 切换笔记置顶状态
   */
  async togglePin(id: number, pinned: boolean, userId: string): Promise<void> {
    await this.update(id, { pinned }, userId);
  }

  /**
   * 获取所有笔记（重写以添加排序）
   */
  async getAll(userId: string): Promise<Note[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq(this.userIdField, userId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * 更新笔记内容
   */
  async updateContent(id: number, content: string, userId: string): Promise<void> {
    // 不手动设置 updated_at，让数据库触发器自动处理
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ content })
      .eq(this.idField, id)
      .eq(this.userIdField, userId);

    if (error) throw error;
  }
} 