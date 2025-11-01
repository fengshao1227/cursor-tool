/**
 * 统一配置管理模块
 * 管理应用配置，支持环境变量覆盖
 */

export interface AppConfig {
  app: {
    name: string
    version: string
  }
  license: {
    serverUrl: string
    publicKey: string
  }
  // 是否启用卡密验证（免费版设为false）
  enableLicenseCheck: boolean
}

/**
 * 获取配置值
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

/**
 * 默认配置值（移除硬编码的IP地址）
 */
const getDefaultConfig = (): AppConfig => ({
  app: {
    name: 'Cursor账号管理器',
    version: '1.0.0',
  },
  license: {
    // 如果没有配置环境变量，使用空字符串，避免暴露真实IP
    serverUrl: '',
    publicKey: '',
  },
  // 通过环境变量控制是否启用卡密验证（默认禁用，需要显式启用）
  enableLicenseCheck: process.env.ENABLE_LICENSE_CHECK === 'true',
})

/**
 * 应用配置（运行时动态获取）
 */
export function getConfig(): AppConfig {
  // 动态导入以避免循环依赖
  const { appDatabase } = require('./database')
  
  // 优先使用环境变量
  const serverUrl = getEnv('LICENSE_SERVER_URL', '')
  const publicKey = getEnv('LICENSE_PUBLIC_KEY', '')
  
  // 如果环境变量未设置，尝试从数据库读取
  const dbServerUrl = appDatabase.getConfig('license.serverUrl') || ''
  const dbPublicKey = appDatabase.getConfig('license.publicKey') || ''
  
  const defaultConfig = getDefaultConfig()
  
  return {
    app: defaultConfig.app,
    license: {
      // 优先使用环境变量，否则使用数据库配置，最后使用空字符串（需要用户配置）
      serverUrl: serverUrl || dbServerUrl || defaultConfig.license.serverUrl,
      publicKey: publicKey || dbPublicKey || defaultConfig.license.publicKey,
    },
    enableLicenseCheck: defaultConfig.enableLicenseCheck,
  }
}

/**
 * 导出配置对象（向后兼容）
 */
export const config = new Proxy({} as AppConfig, {
  get() {
    return getConfig()
  },
})

/**
 * 更新配置（运行时更新）
 */
export function updateConfig(updates: Partial<AppConfig>): void {
  const { appDatabase } = require('./database')
  
  if (updates.license?.serverUrl) {
    appDatabase.setConfig('license.serverUrl', updates.license.serverUrl)
  }
  if (updates.license?.publicKey) {
    appDatabase.setConfig('license.publicKey', updates.license.publicKey)
  }
}

/**
 * 获取配置值（用于向后兼容）
 */
export function getConfigValue(key: keyof AppConfig['license']): string {
  return getConfig().license[key]
}

/**
 * 检查是否启用卡密验证
 */
export function isLicenseCheckEnabled(): boolean {
  return getConfig().enableLicenseCheck
}

export default config
