/**
 * Logger utility with configurable log levels
 * Supports different log levels: debug, info, warn, error
 * In production, only warn and error are logged by default
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerConfig {
  level: LogLevel
  enableInProduction: boolean
}

/**
 * Check if we're in development mode
 * In Vite, import.meta.env.DEV is true in development
 */
const isDevelopment = import.meta.env.DEV

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  level: isDevelopment ? 'debug' : 'warn',
  enableInProduction: false,
}

class Logger {
  private config: LoggerConfig

  constructor(config: LoggerConfig = defaultConfig) {
    this.config = config
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (isDevelopment) {
      return true
    }

    if (!this.config.enableInProduction) {
      return level === 'warn' || level === 'error'
    }

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.config.level)
    const logLevelIndex = levels.indexOf(level)

    return logLevelIndex >= currentLevelIndex
  }

  /**
   * Format log message with timestamp and level
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    ...args: unknown[]
  ): [string, ...unknown[]] {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    return [`${prefix} ${message}`, ...args]
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...this.formatMessage('debug', message, ...args))
    }
  }

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage('info', message, ...args))
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', message, ...args))
    }
  }

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage('error', message, ...args))
    }
  }

  /**
   * Update logger configuration
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config }
  }
}

/**
 * Default logger instance
 * Export singleton instance for use throughout the application
 */
export const logger = new Logger()

/**
 * Create a new logger instance with custom configuration
 */
export function createLogger(config: Partial<LoggerConfig>): Logger {
  return new Logger({ ...defaultConfig, ...config })
}
