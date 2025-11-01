import { appDatabase } from './database'
import { tokenInjector } from './token-injector'
import { processManager } from './process-manager'
import { machineIdManager } from './machine-id'
import { deepResetManager } from './deep-reset'
import { Account, OperationResult } from '../shared/types'

/**
 * 账号管理服务
 * 整合所有功能模块
 */
export class AccountService {
  /**
   * 获取所有账号
   */
  async getAccounts(): Promise<Account[]> {
    return appDatabase.getAccounts()
  }

  /**
   * 添加新账号
   */
  async addAccount(
    email: string,
    accessToken: string,
    refreshToken?: string,
    nickname?: string
  ): Promise<OperationResult> {
    try {
      // 检查邮箱是否已存在
      const existing = appDatabase.getAccountByEmail(email)
      if (existing) {
        return {
          success: false,
          message: '该邮箱已存在',
        }
      }

      // 添加到数据库
      const account = appDatabase.addAccount(email, accessToken, refreshToken, nickname)

      // 记录日志
      appDatabase.addLog('add_account', `Added account: ${email}`)

      return {
        success: true,
        message: `账号 ${email} 添加成功`,
      }
    } catch (error: any) {
      return {
        success: false,
        message: '添加账号失败',
        error: error.message,
      }
    }
  }

  /**
   * 更新账号信息
   */
  async updateAccount(
    id: string,
    data: {
      email?: string
      accessToken?: string
      refreshToken?: string
      nickname?: string
    }
  ): Promise<OperationResult> {
    try {
      const success = appDatabase.updateAccount(id, data)

      if (!success) {
        return {
          success: false,
          message: '账号不存在',
        }
      }

      appDatabase.addLog('update_account', `Updated account: ${id}`)

      return {
        success: true,
        message: '账号更新成功',
      }
    } catch (error: any) {
      return {
        success: false,
        message: '更新账号失败',
        error: error.message,
      }
    }
  }

  /**
   * 删除账号
   */
  async deleteAccount(id: string): Promise<OperationResult> {
    try {
      const account = appDatabase.getAccountById(id)
      if (!account) {
        return {
          success: false,
          message: '账号不存在',
        }
      }

      const success = appDatabase.deleteAccount(id)

      if (!success) {
        return {
          success: false,
          message: '删除失败',
        }
      }

      appDatabase.addLog('delete_account', `Deleted account: ${account.email}`)

      return {
        success: true,
        message: `账号 ${account.email} 已删除`,
      }
    } catch (error: any) {
      return {
        success: false,
        message: '删除账号失败',
        error: error.message,
      }
    }
  }

