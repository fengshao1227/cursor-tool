// 加载环境变量配置（必须在其他导入之前）
import * as dotenv from 'dotenv'
import * as path from 'path'
import { app, BrowserWindow, ipcMain, Menu } from 'electron'
dotenv.config({ path: path.join(__dirname, '../../.env') })

import { accountService } from './account-service'
import { appDatabase } from './database'
import { cursorPaths } from './cursor-paths'
import { backupService } from './backup-service'
import { processManager } from './process-manager'
import { licenseService } from './license-service'
import { tokenInjector } from './token-injector'
import { licenseManager } from './license-manager'
import { announcementService } from './announcement-service'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Cursor 账号管理器',
    // Windows/Linux: 隐藏菜单栏
    autoHideMenuBar: true,
    // Windows: 使用更现代的窗口样式
    frame: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  }

  mainWindow = new BrowserWindow(windowOptions)

  // Windows/Linux: 完全移除菜单栏
  if (process.platform !== 'darwin') {
    mainWindow.setMenuBarVisibility(false)
    // 设置空菜单以完全移除菜单栏
    Menu.setApplicationMenu(null)
  }

  // 开发环境
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 应用准备就绪
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    appDatabase.close()
    app.quit()
  }
})

// ============ IPC 处理器 ============

// 账号管理
ipcMain.handle('getAccounts', async () => {
  return await accountService.getAccounts()
})

ipcMain.handle('addAccount', async (_, email: string, token: string, nickname?: string) => {
  return await accountService.addAccount(email, token, undefined, nickname)
})

ipcMain.handle(
  'updateAccount',
  async (
    _,
    id: string,
    data: { email?: string; token?: string; refreshToken?: string; nickname?: string }
  ) => {
    return await accountService.updateAccount(id, {
      email: data.email,
      accessToken: data.token,
      refreshToken: data.refreshToken,
      nickname: data.nickname,
    })
  }
)

ipcMain.handle('deleteAccount', async (_, id: string) => {
  return await accountService.deleteAccount(id)
})

ipcMain.handle('switchAccount', async (_, id: string) => {
  return await accountService.switchAccount(id)
})

ipcMain.handle('importCurrentAccount', async (_, nickname?: string) => {
  return await accountService.importCurrentAccount(nickname)
})

// 机器码管理
ipcMain.handle('resetMachineId', async () => {
  return await accountService.resetMachineId()
})

ipcMain.handle('factoryReset', async () => {
  return await accountService.factoryReset()
})

ipcMain.handle('deepReset', async () => {
  return await accountService.performDeepReset()
})

ipcMain.handle('getCurrentMachineId', async () => {
  return await accountService.getCurrentMachineId()
})

// 系统管理
ipcMain.handle('isCursorRunning', async () => {
  return await accountService.isCursorRunning()
})

ipcMain.handle('killCursor', async () => {
  return await accountService.killCursor()
})

ipcMain.handle('launchCursor', async () => {
  return await accountService.launchCursor()
})

ipcMain.handle('getCursorPath', async () => {
  return cursorPaths.dataPath
})

// Cursor路径管理
ipcMain.handle('searchCursorInstallations', async () => {
  return cursorPaths.searchCursorInstallations()
})

ipcMain.handle('setCustomCursorPath', async (_, appPath: string) => {
  const success = cursorPaths.setCustomCursorPath(appPath)
  return {
    success,
    message: success ? '✅ Cursor路径已保存' : '❌ 设置路径失败，请检查路径是否正确',
  }
})

ipcMain.handle('clearCustomCursorPath', async () => {
  cursorPaths.clearCustomCursorPath()
  return {
    success: true,
    message: '✅ 已恢复使用默认路径',
  }
})

ipcMain.handle('getCurrentCursorAppPath', async () => {
  return cursorPaths.getCurrentCursorAppPath()
})

// 配置
ipcMain.handle('getConfig', async () => {
  const licenseExpiresAt = appDatabase.getLicenseExpiry()
  const remainingDaysStr = appDatabase.getConfig('license.remainingDays')
  
  return {
    autoRestart: appDatabase.getConfig('autoRestart') === 'true',
    backupBeforeSwitch: appDatabase.getConfig('backupBeforeSwitch') === 'true',
    cursorPath: cursorPaths.dataPath,
    customCursorAppPath: cursorPaths.getCurrentCursorAppPath(),
    licenseExpiresAt: licenseExpiresAt || undefined,
    licenseRemainingDays: remainingDaysStr ? parseInt(remainingDaysStr) : undefined,
  }
})

