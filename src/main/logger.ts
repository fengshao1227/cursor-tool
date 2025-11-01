/**
 * 统一日志管理模块
 * 使用 electron-log 提供统一的日志接口
 */
import log from 'electron-log'

// 配置日志
if (process.env.NODE_ENV === 'development') {
  log.transports.console.level = 'debug'
  log.transports.file.level = 'debug'
} else {
  log.transports.console.level = 'warn'
  log.transports.file.level = 'info'
}

// 设置日志文件位置
log.transports.file.resolvePathFn = () => {
  const path = require('path')
  const { app } = require('electron')
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'logs', 'main.log')
}

/**
 * 日志接口
 */
export const logger = {
  /**
   * Debug级别日志（开发环境）
   */
  debug: (message: string, ...args: any[]): void => {
    log.debug(message, ...args)
  },

  /**
   * Info级别日志
   */
  info: (message: string, ...args: any[]): void => {
    log.info(message, ...args)
  },

  /**
   * Warning级别日志
   */
  warn: (message: string, ...args: any[]): void => {
    log.warn(message, ...args)
  },

  /**
   * Error级别日志
   */
  error: (message: string, error?: Error | unknown): void => {
    if (error instanceof Error) {
      log.error(message, error)
    } else if (error) {
      log.error(message, JSON.stringify(error))
    } else {
      log.error(message)
    }
  },
}

// 导出默认实例
export default logger

