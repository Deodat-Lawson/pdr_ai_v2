/**
 * Structured Logging Service
 *
 * A centralized logging utility that provides consistent logging across the application
 * with support for different log levels, request tracing, and environment-aware behavior.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  documentId?: number;
  companyId?: number;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  error?: Error | string;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Format log entry for output
   */
  private formatLogEntry(entry: LogEntry): string {
    const { level, message, context, timestamp, error } = entry;

    const parts = [
      `[${timestamp}]`,
      `[${level.toUpperCase()}]`,
      message,
    ];

    if (context && Object.keys(context).length > 0) {
      parts.push(`| Context: ${JSON.stringify(context)}`);
    }

    if (error) {
      parts.push(`| Error: ${error instanceof Error ? error.message : String(error)}`);
      if (this.isDevelopment && error instanceof Error && error.stack) {
        parts.push(`\n${error.stack}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error | string): void {
    // In production, only log warnings and errors
    if (this.isProduction && (level === 'debug' || level === 'info')) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      error,
    };

    const formattedMessage = this.formatLogEntry(entry);

    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log general information
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext, error?: Error | string): void {
    this.log('warn', message, context, error);
  }

  /**
   * Log errors
   */
  error(message: string, context?: LogContext, error?: Error | string): void {
    this.log('error', message, context, error);
  }

  /**
   * Create a child logger with persistent context
   */
  withContext(baseContext: LogContext): ChildLogger {
    return new ChildLogger(this, baseContext);
  }
}

/**
 * Child logger that maintains a base context
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private baseContext: LogContext
  ) {}

  private mergeContext(additionalContext?: LogContext): LogContext {
    return { ...this.baseContext, ...additionalContext };
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext, error?: Error | string): void {
    this.parent.warn(message, this.mergeContext(context), error);
  }

  error(message: string, context?: LogContext, error?: Error | string): void {
    this.parent.error(message, this.mergeContext(context), error);
  }

  withContext(additionalContext: LogContext): ChildLogger {
    return new ChildLogger(this.parent, this.mergeContext(additionalContext));
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing purposes
export { Logger, ChildLogger };
