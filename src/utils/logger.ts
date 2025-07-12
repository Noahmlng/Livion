/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
  userId?: string;
}

/**
 * 日志记录器配置
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
}

/**
 * 统一日志记录器
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];

  private constructor(config: LoggerConfig) {
    this.config = config;
  }

  /**
   * 获取日志记录器实例
   */
  static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      const defaultConfig: LoggerConfig = {
        level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
        enableConsole: process.env.NODE_ENV !== 'production',
        enableStorage: false,
        maxStorageEntries: 1000
      };
      Logger.instance = new Logger(config || defaultConfig);
    }
    return Logger.instance;
  }

  /**
   * 记录调试信息
   */
  debug(message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, data, source);
  }

  /**
   * 记录一般信息
   */
  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  /**
   * 记录警告信息
   */
  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  /**
   * 记录错误信息
   */
  error(message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, message, data, source);
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (level < this.config.level) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      source,
      userId: this.getCurrentUserId()
    };

    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    if (this.config.enableStorage) {
      this.logToStorage(logEntry);
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const { timestamp, level, message, data, source } = entry;
    const prefix = `[${timestamp}] [${LogLevel[level]}]${source ? ` [${source}]` : ''}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data || '');
        break;
    }
  }

  /**
   * 存储到内存缓冲区
   */
  private logToStorage(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // 保持缓冲区大小限制
    if (this.logBuffer.length > this.config.maxStorageEntries) {
      this.logBuffer.shift();
    }
  }

  /**
   * 获取当前用户ID
   */
  private getCurrentUserId(): string | undefined {
    try {
      return sessionStorage.getItem('user_id') || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取日志历史
   */
  getLogHistory(maxEntries?: number): LogEntry[] {
    if (maxEntries) {
      return this.logBuffer.slice(-maxEntries);
    }
    return [...this.logBuffer];
  }

  /**
   * 清空日志缓冲区
   */
  clearLogs(): void {
    this.logBuffer = [];
  }

  /**
   * 导出日志为JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * 默认日志记录器实例
 */
export const logger = Logger.getInstance();

/**
 * 性能监控装饰器
 */
export function measurePerformance(source?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      const methodSource = source || `${target.constructor.name}.${propertyName}`;
      
      logger.debug(`Starting ${methodSource}`, { args });

      try {
        const result = await method.apply(this, args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        logger.debug(`Completed ${methodSource}`, { 
          duration: `${duration.toFixed(2)}ms`,
          success: true
        });

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        logger.error(`Failed ${methodSource}`, { 
          duration: `${duration.toFixed(2)}ms`,
          error: error instanceof Error ? error.message : String(error)
        });

        throw error;
      }
    };
  };
}

/**
 * 审计日志记录器
 */
export class AuditLogger {
  private static logger = Logger.getInstance();

  /**
   * 记录用户操作
   */
  static logUserAction(action: string, details?: any): void {
    this.logger.info(`User action: ${action}`, details, 'AUDIT');
  }

  /**
   * 记录数据变更
   */
  static logDataChange(entity: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', entityId?: string | number, changes?: any): void {
    this.logger.info(`Data change: ${operation} ${entity}`, {
      entityId,
      changes
    }, 'AUDIT');
  }

  /**
   * 记录安全事件
   */
  static logSecurityEvent(event: string, details?: any): void {
    this.logger.warn(`Security event: ${event}`, details, 'SECURITY');
  }
} 