ipcMain.handle('updateConfig', async (_, config: any) => {
  if (config.autoRestart !== undefined) {
    appDatabase.setConfig('autoRestart', config.autoRestart.toString())
  }
  if (config.backupBeforeSwitch !== undefined) {
    appDatabase.setConfig('backupBeforeSwitch', config.backupBeforeSwitch.toString())
  }
  return { success: true, message: '配置已保存' }
})

// 许可证管理（卡密激活 - 直接添加到账号列表，支持多token）
ipcMain.handle('activateLicense', async (_evt, licenseKey: string) => {
  try {
    // 1. 调用激活接口
    const result = await licenseService.activate(licenseKey)
    
    if (!result.success) {
      return { success: false, message: result.message }
    }

    // 2. 判断是单token还是多token
    const tokens = result.cursorTokens || (result.cursorToken ? [result.cursorToken] : [])
    
    if (tokens.length === 0 || !result.cursorEmail) {
      return { success: false, message: '激活成功但未获取到账号信息' }
    }

    // 3. 保存全局卡密有效期
    if (result.expiresAt) {
      appDatabase.updateLicenseExpiry(result.expiresAt)
      if (result.remainingDays) {
        appDatabase.setConfig('license.remainingDays', result.remainingDays.toString())
      }
    }

    // 4. 如果是多token，自动为每个token创建账号
    let accountsCreated = 0
    let accountsUpdated = 0
    
    if (tokens.length > 1) {
      console.log(`🎫 检测到${tokens.length}个Token，自动创建账号...`)
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        const accountEmail = `${result.cursorEmail}_${i + 1}`
        const accountNickname = `卡密-${licenseKey.substring(0, 8)}-${i + 1}`
        
        try {
          // 检查账号是否已存在
          const existing = appDatabase.getAccountByEmail(accountEmail)
          if (existing) {
            // 更新已有账号的token
            appDatabase.updateAccount(existing.id, { accessToken: token })
            accountsUpdated++
            console.log(`✅ 已更新账号 ${accountEmail}`)
          } else {
            // 添加新账号
            appDatabase.addAccount(accountEmail, token, undefined, accountNickname)
            accountsCreated++
            console.log(`✅ 已创建账号 ${accountNickname} (${accountEmail})`)
          }
        } catch (err) {
          console.warn(`⚠️ 处理账号失败:`, err)
        }
      }
      
      appDatabase.addLog('activate_license', `Added ${accountsCreated} accounts (updated ${accountsUpdated}) via license: ${result.cursorEmail}`)
      
      const expiryInfo = result.expiresAt 
        ? `\n📅 卡密有效期至：${new Date(result.expiresAt).toLocaleDateString()}\n⏰ 剩余天数：${result.remainingDays || 0}天`
        : ''
      
      return {
        success: true,
        message: `✅ 卡密激活成功！\n\n📧 邮箱：${result.cursorEmail}\n🎫 Token数量：${tokens.length}\n👤 创建账号：${accountsCreated}个\n🔄 更新账号：${accountsUpdated}个${expiryInfo}\n\n请在账号列表中切换使用`,
        cursorEmail: result.cursorEmail,
        cursorTokens: tokens,
        accountCount: accountsCreated + accountsUpdated,
      }
    } else {
      // 单token，创建一个账号
      const existing = appDatabase.getAccountByEmail(result.cursorEmail)
      if (existing) {
        // 更新已存在的账号 token
        appDatabase.updateAccount(existing.id, {
          accessToken: tokens[0],
        })
        
        const expiryInfo = result.expiresAt 
          ? `\n\n📅 卡密有效期至：${new Date(result.expiresAt).toLocaleDateString()}\n⏰ 剩余天数：${result.remainingDays || 0}天`
          : ''
        
        return {
          success: true,
          message: `✅ 卡密激活成功！\n\n账号 ${result.cursorEmail} 已存在，已更新token${expiryInfo}\n\n请在账号列表中切换使用`,
          cursorEmail: result.cursorEmail,
          cursorToken: tokens[0],
        }
      }

      // 添加新账号到账号列表
      const account = appDatabase.addAccount(
        result.cursorEmail,
        tokens[0],
        undefined,
        `卡密-${licenseKey.substring(0, 8)}`
      )

      appDatabase.addLog('activate_license', `Added account via license: ${result.cursorEmail}`)

      const expiryInfo = result.expiresAt 
        ? `\n\n📅 卡密有效期至：${new Date(result.expiresAt).toLocaleDateString()}\n⏰ 剩余天数：${result.remainingDays || 0}天`
        : ''

      return {
        success: true,
        message: `✅ 卡密激活成功！\n\n账号已添加到列表：${result.cursorEmail}${expiryInfo}\n\n请在账号列表中切换使用`,
        cursorEmail: result.cursorEmail,
        cursorToken: tokens[0],
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: `激活失败：${error.message}`,
    }
  }
})

