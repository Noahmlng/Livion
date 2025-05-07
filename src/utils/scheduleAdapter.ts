import { ScheduleEntry as DbScheduleEntry } from './database';
import { ScheduleEntry as SupabaseScheduleEntry } from '../types/supabase';

/**
 * 将 Supabase ScheduleEntry 转换为本地 DbScheduleEntry
 */
export function supabaseToLocalEntry(entry: SupabaseScheduleEntry): DbScheduleEntry {
  return {
    id: entry.entry_id.toString(),
    title: entry.custom_name || '',
    timeSlot: entry.slot,
    scheduled_date: entry.date,
    source_type: entry.task_type as any,
    task_id: entry.ref_task_id?.toString(),
    template_id: entry.ref_template_id?.toString(),
    completed: entry.status === 'completed',
    created_at: entry.created_at,
    user_id: entry.user_id.toString()
  };
}

/**
 * 将本地 DbScheduleEntry 转换为 Supabase ScheduleEntry
 */
export function localToSupabaseEntry(entry: DbScheduleEntry): SupabaseScheduleEntry {
  return {
    entry_id: parseInt(entry.id) || 0,
    user_id: parseInt(entry.user_id!) || 0,
    date: typeof entry.scheduled_date === 'string' 
      ? entry.scheduled_date 
      : entry.scheduled_date.toISOString().split('T')[0],
    slot: entry.timeSlot as any,
    status: entry.completed ? 'completed' : 'ongoing',
    task_type: entry.source_type as any,
    ref_task_id: entry.task_id ? parseInt(entry.task_id) : undefined,
    ref_template_id: entry.template_id ? parseInt(entry.template_id) : undefined,
    custom_name: entry.title,
    custom_desc: '',
    reward_points: 0,
    created_at: entry.created_at || new Date().toISOString()
  };
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
  
  if (data.timeSlot !== undefined) result.slot = data.timeSlot as any;
  if (data.completed !== undefined) result.status = data.completed ? 'completed' : 'ongoing';
  if (data.title !== undefined) result.custom_name = data.title;
  if (data.scheduled_date !== undefined) {
    result.date = typeof data.scheduled_date === 'string'
      ? data.scheduled_date
      : data.scheduled_date.toISOString().split('T')[0];
  }
  if (data.task_id !== undefined) result.ref_task_id = data.task_id ? parseInt(data.task_id) : undefined;
  if (data.template_id !== undefined) result.ref_template_id = data.template_id ? parseInt(data.template_id) : undefined;
  
  return result;
} 