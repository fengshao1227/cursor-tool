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
  }> {
    try {
      // 1. 调用激活接口
      const result = await licenseService.activate(licenseKey)

      if (!result.success) {
        return { success: false, message: result.message }
      }

      // 2. 保存到本地数据库
      const license = appDatabase.addLicense({
        licenseKey,
        nickname: nickname || `卡密-${licenseKey.substring(0, 8)}`,
        cursorEmail: result.cursorEmail,
        cursorToken: result.cursorToken,
        status: 'active',
      })

      return {
        success: true,
        message: `卡密添加成功！\n邮箱：${result.cursorEmail}`,
        licenseId: license.id,
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

      // 更新数据库
      appDatabase.updateLicense(licenseId, {
        cursorEmail: result.cursorEmail,
        cursorToken: result.cursorToken,
        status: 'active',
      })

      return {
        success: true,
        message: '卡密已刷新',
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

