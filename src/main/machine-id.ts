import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import Database from 'better-sqlite3'
import { cursorPaths } from './cursor-paths'

/**
 * 机器码管理器
 * 负责读取、重置、生成Cursor的机器码
 */
export class MachineIdManager {
  /**
   * 从storage.json中读取当前机器码
   */
  getCurrentMachineId(): string | null {
    try {
      const storagePath = cursorPaths.getStorageJsonPath()
      if (!fs.existsSync(storagePath)) {
        return null
      }

      const content = fs.readFileSync(storagePath, 'utf-8')
      const storage = JSON.parse(content)

      return storage['telemetry.machineId'] || null
    } catch (error) {
      console.error('Error reading machine ID:', error)
      return null
    }
  }

  /**
   * 生成新的机器码（UUID格式）
   */
  private generateMachineId(): string {
    // 格式类似: 61757468307c757365725f...
    // 这是一个十六进制字符串
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * 生成新的MAC地址格式的ID
   */
  private generateMacMachineId(): string {
    // 格式: 01f55c26-080c-43ca-93c3-89a2ab09bfa4
    return crypto.randomUUID()
  }

  /**
   * 生成新的设备ID
   */
  private generateDeviceId(): string {
    return crypto.randomUUID()
  }

  /**
   * 恢复指定的机器码（用于切换账号时恢复账号对应的机器码）
   */
  restoreMachineId(machineId: string): {
    success: boolean
    error?: string
  } {
    try {
      const storagePath = cursorPaths.getStorageJsonPath()

      // 读取当前配置
      if (!fs.existsSync(storagePath)) {
        return {
          success: false,
          error: 'Storage file not found',
        }
      }

      const content = fs.readFileSync(storagePath, 'utf-8')
      const storage = JSON.parse(content)

      // 备份原文件
      const backupPath = storagePath + '.backup-' + Date.now()
      fs.copyFileSync(storagePath, backupPath)

      // 恢复机器码（需要生成配套的其他ID）
      const newMacMachineId = this.generateMacMachineId()
      const newDeviceId = this.generateDeviceId()
      const newSqmId = `{${crypto.randomUUID().toUpperCase()}}`

      // 更新所有机器相关的ID
      storage['telemetry.machineId'] = machineId
      storage['telemetry.macMachineId'] = newMacMachineId
      storage['telemetry.devDeviceId'] = newDeviceId
      storage['telemetry.sqmId'] = newSqmId

      // 写入新配置
      fs.writeFileSync(storagePath, JSON.stringify(storage, null, 4), 'utf-8')

      console.log('✅ Machine ID restored successfully')
      console.log('Restored ID:', machineId.substring(0, 20) + '...')

      return {
        success: true,
      }
    } catch (error: any) {
      console.error('Error restoring machine ID:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * 重置机器码
   * 这会让Cursor认为是一个新设备
   */
  resetMachineId(): {
    success: boolean
    oldMachineId?: string
    newMachineId?: string
    error?: string
  } {
    try {
      const storagePath = cursorPaths.getStorageJsonPath()

      // 读取当前配置
      if (!fs.existsSync(storagePath)) {
        return {
          success: false,
          error: 'Storage file not found',
        }
      }

      const content = fs.readFileSync(storagePath, 'utf-8')
      const storage = JSON.parse(content)

      const oldMachineId = storage['telemetry.machineId']

      // 生成新的机器码
      const newMachineId = this.generateMachineId()
      const newMacMachineId = this.generateMacMachineId()
      const newDeviceId = this.generateDeviceId()
      const newSqmId = `{${crypto.randomUUID().toUpperCase()}}`

      // 更新所有机器相关的ID
      storage['telemetry.machineId'] = newMachineId
      storage['telemetry.macMachineId'] = newMacMachineId
      storage['telemetry.devDeviceId'] = newDeviceId
      storage['telemetry.sqmId'] = newSqmId

      // 备份原文件
      const backupPath = storagePath + '.backup-' + Date.now()
      fs.copyFileSync(storagePath, backupPath)

      // 写入新配置
      fs.writeFileSync(storagePath, JSON.stringify(storage, null, 4), 'utf-8')

      console.log('✅ Machine ID reset successfully')
      console.log('Old ID:', oldMachineId)
      console.log('New ID:', newMachineId)

      return {
        success: true,
        oldMachineId,
        newMachineId,
      }
    } catch (error: any) {
      console.error('Error resetting machine ID:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * 完整的机器码重置（包括删除缓存）
   */
  async fullReset(): Promise<{
    success: boolean
    message: string
    error?: string
  }> {
    try {
      // 1. 重置storage.json中的机器码
      const resetResult = this.resetMachineId()
      if (!resetResult.success) {
        return {
          success: false,
          message: 'Failed to reset machine ID',
          error: resetResult.error,
        }
      }

      // 2. 删除可能的缓存文件
      const filesToDelete = [
        path.join(cursorPaths.dataPath, 'Cookies'),
        path.join(cursorPaths.dataPath, 'Cookies-journal'),
        path.join(cursorPaths.dataPath, 'Network Persistent State'),
      ]

      for (const file of filesToDelete) {
        try {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file)
            console.log(`Deleted: ${file}`)
          }
        } catch (err) {
          console.warn(`Failed to delete ${file}:`, err)
        }
      }

      // 3. 清空Local Storage
      const localStoragePath = cursorPaths.getLocalStoragePath()
      if (fs.existsSync(localStoragePath)) {
        const files = fs.readdirSync(localStoragePath)
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(localStoragePath, file))
          } catch (err) {
            console.warn(`Failed to delete ${file}:`, err)
          }
        }
      }

      return {
        success: true,
        message: `机器码已重置\n旧ID: ${resetResult.oldMachineId}\n新ID: ${resetResult.newMachineId}`,
      }
    } catch (error: any) {
      console.error('Error in full reset:', error)
      return {
        success: false,
        message: 'Reset failed',
        error: error.message,
      }
    }
  }

  /**
   * 🔥 完整恢复出厂设置（彻底重置Cursor）
   * 包括：机器码、认证、缓存、会话、工作区历史、扩展数据等
   */
  async factoryReset(): Promise<{
    success: boolean
    message: string
    details: string[]
    error?: string
  }> {
    const deletedItems: string[] = []

    try {
      console.log('🔥 开始恢复出厂设置...')

      // 1. 重置机器码
      const resetResult = this.resetMachineId()
      if (resetResult.success) {
        deletedItems.push(`✅ 机器码已重置: ${resetResult.newMachineId?.substring(0, 20)}...`)
      }

      // 2. 删除认证相关文件
      const authFiles = [
        'Cookies',
        'Cookies-journal',
        'Network Persistent State',
        'TransportSecurity',
      ]

      for (const fileName of authFiles) {
        const filePath = path.join(cursorPaths.dataPath, fileName)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
          deletedItems.push(`✅ 已删除: ${fileName}`)
        }
      }

      // 3. 清空缓存目录
      const cacheDirs = [
        'Cache',
        'Code Cache',
        'GPUCache',
        'DawnCache',
        'DawnGraphiteCache',
        'DawnWebGPUCache',
        'Service Worker',
      ]

      for (const dirName of cacheDirs) {
        const dirPath = path.join(cursorPaths.dataPath, dirName)
        if (fs.existsSync(dirPath)) {
          this.deleteFolderRecursive(dirPath)
          deletedItems.push(`✅ 已清空: ${dirName}`)
        }
      }

      // 4. 清空Local Storage
      const localStoragePath = path.join(cursorPaths.dataPath, 'Local Storage')
      if (fs.existsSync(localStoragePath)) {
        this.deleteFolderRecursive(localStoragePath)
        deletedItems.push('✅ 已清空: Local Storage')
      }

      // 5. 清空Session Storage
      const sessionStoragePath = path.join(cursorPaths.dataPath, 'Session Storage')
      if (fs.existsSync(sessionStoragePath)) {
        this.deleteFolderRecursive(sessionStoragePath)
        deletedItems.push('✅ 已清空: Session Storage')
      }

      // 6. 重置state.vscdb（清除认证信息）
      const stateDbPath = path.join(cursorPaths.dataPath, 'User', 'globalStorage', 'state.vscdb')
      if (fs.existsSync(stateDbPath)) {
        // 备份
        const backupPath = stateDbPath + '.factory-backup-' + Date.now()
        fs.copyFileSync(stateDbPath, backupPath)

        // 清除认证信息
        try {
          const db = new Database(stateDbPath)

          const keysToDelete = [
            'cursorAuth/accessToken',
            'cursorAuth/refreshToken',
            'cursorAuth/cachedEmail',
            'cursorAuth/cachedSignUpType',
            'cursorAuth/stripeMembershipType',
            'cursorAuth/stripeSubscriptionStatus',
          ]

          for (const key of keysToDelete) {
            db.prepare('DELETE FROM ItemTable WHERE key = ?').run(key)
          }

          db.close()
          deletedItems.push('✅ 已清除: 认证信息')
        } catch (err) {
          console.warn('清除认证信息失败:', err)
        }
      }

      // 7. 清空工作区历史
      const workspaceStoragePath = path.join(cursorPaths.dataPath, 'User', 'workspaceStorage')
      if (fs.existsSync(workspaceStoragePath)) {
        this.deleteFolderRecursive(workspaceStoragePath)
        fs.mkdirSync(workspaceStoragePath)
        deletedItems.push('✅ 已清空: 工作区历史')
      }

      // 8. 清空历史记录
      const historyPath = path.join(cursorPaths.dataPath, 'User', 'History')
      if (fs.existsSync(historyPath)) {
        this.deleteFolderRecursive(historyPath)
        fs.mkdirSync(historyPath)
        deletedItems.push('✅ 已清空: 历史记录')
      }

      // 9. 清空备份
      const backupsPath = path.join(cursorPaths.dataPath, 'Backups')
      if (fs.existsSync(backupsPath)) {
        this.deleteFolderRecursive(backupsPath)
        fs.mkdirSync(backupsPath)
        deletedItems.push('✅ 已清空: 备份数据')
      }

      // 10. 清空日志
      const logsPath = path.join(cursorPaths.dataPath, 'logs')
      if (fs.existsSync(logsPath)) {
        this.deleteFolderRecursive(logsPath)
        deletedItems.push('✅ 已清空: 日志文件')
      }

      console.log('✅ 恢复出厂设置完成！')

      return {
        success: true,
        message: `🔥 Cursor已恢复出厂设置\n\n共清理 ${deletedItems.length} 项`,
        details: deletedItems,
      }
    } catch (error: any) {
      console.error('恢复出厂设置失败:', error)
      return {
        success: false,
        message: '恢复出厂设置失败',
        details: deletedItems,
        error: error.message,
      }
    }
  }

  /**
   * 递归删除文件夹
   */
  private deleteFolderRecursive(folderPath: string): void {
    if (fs.existsSync(folderPath)) {
      fs.readdirSync(folderPath).forEach(file => {
        const curPath = path.join(folderPath, file)
        if (fs.lstatSync(curPath).isDirectory()) {
          this.deleteFolderRecursive(curPath)
        } else {
          fs.unlinkSync(curPath)
        }
      })
      fs.rmdirSync(folderPath)
    }
  }

  /**
   * 恢复备份的机器码
   */
  restoreFromBackup(backupPath?: string): boolean {
    try {
      const storagePath = cursorPaths.getStorageJsonPath()

      if (backupPath && fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, storagePath)
        return true
      }

      // 查找最新的备份
      const dir = path.dirname(storagePath)
      const files = fs.readdirSync(dir)
      const backups = files
        .filter(f => f.startsWith('storage.json.backup-'))
        .sort()
        .reverse()

      if (backups.length > 0) {
        const latestBackup = path.join(dir, backups[0])
        fs.copyFileSync(latestBackup, storagePath)
        return true
      }

      return false
    } catch (error) {
      console.error('Error restoring backup:', error)
      return false
    }
  }
}

export const machineIdManager = new MachineIdManager()
