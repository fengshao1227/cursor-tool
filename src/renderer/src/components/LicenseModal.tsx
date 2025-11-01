import { useEffect, useState } from 'react'
import { LicenseStatus } from '../../../shared/types'

export default function LicenseModal({
  onClose,
  required = false,
  onAccountAdded,
  onActivationSuccess,
}: {
  onClose: () => void
  required?: boolean
  onAccountAdded?: () => void
  onActivationSuccess?: () => void
}) {
  const [licenseKey, setLicenseKey] = useState<string>('')
  const [status, setStatus] = useState<LicenseStatus>({ valid: false })
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const st = await window.api.getLicenseStatus()
    setStatus(st)
  }

  useEffect(() => {
    load()
  }, [])

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      alert('请输入卡密')
      return
    }

    setLoading(true)
    try {
      // 激活卡密，会自动添加到账号列表
      const res = await window.api.activateLicense(licenseKey)

      if (res.success) {
        alert(res.message)

        // 重新加载许可证状态
        await load()

        // 通知父组件刷新账号列表
        if (onAccountAdded) {
          onAccountAdded()
        }

        // 通知父组件激活成功（用于取消 required 状态）
        if (onActivationSuccess) {
          onActivationSuccess()
        }

        // 清空输入框
        setLicenseKey('')

        // 如果不是必需模式，延迟关闭以显示更新后的状态
        if (!required) {
          setTimeout(() => {
            onClose()
          }, 500)
        } else {
          // 必需模式立即关闭
          onClose()
        }
      } else {
        alert(res.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async () => {
    if (!confirm('解绑此设备？')) return
    setLoading(true)
    try {
      const res = await window.api.deactivateLicense()
      alert(res.message)
      await load()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[520px] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            {required ? '🔐 请输入卡密激活软件' : '更换卡密'}
          </h3>
          {!required && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors"
              aria-label="关闭"
            >
              ✕
            </button>
          )}
        </div>

        <div className="space-y-4">
          {required && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              💡 首次使用需要输入卡密激活软件
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">卡密</label>
            <input
              placeholder="请输入卡密"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleActivate()}
              autoFocus
            />
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
            ✅ 激活后会自动添加到账号列表，然后在账号列表中切换使用
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleActivate}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '激活中...' : '激活卡密'}
            </button>

            {!required && (
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
