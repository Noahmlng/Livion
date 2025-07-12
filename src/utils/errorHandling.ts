/**
 * 应用错误类型
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  NETWORK = 'NETWORK_ERROR',
  AUTH = 'AUTH_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

/**
 * 应用错误基类
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, ErrorType.VALIDATION, 400);
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, ErrorType.DATABASE, 500);
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * 认证错误
 */
export class AuthError extends AppError {
  constructor(message: string) {
    super(message, ErrorType.AUTH, 401);
  }
}

/**
 * 未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, ErrorType.NOT_FOUND, 404);
  }
}

/**
 * 权限错误
 */
export class PermissionError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, ErrorType.PERMISSION, 403);
  }
}

/**
 * 错误处理器
 */
export class ErrorHandler {
  /**
   * 处理错误并返回用户友好的消息
   */
  static handleError(error: unknown): {
    message: string;
    type: ErrorType;
    shouldReport: boolean;
  } {
    if (error instanceof AppError) {
      return {
        message: error.message,
        type: error.type,
        shouldReport: !error.isOperational
      };
    }

    if (error instanceof Error) {
      // 检查是否是已知的第三方错误
      if (error.message.includes('PGRST116')) {
        return {
          message: 'Resource not found',
          type: ErrorType.NOT_FOUND,
          shouldReport: false
        };
      }

      if (error.message.includes('Invalid JWT')) {
        return {
          message: 'Authentication failed',
          type: ErrorType.AUTH,
          shouldReport: false
        };
      }

      if (error.message.includes('Network')) {
        return {
          message: 'Network connection failed',
          type: ErrorType.NETWORK,
          shouldReport: true
        };
      }

      return {
        message: 'An unexpected error occurred',
        type: ErrorType.UNKNOWN,
        shouldReport: true
      };
    }

    return {
      message: 'An unknown error occurred',
      type: ErrorType.UNKNOWN,
      shouldReport: true
    };
  }

  /**
   * 安全地执行异步操作
   */
  static async safeAsync<T>(
    operation: () => Promise<T>,
    fallbackValue?: T
  ): Promise<{ data?: T; error?: AppError }> {
    try {
      const data = await operation();
      return { data };
    } catch (error) {
      const handledError = this.createAppError(error);
      
      if (fallbackValue !== undefined) {
        return { data: fallbackValue, error: handledError };
      }
      
      return { error: handledError };
    }
  }

  /**
   * 安全地执行同步操作
   */
  static safe<T>(
    operation: () => T,
    fallbackValue?: T
  ): { data?: T; error?: AppError } {
    try {
      const data = operation();
      return { data };
    } catch (error) {
      const handledError = this.createAppError(error);
      
      if (fallbackValue !== undefined) {
        return { data: fallbackValue, error: handledError };
      }
      
      return { error: handledError };
    }
  }

  /**
   * 创建AppError实例
   */
  private static createAppError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error.message, ErrorType.UNKNOWN, 500, false);
    }

    return new AppError('Unknown error occurred', ErrorType.UNKNOWN, 500, false);
  }
}

/**
 * 重试装饰器
 */
export function withRetry<T extends any[], R>(
  maxRetries: number = 3,
  delay: number = 1000
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (...args: T): Promise<R> {
      let lastError: Error;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await method.apply(this, args);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt === maxRetries) {
            throw lastError;
          }

          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
      }

      throw lastError!;
    };
  };
} 