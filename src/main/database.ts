import Database from 'better-sqlite3'
import { cursorPaths } from './cursor-paths'
import { Account, Backup } from '../shared/types'
import * as crypto from 'crypto'

/**
 * 本地SQLite数据库
 * 存储账号信息和备份记录
 */
export class AppDatabase {
  private db: Database.Database

  constructor() {
    const dbPath = cursorPaths.getDatabasePath()
    this.db = new Database(dbPath)
    this.initTables()
  }

  /**
   * 初始化数据库表
   */
  private initTables(): void {
    // 账号表（移除卡密有效期字段）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        nickname TEXT,
        machine_id TEXT,
        is_current INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 如果表已存在但没有 machine_id 字段，添加该字段
    try {
      this.db.exec(`ALTER TABLE accounts ADD COLUMN machine_id TEXT`)
    } catch (e: any) {
      // 字段已存在或其他错误，忽略
      if (!e.message.includes('duplicate column')) {
        console.warn('Failed to add machine_id column:', e.message)
      }
    }

    // 备份记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        account_email TEXT,
        backup_path TEXT NOT NULL,
        backup_type TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 操作日志表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `)

    // 卡密管理表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY,
        license_key TEXT UNIQUE NOT NULL,
        nickname TEXT,
        cursor_email TEXT,
        cursor_token TEXT,
        expires_at TEXT,
        is_current INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  /**
   * 生成UUID
   */
  private generateId(): string {
    return crypto.randomUUID()
  }

  // ============ 账号管理 ============

  /**
   * 获取所有账号
   */
  getAccounts(): Account[] {
    const rows = this.db
      .prepare(
        `SELECT id, email, access_token as token, refresh_token as refreshToken, 
         nickname, machine_id as machineId, is_current as isCurrent, created_at as createdAt, updated_at as updatedAt 
         FROM accounts ORDER BY created_at DESC`
      )
      .all() as any[]

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      token: row.token,
      refreshToken: row.refreshToken,
      nickname: row.nickname,
      machineId: row.machineId || null,
      isCurrent: Boolean(row.isCurrent),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  }

  /**
   * 根据ID获取账号
   */
  getAccountById(id: string): Account | null {
    const row = this.db
      .prepare(
        `SELECT id, email, access_token as token, refresh_token as refreshToken,
         nickname, machine_id as machineId, is_current as isCurrent, created_at as createdAt, updated_at as updatedAt 
         FROM accounts WHERE id = ?`
      )
      .get(id) as any

    if (!row) return null

    return {
      id: row.id,
      email: row.email,
      token: row.token,
      refreshToken: row.refreshToken,
      nickname: row.nickname,
      machineId: row.machineId || null,
      isCurrent: Boolean(row.isCurrent),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  /**
   * 根据邮箱获取账号
   */
  getAccountByEmail(email: string): Account | null {
    const row = this.db
      .prepare(
        `SELECT id, email, access_token as token, refresh_token as refreshToken,
         nickname, machine_id as machineId, is_current as isCurrent, created_at as createdAt, updated_at as updatedAt 
         FROM accounts WHERE email = ?`
      )
      .get(email) as any

    if (!row) return null

    return {
      id: row.id,
      email: row.email,
      token: row.token,
      refreshToken: row.refreshToken,
      nickname: row.nickname,
      machineId: row.machineId || null,
      isCurrent: Boolean(row.isCurrent),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  /**
   * 添加账号
   */
  addAccount(email: string, accessToken: string, refreshToken?: string, nickname?: string): Account {
    const id = this.generateId()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO accounts (id, email, access_token, refresh_token, nickname, machine_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, email, accessToken, refreshToken || null, nickname || null, null, now, now)

    return this.getAccountById(id)!
  }

  /**
   * 添加账号（兼容方法，实际不需要有效期参数了）
   */
  addAccountWithExpiry(
    email: string, 
    accessToken: string, 
    refreshToken?: string, 
    nickname?: string,
    _licenseExpiresAt?: string  // 废弃参数，保留兼容性
  ): Account {
    // 直接调用普通的添加账号方法
    return this.addAccount(email, accessToken, refreshToken, nickname)
  }

  /**
   * 更新账号
   */
  updateAccount(
    id: string,
    data: {
      email?: string
      accessToken?: string
      refreshToken?: string
      nickname?: string
      machineId?: string | null
    }
  ): boolean {
    const account = this.getAccountById(id)
    if (!account) return false

    const updates: string[] = []
    const values: any[] = []

    if (data.email) {
      updates.push('email = ?')
      values.push(data.email)
    }
    if (data.accessToken) {
      updates.push('access_token = ?')
      values.push(data.accessToken)
    }
    if (data.refreshToken !== undefined) {
      updates.push('refresh_token = ?')
      values.push(data.refreshToken)
    }
    if (data.nickname !== undefined) {
      updates.push('nickname = ?')
      values.push(data.nickname)
    }
    if (data.machineId !== undefined) {
      updates.push('machine_id = ?')
      values.push(data.machineId || null)
    }

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    this.db.prepare(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    return true
  }

  /**
   * 更新全局卡密有效期（保存到配置表）
   */
  updateLicenseExpiry(expiresAt: string): void {
    this.setConfig('license.expiresAt', expiresAt)
  }

  /**
   * 获取全局卡密有效期
   */
  getLicenseExpiry(): string | null {
    return this.getConfig('license.expiresAt')
  }

  /**
   * 删除账号
   */
  deleteAccount(id: string): boolean {
    const result = this.db.prepare('DELETE FROM accounts WHERE id = ?').run(id)
    return result.changes > 0
  }

  /**
   * 设置当前使用的账号
   */
  setCurrentAccount(id: string): boolean {
    // 先清除所有的current标记
    this.db.prepare('UPDATE accounts SET is_current = 0').run()

    // 设置指定账号为current
    const result = this.db.prepare('UPDATE accounts SET is_current = 1 WHERE id = ?').run(id)

    return result.changes > 0
  }

  /**
   * 获取当前账号
   */
  getCurrentAccount(): Account | null {
    const row = this.db
      .prepare(
        `SELECT id, email, access_token as token, refresh_token as refreshToken,
         nickname, machine_id as machineId, is_current as isCurrent, created_at as createdAt, updated_at as updatedAt 
         FROM accounts WHERE is_current = 1`
      )
      .get() as any

    if (!row) return null

    return {
      id: row.id,
      email: row.email,
      token: row.token,
      refreshToken: row.refreshToken,
      nickname: row.nickname,
      machineId: row.machineId || null,
      isCurrent: Boolean(row.isCurrent),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  // ============ 备份管理 ============

  /**
   * 添加备份记录
   */
  addBackup(accountEmail: string, backupPath: string, backupType: string): Backup {
    const id = this.generateId()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO backups (id, account_email, backup_path, backup_type, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, accountEmail, backupPath, backupType, now)

    return {
      id,
      accountEmail,
      backupPath,
      backupType: backupType as any,
      createdAt: now,
    }
  }

  /**
   * 获取所有备份
   */
  getBackups(): Backup[] {
    return this.db
      .prepare(
        `SELECT id, account_email as accountEmail, backup_path as backupPath,
         backup_type as backupType, created_at as createdAt
         FROM backups ORDER BY created_at DESC`
      )
      .all() as Backup[]
  }

  /**
   * 根据账号获取备份
   */
  getBackupsByEmail(email: string): Backup[] {
    return this.db
      .prepare(
        `SELECT id, account_email as accountEmail, backup_path as backupPath,
         backup_type as backupType, created_at as createdAt
         FROM backups WHERE account_email = ? ORDER BY created_at DESC`
      )
      .all(email) as Backup[]
  }

  // ============ 日志 ============

  /**
   * 添加操作日志
   */
  addLog(action: string, details?: string): void {
    this.db
      .prepare('INSERT INTO logs (action, details) VALUES (?, ?)')
      .run(action, details || null)
  }

  /**
   * 获取最近的日志
   */
  getLogs(limit = 100): any[] {
    return this.db
      .prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?')
      .all(limit) as any[]
  }

  // ============ 卡密管理 ============

  /**
   * 获取所有卡密
   */
  getLicenses(): any[] {
    return this.db
      .prepare(
        `SELECT id, license_key as licenseKey, nickname, cursor_email as cursorEmail,
         cursor_token as cursorToken, expires_at as expiresAt, is_current as isCurrent,
         status, created_at as createdAt, updated_at as updatedAt
         FROM licenses ORDER BY created_at DESC`
      )
      .all()
      .map((row: any) => ({
        ...row,
        isCurrent: Boolean(row.isCurrent),
      }))
  }

  /**
   * 根据ID获取卡密
   */
  getLicenseById(id: string): any | null {
    const row = this.db
      .prepare(
        `SELECT id, license_key as licenseKey, nickname, cursor_email as cursorEmail,
         cursor_token as cursorToken, expires_at as expiresAt, is_current as isCurrent,
         status, created_at as createdAt, updated_at as updatedAt
         FROM licenses WHERE id = ?`
      )
      .get(id) as any

    if (!row) return null

    return {
      ...row,
      isCurrent: Boolean(row.isCurrent),
    }
  }

  /**
   * 添加卡密
   */
  addLicense(data: {
    licenseKey: string
    nickname?: string
    cursorEmail?: string
    cursorToken?: string
    expiresAt?: string
    status?: string
  }): any {
    const id = this.generateId()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO licenses (id, license_key, nickname, cursor_email, cursor_token, expires_at, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        data.licenseKey,
        data.nickname || null,
        data.cursorEmail || null,
        data.cursorToken || null,
        data.expiresAt || null,
        data.status || 'pending',
        now,
        now
      )

    return this.getLicenseById(id)
  }

  /**
   * 更新卡密
   */
  updateLicense(id: string, data: {
    nickname?: string
    cursorEmail?: string
    cursorToken?: string
    expiresAt?: string
    status?: string
  }): boolean {
    const license = this.getLicenseById(id)
    if (!license) return false

    const updates: string[] = []
    const values: any[] = []

    if (data.nickname !== undefined) {
      updates.push('nickname = ?')
      values.push(data.nickname)
    }
    if (data.cursorEmail !== undefined) {
      updates.push('cursor_email = ?')
      values.push(data.cursorEmail)
    }
    if (data.cursorToken !== undefined) {
      updates.push('cursor_token = ?')
      values.push(data.cursorToken)
    }
    if (data.expiresAt !== undefined) {
      updates.push('expires_at = ?')
      values.push(data.expiresAt)
    }
    if (data.status !== undefined) {
      updates.push('status = ?')
      values.push(data.status)
    }

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    this.db.prepare(`UPDATE licenses SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    return true
  }

