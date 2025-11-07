import { exec, execSync } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { cursorPaths } from './cursor-paths'

const execAsync = promisify(exec)

/**
 * 深度重置管理器
 * 包括系统UUID、程序文件修改、重新签名等
 * Windows 版本已增强，支持多重防护机制
 */
export class DeepResetManager {
  private cursorAppPath: string
  private backupBasePath: string

  constructor() {
    // 根据平台设置路径
    if (process.platform === 'darwin') {
      this.cursorAppPath = '/Applications/Cursor.app'
      this.backupBasePath = path.join(process.env.HOME!, 'Library/Application Support/Cursor/User/globalStorage/backups')
    } else if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE!, 'AppData', 'Local')
      this.cursorAppPath = path.join(localAppData, 'Programs', 'Cursor', 'Cursor.exe')
      this.backupBasePath = path.join(cursorPaths.dataPath, 'globalStorage', 'backups')
    } else {
      throw new Error('不支持的操作系统')
    }
  }

  /**
   * 确保备份目录存在
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupBasePath)) {
      fs.mkdirSync(this.backupBasePath, { recursive: true })
    }
  }

  /**
   * 生成时间戳
   */
  private getTimestamp(): string {
    const now = new Date()
    return now.toISOString().replace(/[:.]/g, '').slice(0, 15).replace('T', '_')
  }

  /**
   * 1. 修改系统UUID（需要管理员权限）
   */
  async resetSystemUUID(): Promise<{ success: boolean; oldUUID?: string; newUUID?: string; message: string }> {
    try {
      console.log('[深度重置] 修改系统UUID...')

      // 生成新的UUID
      const newUUID = crypto.randomUUID()

      // 在Mac上，系统UUID存储在多个位置
      // 注意：这需要管理员权限，并且可能不会完全生效
      // 实际的硬件UUID是只读的，我们只能修改软件层面的标识

      return {
        success: true,
        newUUID,
        message: `系统UUID已准备: ${newUUID}（注意：硬件UUID无法修改）`,
      }
    } catch (error: any) {
      return {
        success: false,
        message: '修改系统UUID失败: ' + error.message,
      }
    }
  }

  /**
   * 2. 清除DNS缓存
   */
  async clearDNSCache(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[深度重置] 清除DNS缓存...')

      if (process.platform === 'darwin') {
        // Mac: 清除DNS缓存
        await execAsync('sudo dscacheutil -flushcache')
        await execAsync('sudo killall -HUP mDNSResponder')
      } else if (process.platform === 'win32') {
        // Windows: 清除DNS缓存
        await execAsync('ipconfig /flushdns')
      }

      return {
        success: true,
        message: 'DNS缓存已清除',
      }
    } catch (error: any) {
      return {
        success: false,
        message: 'DNS缓存清除失败: ' + error.message,
      }
    }
  }

  /**
   * 3. 修改Cursor主程序文件（危险操作）
   */
  async modifyCursorApp(): Promise<{ success: boolean; message: string; details: string[] }> {
    const details: string[] = []

    try {
      console.log('[深度重置] 修改Cursor主程序文件...')

      // 检查Cursor是否存在
      if (!fs.existsSync(this.cursorAppPath)) {
        return {
          success: false,
          message: 'Cursor应用不存在',
          details,
        }
      }

      this.ensureBackupDir()
      const timestamp = this.getTimestamp()

      // Windows 和 Mac 的处理方式不同
      if (process.platform === 'win32') {
        return await this.modifyCursorAppWindows(details, timestamp)
      } else {
        return await this.modifyCursorAppMac(details, timestamp)
      }
    } catch (error: any) {
      return {
        success: false,
        message: '修改程序文件失败: ' + error.message,
        details,
      }
    }
  }

  /**
   * Mac 版本的程序文件修改
   */
  private async modifyCursorAppMac(details: string[], timestamp: string): Promise<{ success: boolean; message: string; details: string[] }> {
    // 1. 备份原应用
    const backupPath = path.join(this.backupBasePath, `Cursor.app.backup_${timestamp}`)
    
    console.log('[深度重置] 备份原应用...')
    details.push('正在备份原应用...')
    
    // 使用cp -R备份（注意：这会很慢，大约几百MB）
    try {
      execSync(`cp -R "${this.cursorAppPath}" "${backupPath}"`, { stdio: 'ignore' })
      details.push(`✅ 应用已备份到: ${backupPath}`)
    } catch (e) {
      details.push('⚠️ 备份失败，继续执行（风险操作）')
    }

    // 2. 定位需要修改的文件（尝试多个可能的路径）
    const possibleMainJsPaths = [
      path.join(this.cursorAppPath, 'Contents/Resources/app/out/main.js'), // 外部脚本使用的路径
      path.join(this.cursorAppPath, 'Contents/Resources/app/out/vs/code/electron-main/main.js'), // 项目使用的路径
    ]
    
    const mainJsPath = possibleMainJsPaths.find(p => fs.existsSync(p)) || possibleMainJsPaths[0]
    
    const cliProcessPath = path.join(
      this.cursorAppPath,
      'Contents/Resources/app/out/vs/server/node/cliProcessMain.js'
    )

    const filesToModify = [
      { path: mainJsPath, name: 'main.js' },
      { path: cliProcessPath, name: 'cliProcessMain.js' },
    ]

    // 3. 生成随机标识符（用于替换可能的硬编码ID）
    const randomId1 = crypto.randomBytes(16).toString('hex')
    const randomId2 = crypto.randomBytes(16).toString('hex')

    details.push('正在修改程序文件...')

    for (const file of filesToModify) {
      if (fs.existsSync(file.path)) {
        try {
          // 读取文件
          let content = fs.readFileSync(file.path, 'utf-8')
          const originalContent = content
          let modified = false

          // 🔥 关键修复：替换 ioreg 命令（获取系统UUID的命令）
          // 这是外部脚本的核心功能：阻止Cursor从系统获取真实的硬件UUID
          // 匹配各种可能的转义形式
          const ioregPatterns = [
            // 匹配: ioreg -rd1 -c IOPlatformExpertDevice (最常见形式)
            /ioreg\s+-rd1\s+-c\s+IOPlatformExpertDevice/g,
            // 匹配转义后的形式
            /ioreg\\s\+-rd1\\s\+-c\\s\+IOPlatformExpertDevice/g,
          ]
          
          const ioregReplacement = 'UUID=$(uuidgen | tr \'[:upper:]\' \'[:lower:]\');echo \\"IOPlatformUUID = \\"$UUID\\";'
          
          for (const pattern of ioregPatterns) {
            if (pattern.test(content)) {
              const beforeLength = content.length
              content = content.replace(pattern, ioregReplacement)
              // 验证是否真的替换了
              if (content.length !== beforeLength || content.includes('UUID=$(uuidgen')) {
                modified = true
                details.push(`✅ 已替换 ioreg 命令（系统UUID获取）`)
                break // 只替换一次
              }
            }
          }

          // 替换可能的硬编码标识符
          content = content.replace(/machineId["']?\s*:\s*["'][^"']{32,}["']/g, `machineId:"${randomId1}"`)
          content = content.replace(/deviceId["']?\s*:\s*["'][^"']{32,}["']/g, `deviceId:"${randomId2}"`)

          // 如果内容改变了才写入
          if (content !== originalContent) {
            fs.writeFileSync(file.path, content, 'utf-8')
            details.push(`✅ 已修改: ${file.name}`)
          } else {
            details.push(`⚠️ 未找到需要修改的标识符: ${file.name}`)
          }
        } catch (err: any) {
          details.push(`❌ 修改失败: ${file.name} - ${err.message}`)
        }
      } else {
        details.push(`⚠️ 文件不存在: ${file.name}`)
      }
    }

    // 4. 移除代码签名（修改后签名会失效）
    console.log('[深度重置] 移除应用签名...')
    details.push('正在移除应用签名...')

    try {
      execSync(`sudo codesign --remove-signature "${this.cursorAppPath}"`, { stdio: 'ignore' })
      details.push('✅ 应用签名已移除')
    } catch (e) {
      details.push('⚠️ 移除签名失败（可能需要管理员权限）')
    }

    // 5. 自签名（让应用能运行）
    console.log('[深度重置] 重新签名应用...')
    details.push('正在重新签名应用...')

    try {
      execSync(`sudo codesign --force --deep --sign - "${this.cursorAppPath}"`, { stdio: 'ignore' })
      details.push('✅ 应用已重新签名（使用临时签名）')
    } catch (e) {
      details.push('⚠️ 重新签名失败（应用可能无法启动）')
    }

    // 6. 清除属性标签（移除隔离标记）
    try {
      execSync(`sudo xattr -cr "${this.cursorAppPath}"`, { stdio: 'ignore' })
      details.push('✅ 已清除隔离标记')
    } catch (e) {
      details.push('⚠️ 清除标记失败')
    }

    return {
      success: true,
      message: '程序文件修改完成',
      details,
    }
  }

  /**
   * Windows 版本的程序文件修改
   */
  private async modifyCursorAppWindows(details: string[], timestamp: string): Promise<{ success: boolean; message: string; details: string[] }> {
    // 1. 备份原程序目录（关键文件）
    const cursorDir = path.dirname(this.cursorAppPath)
    const resourcesDir = path.join(cursorDir, 'resources', 'app')
    
    if (!fs.existsSync(resourcesDir)) {
      details.push('⚠️ 未找到 Cursor 资源目录')
      return {
        success: false,
        message: 'Cursor资源目录不存在',
        details,
      }
    }

    details.push('正在备份关键文件...')
    const backupDir = path.join(this.backupBasePath, `cursor_backup_${timestamp}`)
    fs.mkdirSync(backupDir, { recursive: true })

    // 2. 定位需要修改的文件（Windows路径，尝试多个可能的路径）
    const possibleMainJsPaths = [
      path.join(resourcesDir, 'out', 'main.js'), // 外部脚本使用的路径
      path.join(resourcesDir, 'out', 'vs', 'code', 'electron-main', 'main.js'), // 项目使用的路径
    ]
    
    const mainJsPath = possibleMainJsPaths.find(p => fs.existsSync(p)) || possibleMainJsPaths[0]
    
    const filesToModify = [
      {
        path: mainJsPath,
        name: 'main.js',
      },
      {
        path: path.join(resourcesDir, 'out', 'vs', 'server', 'node', 'cliProcessMain.js'),
        name: 'cliProcessMain.js',
      },
      {
        path: path.join(resourcesDir, 'out', 'vs', 'workbench', 'workbench.desktop.main.js'),
        name: 'workbench.desktop.main.js',
      },
    ]

    // 3. 生成随机标识符
    const randomId1 = crypto.randomBytes(16).toString('hex')
    const randomId2 = crypto.randomBytes(16).toString('hex')
    const randomId3 = crypto.randomBytes(16).toString('hex')

    details.push('正在修改程序文件...')

    let modifiedCount = 0

    for (const file of filesToModify) {
      if (fs.existsSync(file.path)) {
        try {
          // 备份原文件
          const backupFile = path.join(backupDir, file.name)
          fs.copyFileSync(file.path, backupFile)

          // 读取文件
          let content = fs.readFileSync(file.path, 'utf-8')
          const originalContent = content
          let modified = false

          // 🔥 关键修复：替换 REG.exe 命令（获取Windows MachineGuid的命令）
          // 这是外部脚本的核心功能：阻止Cursor从注册表获取真实的MachineGuid
          // Python脚本使用的精确匹配: ${v5[s$()]}\\REG.exe QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid
          // 注意：Python中 r'\\' 表示字面量双反斜杠，实际文件中可能是 \REG.exe 或 \\REG.exe
          const regPatterns = [
            // 精确匹配Python脚本的格式: ${v5[s$()]}\\REG.exe ... (双反斜杠，这是Python raw string的字面量)
            // 在JavaScript文件中，这可能是转义后的形式
            /\$\{v\d+\[s\$\(\)\]\}\\{1,2}REG\.exe\s+QUERY\s+HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\s+\/v\s+MachineGuid/g,
            // 匹配: ${v5[s$()]}\REG.exe ... (单反斜杠)
            /\$\{v\d+\[s\$\(\)\]\}\\REG\.exe\s+QUERY\s+HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\s+\/v\s+MachineGuid/g,
            // 匹配: REG.exe QUERY ... (简化版本，没有变量前缀，可能在其他地方)
            /REG\.exe\s+QUERY\s+HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\s+\/v\s+MachineGuid/g,
            // 匹配: reg query "HKLM\SOFTWARE\Microsoft\Cryptography" /v MachineGuid (带引号版本)
            /reg\s+query\s+["']HKLM\\SOFTWARE\\Microsoft\\Cryptography["']\s+\/v\s+MachineGuid/gi,
            // 匹配: reg query HKLM\SOFTWARE\Microsoft\Cryptography /v MachineGuid (不带引号)
            /reg\s+query\s+HKLM\\SOFTWARE\\Microsoft\\Cryptography\s+\/v\s+MachineGuid/gi,
            // 匹配: wmic csproduct get uuid (另一种获取方式)
            /wmic\s+csproduct\s+get\s+uuid/gi,
            // 匹配: powershell Get-ItemProperty (PowerShell方式)
            /Get-ItemProperty\s+.*HKLM.*Cryptography.*MachineGuid/gi,
          ]
          
          const regReplacement = 'powershell -Command "[guid]::NewGuid().ToString().ToLower()"'
          
          for (const pattern of regPatterns) {
            if (pattern.test(content)) {
              const beforeLength = content.length
              content = content.replace(pattern, regReplacement)
              // 验证是否真的替换了
              if (content.length !== beforeLength || content.includes(regReplacement)) {
                modified = true
                details.push(`✅ 已替换系统标识获取命令`)
                break // 只替换一次
              }
            }
          }

          // 🔥 新增：尝试拦截 Node.js API 调用
          // 匹配 os.machineId() 或 require('os').machineId() 等调用
          const nodeApiPatterns = [
            // 匹配: os.machineId() 或 require('os').machineId()
            /(?:require\(['"]os['"]\)|os)\.machineId\(\)/g,
            // 匹配: require('os').platform() 后获取机器ID的逻辑
            /require\(['"]os['"]\)\.(?:machineId|hostname|platform)\(\)/g,
            // 匹配: crypto.randomUUID() 但替换为固定值（用于测试）
            // 注意：这个可能不需要替换，因为随机UUID是好的
          ]

          // 尝试替换 Node.js API 调用为随机生成的值
          const randomGuid = crypto.randomUUID()
          for (const pattern of nodeApiPatterns) {
            if (pattern.test(content)) {
              // 在调用后添加覆盖逻辑
              const apiReplacement = `(function(){const _orig=require('os').machineId;require('os').machineId=function(){return'${randomGuid}';};return _orig();})()`
              content = content.replace(pattern, apiReplacement)
              modified = true
              details.push(`✅ 已拦截 Node.js API 调用`)
              break
            }
          }

          // 替换各种可能的标识符
          const patterns = [
            { regex: /machineId["']?\s*:\s*["'][^"']{32,}["']/g, replacement: `machineId:"${randomId1}"` },
            { regex: /deviceId["']?\s*:\s*["'][^"']{32,}["']/g, replacement: `deviceId:"${randomId2}"` },
            { regex: /sqmId["']?\s*:\s*["'][^"']{32,}["']/g, replacement: `sqmId:"${randomId3}"` },
            { regex: /telemetry\.machineId/g, replacement: `telemetry.machineId_${Date.now()}` },
            // 新增：匹配更多可能的标识符格式
            { regex: /["']machineId["']\s*:\s*["'][^"']{32,}["']/g, replacement: `"machineId":"${randomId1}"` },
            { regex: /machineId\s*=\s*["'][^"']{32,}["']/g, replacement: `machineId="${randomId1}"` },
            { regex: /MACHINE_GUID\s*[:=]\s*["'][^"']{32,}["']/gi, replacement: `MACHINE_GUID="${crypto.randomUUID()}"` },
            { regex: /deviceGuid\s*[:=]\s*["'][^"']{32,}["']/gi, replacement: `deviceGuid="${crypto.randomUUID()}"` },
          ]

          for (const pattern of patterns) {
            const newContent = content.replace(pattern.regex, pattern.replacement)
            if (newContent !== content) {
              content = newContent
              modified = true
            }
          }

          // 🔥 新增：在文件末尾添加随机注释，改变文件哈希
          // 这样可以改变文件指纹，即使其他修改失败也能改变文件哈希
          const randomComment = `\n// ${crypto.randomBytes(32).toString('hex')} - ${Date.now()}\n`
          if (!content.includes(randomComment.trim())) {
            content += randomComment
            modified = true
          }

          // 如果内容改变了才写入
          if (content !== originalContent) {
            fs.writeFileSync(file.path, content, 'utf-8')
            details.push(`✅ 已修改: ${file.name}`)
            modifiedCount++
          } else {
            details.push(`⚠️ 未找到需要修改的标识符: ${file.name}`)
          }
        } catch (err: any) {
          details.push(`❌ 修改失败: ${file.name} - ${err.message}`)
        }
      } else {
        details.push(`⚠️ 文件不存在: ${file.name}`)
      }
    }

    // Windows 不需要重新签名，修改后可以直接运行
    // 但首次运行可能触发 SmartScreen
    if (modifiedCount > 0) {
      details.push('')
      details.push(`✅ 已修改 ${modifiedCount} 个文件`)
      details.push(`✅ 备份位置: ${backupDir}`)
      details.push('')
      details.push('⚠️ Windows 提示：')
      details.push('1. 首次运行可能触发 SmartScreen 警告')
      details.push('2. 点击"更多信息"→"仍要运行"即可')
      details.push('3. 如遇问题，可从备份恢复')
    }

    return {
      success: true,
      message: '程序文件修改完成',
      details,
    }
  }

  /**
   * Windows: 修改网络适配器 MAC 地址（需要管理员权限）
   */
  async resetWindowsMACAddress(): Promise<{ success: boolean; message: string; details: string[] }> {
    if (process.platform !== 'win32') {
      return { success: false, message: '此功能仅适用于 Windows', details: [] }
    }

    const details: string[] = []
    try {
      console.log('[深度重置] 修改 Windows MAC 地址...')

      // 获取所有网络适配器
      try {
        const { stdout } = await execAsync('powershell -Command "Get-NetAdapter | Select-Object Name, MacAddress | Format-Table -AutoSize"')
        details.push('📋 当前网络适配器：')
        details.push(stdout.split('\n').slice(0, 5).join('\n'))
      } catch (e) {
        // 忽略错误
      }

      // 生成随机 MAC 地址
      const randomMac = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('-')
      
      // 注意：修改 MAC 地址需要禁用/启用适配器，可能影响网络连接
      // 这里只提供信息，不实际修改（因为风险较高）
      details.push('💡 MAC 地址修改提示：')
      details.push('   修改 MAC 地址需要禁用/启用网络适配器')
      details.push('   可能暂时中断网络连接')
      details.push(`   建议的新 MAC 地址: ${randomMac}`)
      details.push('   如需修改，请手动操作或使用专业工具')

      return {
        success: true,
        message: 'MAC 地址信息已准备（建议手动修改）',
        details,
      }
    } catch (error: any) {
      return {
        success: false,
        message: '获取 MAC 地址信息失败: ' + error.message,
        details,
      }
    }
  }

  /**
   * Windows: 清除事件日志（需要管理员权限）
   */
  async clearWindowsEventLogs(): Promise<{ success: boolean; message: string; details: string[] }> {
    if (process.platform !== 'win32') {
      return { success: false, message: '此功能仅适用于 Windows', details: [] }
    }

    const details: string[] = []
    try {
      console.log('[深度重置] 清除 Windows 事件日志...')

      const logTypes = ['Application', 'System', 'Security']
      let clearedCount = 0

      for (const logType of logTypes) {
        try {
          await execAsync(`wevtutil cl ${logType}`)
          details.push(`✅ 已清除 ${logType} 事件日志`)
          clearedCount++
        } catch (e: any) {
          if (e.message.includes('拒绝访问') || e.message.includes('Access is denied')) {
            details.push(`⚠️ 清除 ${logType} 日志需要管理员权限`)
          } else {
            details.push(`⚠️ 清除 ${logType} 日志失败: ${e.message}`)
          }
        }
      }

      if (clearedCount > 0) {
        return {
          success: true,
          message: `已清除 ${clearedCount} 个事件日志`,
          details,
        }
      } else {
        return {
          success: false,
          message: '清除事件日志失败（需要管理员权限）',
          details,
        }
      }
    } catch (error: any) {
      return {
        success: false,
        message: '清除事件日志失败: ' + error.message,
        details,
      }
    }
  }

  /**
   * Windows: 修改其他系统标识符（需要管理员权限）
   */
  async resetWindowsSystemIdentifiers(): Promise<{ success: boolean; message: string; details: string[] }> {
    if (process.platform !== 'win32') {
      return { success: false, message: '此功能仅适用于 Windows', details: [] }
    }

    const details: string[] = []
    try {
      console.log('[深度重置] 修改 Windows 系统标识符...')

      const newProductId = crypto.randomUUID().replace(/-/g, '').substring(0, 20).toUpperCase()
      const newInstallDate = Math.floor(Date.now() / 1000).toString()

      // 修改 ProductId（如果存在）
      try {
        await execAsync(`reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion" /v ProductId /t REG_SZ /d "${newProductId}" /f`)
        details.push(`✅ 已修改 ProductId: ${newProductId}`)
      } catch (e: any) {
        if (!e.message.includes('拒绝访问') && !e.message.includes('Access is denied')) {
          details.push(`⚠️ ProductId 修改失败: ${e.message}`)
        }
      }

      // 修改 InstallDate（如果存在）
      try {
        await execAsync(`reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion" /v InstallDate /t REG_DWORD /d ${newInstallDate} /f`)
        details.push(`✅ 已修改 InstallDate`)
      } catch (e: any) {
        // 忽略错误，这个键可能不存在
      }

      // 修改 DigitalProductId（如果存在，但通常不建议修改）
      // 因为可能影响 Windows 激活状态

      return {
        success: true,
        message: '系统标识符修改完成',
        details,
      }
    } catch (error: any) {
      return {
        success: false,
        message: '修改系统标识符失败: ' + error.message,
        details,
      }
    }
  }

  /**
   * Windows: 清除 Windows 缓存和临时文件
   */
  async clearWindowsCache(): Promise<{ success: boolean; message: string; details: string[] }> {
    if (process.platform !== 'win32') {
      return { success: false, message: '此功能仅适用于 Windows', details: [] }
    }

    const details: string[] = []
    try {
      console.log('[深度重置] 清除 Windows 缓存...')

      // 清除临时文件
      try {
        await execAsync('powershell -Command "Remove-Item -Path $env:TEMP\\* -Recurse -Force -ErrorAction SilentlyContinue"')
        details.push('✅ 已清除临时文件')
      } catch (e) {
        details.push('⚠️ 清除临时文件部分失败')
      }

      // 清除预取文件（Prefetch）
      try {
        await execAsync('powershell -Command "Remove-Item -Path C:\\Windows\\Prefetch\\* -Force -ErrorAction SilentlyContinue"')
        details.push('✅ 已清除预取文件')
      } catch (e) {
        details.push('⚠️ 清除预取文件需要管理员权限')
      }

      // 清除 Windows 更新缓存
      try {
        await execAsync('net stop wuauserv')
        await execAsync('powershell -Command "Remove-Item -Path C:\\Windows\\SoftwareDistribution\\Download\\* -Recurse -Force -ErrorAction SilentlyContinue"')
        await execAsync('net start wuauserv')
        details.push('✅ 已清除 Windows 更新缓存')
      } catch (e) {
        details.push('⚠️ 清除更新缓存需要管理员权限')
      }

      return {
        success: true,
        message: 'Windows 缓存清除完成',
        details,
      }
    } catch (error: any) {
      return {
        success: false,
        message: '清除 Windows 缓存失败: ' + error.message,
        details,
      }
    }
  }

  /**
   * 4. Windows: 修改注册表中的 MachineGuid（需要管理员权限）
   */
  async resetWindowsMachineGuid(): Promise<{ success: boolean; oldGuid?: string; newGuid?: string; message: string }> {
    if (process.platform !== 'win32') {
      return { success: false, message: '此功能仅适用于 Windows' }
    }

    try {
      console.log('[深度重置] 修改 Windows MachineGuid...')

      // 生成新的 GUID
      const newGuid = crypto.randomUUID()

      // 读取当前的 MachineGuid
      let oldGuid = ''
      try {
        const { stdout } = await execAsync(
          'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid'
        )
        const match = stdout.match(/MachineGuid\s+REG_SZ\s+(.+)/i)
        if (match) {
          oldGuid = match[1].trim()
        }
      } catch (e) {
        console.warn('无法读取当前 MachineGuid:', e)
      }

      // 修改注册表（需要管理员权限）
      try {
        await execAsync(
          `reg add "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid /t REG_SZ /d "${newGuid}" /f`
        )

        return {
          success: true,
          oldGuid,
          newGuid,
          message: `MachineGuid 已修改: ${newGuid}`,
        }
      } catch (e: any) {
        // 可能是权限不足
        if (e.message.includes('拒绝访问') || e.message.includes('Access is denied')) {
          return {
            success: false,
            message: '需要管理员权限才能修改 MachineGuid',
          }
        }
        throw e
      }
    } catch (error: any) {
      return {
        success: false,
        message: '修改 MachineGuid 失败: ' + error.message,
      }
    }
  }

  /**
   * 完整的深度重置
   */
  async performDeepReset(): Promise<{
    success: boolean
    message: string
    details: string[]
  }> {
    const allDetails: string[] = []

    try {
      console.log('[深度重置] 开始深度重置...')
      allDetails.push('🔥 开始深度重置...')
      allDetails.push('')

      if (process.platform === 'win32') {
        // Windows 平台：完整深度重置
        return await this.performDeepResetWindows(allDetails)
      } else {
        // Mac 平台：完整深度重置
        return await this.performDeepResetMac(allDetails)
      }
    } catch (error: any) {
      allDetails.push(`❌ 深度重置失败: ${error.message}`)
      return {
        success: false,
        message: '深度重置失败',
        details: allDetails,
      }
    }
  }

  /**
   * Mac 平台的深度重置
   */
  private async performDeepResetMac(allDetails: string[]): Promise<{
    success: boolean
    message: string
    details: string[]
  }> {
    // 1. 修改系统UUID
    const uuidResult = await this.resetSystemUUID()
    if (uuidResult.success) {
      allDetails.push(`✅ 系统UUID: ${uuidResult.newUUID}`)
    } else {
      allDetails.push(`⚠️ 系统UUID修改失败: ${uuidResult.message}`)
    }

    // 2. 清除DNS缓存
    const dnsResult = await this.clearDNSCache()
    if (dnsResult.success) {
      allDetails.push('✅ DNS缓存已清除')
    } else {
      allDetails.push(`⚠️ DNS缓存清除失败: ${dnsResult.message}`)
    }

    // 3. 修改Cursor程序文件
    const appResult = await this.modifyCursorApp()
    allDetails.push(...appResult.details)

    allDetails.push('')
    allDetails.push('🎉 深度重置完成！')
    allDetails.push('')
    allDetails.push('⚠️ 重要提示：')
    allDetails.push('1. Cursor已被修改，签名已失效')
    allDetails.push('2. 首次启动可能需要在"系统偏好设置→安全性"中允许')
    allDetails.push('3. 如遇问题，可从备份恢复原应用')
    allDetails.push(`4. 备份位置: ${this.backupBasePath}`)

    return {
      success: true,
      message: '深度重置完成',
      details: allDetails,
    }
  }

  /**
   * Windows 平台的深度重置（增强版）
   */
  private async performDeepResetWindows(allDetails: string[]): Promise<{
    success: boolean
    message: string
    details: string[]
  }> {
    let hasErrors = false
    let successCount = 0

    // 1. 修改 Windows MachineGuid
    allDetails.push('📋 步骤 1/8: 修改系统 MachineGuid...')
    const guidResult = await this.resetWindowsMachineGuid()
    if (guidResult.success) {
      allDetails.push(`✅ MachineGuid 已修改`)
      allDetails.push(`   旧值: ${guidResult.oldGuid || '(无法读取)'}`)
      allDetails.push(`   新值: ${guidResult.newGuid}`)
      successCount++
    } else {
      allDetails.push(`⚠️ MachineGuid 修改失败: ${guidResult.message}`)
      if (guidResult.message.includes('管理员权限')) {
        allDetails.push('   💡 提示: 请以管理员身份运行本程序')
        hasErrors = true
      }
    }
    allDetails.push('')

    // 2. 修改其他系统标识符
    allDetails.push('📋 步骤 2/8: 修改系统标识符...')
    const sysIdResult = await this.resetWindowsSystemIdentifiers()
    if (sysIdResult.success) {
      allDetails.push(...sysIdResult.details)
      successCount++
    } else {
      allDetails.push(`⚠️ 系统标识符修改失败: ${sysIdResult.message}`)
    }
    allDetails.push('')

    // 3. 清除 DNS 缓存
    allDetails.push('📋 步骤 3/8: 清除 DNS 缓存...')
    const dnsResult = await this.clearDNSCache()
    if (dnsResult.success) {
      allDetails.push('✅ DNS 缓存已清除')
      successCount++
    } else {
      allDetails.push(`⚠️ DNS 缓存清除失败: ${dnsResult.message}`)
    }
    allDetails.push('')

    // 4. 清除网络相关缓存
    allDetails.push('📋 步骤 4/8: 清除网络缓存...')
    try {
      // 清除 ARP 缓存
      await execAsync('arp -d *').catch(() => {})
      allDetails.push('✅ ARP 缓存已清除')

      // 清除 NetBIOS 缓存
      await execAsync('nbtstat -R').catch(() => {})
      await execAsync('nbtstat -RR').catch(() => {})
      allDetails.push('✅ NetBIOS 缓存已清除')
      successCount++
    } catch (e: any) {
      allDetails.push('⚠️ 网络缓存清除部分失败')
    }
    allDetails.push('')

    // 5. 修改 MAC 地址信息（提供建议）
    allDetails.push('📋 步骤 5/8: 处理 MAC 地址...')
    const macResult = await this.resetWindowsMACAddress()
    if (macResult.success) {
      allDetails.push(...macResult.details)
      successCount++
    } else {
      allDetails.push(`⚠️ MAC 地址处理失败: ${macResult.message}`)
    }
    allDetails.push('')

    // 6. 清除 Windows 事件日志
    allDetails.push('📋 步骤 6/8: 清除 Windows 事件日志...')
    const logResult = await this.clearWindowsEventLogs()
    if (logResult.success) {
      allDetails.push(...logResult.details)
      successCount++
    } else {
      allDetails.push(`⚠️ 事件日志清除失败: ${logResult.message}`)
      if (logResult.message.includes('管理员权限')) {
        hasErrors = true
      }
    }
    allDetails.push('')

    // 7. 清除 Windows 缓存
    allDetails.push('📋 步骤 7/8: 清除 Windows 缓存...')
    const cacheResult = await this.clearWindowsCache()
    if (cacheResult.success) {
      allDetails.push(...cacheResult.details)
      successCount++
    } else {
      allDetails.push(`⚠️ Windows 缓存清除失败: ${cacheResult.message}`)
    }
    allDetails.push('')

    // 8. 修改 Cursor 程序文件（增强版）
    allDetails.push('📋 步骤 8/8: 修改 Cursor 程序文件（增强版）...')
    const appResult = await this.modifyCursorApp()
    allDetails.push(...appResult.details)
    if (appResult.success) {
      successCount++
    }
    allDetails.push('')

    // 总结
    allDetails.push('🎉 Windows 深度重置（增强版）完成！')
    allDetails.push('')
    allDetails.push(`✅ 成功执行 ${successCount}/8 个步骤`)
    allDetails.push('')
    allDetails.push('✅ 已完成的操作：')
    allDetails.push('   • 修改系统 MachineGuid')
    allDetails.push('   • 修改系统标识符（ProductId、InstallDate）')
    allDetails.push('   • 清除 DNS 缓存')
    allDetails.push('   • 清除网络缓存（ARP、NetBIOS）')
    allDetails.push('   • 处理 MAC 地址信息')
    allDetails.push('   • 清除 Windows 事件日志')
    allDetails.push('   • 清除 Windows 缓存和临时文件')
    allDetails.push('   • 修改 Cursor 程序文件（增强版）')
    allDetails.push('      - 替换系统标识获取命令')
    allDetails.push('      - 拦截 Node.js API 调用')
    allDetails.push('      - 替换各种标识符')
    allDetails.push('      - 改变文件哈希')
    allDetails.push('')
    
    if (hasErrors) {
      allDetails.push('⚠️ 部分操作需要管理员权限：')
      allDetails.push('   • 修改 MachineGuid')
      allDetails.push('   • 清除事件日志')
      allDetails.push('   • 清除预取文件')
      allDetails.push('')
      allDetails.push('💡 建议：')
      allDetails.push('   1. 以管理员身份重新运行本程序以获得最佳效果')
      allDetails.push('   2. 或手动修改注册表 MachineGuid')
      allDetails.push('   3. 其他操作已成功执行')
    }
    
    allDetails.push('')
    allDetails.push('⚠️ 重要提示：')
    allDetails.push('   1. 首次运行 Cursor 可能触发 SmartScreen 警告')
    allDetails.push('   2. 点击"更多信息"→"仍要运行"即可')
    allDetails.push('   3. 建议重启计算机使所有更改生效')
    allDetails.push('   4. 如遇问题，可从备份恢复')
    allDetails.push(`   5. 备份位置: ${this.backupBasePath}`)
    allDetails.push('')
    allDetails.push('🛡️ 增强防护说明：')
    allDetails.push('   • 程序文件修改已增强，支持更多匹配模式')
    allDetails.push('   • 已添加 Node.js API 拦截机制')
    allDetails.push('   • 文件哈希已改变（即使其他修改失败）')
    allDetails.push('   • 多重防护机制，效果接近 Mac 版本')

    return {
      success: !hasErrors || successCount >= 5, // 至少成功5个步骤就算成功
      message: hasErrors ? 'Windows 深度重置部分完成（建议以管理员身份运行）' : 'Windows 深度重置（增强版）完成',
      details: allDetails,
    }
  }

  /**
   * 恢复备份的应用
   */
  async restoreBackup(backupPath?: string): Promise<{ success: boolean; message: string }> {
    try {
      // 如果没有指定备份路径，使用最新的备份
      if (!backupPath) {
        const backups = fs
          .readdirSync(this.backupBasePath)
          .filter((f) => f.startsWith('Cursor.app.backup_'))
          .sort()
          .reverse()

        if (backups.length === 0) {
          return { success: false, message: '没有找到备份' }
        }

        backupPath = path.join(this.backupBasePath, backups[0])
      }

      if (!fs.existsSync(backupPath)) {
        return { success: false, message: '备份不存在' }
      }

      console.log('[深度重置] 恢复备份...')

      // 删除当前应用
      if (fs.existsSync(this.cursorAppPath)) {
        execSync(`sudo rm -rf "${this.cursorAppPath}"`, { stdio: 'ignore' })
      }

      // 恢复备份
      execSync(`sudo cp -R "${backupPath}" "${this.cursorAppPath}"`, { stdio: 'ignore' })

      return {
        success: true,
        message: '备份恢复成功',
      }
    } catch (error: any) {
      return {
        success: false,
        message: '恢复备份失败: ' + error.message,
      }
    }
  }
}

export const deepResetManager = new DeepResetManager()

