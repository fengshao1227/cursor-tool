import * as https from 'https'
import * as http from 'http'
import * as crypto from 'crypto'
import * as os from 'os'
import pkg from '../../package.json'
import { appDatabase } from './database'
import { machineIdManager } from './machine-id'

type VerifyResponse = {
  receipt: {
    licenseId: number
    keyPrefix: string
    device: { machineId: string; platform: string }
    maxDevices: number
    expiresAt: string
    issuedAt: string
    notAfter: string
  }
  signature: string
  serverTime: string
}

type ActivateResponse = {
  success: boolean
  message: string
  data?: {
    cursorToken?: string  // 兼容单token
    cursorTokens?: string[]  // 支持多token（优先使用）
    cursorEmail: string
    expiresAt: string
    remainingDays: number
    maxDevices: number
  }
}

// 默认服务地址与公钥（可通过环境变量或数据库配置覆盖）
// 优先级：环境变量 > 数据库配置 > 硬编码默认值
const DEFAULT_SERVER_URL = process.env.LICENSE_SERVER_URL || 'http://117.72.163.3:8080'
const EMBEDDED_PUBLIC_KEY_B64 = process.env.LICENSE_PUBLIC_KEY_B64 || 'MCowBQYDK2VwAyEAh1cSzLyOG6HxBNcqxYUOcheYPJlB0v9iBK4e8HjNHao='

// 🔓 验证开关：设置为 true 时禁用验证（用于打包无验证版本）
// Vite 会在构建时通过 define 配置替换 process.env.DISABLE_LICENSE_CHECK
// 构建无验证版本时：DISABLE_LICENSE_CHECK=true npm run build
const DISABLE_LICENSE_CHECK = process.env.DISABLE_LICENSE_CHECK === 'true' || 
                               process.env.DISABLE_LICENSE_CHECK === '1' ||
                               process.env.DISABLE_LICENSE_CHECK === true ||
                               (typeof process !== 'undefined' && process.env && (process.env as any).DISABLE_LICENSE_CHECK === true)

// 调试日志（构建时会保留）
console.log('[License] DISABLE_LICENSE_CHECK:', DISABLE_LICENSE_CHECK, 'env:', process.env.DISABLE_LICENSE_CHECK)

function httpFetch<T = any>(url: string, body: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:')
    const mod = isHttps ? https : http
    const u = new URL(url)
    const data = Buffer.from(JSON.stringify(body))
    const req = mod.request(
      {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': data.length,
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
            // 尝试解析错误响应中的 JSON
            try {
              const errorJson = JSON.parse(txt)
              // 如果错误响应包含 message 字段，使用它
              const error = new Error(errorJson.message || txt)
              ;(error as any).statusCode = res.statusCode
              ;(error as any).errorCode = errorJson.error
              ;(error as any).response = errorJson
              reject(error)
            } catch {
              // 如果无法解析 JSON，使用原始错误
              reject(new Error(`HTTP ${res.statusCode}: ${txt}`))
            }
          }
        })
      }
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function getConfig(key: string): string | null {
  return appDatabase.getConfig(key)
}

function setConfig(key: string, value: string): void {
  appDatabase.setConfig(key, value)
}

function getPublicKey(): string | null {
  // 优先级：环境变量 > 数据库配置 > 硬编码默认值
  const envKey = process.env.LICENSE_PUBLIC_KEY_B64
  const dbKey = getConfig('license.publicKeyB64')
  return (envKey || (dbKey && dbKey.length > 0 ? dbKey : EMBEDDED_PUBLIC_KEY_B64)) || null
}

function getServerUrl(): string {
  // 优先级：环境变量 > 数据库配置 > 硬编码默认值
  const envUrl = process.env.LICENSE_SERVER_URL
  const dbUrl = getConfig('license.serverUrl')
  return envUrl || dbUrl || DEFAULT_SERVER_URL
}

