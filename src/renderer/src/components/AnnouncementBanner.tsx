import { useState, useEffect } from 'react'
import { Announcement } from '../../../shared/types'

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 首次加载时获取公告
    loadAnnouncement()

    // 每30分钟自动刷新一次公告
    const intervalId = setInterval(() => {
      loadAnnouncement()
    }, 30 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [])

  const loadAnnouncement = async () => {
    try {
      const data = await window.api.getAnnouncement()
      if (data) {
        setAnnouncement(data)
        setIsVisible(true)
      }
    } catch (error) {
      console.error('加载公告失败:', error)
    }
  }

  const handleDismiss = async () => {
    if (!announcement) return

    try {
      await window.api.dismissAnnouncement(announcement.id)
      setIsVisible(false)
      // 延迟清除状态，等动画完成
      setTimeout(() => setAnnouncement(null), 300)
    } catch (error) {
      console.error('关闭公告失败:', error)
    }
  }

  const handleOpenUrl = () => {
    if (announcement?.url) {
      // 在浏览器中打开链接
      window.open(announcement.url, '_blank')
    }
  }

  if (!announcement || !isVisible) {
    return null
  }

  // 根据类型设置样式
  const getColorClasses = () => {
    switch (announcement.type) {
      case 'error':
        return 'bg-red-50 border-red-500 text-red-900'
      case 'warning':
        return 'bg-yellow-50 border-yellow-500 text-yellow-900'
      case 'success':
        return 'bg-green-50 border-green-500 text-green-900'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-500 text-blue-900'
    }
  }

  const getIconClasses = () => {
    switch (announcement.type) {
      case 'error':
        return 'text-red-500'
      case 'warning':
        return 'text-yellow-500'
      case 'success':
        return 'text-green-500'
      case 'info':
      default:
        return 'text-blue-500'
    }
  }

  const getIcon = () => {
    switch (announcement.type) {
      case 'error':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'success':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'info':
      default:
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  return (
    <div
      className={`
        border-l-4 p-4 mb-4 rounded-lg shadow-lg
        ${getColorClasses()}
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}
    >
      <div className="flex items-start">
        {/* 图标 */}
        <div className={`flex-shrink-0 ${getIconClasses()}`}>
          {getIcon()}
        </div>

        {/* 内容 */}
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-bold mb-1">
            {announcement.title}
          </h3>
          <div className="text-sm whitespace-pre-wrap">
            {announcement.content}
          </div>

          {/* 链接按钮 */}
          {announcement.url && (
            <button
              onClick={handleOpenUrl}
              className="mt-3 text-sm font-medium underline hover:no-underline focus:outline-none"
            >
              了解更多 →
            </button>
          )}
        </div>

        {/* 关闭按钮 */}
        {announcement.dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="关闭公告"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

