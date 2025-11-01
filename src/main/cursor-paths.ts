import { app } from 'electron'
import * as path from 'path'
import * as os from 'os'
import { execSync } from 'child_process'
import * as fs from 'fs'

/**
 * Cursor配置文件路径管理
 * 支持Mac和Windows
 * 支持自动搜索Cursor安装位置
 */
export class CursorPaths {
  private static instance: CursorPaths
  private platform: string
  private cursorDataPath: string
  private customCursorPath: string | null = null

  private constructor() {
    this.platform = process.platform
    this.cursorDataPath = this.getCursorDataPath()
    this.loadCustomPath()
  }

  static getInstance(): CursorPaths {
    if (!CursorPaths.instance) {
      CursorPaths.instance = new CursorPaths()
    }
    return CursorPaths.instance
  }

  /**
   * 获取Cursor数据目录根路径
   */
  private getCursorDataPath(): string {
    if (this.platform === 'darwin') {
      // Mac: ~/Library/Application Support/Cursor
      return path.join(os.homedir(), 'Library', 'Application Support', 'Cursor')
    } else if (this.platform === 'win32') {
      // Windows: %APPDATA%/Cursor
      return path.join(process.env.APPDATA || '', 'Cursor')
    }
    throw new Error('Unsupported platform: ' + this.platform)
  }

