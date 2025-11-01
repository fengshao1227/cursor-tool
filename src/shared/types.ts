// 共享类型定义

export interface Account {
  id: string
  email: string
  token: string
  refreshToken?: string
  nickname?: string
  machineId?: string | null
  isCurrent: boolean
  createdAt: string
  updatedAt: string
}

export interface Backup {
  id: string
  accountEmail: string
  backupPath: string
  backupType: 'session' | 'settings' | 'full'
  createdAt: string
}

export interface AppConfig {
  autoRestart: boolean
  backupBeforeSwitch: boolean
  cursorPath?: string
  licenseExpiresAt?: string // 全局卡密有效期
  licenseRemainingDays?: number // 剩余天数
}

export interface OperationResult {
  success: boolean
  message: string
  error?: string
}

// 许可证
export interface LicenseStatus {
  valid: boolean
  message?: string
  expiresAt?: string
  notAfter?: string
  devices?: { current: number; max: number }
}

// 卡密信息
export interface License {
  id: string
  licenseKey: string
  nickname?: string
  cursorEmail?: string
  cursorToken?: string
  expiresAt?: string
  isCurrent: boolean
  status: 'pending' | 'active' | 'expired' | 'error'
  createdAt: string
  updatedAt: string
}

// IPC通信类型
export interface IpcApi {
  // 账号管理
  getAccounts: () => Promise<Account[]>
  addAccount: (email: string, token: string, nickname?: string) => Promise<OperationResult>
  updateAccount: (id: string, data: Partial<Account>) => Promise<OperationResult>
  deleteAccount: (id: string) => Promise<OperationResult>
  switchAccount: (id: string) => Promise<OperationResult>
  importCurrentAccount: (nickname?: string) => Promise<OperationResult>

  // 机器码管理
  resetMachineId: () => Promise<OperationResult>
  factoryReset: () => Promise<OperationResult & { details?: string[] }>
  deepReset: () => Promise<OperationResult & { details?: string[] }>
  getCurrentMachineId: () => Promise<string>

  // 备份恢复
  backupAll: (accountEmail?: string) => Promise<OperationResult & { backupPath?: string }>
  restoreAll: (backupPath: string) => Promise<OperationResult>
  backupSession: (accountEmail: string) => Promise<OperationResult & { backupPath?: string }>
  restoreSession: (backupPath: string) => Promise<OperationResult>
  backupSettings: () => Promise<OperationResult & { backupPath?: string }>
  restoreSettings: (backupPath: string) => Promise<OperationResult>
  getBackups: () => Promise<
    Array<{
      name: string
      path: string
      type: string
      timestamp: string
      accountEmail?: string
    }>
  >
  deleteBackup: (backupPath: string) => Promise<OperationResult>

  // 系统管理
  isCursorRunning: () => Promise<boolean>
  killCursor: () => Promise<OperationResult>
  launchCursor: () => Promise<OperationResult>
  getCursorPath: () => Promise<string>

  // Cursor路径管理
  searchCursorInstallations: () => Promise<string[]>
  setCustomCursorPath: (appPath: string) => Promise<OperationResult>
  clearCustomCursorPath: () => Promise<OperationResult>
  getCurrentCursorAppPath: () => Promise<string | null>

  // 配置
  getConfig: () => Promise<AppConfig & { customCursorAppPath?: string | null }>
  updateConfig: (config: Partial<AppConfig>) => Promise<OperationResult>

  // 卡密激活（单卡密模式 - 激活新卡密会替换旧的，并直接添加账号到管理列表）
  activateLicense: (licenseKey: string) => Promise<
    OperationResult & {
      cursorToken?: string
      cursorEmail?: string
      expiresAt?: string
      remainingDays?: number
    }
  >
  deactivateLicense: () => Promise<OperationResult>
  getLicenseStatus: () => Promise<LicenseStatus>
}

declare global {
  interface Window {
    api: IpcApi
    platform: {
      isWindows: boolean
      isMac: boolean
      isLinux: boolean
      platform: string
    }
  }
}