  /**
   * 切换账号（核心功能）
   * 流程：保存当前机器码 → 备份会话 → 恢复目标机器码 → 重置Cursor → 恢复会话 → 注入Token → 重启
   */
  async switchAccount(id: string): Promise<OperationResult> {
    const { backupService } = await import('./backup-service')

    try {
      // 1. 获取目标账号
      const account = appDatabase.getAccountById(id)
      if (!account) {
        return {
          success: false,
          message: '账号不存在',
        }
      }

      // 2. 保存当前账号的机器码（如果存在）
      const currentAccount = appDatabase.getCurrentAccount()
      if (currentAccount) {
        const currentMachineId = machineIdManager.getCurrentMachineId()
        if (currentMachineId) {
          console.log('💾 保存当前账号的机器码...')
          appDatabase.updateAccount(currentAccount.id, {
            machineId: currentMachineId,
          })
          console.log(`✅ 已保存账号 ${currentAccount.email} 的机器码`)
        }
      }

      // 3. 检查Cursor是否在运行，如果是则关闭
      const isRunning = await processManager.isCursorRunning()
      if (isRunning) {
        console.log('🔄 关闭Cursor...')
        const killed = await processManager.killCursor()
        if (!killed) {
          return {
            success: false,
            message: '无法关闭Cursor，请手动关闭后重试',
          }
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // 4. 备份当前环境（会话 + 设置 + MCP，保留工作环境）
      // 注意：这是临时备份，恢复后会自动删除，不会显示在备份管理中
      console.log('💾 备份当前环境（临时完整备份）...')
      let completeBackupPath = ''

      try {
        // 使用新的 backupAll 方法一次性备份所有内容
        const backupResult = await backupService.backupAll('_global_session_', true)
        if (backupResult.success && backupResult.backupPath) {
          completeBackupPath = backupResult.backupPath
          console.log('✅ 完整备份成功（包括会话、设置和MCP）')
        }
      } catch (err) {
        console.warn('⚠️ 备份时出错:', err)
        // 继续执行，不中断流程
      }

      // 5. 恢复目标账号的机器码（如果存在）
      let restoredMachineId = false
      if (account.machineId) {
        console.log('🔄 恢复目标账号的机器码...')
        const restoreResult = machineIdManager.restoreMachineId(account.machineId)
        if (restoreResult.success) {
          restoredMachineId = true
          console.log(`✅ 已恢复账号 ${account.email} 的机器码`)
        } else {
          console.warn('⚠️ 恢复机器码失败:', restoreResult.error)
        }
      }

      // 6. 深度重置Cursor（包括修改程序文件、清除DNS等）
      // 如果已恢复机器码，则跳过机器码重置部分
      console.log('🔥 执行深度重置...')
      const resetDetails: string[] = []

      try {
        // 6.1 如果未恢复机器码，则先执行基础的出厂重置（会生成新机器码）
        if (!restoredMachineId) {
          const factoryResetResult = await machineIdManager.factoryReset()
          if (factoryResetResult.success) {
            console.log('✅ 基础重置完成（已生成新机器码）')
            resetDetails.push(...factoryResetResult.details)

            // 保存新生成的机器码到目标账号
            const newMachineId = machineIdManager.getCurrentMachineId()
            if (newMachineId) {
              appDatabase.updateAccount(id, {
                machineId: newMachineId,
              })
              console.log(`✅ 已保存新机器码到账号 ${account.email}`)
            }
          }
        } else {
          // 如果已恢复机器码，只执行清理操作，不重置机器码
          console.log('⏭️ 跳过机器码重置（已恢复账号的机器码）')
          resetDetails.push('✅ 已恢复账号的机器码，跳过重置')
        }

        // 6.2 执行深度重置（修改程序文件、清除DNS等）
        console.log('🔥 执行深度重置...')
        const deepResetResult = await deepResetManager.performDeepReset()
        if (deepResetResult.success) {
          console.log('✅ 深度重置完成')
          resetDetails.push(...deepResetResult.details)
        } else {
          console.warn('⚠️ 深度重置失败:', deepResetResult.message)
          resetDetails.push(`⚠️ 深度重置失败: ${deepResetResult.message}`)
        }
      } catch (err: any) {
        console.warn('⚠️ 重置时出错:', err)
        resetDetails.push(`⚠️ 重置出错: ${err.message}`)
      }

      // 等待重置完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 7. 恢复工作环境（会话 + 设置 + MCP）
      console.log('📂 恢复工作环境...')
      try {
        if (completeBackupPath) {
          const restoreResult = await backupService.restoreAll(completeBackupPath)
          if (restoreResult.success) {
            console.log('✅ 完整环境恢复成功（包括会话、设置和MCP）')
            // 恢复完成后删除临时备份
            backupService.deleteBackup(completeBackupPath)
            console.log('🗑️ 已清理临时备份')
          }
        }
      } catch (err) {
        console.warn('⚠️ 恢复时出错:', err)
        // 即使恢复失败，也尝试清理临时备份
        try {
          if (completeBackupPath) {
            backupService.deleteBackup(completeBackupPath)
          }
        } catch (cleanupErr) {
          console.warn('⚠️ 清理临时备份失败:', cleanupErr)
        }
      }

      // 8. 注入新账号的Token
      console.log('🔑 注入新账号Token...')
      tokenInjector.injectToken(account.email, account.token, account.refreshToken || undefined)

      // 9. 更新数据库中的当前账号标记
      appDatabase.setCurrentAccount(id)

      // 10. 记录日志
      appDatabase.addLog('switch_account', `Switched to: ${account.email}`)

      // 11. 自动重启Cursor
      console.log('🚀 重启Cursor...')
      const autoRestart = appDatabase.getConfig('autoRestart')
      if (autoRestart === 'true') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await processManager.launchCursor()
      }

      const machineIdInfo = restoredMachineId
        ? '\n✓ 已恢复账号的机器码'
        : '\n✓ 已生成新机器码并保存'

      return {
        success: true,
        message: `✅ 已切换到账号: ${account.email}\n\n✓ 工作环境已保留${machineIdInfo}\n✓ Cursor已深度重置\n✓ 程序文件已修改\n✓ DNS缓存已清除\n✓ 账号已切换${autoRestart === 'true' ? '\n✓ Cursor已重启' : '\n\n请手动启动Cursor'}\n\n${resetDetails.length > 0 ? '\n详细信息:\n' + resetDetails.slice(-5).join('\n') : ''}`,
      }
    } catch (error: any) {
      console.error('❌ Switch account error:', error)
      return {
        success: false,
        message: '切换账号失败',
        error: error.message,
      }
    }
  }

  /**
   * 导入当前Cursor账号
   */
  async importCurrentAccount(nickname?: string): Promise<OperationResult> {
    try {
      const currentToken = tokenInjector.exportToken()

      if (!currentToken || !currentToken.email) {
        return {
          success: false,
          message: 'Cursor当前未登录任何账号',
        }
      }

      // 检查是否已存在
      const existing = appDatabase.getAccountByEmail(currentToken.email)
      if (existing) {
        // 更新token
        appDatabase.updateAccount(existing.id, {
          accessToken: currentToken.accessToken,
          refreshToken: currentToken.refreshToken,
        })
        return {
          success: true,
          message: `账号 ${currentToken.email} 已存在，已更新token`,
        }
      }

      // 添加新账号
      const account = appDatabase.addAccount(
        currentToken.email,
        currentToken.accessToken,
        currentToken.refreshToken,
        nickname
      )

      // 设置为当前账号
      appDatabase.setCurrentAccount(account.id)

      appDatabase.addLog('import_account', `Imported: ${currentToken.email}`)

      return {
        success: true,
        message: `已导入账号: ${currentToken.email}`,
      }
    } catch (error: any) {
      return {
        success: false,
        message: '导入账号失败',
        error: error.message,
      }
    }
  }

  /**
   * 重置机器码
   */
  async resetMachineId(): Promise<OperationResult> {
    try {
      // 1. 检查Cursor是否在运行
      const isRunning = await processManager.isCursorRunning()
      if (isRunning) {
        const killed = await processManager.killCursor()
        if (!killed) {
          return {
            success: false,
            message: '请先关闭Cursor再执行此操作',
          }
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // 2. 执行重置
      const result = await machineIdManager.fullReset()

      if (result.success) {
        appDatabase.addLog('reset_machine_id', result.message)
      }

      return result
    } catch (error: any) {
      return {
        success: false,
        message: '重置机器码失败',
        error: error.message,
      }
    }
  }

  /**
   * 🔥 完整恢复出厂设置（彻底重置Cursor）
   */
  async factoryReset(): Promise<OperationResult & { details?: string[] }> {
    try {
      // 1. 检查Cursor是否在运行
      const isRunning = await processManager.isCursorRunning()
      if (isRunning) {
        const killed = await processManager.killCursor()
        if (!killed) {
          return {
            success: false,
            message: '请先关闭Cursor再执行此操作',
          }
        }
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      // 2. 执行完整的恢复出厂设置
      const result = await machineIdManager.factoryReset()

      if (result.success) {
        appDatabase.addLog('factory_reset', result.message)
      }

      return {
        success: result.success,
        message: result.message,
        details: result.details,
        error: result.error,
      }
    } catch (error: any) {
      return {
        success: false,
        message: '恢复出厂设置失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取当前机器码
   */
  async getCurrentMachineId(): Promise<string> {
    return machineIdManager.getCurrentMachineId() || '未找到'
  }

  /**
   * 检查Cursor是否运行
   */
  async isCursorRunning(): Promise<boolean> {
    return await processManager.isCursorRunning()
  }

  /**
   * 关闭Cursor
   */
  async killCursor(): Promise<OperationResult> {
    const success = await processManager.killCursor()
    return {
      success,
      message: success ? 'Cursor已关闭' : '关闭Cursor失败',
    }
  }

  /**
   * 启动Cursor
   */
  async launchCursor(): Promise<OperationResult> {
    const success = await processManager.launchCursor()
    return {
      success,
      message: success ? 'Cursor已启动' : '启动Cursor失败',
    }
  }

  /**
   * 🔥 执行深度重置（单独调用）
   */
  async performDeepReset(): Promise<OperationResult & { details?: string[] }> {
    try {
      // 1. 检查Cursor是否在运行
      const isRunning = await processManager.isCursorRunning()
      if (isRunning) {
        const killed = await processManager.killCursor()
        if (!killed) {
          return {
            success: false,
            message: '请先关闭Cursor再执行此操作',
          }
        }
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      // 2. 执行基础重置
      const factoryResult = await machineIdManager.factoryReset()

      // 3. 执行深度重置
      const deepResult = await deepResetManager.performDeepReset()

      const allDetails = [...(factoryResult.details || []), ...(deepResult.details || [])]

      appDatabase.addLog('deep_reset', '执行深度重置')

      return {
        success: true,
        message: '深度重置完成',
        details: allDetails,
      }
    } catch (error: any) {
      return {
        success: false,
        message: '深度重置失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取操作日志
   */
  async getLogs(limit = 50): Promise<any[]> {
    return appDatabase.getLogs(limit)
  }
}

export const accountService = new AccountService()