  /**
   * 加载保存的自定义路径
   */
  private loadCustomPath(): void {
    try {
      const configPath = path.join(app.getPath('userData'), 'cursor-path.json')
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        if (config.customPath && fs.existsSync(config.customPath)) {
          this.customCursorPath = config.customPath
          console.log('✅ 已加载自定义Cursor路径:', this.customCursorPath)
        }
      }
    } catch (error) {
      console.warn('⚠️ 加载自定义路径失败:', error)
    }
  }

  /**
   * 搜索系统中所有Cursor安装位置
   */
  searchCursorInstallations(): string[] {
    const found: string[] = []

    try {
      if (this.platform === 'darwin') {
        // Mac: 使用 mdfind (Spotlight) 快速搜索
        console.log('🔍 正在搜索Cursor安装位置...')

        try {
          const result = execSync(
            'mdfind "kMDItemKind == Application && kMDItemFSName == Cursor.app"',
            {
              encoding: 'utf-8',
              timeout: 5000,
            }
          )

          const paths = result
            .split('\n')
            .filter(p => p.trim())
            .filter(p => fs.existsSync(path.join(p, 'Contents', 'MacOS', 'Cursor')))

          found.push(...paths)
        } catch (error) {
          console.warn('mdfind搜索失败，使用备用方案')
        }

        // 如果mdfind没找到，检查常见位置
        const commonPaths = [
          '/Applications/Cursor.app',
          path.join(os.homedir(), 'Applications', 'Cursor.app'),
          path.join(os.homedir(), 'Desktop', 'Cursor.app'),
          path.join(os.homedir(), 'Downloads', 'Cursor.app'),
        ]

        for (const appPath of commonPaths) {
          const execPath = path.join(appPath, 'Contents', 'MacOS', 'Cursor')
          if (fs.existsSync(execPath) && !found.includes(appPath)) {
            found.push(appPath)
          }
        }
      } else if (this.platform === 'win32') {
        // Windows: 检查常见安装位置
        const commonPaths = [
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Cursor', 'Cursor.exe'),
          path.join(process.env.PROGRAMFILES || '', 'Cursor', 'Cursor.exe'),
          path.join(process.env['PROGRAMFILES(X86)'] || '', 'Cursor', 'Cursor.exe'),
        ]

        for (const execPath of commonPaths) {
          if (fs.existsSync(execPath)) {
            const appPath = path.dirname(path.dirname(execPath))
            if (!found.includes(appPath)) {
              found.push(appPath)
            }
          }
        }

        // 使用where命令搜索
        try {
          const result = execSync('where Cursor.exe', {
            encoding: 'utf-8',
            timeout: 5000,
          })
          const paths = result.split('\n').filter(p => p.trim())
          for (const execPath of paths) {
            const appPath = path.dirname(path.dirname(execPath.trim()))
            if (fs.existsSync(execPath.trim()) && !found.includes(appPath)) {
              found.push(appPath)
            }
          }
        } catch (error) {
          // where命令失败，忽略
        }
      }

      console.log(`✅ 找到 ${found.length} 个Cursor安装位置:`, found)
      return found
    } catch (error) {
      console.error('❌ 搜索Cursor失败:', error)
      return found
    }
  }

  /**
   * 设置自定义Cursor路径
   */
  setCustomCursorPath(appPath: string): boolean {
    try {
      // 验证路径是否有效
      let execPath: string
      if (this.platform === 'darwin') {
        execPath = path.join(appPath, 'Contents', 'MacOS', 'Cursor')
      } else {
        execPath = path.join(appPath, 'Cursor.exe')
      }

      if (!fs.existsSync(execPath)) {
        console.error('❌ 无效的Cursor路径:', execPath)
        return false
      }

      // 保存配置
      this.customCursorPath = appPath
      const configPath = path.join(app.getPath('userData'), 'cursor-path.json')
      fs.writeFileSync(configPath, JSON.stringify({ customPath: appPath }, null, 2), 'utf-8')

      console.log('✅ 已保存自定义Cursor路径:', appPath)
      return true
    } catch (error) {
      console.error('❌ 保存自定义路径失败:', error)
      return false
    }
  }

  /**
   * 清除自定义路径，恢复使用默认路径
   */
  clearCustomCursorPath(): void {
    try {
      this.customCursorPath = null
      const configPath = path.join(app.getPath('userData'), 'cursor-path.json')
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath)
      }
      console.log('✅ 已清除自定义Cursor路径')
    } catch (error) {
      console.error('❌ 清除自定义路径失败:', error)
    }
  }

  /**
   * 获取Cursor可执行文件路径
   * 优先使用自定义路径
   */
  getCursorExecutablePath(): string {
    // 如果有自定义路径，使用自定义路径
    if (this.customCursorPath) {
      if (this.platform === 'darwin') {
        return path.join(this.customCursorPath, 'Contents', 'MacOS', 'Cursor')
      } else if (this.platform === 'win32') {
        return path.join(this.customCursorPath, 'Cursor.exe')
      }
    }

    // 否则使用默认路径
    if (this.platform === 'darwin') {
      return '/Applications/Cursor.app/Contents/MacOS/Cursor'
    } else if (this.platform === 'win32') {
      return path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Cursor', 'Cursor.exe')
    }
    throw new Error('Unsupported platform')
  }

  /**
   * 获取当前使用的Cursor路径（App路径，不是可执行文件路径）
   */
  getCurrentCursorAppPath(): string | null {
    if (this.customCursorPath) {
      return this.customCursorPath
    }

    if (this.platform === 'darwin') {
      const defaultPath = '/Applications/Cursor.app'
      return fs.existsSync(defaultPath) ? defaultPath : null
    } else if (this.platform === 'win32') {
      const defaultPath = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Cursor')
      return fs.existsSync(path.join(defaultPath, 'Cursor.exe')) ? defaultPath : null
    }

    return null
  }

  /**
   * 获取认证相关文件路径
   */
  getAuthFiles(): string[] {
    return [
      path.join(this.cursorDataPath, 'Cookies'),
      path.join(this.cursorDataPath, 'Cookies-journal'),
      path.join(this.cursorDataPath, 'Network Persistent State'),
    ]
  }

  /**
   * 获取Local Storage目录
   */
  getLocalStoragePath(): string {
    return path.join(this.cursorDataPath, 'Local Storage', 'leveldb')
  }

  /**
   * 获取globalStorage配置文件
   */
  getStorageJsonPath(): string {
    return path.join(this.cursorDataPath, 'User', 'globalStorage', 'storage.json')
  }

  /**
   * 获取用户设置文件
   */
  getUserSettingsPath(): string {
    return path.join(this.cursorDataPath, 'User', 'settings.json')
  }

  /**
   * 获取工作区存储目录
   */
  getWorkspaceStoragePath(): string {
    return path.join(this.cursorDataPath, 'User', 'workspaceStorage')
  }

  /**
   * 获取会话相关目录
   */
  getSessionPaths(): string[] {
    return [
      path.join(this.cursorDataPath, 'User', 'globalStorage'),
      path.join(this.cursorDataPath, 'User', 'workspaceStorage'),
      path.join(this.cursorDataPath, 'User', 'History'),
    ]
  }

  /**
   * 获取备份目录（我们自己的应用数据）
   */
  getBackupBasePath(): string {
    const appData = app.getPath('userData')
    return path.join(appData, 'backups')
  }

  /**
   * 获取账号备份目录
   */
  getAccountBackupPath(email: string): string {
    return path.join(this.getBackupBasePath(), 'accounts', email)
  }

  /**
   * 获取数据库路径
   */
  getDatabasePath(): string {
    return path.join(app.getPath('userData'), 'accounts.db')
  }

  get dataPath(): string {
    return this.cursorDataPath
  }
}

export const cursorPaths = CursorPaths.getInstance()
