import { useState, useEffect } from 'react'
import {
  FloppyDisk,
  ArrowsClockwise,
  Clock,
  Trash,
  Package,
  CheckCircle,
  Warning,
} from 'phosphor-react'

interface Backup {
  name: string
  path: string
  type: string
  timestamp: string
  accountEmail?: string
}

interface Props {
  currentAccountEmail?: string
  onRefresh: () => void
}

export default function BackupPanel({ currentAccountEmail, onRefresh }: Props) {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(false)

  const loadBackups = async () => {
    const list = await window.api.getBackups()
    setBackups(list)
  }

  useEffect(() => {
    loadBackups()
  }, [])

  const handleBackupAll = async () => {
    const accountInfo = currentAccountEmail ? `\n账号: ${currentAccountEmail}` : ''

    if (
      !confirm(
        `确定要创建完整备份吗？${accountInfo}\n\n将备份以下内容：\n✓ 会话数据（对话历史、工作区等）\n✓ 用户设置（settings.json, keybindings等）\n✓ MCP配置\n✓ 扩展列表和snippets`
      )
    ) {
      return
    }

    setLoading(true)
    const result = await window.api.backupAll(currentAccountEmail)
    setLoading(false)

    if (result.success) {
      alert(result.message)
      loadBackups()
      onRefresh()
    } else {
      alert(result.message || result.error)
    }
  }

  const handleRestore = async (backup: Backup) => {
    let typeLabel = '完整备份'
    if (backup.type === 'session') {
      typeLabel = '会话'
    } else if (backup.type === 'settings') {
      typeLabel = '设置'
    }

    if (
      !confirm(
        `⚠️ 确定要恢复${typeLabel}吗？\n\n备份信息：\n时间: ${new Date(backup.timestamp).toLocaleString()}\n${backup.accountEmail && backup.accountEmail !== 'all' ? `账号: ${backup.accountEmail}` : ''}\n\n当前数据将被覆盖！`
      )
    ) {
      return
    }

    setLoading(true)
    let result
    if (backup.type === 'complete') {
      result = await window.api.restoreAll(backup.path)
    } else if (backup.type === 'session') {
      result = await window.api.restoreSession(backup.path)
    } else {
      result = await window.api.restoreSettings(backup.path)
    }
    setLoading(false)

    if (result.success) {
      alert(`${result.message}\n\n请重启Cursor以生效`)
      onRefresh()
    } else {
      alert(result.message || result.error)
    }
  }

  const handleDelete = async (backup: Backup) => {
    if (
      !confirm(
        `确定要删除这个备份吗？\n\n${backup.name}\n${new Date(backup.timestamp).toLocaleString()}`
      )
    ) {
      return
    }

    const result = await window.api.deleteBackup(backup.path)
    if (result.success) {
      alert(result.message)
      loadBackups()
    } else {
      alert(result.message || result.error)
    }
  }

  const getBackupTypeInfo = (type: string) => {
    switch (type) {
      case 'complete':
        return { label: '完整', color: 'from-purple-500 to-pink-500', icon: Package }
      case 'session':
        return { label: '会话', color: 'from-blue-500 to-indigo-500', icon: CheckCircle }
      default:
        return { label: '设置', color: 'from-emerald-500 to-cyan-500', icon: CheckCircle }
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部标题和创建备份 */}
      <div className="p-6 border-b border-white/10">
        <h2 className="text-2xl font-bold text-white mb-1">备份管理</h2>
        <p className="text-sm text-slate-400 mb-5">创建和恢复 Cursor 数据备份</p>

        <button
          onClick={handleBackupAll}
          disabled={loading}
          className="
            w-full px-6 py-4 rounded-2xl
            bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-600 text-white
            hover:from-purple-600 hover:via-pink-600 hover:to-indigo-700
            disabled:from-slate-700 disabled:to-slate-700 
            disabled:text-slate-500 disabled:cursor-not-allowed
            transition-all duration-300
            shadow-lg hover:shadow-xl
            hover:-translate-y-1
            active:translate-y-0
            font-semibold
            group
          "
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <FloppyDisk size={24} weight="fill" className={loading ? 'animate-pulse' : ''} />
            <span className="text-base">{loading ? '创建中...' : '创建完整备份'}</span>
          </div>
          <div className="text-xs opacity-90">包含会话、设置和 MCP 配置</div>
        </button>

        {currentAccountEmail && (
          <div className="mt-4 p-3 rounded-xl bg-black/20 border border-white/5">
            <p className="text-xs text-slate-400 text-center">
              当前账号: <span className="font-semibold text-slate-200">{currentAccountEmail}</span>
            </p>
          </div>
        )}
      </div>

      {/* 备份列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-fade-in">
            <div className="w-24 h-24 rounded-3xl glass-card flex items-center justify-center mb-6 shadow-lg">
              <FloppyDisk size={48} weight="thin" className="text-slate-500" />
            </div>
            <p className="text-base font-semibold mb-2">还没有备份</p>
            <p className="text-sm text-slate-500">点击上方按钮创建备份</p>
          </div>
        ) : (
          <div className="space-y-4">
            {backups.map((backup, index) => {
              const typeInfo = getBackupTypeInfo(backup.type)
              const TypeIcon = typeInfo.icon

              return (
                <div
                  key={backup.path}
                  className="glass-card rounded-2xl p-6 card-hover animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* 头部 - 类型和时间 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      {/* 类型标签 */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span
                          className={`
                          inline-flex items-center gap-1.5
                          px-3 py-1.5 text-xs font-semibold rounded-lg
                          bg-gradient-to-r ${typeInfo.color} text-white
                          shadow-md
                        `}
                        >
                          <TypeIcon size={14} weight="fill" />
                          {typeInfo.label}
                        </span>

                        {backup.accountEmail && backup.accountEmail !== 'all' && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400 px-2.5 py-1 bg-black/20 rounded-lg border border-white/5">
                            {backup.accountEmail}
                          </span>
                        )}
                      </div>

                      {/* 备份名称 */}
                      <p className="text-sm text-white font-bold mb-2 truncate-1">{backup.name}</p>

                      {/* 时间 */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock size={14} />
                        <span>
                          {new Date(backup.timestamp).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(backup)}
                      disabled={loading}
                      className="
                        flex-1 flex items-center justify-center gap-2
                        px-4 py-2.5 text-sm font-semibold rounded-xl
                        btn-gradient-primary
                        disabled:from-slate-700 disabled:to-slate-700 
                        disabled:text-slate-500 disabled:cursor-not-allowed
                      "
                    >
                      <ArrowsClockwise size={16} weight="bold" />
                      <span>恢复</span>
                    </button>

                    <button
                      onClick={() => handleDelete(backup)}
                      disabled={loading}
                      className="
                        px-4 py-2.5 text-sm font-semibold rounded-xl
                        bg-red-500/10 text-red-400
                        hover:bg-red-500/20 hover:text-red-300
                        border border-red-500/30 hover:border-red-500/50
                        disabled:opacity-30 disabled:cursor-not-allowed
                        transition-all duration-300
                        hover:-translate-y-0.5
                        active:translate-y-0
                      "
                    >
                      <Trash size={16} weight="bold" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 底部刷新按钮 */}
      <div className="p-6 border-t border-white/10">
        <button
          onClick={loadBackups}
          disabled={loading}
          className="
            w-full flex items-center justify-center gap-2
            px-4 py-3 text-sm font-semibold rounded-xl
            bg-slate-700/50 text-slate-300
            hover:bg-slate-700 hover:text-white
            border border-slate-600/30 hover:border-slate-500/50
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300
            hover:-translate-y-1
            active:translate-y-0
          "
        >
          <ArrowsClockwise size={16} weight="bold" className={loading ? 'animate-spin' : ''} />
          <span>{loading ? '处理中...' : '刷新备份列表'}</span>
        </button>
      </div>
    </div>
  )
}
