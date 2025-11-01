import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { cursorPaths } from './cursor-paths'
import { appDatabase } from './database'

/**
 * 备份和恢复服务
 * 负责备份/恢复Cursor的会话、设置、工作区等数据
 */
export class BackupService {
  /**
   * 获取备份根目录
   */
  private getBackupRoot(): string {
    return cursorPaths.getBackupBasePath()
  }

  /**
   * 确保备份目录存在
   */
  private ensureBackupDir(): void {
    const backupRoot = this.getBackupRoot()
    if (!fs.existsSync(backupRoot)) {
      fs.mkdirSync(backupRoot, { recursive: true })
    }
  }

  /**
   * 复制文件夹
   */
  private copyFolderRecursive(source: string, target: string): void {
    if (!fs.existsSync(source)) {
      return
    }

    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true })
    }

    const files = fs.readdirSync(source)

    for (const file of files) {
      const sourcePath = path.join(source, file)
      const targetPath = path.join(target, file)

      if (fs.lstatSync(sourcePath).isDirectory()) {
        this.copyFolderRecursive(sourcePath, targetPath)
      } else {
        fs.copyFileSync(sourcePath, targetPath)
      }
    }
  }

  /**
   * 完整备份（会话 + 设置 + MCP）
   * @param accountEmail 账号邮箱（可选，如果只备份设置则不需要）
   * @param temporary 是否为临时备份（切换账号时的临时备份，不会记录到数据库，恢复后自动删除）
   */
  async backupAll(
    accountEmail?: string,
    temporary: boolean = false
  ): Promise<{ success: boolean; message: string; backupPath?: string }> {
    try {
      this.ensureBackupDir()

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const backupName = accountEmail
        ? `complete_${accountEmail}_${timestamp}`
        : `complete_${timestamp}`
      const backupPath = path.join(this.getBackupRoot(), backupName)

      fs.mkdirSync(backupPath, { recursive: true })

      const itemsToBak: { name: string; source: string; success: boolean }[] = []

      // === 会话数据备份 ===

      // 1. 备份 state.vscdb（包含会话状态）
      const stateDbPath = path.join(cursorPaths.dataPath, 'User', 'globalStorage', 'state.vscdb')
      if (fs.existsSync(stateDbPath)) {
        fs.copyFileSync(stateDbPath, path.join(backupPath, 'state.vscdb'))
        itemsToBak.push({ name: 'state.vscdb', source: stateDbPath, success: true })
      }

      // 2. 备份 storage.json（机器码和配置）
      const storageJsonPath = path.join(
        cursorPaths.dataPath,
        'User',
        'globalStorage',
        'storage.json'
      )
      if (fs.existsSync(storageJsonPath)) {
        fs.copyFileSync(storageJsonPath, path.join(backupPath, 'storage.json'))
        itemsToBak.push({ name: 'storage.json', source: storageJsonPath, success: true })
      }

      // 3. 备份工作区存储
      const workspaceStoragePath = path.join(cursorPaths.dataPath, 'User', 'workspaceStorage')
      if (fs.existsSync(workspaceStoragePath)) {
        const targetWorkspace = path.join(backupPath, 'workspaceStorage')
        this.copyFolderRecursive(workspaceStoragePath, targetWorkspace)
        itemsToBak.push({
          name: 'workspaceStorage',
          source: workspaceStoragePath,
          success: true,
        })
      }

      // 4. 备份历史记录
      const historyPath = path.join(cursorPaths.dataPath, 'User', 'History')
      if (fs.existsSync(historyPath)) {
        const targetHistory = path.join(backupPath, 'History')
        this.copyFolderRecursive(historyPath, targetHistory)
        itemsToBak.push({ name: 'History', source: historyPath, success: true })
      }

      // 5. 备份 Cookies（认证信息）
      const cookiesPath = path.join(cursorPaths.dataPath, 'Cookies')
      if (fs.existsSync(cookiesPath)) {
        fs.copyFileSync(cookiesPath, path.join(backupPath, 'Cookies'))
        itemsToBak.push({ name: 'Cookies', source: cookiesPath, success: true })
      }

      // 6. 备份 Local Storage
      const localStoragePath = path.join(cursorPaths.dataPath, 'Local Storage')
      if (fs.existsSync(localStoragePath)) {
        const targetLS = path.join(backupPath, 'Local Storage')
        this.copyFolderRecursive(localStoragePath, targetLS)
        itemsToBak.push({ name: 'Local Storage', source: localStoragePath, success: true })
      }

      // 7. 备份 Session Storage（重要！会话状态）
      const sessionStoragePath = path.join(cursorPaths.dataPath, 'Session Storage')
      if (fs.existsSync(sessionStoragePath)) {
        const targetSS = path.join(backupPath, 'Session Storage')
        this.copyFolderRecursive(sessionStoragePath, targetSS)
        itemsToBak.push({ name: 'Session Storage', source: sessionStoragePath, success: true })
      }

      // === 设置备份 ===

      // 8. 备份 settings.json
      const settingsPath = path.join(cursorPaths.dataPath, 'User', 'settings.json')
      if (fs.existsSync(settingsPath)) {
        fs.copyFileSync(settingsPath, path.join(backupPath, 'settings.json'))
        itemsToBak.push({ name: 'settings.json', source: settingsPath, success: true })
      }

      // 9. 备份 keybindings.json
      const keybindingsPath = path.join(cursorPaths.dataPath, 'User', 'keybindings.json')
      if (fs.existsSync(keybindingsPath)) {
        fs.copyFileSync(keybindingsPath, path.join(backupPath, 'keybindings.json'))
        itemsToBak.push({ name: 'keybindings.json', source: keybindingsPath, success: true })
      }

      // 10. 备份 snippets
      const snippetsPath = path.join(cursorPaths.dataPath, 'User', 'snippets')
      if (fs.existsSync(snippetsPath)) {
        const targetSnippets = path.join(backupPath, 'snippets')
        this.copyFolderRecursive(snippetsPath, targetSnippets)
        itemsToBak.push({ name: 'snippets', source: snippetsPath, success: true })
      }

      // 11. 备份 profiles.json（如果有）
      const profilesPath = path.join(cursorPaths.dataPath, 'User', 'profiles.json')
      if (fs.existsSync(profilesPath)) {
        fs.copyFileSync(profilesPath, path.join(backupPath, 'profiles.json'))
        itemsToBak.push({ name: 'profiles.json', source: profilesPath, success: true })
      }

      // 12. 备份扩展列表
      const extensionsPath = path.join(cursorPaths.dataPath, 'User', 'extensions.json')
      if (fs.existsSync(extensionsPath)) {
        fs.copyFileSync(extensionsPath, path.join(backupPath, 'extensions.json'))
        itemsToBak.push({ name: 'extensions.json', source: extensionsPath, success: true })
      }

      // === MCP 备份 ===

      // 13. 备份 MCP 配置 (在 globalStorage 中)
      const mcpConfigPath = path.join(
        cursorPaths.dataPath,
        'User',
        'globalStorage',
        'rooveterinaryinc.roo-cline'
      )
      if (fs.existsSync(mcpConfigPath)) {
        const targetMcp = path.join(backupPath, 'mcp-config')
        this.copyFolderRecursive(mcpConfigPath, targetMcp)
        itemsToBak.push({ name: 'MCP Config (Cline)', source: mcpConfigPath, success: true })
      }

      // 14. 备份可能的 .cursor-mcp 配置
      const homeMcpPath = path.join(os.homedir(), '.cursor-mcp')
      if (fs.existsSync(homeMcpPath)) {
        const targetHomeMcp = path.join(backupPath, 'cursor-mcp')
        this.copyFolderRecursive(homeMcpPath, targetHomeMcp)
        itemsToBak.push({ name: 'Cursor MCP Config', source: homeMcpPath, success: true })
      }

      // 15. 备份项目级 MCP 配置（如果在设置中有引用）
      // 检查 settings.json 中的 MCP 相关设置
      if (fs.existsSync(settingsPath)) {
        try {
          const settingsContent = fs.readFileSync(settingsPath, 'utf-8')
          const settings = JSON.parse(settingsContent)

          // 如果有 MCP 服务器配置，记录一下
          if (settings['mcp.servers'] || settings['mcpServers']) {
            const mcpInfo = {
              hasMcpConfig: true,
              servers: settings['mcp.servers'] || settings['mcpServers'],
            }
            fs.writeFileSync(
              path.join(backupPath, 'mcp-info.json'),
              JSON.stringify(mcpInfo, null, 2)
            )
            itemsToBak.push({ name: 'MCP Settings Info', source: 'settings.json', success: true })
          }
        } catch (err) {
          console.warn('Failed to parse settings.json for MCP config:', err)
        }
      }

      // 保存备份元数据
      const metadata = {
        type: 'complete',
        accountEmail,
        timestamp: new Date().toISOString(),
        items: itemsToBak,
        cursorVersion: 'unknown',
        temporary: temporary,
      }
      fs.writeFileSync(path.join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2))

      // 记录到数据库（仅非临时备份才记录）
      if (!temporary) {
        try {
          appDatabase.addBackup(accountEmail || 'all', backupPath, 'complete')
        } catch (err) {
          console.warn('记录备份到数据库失败:', err)
        }
      }

      return {
        success: true,
        message: `完整备份已完成\n位置: ${backupPath}\n包含: ${itemsToBak.length} 项\n\n包括:\n- 会话数据\n- 用户设置\n- MCP 配置`,
        backupPath,
      }
    } catch (error: any) {
      console.error('完整备份失败:', error)
      return {
        success: false,
        message: '完整备份失败: ' + error.message,
      }
    }
  }

  /**
   * 备份会话数据（针对特定账号）
   * @param accountEmail 账号邮箱
   * @param temporary 是否为临时备份（切换账号时的临时备份，不会记录到数据库，恢复后自动删除）
   * @deprecated 使用 backupAll() 代替
   */
  async backupSession(
    accountEmail: string,
    temporary: boolean = false
  ): Promise<{ success: boolean; message: string; backupPath?: string }> {
    try {
      this.ensureBackupDir()

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const backupName = `session_${accountEmail}_${timestamp}`
      const backupPath = path.join(this.getBackupRoot(), backupName)

      fs.mkdirSync(backupPath, { recursive: true })

      // 备份项目列表
      const itemsToBak: { name: string; source: string; success: boolean }[] = []

      // 1. 备份 state.vscdb（包含会话状态）
      const stateDbPath = path.join(cursorPaths.dataPath, 'User', 'globalStorage', 'state.vscdb')
      if (fs.existsSync(stateDbPath)) {
        fs.copyFileSync(stateDbPath, path.join(backupPath, 'state.vscdb'))
        itemsToBak.push({ name: 'state.vscdb', source: stateDbPath, success: true })
      }

      // 2. 备份 storage.json（机器码和配置）
      const storageJsonPath = path.join(
        cursorPaths.dataPath,
        'User',
        'globalStorage',
        'storage.json'
      )
      if (fs.existsSync(storageJsonPath)) {
        fs.copyFileSync(storageJsonPath, path.join(backupPath, 'storage.json'))
        itemsToBak.push({ name: 'storage.json', source: storageJsonPath, success: true })
      }

      // 3. 备份工作区存储
      const workspaceStoragePath = path.join(cursorPaths.dataPath, 'User', 'workspaceStorage')
      if (fs.existsSync(workspaceStoragePath)) {
        const targetWorkspace = path.join(backupPath, 'workspaceStorage')
        this.copyFolderRecursive(workspaceStoragePath, targetWorkspace)
        itemsToBak.push({
          name: 'workspaceStorage',
          source: workspaceStoragePath,
          success: true,
        })
      }

      // 4. 备份历史记录
      const historyPath = path.join(cursorPaths.dataPath, 'User', 'History')
      if (fs.existsSync(historyPath)) {
        const targetHistory = path.join(backupPath, 'History')
        this.copyFolderRecursive(historyPath, targetHistory)
        itemsToBak.push({ name: 'History', source: historyPath, success: true })
      }

      // 5. 备份 Cookies（认证信息）
      const cookiesPath = path.join(cursorPaths.dataPath, 'Cookies')
      if (fs.existsSync(cookiesPath)) {
        fs.copyFileSync(cookiesPath, path.join(backupPath, 'Cookies'))
        itemsToBak.push({ name: 'Cookies', source: cookiesPath, success: true })
      }

      // 6. 备份 Local Storage
      const localStoragePath = path.join(cursorPaths.dataPath, 'Local Storage')
      if (fs.existsSync(localStoragePath)) {
        const targetLS = path.join(backupPath, 'Local Storage')
        this.copyFolderRecursive(localStoragePath, targetLS)
        itemsToBak.push({ name: 'Local Storage', source: localStoragePath, success: true })
      }

      // 7. 备份 Session Storage（重要！会话状态）
      const sessionStoragePath = path.join(cursorPaths.dataPath, 'Session Storage')
      if (fs.existsSync(sessionStoragePath)) {
        const targetSS = path.join(backupPath, 'Session Storage')
        this.copyFolderRecursive(sessionStoragePath, targetSS)
        itemsToBak.push({ name: 'Session Storage', source: sessionStoragePath, success: true })
      }

      // 保存备份元数据
      const metadata = {
        accountEmail,
        timestamp: new Date().toISOString(),
        items: itemsToBak,
        cursorVersion: 'unknown',
        temporary: temporary, // 标记是否为临时备份
      }
      fs.writeFileSync(path.join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2))

      // 记录到数据库（仅非临时备份才记录）
      if (!temporary) {
        try {
          appDatabase.addBackup(accountEmail, backupPath, 'session')
        } catch (err) {
          console.warn('记录备份到数据库失败:', err)
        }
      }

      return {
        success: true,
        message: `会话已备份\n位置: ${backupPath}\n包含: ${itemsToBak.length} 项`,
        backupPath,
      }
    } catch (error: any) {
      console.error('备份会话失败:', error)
      return {
        success: false,
        message: '备份会话失败: ' + error.message,
      }
    }
  }

  /**
   * 备份用户设置
   * @param temporary 是否为临时备份（切换账号时的临时备份，不会记录到数据库，恢复后自动删除）
   */
  async backupSettings(temporary: boolean = false): Promise<{
    success: boolean
    message: string
    backupPath?: string
  }> {
    try {
      this.ensureBackupDir()

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const backupName = `settings_${timestamp}`
      const backupPath = path.join(this.getBackupRoot(), backupName)

      fs.mkdirSync(backupPath, { recursive: true })

      const itemsToBak: { name: string; source: string; success: boolean }[] = []

      // 1. 备份 settings.json
      const settingsPath = path.join(cursorPaths.dataPath, 'User', 'settings.json')
      if (fs.existsSync(settingsPath)) {
        fs.copyFileSync(settingsPath, path.join(backupPath, 'settings.json'))
        itemsToBak.push({ name: 'settings.json', source: settingsPath, success: true })
      }

      // 2. 备份 keybindings.json
      const keybindingsPath = path.join(cursorPaths.dataPath, 'User', 'keybindings.json')
      if (fs.existsSync(keybindingsPath)) {
        fs.copyFileSync(keybindingsPath, path.join(backupPath, 'keybindings.json'))
        itemsToBak.push({ name: 'keybindings.json', source: keybindingsPath, success: true })
      }

      // 3. 备份 snippets
      const snippetsPath = path.join(cursorPaths.dataPath, 'User', 'snippets')
      if (fs.existsSync(snippetsPath)) {
        const targetSnippets = path.join(backupPath, 'snippets')
        this.copyFolderRecursive(snippetsPath, targetSnippets)
        itemsToBak.push({ name: 'snippets', source: snippetsPath, success: true })
      }

      // 4. 备份 profiles.json（如果有）
      const profilesPath = path.join(cursorPaths.dataPath, 'User', 'profiles.json')
      if (fs.existsSync(profilesPath)) {
        fs.copyFileSync(profilesPath, path.join(backupPath, 'profiles.json'))
        itemsToBak.push({ name: 'profiles.json', source: profilesPath, success: true })
      }

      // 5. 备份扩展列表
      const extensionsPath = path.join(cursorPaths.dataPath, 'User', 'extensions.json')
      if (fs.existsSync(extensionsPath)) {
        fs.copyFileSync(extensionsPath, path.join(backupPath, 'extensions.json'))
        itemsToBak.push({ name: 'extensions.json', source: extensionsPath, success: true })
      }

      // 保存元数据
      const metadata = {
        type: 'settings',
        timestamp: new Date().toISOString(),
        items: itemsToBak,
        temporary: temporary, // 标记是否为临时备份
      }
      fs.writeFileSync(path.join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2))

      // 记录到数据库（仅非临时备份才记录）
      if (!temporary) {
        try {
          appDatabase.addBackup('settings', backupPath, 'settings')
        } catch (err) {
          console.warn('记录备份到数据库失败:', err)
        }
      }

      return {
        success: true,
        message: `设置已备份\n位置: ${backupPath}\n包含: ${itemsToBak.length} 项`,
        backupPath,
      }
    } catch (error: any) {
      console.error('备份设置失败:', error)
      return {
        success: false,
        message: '备份设置失败: ' + error.message,
      }
    }
  }

  /**
   * 恢复完整备份（会话 + 设置 + MCP）
   */
  async restoreAll(backupPath: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // 检查备份是否存在
      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          message: '备份不存在',
        }
      }

      // 读取元数据
      const metadataPath = path.join(backupPath, 'metadata.json')
      let metadata: any = {}
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
      }

      const restoredItems: string[] = []

      // === 恢复会话数据 ===

      // 1. 恢复 state.vscdb
      const stateDbBackup = path.join(backupPath, 'state.vscdb')
      if (fs.existsSync(stateDbBackup)) {
        const stateDbPath = path.join(cursorPaths.dataPath, 'User', 'globalStorage', 'state.vscdb')
        if (fs.existsSync(stateDbPath)) {
          fs.copyFileSync(stateDbPath, stateDbPath + '.before-restore')
        }
        fs.copyFileSync(stateDbBackup, stateDbPath)
        restoredItems.push('state.vscdb')
      }

      // 2. 恢复 storage.json
      const storageBackup = path.join(backupPath, 'storage.json')
      if (fs.existsSync(storageBackup)) {
        const storagePath = path.join(cursorPaths.dataPath, 'User', 'globalStorage', 'storage.json')
        if (fs.existsSync(storagePath)) {
          fs.copyFileSync(storagePath, storagePath + '.before-restore')
        }
        fs.copyFileSync(storageBackup, storagePath)
        restoredItems.push('storage.json')
      }

      // 3. 恢复工作区存储
      const workspaceBackup = path.join(backupPath, 'workspaceStorage')
      if (fs.existsSync(workspaceBackup)) {
        const workspacePath = path.join(cursorPaths.dataPath, 'User', 'workspaceStorage')
        if (fs.existsSync(workspacePath)) {
          fs.rmSync(workspacePath, { recursive: true, force: true })
        }
        this.copyFolderRecursive(workspaceBackup, workspacePath)
        restoredItems.push('workspaceStorage')
      }

      // 4. 恢复历史记录
      const historyBackup = path.join(backupPath, 'History')
      if (fs.existsSync(historyBackup)) {
        const historyPath = path.join(cursorPaths.dataPath, 'User', 'History')
        if (fs.existsSync(historyPath)) {
          fs.rmSync(historyPath, { recursive: true, force: true })
        }
        this.copyFolderRecursive(historyBackup, historyPath)
        restoredItems.push('History')
      }

      // 5. 恢复 Cookies
      const cookiesBackup = path.join(backupPath, 'Cookies')
      if (fs.existsSync(cookiesBackup)) {
        const cookiesPath = path.join(cursorPaths.dataPath, 'Cookies')
        if (fs.existsSync(cookiesPath)) {
          fs.copyFileSync(cookiesPath, cookiesPath + '.before-restore')
        }
        fs.copyFileSync(cookiesBackup, cookiesPath)
        restoredItems.push('Cookies')
      }

      // 6. 恢复 Local Storage
      const lsBackup = path.join(backupPath, 'Local Storage')
      if (fs.existsSync(lsBackup)) {
        const lsPath = path.join(cursorPaths.dataPath, 'Local Storage')
        if (fs.existsSync(lsPath)) {
          fs.rmSync(lsPath, { recursive: true, force: true })
        }
        this.copyFolderRecursive(lsBackup, lsPath)
        restoredItems.push('Local Storage')
      }

      // 7. 恢复 Session Storage（重要！会话状态）
      const ssBackup = path.join(backupPath, 'Session Storage')
      if (fs.existsSync(ssBackup)) {
        const ssPath = path.join(cursorPaths.dataPath, 'Session Storage')
        if (fs.existsSync(ssPath)) {
          fs.rmSync(ssPath, { recursive: true, force: true })
        }
        this.copyFolderRecursive(ssBackup, ssPath)
        restoredItems.push('Session Storage')
      }

      // === 恢复设置 ===

      // 8. 恢复 settings.json
      const settingsBackup = path.join(backupPath, 'settings.json')
      if (fs.existsSync(settingsBackup)) {
        const settingsPath = path.join(cursorPaths.dataPath, 'User', 'settings.json')
        if (fs.existsSync(settingsPath)) {
          fs.copyFileSync(settingsPath, settingsPath + '.before-restore')
        }
        fs.copyFileSync(settingsBackup, settingsPath)
        restoredItems.push('settings.json')
      }

      // 9. 恢复 keybindings.json
      const keybindingsBackup = path.join(backupPath, 'keybindings.json')
      if (fs.existsSync(keybindingsBackup)) {
        const keybindingsPath = path.join(cursorPaths.dataPath, 'User', 'keybindings.json')
        if (fs.existsSync(keybindingsPath)) {
          fs.copyFileSync(keybindingsPath, keybindingsPath + '.before-restore')
        }
        fs.copyFileSync(keybindingsBackup, keybindingsPath)
        restoredItems.push('keybindings.json')
      }

      // 10. 恢复 snippets
      const snippetsBackup = path.join(backupPath, 'snippets')
      if (fs.existsSync(snippetsBackup)) {
        const snippetsPath = path.join(cursorPaths.dataPath, 'User', 'snippets')
        if (fs.existsSync(snippetsPath)) {
          fs.rmSync(snippetsPath, { recursive: true, force: true })
        }
        this.copyFolderRecursive(snippetsBackup, snippetsPath)
        restoredItems.push('snippets')
      }

      // 11. 恢复 profiles.json
      const profilesBackup = path.join(backupPath, 'profiles.json')
      if (fs.existsSync(profilesBackup)) {
        const profilesPath = path.join(cursorPaths.dataPath, 'User', 'profiles.json')
        if (fs.existsSync(profilesPath)) {
          fs.copyFileSync(profilesPath, profilesPath + '.before-restore')
        }
        fs.copyFileSync(profilesBackup, profilesPath)
        restoredItems.push('profiles.json')
      }

      // === 恢复 MCP 配置 ===

      // 12. 恢复 MCP 配置
      const mcpBackup = path.join(backupPath, 'mcp-config')
      if (fs.existsSync(mcpBackup)) {
        const mcpPath = path.join(
          cursorPaths.dataPath,
          'User',
          'globalStorage',
          'rooveterinaryinc.roo-cline'
        )
        if (fs.existsSync(mcpPath)) {
          fs.rmSync(mcpPath, { recursive: true, force: true })
        }
        this.copyFolderRecursive(mcpBackup, mcpPath)
        restoredItems.push('MCP Config (Cline)')
      }

      // 13. 恢复 .cursor-mcp 配置
      const homeMcpBackup = path.join(backupPath, 'cursor-mcp')
      if (fs.existsSync(homeMcpBackup)) {
        const homeMcpPath = path.join(os.homedir(), '.cursor-mcp')
        if (fs.existsSync(homeMcpPath)) {
          fs.rmSync(homeMcpPath, { recursive: true, force: true })
        }
        this.copyFolderRecursive(homeMcpBackup, homeMcpPath)
        restoredItems.push('Cursor MCP Config')
      }

      appDatabase.addLog('restore_complete', `恢复完整备份: ${backupPath}`)

      return {
        success: true,
        message: `完整备份已恢复\n来自: ${metadata.accountEmail || 'all'}\n时间: ${metadata.timestamp || 'unknown'}\n恢复: ${restoredItems.length} 项\n\n包括会话、设置和MCP配置`,
      }
    } catch (error: any) {
      console.error('恢复完整备份失败:', error)
      return {
        success: false,
        message: '恢复完整备份失败: ' + error.message,
      }
    }
  }

  /**
   * 恢复会话数据
   * @deprecated 使用 restoreAll() 代替
   */
  async restoreSession(backupPath: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // 检查备份是否存在
      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          message: '备份不存在',
        }
      }

      // 读取元数据
      const metadataPath = path.join(backupPath, 'metadata.json')
      let metadata: any = {}
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
      }

      const restoredItems: string[] = []

      // 1. 恢复 state.vscdb
      const stateDbBackup = path.join(backupPath, 'state.vscdb')
      if (fs.existsSync(stateDbBackup)) {
        const stateDbPath = path.join(cursorPaths.dataPath, 'User', 'globalStorage', 'state.vscdb')
        // 先备份当前的
        if (fs.existsSync(stateDbPath)) {
          fs.copyFileSync(stateDbPath, stateDbPath + '.before-restore')
        }
        fs.copyFileSync(stateDbBackup, stateDbPath)
        restoredItems.push('state.vscdb')
      }

      // 2. 恢复 storage.json
      const storageBackup = path.join(backupPath, 'storage.json')
      if (fs.existsSync(storageBackup)) {
        const storagePath = path.join(cursorPaths.dataPath, 'User', 'globalStorage', 'storage.json')
        if (fs.existsSync(storagePath)) {
          fs.copyFileSync(storagePath, storagePath + '.before-restore')
        }
        fs.copyFileSync(storageBackup, storagePath)
        restoredItems.push('storage.json')
      }

      // 3. 恢复工作区存储
      const workspaceBackup = path.join(backupPath, 'workspaceStorage')
      if (fs.existsSync(workspaceBackup)) {
        const workspacePath = path.join(cursorPaths.dataPath, 'User', 'workspaceStorage')
        // 先清空当前的
        if (fs.existsSync(workspacePath)) {
          fs.rmSync(workspacePath, { recursive: true, force: true })
        }
        this.copyFolderRecursive(workspaceBackup, workspacePath)
        restoredItems.push('workspaceStorage')
      }

      // 4. 恢复历史记录
      const historyBackup = path.join(backupPath, 'History')
      if (fs.existsSync(historyBackup)) {
        const historyPath = path.join(cursorPaths.dataPath, 'User', 'History')
        if (fs.existsSync(historyPath)) {
          fs.rmSync(historyPath, { recursive: true, force: true })
        }
        this.copyFolderRecursive(historyBackup, historyPath)
        restoredItems.push('History')
      }

      // 5. 恢复 Cookies
      const cookiesBackup = path.join(backupPath, 'Cookies')
      if (fs.existsSync(cookiesBackup)) {
        const cookiesPath = path.join(cursorPaths.dataPath, 'Cookies')
        if (fs.existsSync(cookiesPath)) {
          fs.copyFileSync(cookiesPath, cookiesPath + '.before-restore')
        }
        fs.copyFileSync(cookiesBackup, cookiesPath)
        restoredItems.push('Cookies')
      }

      // 6. 恢复 Local Storage
      const lsBackup = path.join(backupPath, 'Local Storage')
      if (fs.existsSync(lsBackup)) {
        const lsPath = path.join(cursorPaths.dataPath, 'Local Storage')
        if (fs.existsSync(lsPath)) {
          fs.rmSync(lsPath, { recursive: true, force: true })
        }
        this.copyFolderRecursive(lsBackup, lsPath)
        restoredItems.push('Local Storage')
      }

      // 7. 恢复 Session Storage（重要！会话状态）
      const ssBackup = path.join(backupPath, 'Session Storage')
      if (fs.existsSync(ssBackup)) {
        const ssPath = path.join(cursorPaths.dataPath, 'Session Storage')
        if (fs.existsSync(ssPath)) {
          fs.rmSync(ssPath, { recursive: true, force: true })
        }
        this.copyFolderRecursive(ssBackup, ssPath)
        restoredItems.push('Session Storage')
      }

      appDatabase.addLog('restore_session', `恢复会话: ${backupPath}`)

      return {
        success: true,
        message: `会话已恢复\n来自: ${metadata.accountEmail || 'unknown'}\n时间: ${metadata.timestamp || 'unknown'}\n恢复: ${restoredItems.length} 项`,
      }
    } catch (error: any) {
      console.error('恢复会话失败:', error)
      return {
        success: false,
        message: '恢复会话失败: ' + error.message,
      }
    }
  }

  /**
   * 恢复设置
   */
  async restoreSettings(backupPath: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          message: '备份不存在',
        }
      }

      const restoredItems: string[] = []

      // 1. 恢复 settings.json
      const settingsBackup = path.join(backupPath, 'settings.json')
      if (fs.existsSync(settingsBackup)) {
        const settingsPath = path.join(cursorPaths.dataPath, 'User', 'settings.json')
        if (fs.existsSync(settingsPath)) {
          fs.copyFileSync(settingsPath, settingsPath + '.before-restore')
        }
        fs.copyFileSync(settingsBackup, settingsPath)
        restoredItems.push('settings.json')
      }

      // 2. 恢复 keybindings.json
      const keybindingsBackup = path.join(backupPath, 'keybindings.json')
      if (fs.existsSync(keybindingsBackup)) {
        const keybindingsPath = path.join(cursorPaths.dataPath, 'User', 'keybindings.json')
        if (fs.existsSync(keybindingsPath)) {
          fs.copyFileSync(keybindingsPath, keybindingsPath + '.before-restore')
        }
        fs.copyFileSync(keybindingsBackup, keybindingsPath)
        restoredItems.push('keybindings.json')
      }

      // 3. 恢复 snippets
      const snippetsBackup = path.join(backupPath, 'snippets')
      if (fs.existsSync(snippetsBackup)) {
        const snippetsPath = path.join(cursorPaths.dataPath, 'User', 'snippets')
        if (fs.existsSync(snippetsPath)) {
          fs.rmSync(snippetsPath, { recursive: true, force: true })
        }
        this.copyFolderRecursive(snippetsBackup, snippetsPath)
        restoredItems.push('snippets')
      }

      // 4. 恢复 profiles.json
      const profilesBackup = path.join(backupPath, 'profiles.json')
      if (fs.existsSync(profilesBackup)) {
        const profilesPath = path.join(cursorPaths.dataPath, 'User', 'profiles.json')
        if (fs.existsSync(profilesPath)) {
          fs.copyFileSync(profilesPath, profilesPath + '.before-restore')
        }
        fs.copyFileSync(profilesBackup, profilesPath)
        restoredItems.push('profiles.json')
      }

      appDatabase.addLog('restore_settings', `恢复设置: ${backupPath}`)

      return {
        success: true,
        message: `设置已恢复\n恢复: ${restoredItems.length} 项`,
      }
    } catch (error: any) {
      console.error('恢复设置失败:', error)
      return {
        success: false,
        message: '恢复设置失败: ' + error.message,
      }
    }
  }

  /**
   * 列出所有备份（排除临时备份）
   */
  listBackups(): Array<{
    name: string
    path: string
    type: string
    timestamp: string
    accountEmail?: string
  }> {
    try {
      const backupRoot = this.getBackupRoot()
      if (!fs.existsSync(backupRoot)) {
        return []
      }

      const backups: any[] = []
      const items = fs.readdirSync(backupRoot)

      for (const item of items) {
        const itemPath = path.join(backupRoot, item)
        if (fs.lstatSync(itemPath).isDirectory()) {
          const metadataPath = path.join(itemPath, 'metadata.json')
          let metadata: any = {}

          if (fs.existsSync(metadataPath)) {
            try {
              metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
            } catch (e) {
              // 忽略损坏的元数据
            }
          }

          // 跳过临时备份（切换账号时的临时备份不在备份管理中显示）
          if (metadata.temporary === true) {
            continue
          }

          // 确定备份类型
          let backupType = metadata.type
          if (!backupType) {
            if (item.startsWith('complete_')) {
              backupType = 'complete'
            } else if (item.startsWith('session_')) {
              backupType = 'session'
            } else {
              backupType = 'settings'
            }
          }

          backups.push({
            name: item,
            path: itemPath,
            type: backupType,
            timestamp: metadata.timestamp || 'unknown',
            accountEmail: metadata.accountEmail,
          })
        }
      }

      // 按时间倒序排序
      return backups.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })
    } catch (error) {
      console.error('列出备份失败:', error)
      return []
    }
  }

  /**
   * 删除备份
   */
  deleteBackup(backupPath: string): boolean {
    try {
      if (fs.existsSync(backupPath)) {
        fs.rmSync(backupPath, { recursive: true, force: true })
        return true
      }
      return false
    } catch (error) {
      console.error('删除备份失败:', error)
      return false
    }
  }
}

export const backupService = new BackupService()