ipcMain.handle('deactivateLicense', async () => {
  const result = await licenseService.deactivate()
  if (result.success) {
    // 清除全局卡密有效期
    appDatabase.updateLicenseExpiry('')
    appDatabase.setConfig('license.remainingDays', '')
  }
  return result
})

ipcMain.handle('getLicenseStatus', async () => {
  // 实时验证卡密状态，确保卡密仍然有效
  const result = await licenseService.ensureLicensed()
  
  // 🔓 如果是无验证版本，直接返回有效状态
  if (result.success && result.message === '无验证版本') {
    return {
      valid: true,
      message: '无验证版本'
    }
  }
  
  if (result.success) {
    // 验证成功，返回状态信息
    const status = licenseService.getStatus()
    return status
  } else {
    // 验证失败，返回失败状态
    return {
      valid: false,
      message: result.message || '卡密验证失败'
    }
  }
})

// 卡密管理功能已移除 - 现在只支持单个卡密，激活新卡密会替换旧的

// 备份相关
// 新的完整备份API - 备份时不需要关闭Cursor
ipcMain.handle('backupAll', async (_, accountEmail?: string) => {
  return await backupService.backupAll(accountEmail)
})

// 恢复备份 - 恢复时必须关闭Cursor
ipcMain.handle('restoreAll', async (_, backupPath: string) => {
  // 确保Cursor已关闭
  const isRunning = await processManager.isCursorRunning()
  if (isRunning) {
    const killed = await processManager.killCursor()
    if (!killed) {
      return {
        success: false,
        message: '请先关闭Cursor再执行恢复',
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  return await backupService.restoreAll(backupPath)
})

// 保留旧的API以兼容 - 备份不需要关闭Cursor
ipcMain.handle('backupSession', async (_, accountEmail: string) => {
  return await backupService.backupSession(accountEmail)
})

// 恢复会话 - 恢复时必须关闭Cursor
ipcMain.handle('restoreSession', async (_, backupPath: string) => {
  // 确保Cursor已关闭
  const isRunning = await processManager.isCursorRunning()
  if (isRunning) {
    const killed = await processManager.killCursor()
    if (!killed) {
      return {
        success: false,
        message: '请先关闭Cursor再执行恢复',
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  return await backupService.restoreSession(backupPath)
})

ipcMain.handle('backupSettings', async () => {
  return await backupService.backupSettings()
})

ipcMain.handle('restoreSettings', async (_, backupPath: string) => {
  return await backupService.restoreSettings(backupPath)
})

ipcMain.handle('getBackups', async () => {
  return backupService.listBackups()
})

ipcMain.handle('deleteBackup', async (_, backupPath: string) => {
  const success = backupService.deleteBackup(backupPath)
  return {
    success,
    message: success ? '备份已删除' : '删除备份失败',
  }
})

// 在线公告
ipcMain.handle('getAnnouncement', async () => {
  try {
    const announcement = await announcementService.getAnnouncement()
    return announcement
  } catch (error: any) {
    console.error('获取公告失败:', error)
    return null
  }
})

ipcMain.handle('dismissAnnouncement', async (_, announcementId: string) => {
  try {
    announcementService.dismissAnnouncement(announcementId)
    return { success: true, message: '已关闭公告' }
  } catch (error: any) {
    return { success: false, message: `关闭公告失败：${error.message}` }
  }
})

// 日志
ipcMain.handle('getLogs', async () => {
  return await accountService.getLogs(50)
})

