import { contextBridge, ipcRenderer } from 'electron'
import { IpcApi } from '../shared/types'
 

// 暴露安全的API给渲染进程
const api: IpcApi = {
  // 账号管理
  getAccounts: () => ipcRenderer.invoke('getAccounts'),
  addAccount: (email, token, nickname) => ipcRenderer.invoke('addAccount', email, token, nickname),
  updateAccount: (id, data) => ipcRenderer.invoke('updateAccount', id, data),
  deleteAccount: (id) => ipcRenderer.invoke('deleteAccount', id),
  switchAccount: (id) => ipcRenderer.invoke('switchAccount', id),
  importCurrentAccount: (nickname) => ipcRenderer.invoke('importCurrentAccount', nickname),

  // 机器码管理
  resetMachineId: () => ipcRenderer.invoke('resetMachineId'),
  factoryReset: () => ipcRenderer.invoke('factoryReset'),
  deepReset: () => ipcRenderer.invoke('deepReset'),
  getCurrentMachineId: () => ipcRenderer.invoke('getCurrentMachineId'),

  // 备份恢复
  backupAll: (accountEmail) => ipcRenderer.invoke('backupAll', accountEmail),
  restoreAll: (backupPath) => ipcRenderer.invoke('restoreAll', backupPath),
  backupSession: (accountEmail) => ipcRenderer.invoke('backupSession', accountEmail),
  restoreSession: (backupPath) => ipcRenderer.invoke('restoreSession', backupPath),
  backupSettings: () => ipcRenderer.invoke('backupSettings'),
  restoreSettings: (backupPath) => ipcRenderer.invoke('restoreSettings', backupPath),
  getBackups: () => ipcRenderer.invoke('getBackups'),
  deleteBackup: (backupPath) => ipcRenderer.invoke('deleteBackup', backupPath),

  // 系统管理
  isCursorRunning: () => ipcRenderer.invoke('isCursorRunning'),
  killCursor: () => ipcRenderer.invoke('killCursor'),
  launchCursor: () => ipcRenderer.invoke('launchCursor'),
  getCursorPath: () => ipcRenderer.invoke('getCursorPath'),

  // Cursor路径管理
  searchCursorInstallations: () => ipcRenderer.invoke('searchCursorInstallations'),
  setCustomCursorPath: (appPath) => ipcRenderer.invoke('setCustomCursorPath', appPath),
  clearCustomCursorPath: () => ipcRenderer.invoke('clearCustomCursorPath'),
  getCurrentCursorAppPath: () => ipcRenderer.invoke('getCurrentCursorAppPath'),

  // 配置
  getConfig: () => ipcRenderer.invoke('getConfig'),
  updateConfig: (config) => ipcRenderer.invoke('updateConfig', config),

  // 许可证（卡密激活，直接添加到账号列表）
  activateLicense: (licenseKey) => ipcRenderer.invoke('activateLicense', licenseKey),
  deactivateLicense: () => ipcRenderer.invoke('deactivateLicense'),
  getLicenseStatus: () => ipcRenderer.invoke('getLicenseStatus'),

}

contextBridge.exposeInMainWorld('api', api)

// 暴露平台信息
contextBridge.exposeInMainWorld('platform', {
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  platform: process.platform,
})

