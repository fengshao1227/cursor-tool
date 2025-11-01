import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { cursorPaths } from './cursor-paths'

const execAsync = promisify(exec)

/**
 * Cursor 进程管理器
 * 负责检测、关闭、启动 Cursor
 */
export class ProcessManager {
  /**
   * 检查Cursor是否正在运行
   */
  async isCursorRunning(): Promise<boolean> {
    try {
      if (process.platform === 'darwin') {
        // 使用更精确的检测：检查 /Applications/Cursor.app 是否在运行
        // 使用 pgrep -x 精确匹配可执行文件名
        try {
          const { stdout } = await execAsync('pgrep -x Cursor')
          return stdout.trim().length > 0
        } catch (e) {
          // pgrep -x 可能找不到，尝试检查特定路径
          try {
            const { stdout } = await execAsync(
              'pgrep -f "/Applications/Cursor.app/Contents/MacOS/Cursor"'
            )
            const pids = stdout
              .trim()
              .split('\n')
              .filter(pid => pid)
            // 排除我们自己的进程
            return pids.length > 0
          } catch (e2) {
            return false
          }
        }
      } else if (process.platform === 'win32') {
        // Windows: 使用tasklist精确匹配
        const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq Cursor.exe" /NH')
        // 检查输出是否包含有效的进程信息
        // tasklist在没找到进程时会返回"信息: 没有运行的任务匹配指定标准。"
        const lines = stdout.trim().split('\n')
        // 过滤出真正的进程行（包含.exe且不是错误信息）
        const validLines = lines.filter(
          line => line.includes('Cursor.exe') && !line.includes('信息:') && !line.includes('INFO:')
        )
        return validLines.length > 0
      }
      return false
    } catch (error) {
      // 命令执行失败通常意味着进程不存在
      return false
    }
  }

  /**
   * 获取Cursor进程ID
   */
  async getCursorPids(): Promise<number[]> {
    try {
      if (process.platform === 'darwin') {
        // 先尝试精确匹配
        try {
          const { stdout } = await execAsync('pgrep -x Cursor')
          return stdout
            .trim()
            .split('\n')
            .filter(pid => pid)
            .map(pid => parseInt(pid, 10))
        } catch (e) {
          // 使用完整路径匹配
          const { stdout } = await execAsync(
            'pgrep -f "/Applications/Cursor.app/Contents/MacOS/Cursor"'
          )
          return stdout
            .trim()
            .split('\n')
            .filter(pid => pid)
            .map(pid => parseInt(pid, 10))
        }
      } else if (process.platform === 'win32') {
        const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq Cursor.exe" /FO CSV /NH')
        const lines = stdout.trim().split('\n')
        // CSV格式: "Image Name","PID","Session Name","Session#","Mem Usage"
        // 只处理包含Cursor.exe的有效行
        return lines
          .filter(line => line.includes('Cursor.exe'))
          .map(line => {
            const match = line.match(/"Cursor\.exe","(\d+)",/)
            return match ? parseInt(match[1], 10) : 0
          })
          .filter(pid => pid > 0)
      }
      return []
    } catch (error) {
      return []
    }
  }

  /**
   * 优雅关闭Cursor
   */
  async killCursor(): Promise<boolean> {
    try {
      const isRunning = await this.isCursorRunning()
      if (!isRunning) {
        return true
      }

      if (process.platform === 'darwin') {
        // Mac: 优先使用 osascript quit，更优雅
        try {
          await execAsync('osascript -e \'tell application "Cursor" to quit\'')
          // 等待最多5秒让应用优雅退出
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500))
            if (!(await this.isCursorRunning())) {
              return true
            }
          }
        } catch (e) {
          console.warn('osascript quit failed:', e)
        }

        // 强制kill - 使用精确匹配
        try {
          await execAsync('pkill -9 -x Cursor')
        } catch (e) {
          // 如果精确匹配失败，使用完整路径
          try {
            await execAsync('pkill -9 -f "/Applications/Cursor.app/Contents/MacOS/Cursor"')
          } catch (e2) {
            console.warn('pkill failed:', e2)
          }
        }
      } else if (process.platform === 'win32') {
        // Windows: taskkill 强制终止
        try {
          await execAsync('taskkill /F /IM Cursor.exe')
        } catch (e) {
          console.warn('taskkill failed:', e)
        }
      }

      // 等待进程完全退出
      await new Promise(resolve => setTimeout(resolve, 1000))
      return !(await this.isCursorRunning())
    } catch (error) {
      console.error('Error killing Cursor:', error)
      return false
    }
  }

  /**
   * 启动Cursor
   */
  async launchCursor(): Promise<boolean> {
    try {
      const execPath = cursorPaths.getCursorExecutablePath()

      if (process.platform === 'darwin') {
        // Mac: 使用open命令
        spawn('open', ['-a', 'Cursor'], {
          detached: true,
          stdio: 'ignore',
        }).unref()
      } else if (process.platform === 'win32') {
        // Windows: 直接启动
        spawn(execPath, [], {
          detached: true,
          stdio: 'ignore',
        }).unref()
      }

      return true
    } catch (error) {
      console.error('Error launching Cursor:', error)
      return false
    }
  }

  /**
   * 重启Cursor
   */
  async restartCursor(): Promise<boolean> {
    const killed = await this.killCursor()
    if (!killed) {
      return false
    }

    // 等待1秒确保完全退出
    await new Promise(resolve => setTimeout(resolve, 1000))

    return await this.launchCursor()
  }
}

export const processManager = new ProcessManager()