  /**
   * 删除卡密
   */
  deleteLicense(id: string): boolean {
    const result = this.db.prepare('DELETE FROM licenses WHERE id = ?').run(id)
    return result.changes > 0
  }

  /**
   * 设置当前使用的卡密
   */
  setCurrentLicense(id: string): boolean {
    // 先清除所有的current标记
    this.db.prepare('UPDATE licenses SET is_current = 0').run()

    // 设置指定卡密为current
    const result = this.db.prepare('UPDATE licenses SET is_current = 1 WHERE id = ?').run(id)

    return result.changes > 0
  }

  /**
   * 获取当前卡密
   */
  getCurrentLicense(): any | null {
    const row = this.db
      .prepare(
        `SELECT id, license_key as licenseKey, nickname, cursor_email as cursorEmail,
         cursor_token as cursorToken, expires_at as expiresAt, is_current as isCurrent,
         status, created_at as createdAt, updated_at as updatedAt
         FROM licenses WHERE is_current = 1`
      )
      .get() as any

    if (!row) return null

    return {
      ...row,
      isCurrent: Boolean(row.isCurrent),
    }
  }

  // ============ 配置 ============

  /**
   * 获取配置
   */
  getConfig(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM config WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value || null
  }

  /**
   * 设置配置
   */
  setConfig(key: string, value: string): void {
    this.db
      .prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
      .run(key, value)
  }

  /**
   * 关闭数据库
   */
  close(): void {
    this.db.close()
  }
}

export const appDatabase = new AppDatabase()

