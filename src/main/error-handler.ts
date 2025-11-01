/**
 * 统一错误处理模块
 */
import { OperationResult } from '../shared/types'

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AppError'
    // 保持正确的原型链
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  CURSOR_NOT_FOUND = 'CURSOR_NOT_FOUND',
  CURSOR_RUNNING = 'CURSOR_RUNNING',
  LICENSE_INVALID = 'LICENSE_INVALID',
  LICENSE_EXPIRED = 'LICENSE_EXPIRED',
  LICENSE_REVOKED = 'LICENSE_REVOKED',
}

/**
 * 处理IPC错误，返回统一的OperationResult格式
 */
export function handleIpcError(error: unknown): OperationResult {
  if (error instanceof AppError) {
    return {
      success: false,
      message: error.message,
      error: error.code,
    }
  }

  if (error instanceof Error) {
    // 检查是否是已知的错误类型
    if (error.message.includes('网络') || error.message.includes('network')) {
      return {
        success: false,
        message: error.message,
        error: ErrorCode.NETWORK_ERROR,
      }
    }

    if (error.message.includes('找不到') || error.message.includes('not found')) {
      return {
        success: false,
        message: error.message,
        error: ErrorCode.FILE_SYSTEM_ERROR,
      }
    }

    return {
      success: false,
      message: error.message,
      error: ErrorCode.UNKNOWN_ERROR,
    }
  }

  return {
    success: false,
    message: '未知错误',
    error: ErrorCode.UNKNOWN_ERROR,
  }
}

/**
 * 包装异步函数，自动处理错误
 */
export function wrapAsync<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      return handleIpcError(error)
    }
  }) as T
}

/**
 * 创建友好的错误消息
 */
export function createFriendlyErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return '发生了未知错误'
}

export default {
  AppError,
  ErrorCode,
  handleIpcError,
  wrapAsync,
  createFriendlyErrorMessage,
}
