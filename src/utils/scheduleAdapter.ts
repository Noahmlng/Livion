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
    description: entry.description,
    reward_points: entry.reward_points,
    created_at: entry.created_at
  };
}

/**
 * 将本地 DbScheduleEntry 转换为 Supabase ScheduleEntry
 */
export function localToSupabaseEntry(entry: DbScheduleEntry): Omit<SupabaseScheduleEntry, 'entry_id' | 'created_at'> {
  console.log('localToSupabaseEntry - 输入日期值:', entry.date, 'Type:', typeof entry.date);
  
  const formattedDate = formatDate(entry.date);
  console.log('localToSupabaseEntry - 格式化后日期值:', formattedDate);
  
  // 创建基本对象，不包含entry_id和created_at，让数据库使用默认时间
  const result: Omit<SupabaseScheduleEntry, 'entry_id' | 'created_at'> = {
    user_id: entry.user_id,
    date: formattedDate,
    slot: entry.slot as TimeSlot,
    status: entry.status as TaskStatus,
    task_type: entry.task_type as TaskType,
    ref_task_id: entry.ref_task_id,
    ref_template_id: entry.ref_template_id,
    custom_name: entry.custom_name,
    description: entry.description,
    reward_points: entry.reward_points
  };
  
  console.log('转换后的对象 (不含entry_id和created_at):', result);
  return result;
}

/**
 * 格式化日期为 YYYY-MM-DD 格式的字符串
 * 处理各种可能的输入类型
 */
function formatDate(date: Date | string | undefined): string {
  console.log('formatDate - 输入值:', date, 'Type:', typeof date);
  
  if (!date) {
    // 如果日期未定义，返回今天的日期
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    console.log('formatDate - 日期未定义，使用今天:', today);
    return today;
  }
  
  if (typeof date === 'string') {
    // 如果已经是字符串格式
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.log('formatDate - 已经是YYYY-MM-DD格式:', date);
      return date;
    }
    if (date.includes('T')) {
      // 如果是ISO格式，提取日期部分
      const extractedDate = date.split('T')[0];
      console.log('formatDate - 从ISO提取日期部分:', extractedDate);
      return extractedDate;
    }
    console.log('formatDate - 使用原始字符串:', date);
    return date; // 否则直接返回字符串
  }
  
  // 处理Date对象 - 直接使用系统时间（UTC+8）
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
  console.log('formatDate - 从Date对象转换:', formattedDate, '原始Date:', date);
  return formattedDate;
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
    if (typeof data.date === 'string') {
      result.date = data.date;
    } else {
      // 使用本地日期格式化，避免时区问题
      const year = data.date.getFullYear();
      const month = String(data.date.getMonth() + 1).padStart(2, '0');
      const day = String(data.date.getDate()).padStart(2, '0');
      result.date = `${year}-${month}-${day}`;
    }
  }
  if (data.ref_task_id !== undefined) result.ref_task_id = data.ref_task_id;
  if (data.ref_template_id !== undefined) result.ref_template_id = data.ref_template_id;
  if (data.reward_points !== undefined) result.reward_points = data.reward_points;
  
  return result;
} 