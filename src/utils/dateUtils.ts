/**
 * 日期时间工具函数
 * 统一处理所有日期时间相关的操作
 */

/**
 * 格式化日期为数据库格式 (YYYY-MM-DD)
 */
export function formatDateForDB(date: Date | string): string {
  if (typeof date === 'string') {
    // 如果已经是字符串格式
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    if (date.includes('T')) {
      // 如果是ISO格式，提取日期部分
      return date.split('T')[0];
    }
    return date;
  }
  
  // 处理Date对象
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间为显示格式 (YYYY-MM-DD HH:MM)
 */
export function formatDateTime(date: Date | string): string {
  try {
    if (!date || date === 'null' || date === 'undefined') {
      return getCurrentDateTimeString();
    }
    
    if (typeof date === 'string') {
      // 如果已经是目标格式
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date)) {
        return date;
      }
      
      // PostgreSQL格式处理
      if (date.includes(' ') && !date.includes('T')) {
        const parts = date.split(' ');
        const datePart = parts[0];
        const timePart = parts[1].split('.')[0].substring(0, 5);
        return `${datePart} ${timePart}`;
      }
      
      // ISO格式处理
      if (date.includes('T')) {
        const serverDate = new Date(date);
        if (isNaN(serverDate.getTime())) {
          return getCurrentDateTimeString();
        }
        // 修正时区差异
        const correctedDate = new Date(serverDate.getTime() - 8 * 60 * 60 * 1000);
        return formatDateTimeFromDate(correctedDate);
      }
    }
    
    // 处理Date对象
    if (date instanceof Date) {
      return formatDateTimeFromDate(date);
    }
    
    return getCurrentDateTimeString();
  } catch (error) {
    return getCurrentDateTimeString();
  }
}

/**
 * 从Date对象格式化为 YYYY-MM-DD HH:MM
 */
function formatDateTimeFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 获取当前日期时间字符串
 */
export function getCurrentDateTimeString(): string {
  return formatDateTimeFromDate(new Date());
}

/**
 * 获取今天的日期字符串
 */
export function getTodayDateString(): string {
  return formatDateForDB(new Date());
}

/**
 * 格式化时间为显示格式 (HH:MM)
 */
export function formatTimeOnly(date: Date | string): string {
  try {
    let targetDate: Date;
    
    if (typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date)) {
        // 本地格式
        const [datePart, timePart] = date.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        targetDate = new Date(year, month - 1, day, hour, minute);
      } else if (date.includes('T')) {
        // ISO格式
        const serverDate = new Date(date);
        if (isNaN(serverDate.getTime())) {
          throw new Error('Invalid date');
        }
        targetDate = new Date(serverDate.getTime() - 8 * 60 * 60 * 1000);
      } else {
        throw new Error('Unsupported date format');
      }
    } else {
      targetDate = date;
    }
    
    const hours = String(targetDate.getHours()).padStart(2, '0');
    const minutes = String(targetDate.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

/**
 * 检查两个日期是否是同一天
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * 比较两个时间字符串（用于排序）
 */
export function compareTimeStrings(timeA: string | Date, timeB: string | Date): number {
  const getComparableTime = (time: string | Date): string => {
    if (time instanceof Date) {
      return time.toISOString();
    }
    
    if (typeof time === 'string') {
      const formattedTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      if (formattedTimeRegex.test(time)) {
        return `${time.replace(' ', 'T')}:00.000Z`;
      }
      return time;
    }
    
    return String(time);
  };
  
  const comparableA = getComparableTime(timeA);
  const comparableB = getComparableTime(timeB);
  
  // 倒序排列：最新的在前
  return comparableB.localeCompare(comparableA);
} 