import { useState, useEffect } from 'react'
import {
  House,
  UsersThree,
  Wrench,
  Database,
  Gear,
  CaretLeft,
  CaretRight,
  Key,
} from 'phosphor-react'
import Logo from './Logo'

type NavItem = 'home' | 'accounts' | 'tools' | 'backup' | 'settings'

interface SidebarProps {
  activeItem: NavItem
  onNavigate: (item: NavItem) => void
  onChangeLicense?: () => void
  className?: string
}

export default function Sidebar({
  activeItem,
  onNavigate,
  onChangeLicense,
  className = '',
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // 响应式处理
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)

      if (width < 768) {
        setIsExpanded(false)
      } else if (width < 1024) {
        setIsExpanded(false)
      } else {
        setIsExpanded(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navItems = [
    { id: 'home' as NavItem, icon: House, label: '主页' },
    { id: 'accounts' as NavItem, icon: UsersThree, label: '账号管理' },
    { id: 'tools' as NavItem, icon: Wrench, label: '系统工具' },
    { id: 'backup' as NavItem, icon: Database, label: '备份管理' },
    { id: 'settings' as NavItem, icon: Gear, label: '设置' },
  ]

  const sidebarClass = isExpanded
    ? 'sidebar-expanded'
    : isMobile
      ? 'sidebar-hidden'
      : 'sidebar-collapsed'

  return (
    <div
      className={`
        ${sidebarClass}
        h-full glass-dark
        flex flex-col
        transition-all duration-300 ease-in-out
        border-r border-white/10
        ${className}
      `}
    >
      {/* Logo 区域 */}
      <div className="p-6 border-b border-white/10 no-drag-region">
        <Logo size={isExpanded ? 'md' : 'sm'} showText={isExpanded} className="justify-center" />
      </div>

      {/* 导航项 */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = activeItem === item.id

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3
                px-4 py-3 rounded-xl
                transition-all duration-300
                group relative
                no-drag-region
                ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
                ${!isExpanded && 'justify-center'}
              `}
              title={!isExpanded ? item.label : undefined}
            >
              {/* 活动指示器 */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-emerald-500 to-cyan-500 rounded-r-full" />
              )}

              {/* 图标 */}
              <Icon
                size={24}
                weight={isActive ? 'fill' : 'regular'}
                className={`
                  flex-shrink-0 transition-all duration-300
                  ${isActive ? 'text-gradient-primary' : ''}
                  ${!isActive && 'group-hover:scale-110'}
                `}
              />

              {/* 标签文字 */}
              {isExpanded && (
                <span
                  className={`
                  font-medium text-sm transition-all duration-300
                  ${isActive ? 'text-white' : ''}
                `}
                >
                  {item.label}
                </span>
              )}

              {/* 活动发光效果 */}
              {isActive && (
                <span
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ boxShadow: 'inset 0 0 20px rgba(74, 222, 128, 0.1)' }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* 更换卡密按钮 */}
      {onChangeLicense && (
        <div className="px-4 pb-2 no-drag-region">
          <button
            onClick={onChangeLicense}
            className={`
              w-full flex items-center gap-3
              px-4 py-3 rounded-xl
              transition-all duration-300
              text-amber-400 hover:text-amber-300
              bg-amber-500/10 hover:bg-amber-500/20
              border border-amber-500/30
              group
              ${!isExpanded && 'justify-center'}
            `}
            title={!isExpanded ? '更换卡密' : undefined}
          >
            <Key
              size={20}
              weight="bold"
              className="flex-shrink-0 transition-all duration-300 group-hover:scale-110"
            />
            {isExpanded && <span className="font-medium text-sm">更换卡密</span>}
          </button>
        </div>
      )}

      {/* 展开/收起按钮 */}
      {!isMobile && (
        <div className="p-4 border-t border-white/10 no-drag-region">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="
              w-full flex items-center justify-center gap-2
              px-4 py-3 rounded-xl
              text-slate-400 hover:text-white
              bg-white/5 hover:bg-white/10
              transition-all duration-300
              group
            "
            title={isExpanded ? '收起侧边栏' : '展开侧边栏'}
          >
            {isExpanded ? (
              <>
                <CaretLeft
                  size={20}
                  weight="bold"
                  className="group-hover:-translate-x-1 transition-transform"
                />
                <span className="text-sm font-medium">收起</span>
              </>
            ) : (
              <CaretRight
                size={20}
                weight="bold"
                className="group-hover:translate-x-1 transition-transform"
              />
            )}
          </button>
        </div>
      )}

      {/* 移动端遮罩 */}
      {isMobile && isExpanded && (
        <div className="fixed inset-0 bg-black/50 z-[-1]" onClick={() => setIsExpanded(false)} />
      )}
    </div>
  )
}

export type { NavItem }
