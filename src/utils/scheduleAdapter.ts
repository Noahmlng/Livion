import { ScheduleEntry as DbScheduleEntry } from './database';
import { ScheduleEntry as SupabaseScheduleEntry, TimeSlot, TaskType, TaskStatus } from '../types/supabase';

/**
 * 将 Supabase ScheduleEntry 转换为本地 DbScheduleEntry
 */
export function supabaseToLocalEntry(entry: SupabaseScheduleEntry): DbScheduleEntry {
  return {
    entry_id: entry.entry_id,
    user_id: entry.user_id,
    date: entry.date,
    slot: entry.slot,
    status: entry.status,
    task_type: entry.task_type,
    ref_task_id: entry.ref_task_id,
    ref_template_id: entry.ref_template_id,
    custom_name: entry.custom_name,
    custom_desc: entry.custom_desc,
    reward_points: entry.reward_points,
    created_at: entry.created_at
  };
}

/**
 * 将本地 DbScheduleEntry 转换为 Supabase ScheduleEntry
 */
export function localToSupabaseEntry(entry: DbScheduleEntry): SupabaseScheduleEntry {
  return {
    entry_id: entry.entry_id || 0,
    user_id: entry.user_id,
    date: formatDate(entry.date),
    slot: entry.slot as TimeSlot,
    status: entry.status as TaskStatus,
    task_type: entry.task_type as TaskType,
    ref_task_id: entry.ref_task_id,
    ref_template_id: entry.ref_template_id,
    custom_name: entry.custom_name,
    custom_desc: entry.custom_desc,
    reward_points: entry.reward_points,
    created_at: entry.created_at || new Date().toISOString()
  };
}

/**
 * 格式化日期为 YYYY-MM-DD 格式的字符串
 * 处理各种可能的输入类型
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) {
    // 如果日期未定义，返回今天的日期
    return new Date().toISOString().split('T')[0];
  }
  
  if (typeof date === 'string') {
    // 如果已经是字符串格式
    if (date.includes('T')) {
      // 如果是ISO格式，提取日期部分
      return date.split('T')[0];
    }
    return date; // 否则直接返回字符串
  }
  
  // 处理Date对象
  return date.toISOString().split('T')[0];
}

/**
 * 将 Supabase ScheduleEntry 数组转换为本地 DbScheduleEntry 数组
 */
export function convertSupabaseEntries(entries: SupabaseScheduleEntry[]): DbScheduleEntry[] {
  return entries.map(supabaseToLocalEntry);
}

/**
 * 转换部分更新字段
 */
export function convertUpdateFields(data: Partial<DbScheduleEntry>): Partial<SupabaseScheduleEntry> {
  const result: Partial<SupabaseScheduleEntry> = {};
  
  if (data.slot !== undefined) result.slot = data.slot as TimeSlot;
  if (data.status !== undefined) result.status = data.status as TaskStatus;
  if (data.custom_name !== undefined) result.custom_name = data.custom_name;
  if (data.date !== undefined) {
    result.date = typeof data.date === 'string'
      ? data.date
      : data.date.toISOString().split('T')[0];
  }
  if (data.ref_task_id !== undefined) result.ref_task_id = data.ref_task_id;
  if (data.ref_template_id !== undefined) result.ref_template_id = data.ref_template_id;
  if (data.reward_points !== undefined) result.reward_points = data.reward_points;
  
  return result;
} 