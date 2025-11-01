import { appDatabase } from './database'
import { licenseService } from './license-service'
import { tokenInjector } from './token-injector'
import { processManager } from './process-manager'

/**
 * 卡密管理器
 * 支持多卡密管理和快速切换
 */
export class LicenseManager {
  /**
   * 获取所有卡密
   */
  async getLicenses() {
    return appDatabase.getLicenses()
  }

  /**
   * 添加并激活卡密
   */
  async addAndActivateLicense(
    licenseKey: string,
    nickname?: string
  ): Promise<{
    success: boolean
    message: string
    licenseId?: string
    accountCount?: number
  }> {
    try {
      // 1. 调用激活接口
      const result = await licenseService.activate(licenseKey)

      if (!result.success) {
        return { success: false, message: result.message }
      }

      // 2. 判断是单token还是多token
      const tokens = result.cursorTokens || (result.cursorToken ? [result.cursorToken] : [])
      
      if (tokens.length === 0) {
        return { success: false, message: '激活失败：未返回有效Token' }
      }

      // 3. 保存卡密到本地数据库
      const license = appDatabase.addLicense({
        licenseKey,
        nickname: nickname || `卡密-${licenseKey.substring(0, 8)}`,
        cursorEmail: result.cursorEmail,
        cursorToken: tokens[0],  // 保留第一个token作为主token
        cursorTokens: tokens,  // 保存所有tokens
        status: 'active',
      })

      // 4. 如果是多token，自动为每个token创建账号
      let accountsCreated = 0
      if (tokens.length > 1) {
        console.log(`🎫 检测到${tokens.length}个Token，自动创建账号...`)
        
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i]
          const accountEmail = `${result.cursorEmail}_${i + 1}`
          const accountNickname = `${nickname || '卡密账号'}-${i + 1}`
          
          try {
            // 检查账号是否已存在
            const existing = appDatabase.getAccountByEmail(accountEmail)
            if (existing) {
              console.log(`⏭️ 账号 ${accountEmail} 已存在，跳过`)
              continue
            }
            
            // 添加账号
            appDatabase.addAccount(accountEmail, token, undefined, accountNickname)
            accountsCreated++
            console.log(`✅ 已创建账号 ${accountNickname} (${accountEmail})`)
          } catch (err) {
            console.warn(`⚠️ 创建账号失败:`, err)
          }
        }
      } else {
        // 单token，创建一个账号
        try {
          const existing = appDatabase.getAccountByEmail(result.cursorEmail!)
          if (!existing) {
            appDatabase.addAccount(
              result.cursorEmail!,
              tokens[0],
              undefined,
              nickname || `${result.cursorEmail}`
            )
            accountsCreated = 1
            console.log(`✅ 已创建账号 ${result.cursorEmail}`)
          } else {
            // 更新已有账号的token
            appDatabase.updateAccount(existing.id, { accessToken: tokens[0] })
            accountsCreated = 1
            console.log(`✅ 已更新账号 ${result.cursorEmail}`)
          }
        } catch (err) {
          console.warn(`⚠️ 创建账号失败:`, err)
        }
      }

      const message = tokens.length > 1 
        ? `✅ 卡密添加成功！\n📧 邮箱：${result.cursorEmail}\n🎫 Token数量：${tokens.length}\n👤 已自动创建${accountsCreated}个账号`
        : `✅ 卡密添加成功！\n📧 邮箱：${result.cursorEmail}\n👤 已创建账号`

