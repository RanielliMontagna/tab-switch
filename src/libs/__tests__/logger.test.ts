import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLogger, logger } from '../logger'

// Mock console methods
let mockConsoleWarn: ReturnType<typeof vi.spyOn>
let mockConsoleError: ReturnType<typeof vi.spyOn>

describe('Logger', () => {
  beforeEach(() => {
    // Setup console mocks before each test
    mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logger (default instance)', () => {
    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function')
    })

    it('should have info method', () => {
      expect(typeof logger.info).toBe('function')
    })

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function')
    })

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function')
    })

    it('should have setConfig method', () => {
      expect(typeof logger.setConfig).toBe('function')
    })

    it('should have getConfig method', () => {
      expect(typeof logger.getConfig).toBe('function')
    })

    it('should be able to call all logging methods', () => {
      expect(() => {
        logger.debug('Debug message')
        logger.info('Info message')
        logger.warn('Warning message')
        logger.error('Error message')
      }).not.toThrow()
    })
  })

  describe('createLogger', () => {
    it('should create logger with custom configuration', () => {
      const customLogger = createLogger({
        level: 'error',
        enableInProduction: true,
      })

      const config = customLogger.getConfig()
      expect(config.level).toBe('error')
      expect(config.enableInProduction).toBe(true)
    })

    it('should merge custom config with defaults', () => {
      const customLogger = createLogger({
        level: 'debug',
      })

      const config = customLogger.getConfig()
      expect(config.level).toBe('debug')
      expect(config.enableInProduction).toBeDefined()
    })

    it('should create independent logger instances', () => {
      const logger1 = createLogger({ level: 'debug' })
      const logger2 = createLogger({ level: 'error' })

      expect(logger1.getConfig().level).toBe('debug')
      expect(logger2.getConfig().level).toBe('error')
    })
  })

  describe('setConfig', () => {
    it('should update logger configuration', () => {
      const customLogger = createLogger({
        level: 'warn',
        enableInProduction: false,
      })

      customLogger.setConfig({ level: 'debug' })

      const config = customLogger.getConfig()
      expect(config.level).toBe('debug')
      expect(config.enableInProduction).toBe(false) // Should preserve other values
    })

    it('should update enableInProduction', () => {
      const customLogger = createLogger({
        level: 'info',
        enableInProduction: false,
      })

      customLogger.setConfig({ enableInProduction: true })

      const config = customLogger.getConfig()
      expect(config.enableInProduction).toBe(true)
      expect(config.level).toBe('info') // Should preserve other values
    })

    it('should update both level and enableInProduction', () => {
      const customLogger = createLogger({
        level: 'warn',
        enableInProduction: false,
      })

      customLogger.setConfig({
        level: 'debug',
        enableInProduction: true,
      })

      const config = customLogger.getConfig()
      expect(config.level).toBe('debug')
      expect(config.enableInProduction).toBe(true)
    })
  })

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const customLogger = createLogger({
        level: 'info',
        enableInProduction: true,
      })

      const config = customLogger.getConfig()

      expect(config).toEqual({
        level: 'info',
        enableInProduction: true,
      })
    })

    it('should return a copy of configuration', () => {
      const customLogger = createLogger({
        level: 'warn',
        enableInProduction: false,
      })

      const config1 = customLogger.getConfig()
      const config2 = customLogger.getConfig()

      expect(config1).toEqual(config2)
      expect(config1).not.toBe(config2) // Should be different objects
    })
  })

  describe('formatMessage', () => {
    it('should format messages with timestamp and level', () => {
      // Use warn which should always log
      const customLogger = createLogger({
        level: 'warn',
        enableInProduction: false,
      })

      customLogger.warn('Test message')

      // Verify console.warn was called with formatted message
      expect(mockConsoleWarn).toHaveBeenCalled()
      const callArgs = mockConsoleWarn.mock.calls[0]
      expect(callArgs[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) // ISO timestamp
      expect(callArgs[0]).toContain('[WARN]')
      expect(callArgs[0]).toContain('Test message')
    })

    it('should include additional arguments', () => {
      const customLogger = createLogger({
        level: 'error',
        enableInProduction: false,
      })

      customLogger.error('Message', { key: 'value' }, 123)

      expect(mockConsoleError).toHaveBeenCalled()
      const callArgs = mockConsoleError.mock.calls[0]
      expect(callArgs.length).toBeGreaterThan(1)
      expect(callArgs[1]).toEqual({ key: 'value' })
      expect(callArgs[2]).toBe(123)
    })
  })

  describe('logging methods', () => {
    it('should call console.warn for warn messages', () => {
      const customLogger = createLogger({
        level: 'warn',
        enableInProduction: false,
      })

      customLogger.warn('Warning message')

      expect(mockConsoleWarn).toHaveBeenCalled()
    })

    it('should call console.error for error messages', () => {
      const customLogger = createLogger({
        level: 'error',
        enableInProduction: false,
      })

      customLogger.error('Error message')

      expect(mockConsoleError).toHaveBeenCalled()
    })

    it('should format error messages correctly', () => {
      const customLogger = createLogger({
        level: 'error',
        enableInProduction: false,
      })

      customLogger.error('Error message')

      const callArgs = mockConsoleError.mock.calls[0]
      expect(callArgs[0]).toContain('[ERROR]')
      expect(callArgs[0]).toContain('Error message')
    })

    it('should format warn messages correctly', () => {
      const customLogger = createLogger({
        level: 'warn',
        enableInProduction: false,
      })

      customLogger.warn('Warning message')

      const callArgs = mockConsoleWarn.mock.calls[0]
      expect(callArgs[0]).toContain('[WARN]')
      expect(callArgs[0]).toContain('Warning message')
    })
  })

  describe('shouldLog behavior', () => {
    it('should log warn and error when enableInProduction is false', () => {
      const customLogger = createLogger({
        level: 'debug',
        enableInProduction: false,
      })

      customLogger.debug('Debug')
      customLogger.info('Info')
      customLogger.warn('Warn')
      customLogger.error('Error')

      // Warn and error should always log (even in production)
      expect(mockConsoleWarn).toHaveBeenCalled()
      expect(mockConsoleError).toHaveBeenCalled()
    })

    it('should have all logging methods callable', () => {
      const customLogger = createLogger({
        level: 'debug',
        enableInProduction: true,
      })

      expect(() => {
        customLogger.debug('Debug')
        customLogger.info('Info')
        customLogger.warn('Warn')
        customLogger.error('Error')
      }).not.toThrow()
    })
  })
})
