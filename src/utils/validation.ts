/**
 * 通用验证工具函数
 */

/**
 * 验证字符串是否为空
 */
export function isEmptyString(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * 验证内容长度
 */
export function validateContentLength(content: string, minLength: number = 1, maxLength: number = 10000): {
  isValid: boolean;
  error?: string;
} {
  if (isEmptyString(content)) {
    return {
      isValid: false,
      error: `Content cannot be empty`
    };
  }

  const trimmedContent = content.trim();
  
  if (trimmedContent.length < minLength) {
    return {
      isValid: false,
      error: `Content must be at least ${minLength} characters long`
    };
  }
  
  if (trimmedContent.length > maxLength) {
    return {
      isValid: false,
      error: `Content cannot exceed ${maxLength} characters`
    };
  }
  
  return { isValid: true };
}

/**
 * 验证名称格式
 */
export function validateName(name: string): {
  isValid: boolean;
  error?: string;
} {
  if (isEmptyString(name)) {
    return {
      isValid: false,
      error: 'Name is required'
    };
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < 2) {
    return {
      isValid: false,
      error: 'Name must be at least 2 characters long'
    };
  }
  
  if (trimmedName.length > 100) {
    return {
      isValid: false,
      error: 'Name cannot exceed 100 characters'
    };
  }
  
  return { isValid: true };
}

/**
 * 验证密码格式
 */
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (isEmptyString(password)) {
    return {
      isValid: false,
      error: 'Password is required'
    };
  }
  
  // 简单的密码验证 - 可以根据需要扩展
  if (password.length < 4) {
    return {
      isValid: false,
      error: 'Password must be at least 4 characters long'
    };
  }
  
  return { isValid: true };
}

/**
 * 验证数字范围
 */
export function validateNumberRange(value: number, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): {
  isValid: boolean;
  error?: string;
} {
  if (isNaN(value)) {
    return {
      isValid: false,
      error: 'Value must be a valid number'
    };
  }
  
  if (value < min) {
    return {
      isValid: false,
      error: `Value must be at least ${min}`
    };
  }
  
  if (value > max) {
    return {
      isValid: false,
      error: `Value cannot exceed ${max}`
    };
  }
  
  return { isValid: true };
}

/**
 * 验证时间段
 */
export function validateTimeSlot(slot: string): {
  isValid: boolean;
  error?: string;
} {
  const validSlots = ['morning', 'afternoon', 'evening'];
  
  if (!validSlots.includes(slot)) {
    return {
      isValid: false,
      error: 'Invalid time slot. Must be one of: morning, afternoon, evening'
    };
  }
  
  return { isValid: true };
}

/**
 * 验证状态
 */
export function validateStatus(status: string): {
  isValid: boolean;
  error?: string;
} {
  const validStatuses = ['ongoing', 'completed', 'deleted'];
  
  if (!validStatuses.includes(status)) {
    return {
      isValid: false,
      error: 'Invalid status. Must be one of: ongoing, completed, deleted'
    };
  }
  
  return { isValid: true };
}

/**
 * 安全地解析JSON
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
} 