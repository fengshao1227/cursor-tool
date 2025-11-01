import * as https from 'https'
import * as http from 'http'
import { appDatabase } from './database'

type AnnouncementResponse = {
  success: boolean
  message?: string
  data?: {
    id: string
    title: string
    content: string
    type: 'info' | 'warning' | 'error' | 'success'
    priority: number
    platforms?: string[]
    startTime?: string
    endTime?: string
    dismissible: boolean
    autoShow: boolean
    url?: string
    createdAt: string
    updatedAt: string
  } | null
}

// 默认服务地址（使用与卡密相同的服务器）
const DEFAULT_SERVER_URL = process.env.LICENSE_SERVER_URL || 'http://117.72.163.3:8080'

function httpFetch<T = any>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:')
    const mod = isHttps ? https : http
    const u = new URL(url)
    const req = mod.request(
      {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'content-type': 'application/json',
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const txt = Buffer.concat(chunks).toString('utf-8')
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(txt))
            } catch (e: any) {
              reject(e)
            }
          } else {
            try {
              const errorJson = JSON.parse(txt)
              const error = new Error(errorJson.message || txt)
              ;(error as any).statusCode = res.statusCode
              ;(error as any).errorCode = errorJson.error
              ;(error as any).response = errorJson
              reject(error)
            } catch {
              reject(new Error(`HTTP ${res.statusCode}: ${txt}`))
            }
          }
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

function getConfig(key: string): string | null {
  return appDatabase.getConfig(key)
}

function setConfig(key: string, value: string): void {
  appDatabase.setConfig(key, value)
}

function getServerUrl(): string {
  const envUrl = process.env.LICENSE_SERVER_URL
  const dbUrl = getConfig('license.serverUrl')
  return envUrl || dbUrl || DEFAULT_SERVER_URL
}

export class AnnouncementService {
  /**
   * 获取当前平台的在线公告
   */
  async getAnnouncement(): Promise<AnnouncementResponse['data']> {
    const url = getServerUrl()
    const platform = process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows' : 'linux'
    
    try {
      const resp = await httpFetch<AnnouncementResponse>(
        new URL(`/v1/announcement/current?platform=${platform}`, url).toString()
      )
      
      if (!resp.success || !resp.data) {
        console.log('📢 暂无公告')
        return null
      }
      
      const announcement = resp.data
      
      // 检查是否在有效期内
      if (announcement.startTime && new Date(announcement.startTime) > new Date()) {
        console.log('📢 公告未到开始时间')
        return null
      }
      
      if (announcement.endTime && new Date(announcement.endTime) < new Date()) {
        console.log('📢 公告已过期')
        return null
      }
      
      // 检查是否已被用户关闭
      const dismissedIds = this.getDismissedAnnouncements()
      if (dismissedIds.includes(announcement.id)) {
        console.log('📢 公告已被用户关闭')
        return null
      }
      
      // 缓存最新公告
      setConfig('announcement.latest', JSON.stringify(announcement))
      setConfig('announcement.lastFetch', new Date().toISOString())
      
      console.log(`📢 获取到新公告: ${announcement.title}`)
      return announcement
    } catch (e: any) {
      console.warn('📢 获取公告失败:', e.message)
      
      // 如果网络失败，尝试返回缓存的公告
      const cached = getConfig('announcement.latest')
      if (cached) {
        try {
          const announcement = JSON.parse(cached)
          // 检查缓存的公告是否已被关闭
          const dismissedIds = this.getDismissedAnnouncements()
          if (!dismissedIds.includes(announcement.id)) {
            console.log('📢 返回缓存的公告')
            return announcement
          }
        } catch (parseError) {
          console.warn('📢 解析缓存公告失败')
        }
      }
      
      return null
    }
  }
  
  /**
   * 关闭公告（记录已关闭的公告ID）
   */
  dismissAnnouncement(announcementId: string): void {
    const dismissedIds = this.getDismissedAnnouncements()
    if (!dismissedIds.includes(announcementId)) {
      dismissedIds.push(announcementId)
      setConfig('announcement.dismissed', JSON.stringify(dismissedIds))
      console.log(`📢 已关闭公告: ${announcementId}`)
    }
  }
  
  /**
   * 获取已关闭的公告ID列表
   */
  private getDismissedAnnouncements(): string[] {
    const dismissed = getConfig('announcement.dismissed')
    if (!dismissed) return []
    
    try {
      return JSON.parse(dismissed)
    } catch {
      return []
    }
  }
  
  /**
   * 清除已关闭的公告记录（用于测试或重置）
   */
  clearDismissedAnnouncements(): void {
    setConfig('announcement.dismissed', '[]')
    console.log('📢 已清除所有已关闭的公告记录')
  }
  
  /**
   * 检查是否需要刷新公告（超过30分钟自动刷新）
   */
  shouldRefresh(): boolean {
    const lastFetch = getConfig('announcement.lastFetch')
    if (!lastFetch) return true
    
    const lastFetchTime = new Date(lastFetch).getTime()
    const now = Date.now()
    const thirtyMinutes = 30 * 60 * 1000
    
    return now - lastFetchTime > thirtyMinutes
  }
}

export const announcementService = new AnnouncementService()