      return {
        success: true,
        message,
        licenseId: license.id,
        accountCount: accountsCreated,
      }
    } catch (error: any) {
      return {
        success: false,
        message: `添加失败：${error.message}`,
      }
    }
  }

  /**
   * 切换卡密并自动注入
   */
  async switchLicense(licenseId: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // 1. 获取卡密信息
      const license = appDatabase.getLicenseById(licenseId)
      if (!license) {
        return { success: false, message: '卡密不存在' }
      }

      if (!license.cursorToken || !license.cursorEmail) {
        return { success: false, message: '卡密信息不完整，请重新激活' }
      }

      // 2. 检查 Cursor 是否运行
      const isRunning = await processManager.isCursorRunning()
      if (isRunning) {
        return {
          success: false,
          message: '请先关闭 Cursor 再切换卡密',
        }
      }

      // 3. 注入 Token
      tokenInjector.injectToken(license.cursorEmail, license.cursorToken)

      // 4. 设置为当前卡密
      appDatabase.setCurrentLicense(licenseId)

      return {
        success: true,
        message: `✅ 已切换到卡密：${license.nickname || license.licenseKey}\n\n请启动 Cursor 即可使用`,
      }
    } catch (error: any) {
      return {
        success: false,
        message: `切换失败：${error.message}`,
      }
    }
  }

  /**
   * 删除卡密
   */
  async deleteLicense(licenseId: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const license = appDatabase.getLicenseById(licenseId)
      if (!license) {
        return { success: false, message: '卡密不存在' }
      }

      // 如果是当前使用的卡密，需要提示
      if (license.isCurrent) {
        return {
          success: false,
          message: '无法删除当前使用的卡密，请先切换到其他卡密',
        }
      }

      appDatabase.deleteLicense(licenseId)

      return {
        success: true,
        message: '卡密已删除',
      }
    } catch (error: any) {
      return {
        success: false,
        message: `删除失败：${error.message}`,
      }
    }
  }

  /**
   * 更新卡密昵称
   */
  async updateLicenseNickname(
    licenseId: string,
    nickname: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const success = appDatabase.updateLicense(licenseId, { nickname })

      if (!success) {
        return { success: false, message: '卡密不存在' }
      }

      return {
        success: true,
        message: '昵称已更新',
      }
    } catch (error: any) {
      return {
        success: false,
        message: `更新失败：${error.message}`,
      }
    }
  }

  /**
   * 重新激活卡密（刷新Token）
   */
  async reactivateLicense(licenseId: string): Promise<{
    success: boolean
    message: string
    accountCount?: number
  }> {
    try {
      const license = appDatabase.getLicenseById(licenseId)
      if (!license) {
        return { success: false, message: '卡密不存在' }
      }

      // 调用激活接口
      const result = await licenseService.activate(license.licenseKey)

      if (!result.success) {
        return { success: false, message: result.message }
      }

      // 判断是单token还是多token
      const tokens = result.cursorTokens || (result.cursorToken ? [result.cursorToken] : [])
      
      if (tokens.length === 0) {
        return { success: false, message: '刷新失败：未返回有效Token' }
      }

      // 更新数据库
      appDatabase.updateLicense(licenseId, {
        cursorEmail: result.cursorEmail,
        cursorToken: tokens[0],
        cursorTokens: tokens,
        status: 'active',
      })

      // 如果是多token，自动更新或创建账号
      let accountsUpdated = 0
      if (tokens.length > 1) {
        console.log(`🔄 检测到${tokens.length}个Token，更新账号...`)
        
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i]
          const accountEmail = `${result.cursorEmail}_${i + 1}`
          const accountNickname = `${license.nickname || '卡密账号'}-${i + 1}`
          
          try {
            const existing = appDatabase.getAccountByEmail(accountEmail)
            if (existing) {
              // 更新已有账号
              appDatabase.updateAccount(existing.id, { accessToken: token })
              console.log(`✅ 已更新账号 ${accountEmail}`)
            } else {
              // 创建新账号
              appDatabase.addAccount(accountEmail, token, undefined, accountNickname)
              console.log(`✅ 已创建账号 ${accountEmail}`)
            }
            accountsUpdated++
          } catch (err) {
            console.warn(`⚠️ 更新账号失败:`, err)
          }
        }
      }

      const message = tokens.length > 1
        ? `✅ 卡密已刷新\n🎫 Token数量：${tokens.length}\n👤 已更新${accountsUpdated}个账号`
        : `✅ 卡密已刷新`

      return {
        success: true,
        message,
        accountCount: accountsUpdated,
      }
    } catch (error: any) {
      return {
        success: false,
        message: `刷新失败：${error.message}`,
      }
    }
  }

  /**
   * 获取当前使用的卡密
   */
  async getCurrentLicense() {
    return appDatabase.getCurrentLicense()
  }
}

export const licenseManager = new LicenseManager()

