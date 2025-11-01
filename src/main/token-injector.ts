import Database from 'better-sqlite3'
import { cursorPaths } from './cursor-paths'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Cursor Token 注入器
 * 直接操作 state.vscdb 数据库来切换账号
 */
export class TokenInjector {
  private dbPath: string

  constructor() {
    this.dbPath = path.join(cursorPaths.dataPath, 'User', 'globalStorage', 'state.vscdb')
  }

  /**
   * 检查数据库是否存在
   */
  private checkDatabase(): void {
    if (!fs.existsSync(this.dbPath)) {
      throw new Error('Cursor state database not found. Please make sure Cursor is installed.')
    }
  }

  /**
   * 获取当前登录的账号信息
   */
  getCurrentAccount(): { email: string; accessToken: string; refreshToken: string } | null {
    try {
      this.checkDatabase()
      const db = new Database(this.dbPath, { readonly: true })

      const email = db
        .prepare('SELECT value FROM ItemTable WHERE key = ?')
        .get('cursorAuth/cachedEmail') as { value: string } | undefined

      const accessToken = db
        .prepare('SELECT value FROM ItemTable WHERE key = ?')
        .get('cursorAuth/accessToken') as { value: string } | undefined

      const refreshToken = db
        .prepare('SELECT value FROM ItemTable WHERE key = ?')
        .get('cursorAuth/refreshToken') as { value: string } | undefined

      db.close()

      if (!email || !accessToken) {
        return null
      }

      return {
        email: email.value,
        accessToken: accessToken.value,
        refreshToken: refreshToken?.value || '',
      }
    } catch (error) {
      console.error('Error reading current account:', error)
      return null
    }
  }

  /**
   * 注入新的token（切换账号）
   */
  injectToken(email: string, accessToken: string, refreshToken?: string): void {
    try {
      this.checkDatabase()

      // 创建备份
      const backupPath = this.dbPath + '.backup'
      fs.copyFileSync(this.dbPath, backupPath)

      const db = new Database(this.dbPath)

      // 开始事务
      db.exec('BEGIN TRANSACTION')

      try {
        // 更新邮箱
        db.prepare('INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)').run(
          'cursorAuth/cachedEmail',
          email
        )

        // 更新accessToken
        db.prepare('INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)').run(
          'cursorAuth/accessToken',
          accessToken
        )

        // 更新refreshToken
        if (refreshToken) {
          db.prepare('INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)').run(
            'cursorAuth/refreshToken',
            refreshToken
          )
        }

        // 提交事务
        db.exec('COMMIT')
        console.log(`✅ Token injected successfully for ${email}`)
      } catch (error) {
        // 回滚事务
        db.exec('ROLLBACK')
        throw error
      } finally {
        db.close()
      }
    } catch (error) {
      console.error('Error injecting token:', error)
      throw error
    }
  }

  /**
   * 导出当前账号的token（用于备份）
   */
  exportToken(): {
    email: string
    accessToken: string
    refreshToken: string
    membershipType?: string
    subscriptionStatus?: string
  } | null {
    try {
      this.checkDatabase()
      const db = new Database(this.dbPath, { readonly: true })

      const getData = (key: string): string | undefined => {
        const result = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(key) as
          | { value: string }
          | undefined
        return result?.value
      }

      const email = getData('cursorAuth/cachedEmail')
      const accessToken = getData('cursorAuth/accessToken')
      const refreshToken = getData('cursorAuth/refreshToken')
      const membershipType = getData('cursorAuth/stripeMembershipType')
      const subscriptionStatus = getData('cursorAuth/stripeSubscriptionStatus')

      db.close()

      if (!email || !accessToken) {
        return null
      }

      return {
        email,
        accessToken,
        refreshToken: refreshToken || '',
        membershipType,
        subscriptionStatus,
      }
    } catch (error) {
      console.error('Error exporting token:', error)
      return null
    }
  }

  /**
   * 清除认证信息（登出）
   */
  clearAuth(): void {
    try {
      this.checkDatabase()
      const db = new Database(this.dbPath)

      const keysToDelete = [
        'cursorAuth/cachedEmail',
        'cursorAuth/accessToken',
        'cursorAuth/refreshToken',
        'cursorAuth/stripeMembershipType',
        'cursorAuth/stripeSubscriptionStatus',
        'cursorAuth/cachedSignUpType',
      ]

      db.exec('BEGIN TRANSACTION')

      try {
        for (const key of keysToDelete) {
          db.prepare('DELETE FROM ItemTable WHERE key = ?').run(key)
        }
        db.exec('COMMIT')
        console.log('✅ Auth cleared successfully')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      } finally {
        db.close()
      }
    } catch (error) {
      console.error('Error clearing auth:', error)
      throw error
    }
  }

  /**
   * 恢复数据库备份
   */
  restoreBackup(): boolean {
    const backupPath = this.dbPath + '.backup'
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, this.dbPath)
      return true
    }
    return false
  }
}

export const tokenInjector = new TokenInjector()