function verifySignature(payload: unknown, signatureB64: string): boolean {
  const pub = getPublicKey()
  if (!pub) return false
  try {
    const publicKey = crypto.createPublicKey({ key: Buffer.from(pub, 'base64'), format: 'der', type: 'spki' })
    const data = Buffer.from(JSON.stringify(payload))
    return crypto.verify(null, data, publicKey, Buffer.from(signatureB64, 'base64'))
  } catch {
    return false
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

export class LicenseService {
  async activate(licenseKey: string): Promise<{ 
    success: boolean
    message: string
    cursorToken?: string  // 兼容单token
    cursorTokens?: string[]  // 支持多token
    cursorEmail?: string
    expiresAt?: string
    remainingDays?: number
  }> {
    // 从环境变量或配置获取服务器地址
    const url = getServerUrl()
    const machineId = machineIdManager.getCurrentMachineId()

    try {
      // 调用激活接口（机器码改为可选）
      const body = {
        licenseKey,
        ...(machineId && { machineId }),
        platform: process.platform,
        hostname: os.hostname()
      }
      const resp = await httpFetch<ActivateResponse>(
        new URL('/v1/licenses/activate', url).toString(),
        body
      )
      
      if (!resp.success) {
        // 根据后端返回的错误类型，返回友好的中文提示
        const errorMessage = resp.message || '激活失败'
        let friendlyMessage = errorMessage
        
        // 检查是否是常见的错误类型
        if (errorMessage.includes('卡密不存在') || errorMessage.includes('INVALID_KEY')) {
          friendlyMessage = '❌ 卡密无效，请检查卡密是否正确'
        } else if (errorMessage.includes('卡密已被禁用') || errorMessage.includes('REVOKED')) {
          friendlyMessage = '❌ 卡密已被禁用，请联系客服'
        } else if (errorMessage.includes('卡密已过期') || errorMessage.includes('EXPIRED')) {
          friendlyMessage = '❌ 卡密已过期，请更换卡密'
        } else if (errorMessage.includes('激活失败')) {
          friendlyMessage = '❌ 激活失败，请检查网络连接或联系客服'
        }
        
        return { success: false, message: friendlyMessage }
      }

      // 保存卡密和服务器地址
      setConfig('license.key', licenseKey)
      setConfig('license.serverUrl', url)
      
      // 立即调用 verify 接口获取 receipt 和 signature（用于离线验证）
      console.log('🔐 激活成功，正在获取许可证凭证...')
      try {
        const verifyBody = {
          licenseKey,
          ...(machineId && { 
            device: { 
              machineId, 
              platform: process.platform, 
              hostname: os.hostname() 
            } 
          }),
          appVersion: (pkg as any).version,
        }
        const verifyResp = await httpFetch<VerifyResponse>(
          new URL('/v1/licenses/verify', url).toString(),
          verifyBody
        )
        
        // 验证签名（如果签名为空则跳过验证）
        if (!verifyResp.signature || verifySignature(verifyResp.receipt, verifyResp.signature)) {
          setConfig('license.receipt', JSON.stringify(verifyResp.receipt))
          setConfig('license.signature', verifyResp.signature || '')
          setConfig('license.lastVerifyAt', nowIso())
          console.log('✅ 许可证凭证已保存')
        } else {
          console.warn('⚠️ 签名验证失败')
        }
      } catch (verifyError) {
        console.warn('⚠️ 获取许可证凭证失败:', verifyError)
      }
      
      // 返回 Token、Email 和有效期信息（支持多token）
      return {
        success: true,
        message: resp.message || '激活成功',
        cursorToken: resp.data?.cursorToken,  // 兼容单token
        cursorTokens: resp.data?.cursorTokens,  // 多token（优先使用）
        cursorEmail: resp.data?.cursorEmail,
        expiresAt: resp.data?.expiresAt,
        remainingDays: resp.data?.remainingDays
      }
    } catch (e: any) {
      // 处理网络错误或其他异常
      let errorMessage = '激活失败'
      
      // 检查是否有解析后的错误响应
      if (e.response && e.response.message) {
        const errorCode = e.errorCode || e.response.error
        const responseMessage = e.response.message
        
        // 根据错误代码返回友好的中文提示
        if (errorCode === 'INVALID_KEY' || responseMessage.includes('卡密不存在')) {
          errorMessage = '❌ 卡密无效，请检查卡密是否正确'
        } else if (errorCode === 'REVOKED' || responseMessage.includes('卡密已被禁用')) {
          errorMessage = '❌ 卡密已被禁用，请联系客服'
        } else if (errorCode === 'EXPIRED' || responseMessage.includes('卡密已过期')) {
          errorMessage = '❌ 卡密已过期，请更换卡密'
        } else {
          errorMessage = `❌ ${responseMessage}`
        }
      } else if (e.message) {
        // 检查是否是 HTTP 错误响应
        if (e.message.includes('404') || e.message.includes('INVALID_KEY')) {
          errorMessage = '❌ 卡密无效，请检查卡密是否正确'
        } else if (e.message.includes('403') && e.message.includes('REVOKED')) {
          errorMessage = '❌ 卡密已被禁用，请联系客服'
        } else if (e.message.includes('403') && e.message.includes('EXPIRED')) {
          errorMessage = '❌ 卡密已过期，请更换卡密'
        } else if (e.message.includes('HTTP')) {
          errorMessage = '❌ 网络错误，请检查网络连接后重试'
        } else {
          errorMessage = `❌ ${e.message}`
        }
      }
      
      return { success: false, message: errorMessage }
    }
  }

  async deactivate(): Promise<{ success: boolean; message: string }> {
    const serverUrl = getServerUrl()
    const licenseKey = getConfig('license.key')
    if (!licenseKey) return { success: false, message: '未激活' }
    const machineId = machineIdManager.getCurrentMachineId()
    try {
      if (machineId) {
        await httpFetch(new URL('/v1/licenses/deactivate', serverUrl).toString(), {
          licenseKey,
          device: { machineId },
        })
      }
    } catch (e) {
      console.warn('解绑请求失败，但仍然清除本地数据:', e)
    }
    // 清除所有许可证相关的配置
    setConfig('license.key', '')
    setConfig('license.receipt', '')
    setConfig('license.signature', '')
    setConfig('license.lastVerifyAt', '')
    setConfig('license.serverUrl', '')
    return { success: true, message: '已解绑此设备' }
  }

  async verifyOnline(): Promise<{ success: boolean; message: string }> {
    // 🔓 如果禁用验证，直接返回成功，不进行任何网络请求
    if (DISABLE_LICENSE_CHECK) {
      console.log('🔓 验证已禁用（无验证版本），跳过在线验证')
      return { success: true, message: '无验证版本' }
    }
    
    const serverUrl = getServerUrl()
    const licenseKey = getConfig('license.key')
    if (!serverUrl) return { success: false, message: '未配置服务器地址' }
    if (!licenseKey) return { success: false, message: '未配置许可证' }

    const machineId = machineIdManager.getCurrentMachineId()
    const body = {
      licenseKey,
      ...(machineId && { 
        device: { 
          machineId, 
          platform: process.platform, 
          hostname: os.hostname() 
        } 
      }),
      appVersion: (pkg as any).version,
    }
    
    try {
      const resp = await httpFetch(new URL('/v1/licenses/verify', serverUrl).toString(), body)
      
      // 检查返回的格式 - 后端可能返回 { valid: false } 或 { success: false }
      if (resp.valid === false || resp.success === false) {
        // 验证失败，清除本地配置
        this.clearLocalLicense()
        return { success: false, message: resp.message || '卡密验证失败' }
      }
      
      // 如果签名为空则跳过验证（简化版验证服务）
      if (resp.signature && !verifySignature(resp.receipt, resp.signature)) {
        return { success: false, message: '签名校验失败' }
      }
      
      setConfig('license.receipt', JSON.stringify(resp.receipt))
      setConfig('license.signature', resp.signature || '')
      setConfig('license.lastVerifyAt', nowIso())
      return { success: true, message: '验证成功' }
    } catch (e: any) {
      // 如果是卡密不存在或无效的错误，清除本地配置
      if (e.response) {
        const errorCode = e.errorCode || e.response.error
        if (errorCode === 'INVALID_KEY' || e.response.message?.includes('卡密不存在')) {
          this.clearLocalLicense()
          return { success: false, message: '卡密不存在，已清除本地配置' }
        }
        // 如果是其他错误，也清除本地配置（因为可能是卡密被删除）
        if (e.response.message?.includes('卡密') || e.response.message?.includes('license')) {
          this.clearLocalLicense()
          return { success: false, message: e.response.message || '卡密验证失败，已清除本地配置' }
        }
      }
      // 其他错误暂时不清除，可能是网络问题
      throw e
    }
  }

  /**
   * 清除本地许可证配置
   */
  private clearLocalLicense(): void {
    setConfig('license.key', '')
    setConfig('license.receipt', '')
    setConfig('license.signature', '')
    setConfig('license.lastVerifyAt', '')
    setConfig('license.serverUrl', '')
    appDatabase.setConfig('license.expiresAt', '')
    appDatabase.setConfig('license.remainingDays', '')
    console.log('🧹 已清除本地许可证配置')
  }

  getStatus(): { valid: boolean; message?: string; expiresAt?: string; notAfter?: string } {
    // 🔓 如果禁用验证，直接返回有效状态
    if (DISABLE_LICENSE_CHECK) {
      console.log('🔓 验证已禁用（无验证版本）')
      return { valid: true, message: '无验证版本' }
    }

    try {
      const receiptStr = getConfig('license.receipt')
      const sig = getConfig('license.signature') || ''
      if (!receiptStr) return { valid: false, message: '未激活' }
      const receipt = JSON.parse(receiptStr) as VerifyResponse['receipt']
      // 如果签名为空，则跳过签名验证（简化版验证服务）
      if (sig && !verifySignature(receipt, sig)) return { valid: false, message: '离线签名无效' }
      const now = Date.now()
      const expiresAt = Date.parse(receipt.expiresAt)
      const notAfter = Date.parse(receipt.notAfter)
      if (now > expiresAt) return { valid: false, message: '许可证已过期', expiresAt: receipt.expiresAt, notAfter: receipt.notAfter }
      if (now > notAfter) return { valid: false, message: '离线宽限已过', expiresAt: receipt.expiresAt, notAfter: receipt.notAfter }
      return { valid: true, expiresAt: receipt.expiresAt, notAfter: receipt.notAfter }
    } catch (e: any) {
      return { valid: false, message: e?.message || '状态错误' }
    }
  }

  async ensureLicensed(): Promise<{ success: boolean; message?: string }> {
    // 🔓 如果禁用验证，直接返回成功
    if (DISABLE_LICENSE_CHECK) {
      console.log('🔓 验证已禁用（无验证版本）')
      return { success: true, message: '无验证版本' }
    }

    // 优先在线验证，确保卡密仍然有效
    try {
      const online = await this.verifyOnline()
      if (online.success) return online
      // 在线验证失败，返回失败信息
      return { success: false, message: online.message || '卡密验证失败' }
    } catch (e: any) {
      // 网络错误或其他异常
      console.warn('在线验证失败，尝试离线验证:', e)
      
      // 如果错误是卡密不存在，清除本地配置
      if (e.response && e.response.error === 'INVALID_KEY') {
        this.clearLocalLicense()
        return { success: false, message: '卡密不存在，已清除本地配置' }
      }
      
      // 其他错误，尝试离线验证（仅在网络问题时使用）
      const status = this.getStatus()
      if (status.valid) {
        console.warn('⚠️ 使用离线验证（网络可能有问题）')
        return { success: true, message: '离线验证通过（建议检查网络连接）' }
      }
      return { success: false, message: status.message || '未授权' }
    }
  }
}

export const licenseService = new LicenseService()


