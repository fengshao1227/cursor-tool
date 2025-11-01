import { AppConfig } from '../../../shared/types'
import { useState, useEffect } from 'react'
import { CheckCircle, FolderOpen, MagnifyingGlass, Folder, X } from 'phosphor-react'

interface Props {
  config: AppConfig & { customCursorAppPath?: string | null }
  onToggleConfig: (key: keyof AppConfig, value: boolean) => void
  onRefresh: () => void
  autoOpenPathSelector?: boolean
  onPathSelectorClose?: () => void
}

export default function SettingsPanel({
  config,
  onToggleConfig,
  onRefresh,
  autoOpenPathSelector = false,
  onPathSelectorClose,
}: Props) {
  const [searching, setSearching] = useState(false)
  const [foundPaths, setFoundPaths] = useState<string[]>([])
  const [showPathInput, setShowPathInput] = useState(false)
  const [manualPath, setManualPath] = useState('')

  // 监听autoOpenPathSelector，自动展开路径输入
  useEffect(() => {
    if (autoOpenPathSelector) {
      setShowPathInput(true)
    }
  }, [autoOpenPathSelector])

  const handleSearchCursor = async () => {
    setSearching(true)
    try {
      const paths = await window.api.searchCursorInstallations()
      setFoundPaths(paths)

      if (paths.length === 0) {
        alert('❌ 未找到Cursor安装位置\n\n您可以手动输入Cursor的安装路径')
        setShowPathInput(true)
      } else if (paths.length === 1) {
        // 只找到一个，直接设置
        const result = await window.api.setCustomCursorPath(paths[0])
        alert(result.message)
        if (result.success) {
          onRefresh()
          setFoundPaths([])
        }
      }
    } catch (error: any) {
      alert('搜索失败: ' + error.message)
      setShowPathInput(true)
    } finally {
      setSearching(false)
    }
  }

  const handleSetPath = async (path: string) => {
    const result = await window.api.setCustomCursorPath(path)
    alert(result.message)
    if (result.success) {
      onRefresh()
      setFoundPaths([])
      setShowPathInput(false)
      setManualPath('')
      if (onPathSelectorClose) {
        onPathSelectorClose()
      }
    }
  }

  const handleClearPath = async () => {
    if (!confirm('确定要恢复使用默认Cursor路径吗？')) return

    const result = await window.api.clearCustomCursorPath()
    alert(result.message)
    if (result.success) {
      onRefresh()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部标题 */}
      <div className="p-6 border-b border-white/10">
        <h2 className="text-2xl font-bold text-white mb-1">设置</h2>
        <p className="text-sm text-slate-400">配置应用选项和Cursor路径</p>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* 偏好设置 */}
        <div className="glass-card rounded-2xl p-6 card-hover animate-slide-up">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <CheckCircle size={20} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">偏好设置</h3>
              <p className="text-xs text-slate-400">自动化选项</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* 切换选项 */}
            <label className="flex items-center justify-between cursor-pointer group p-4 rounded-xl bg-black/20 hover:bg-black/30 border border-white/5 hover:border-white/10 transition-all duration-200">
              <span className="text-sm text-slate-200 font-medium">切换后自动重启 Cursor</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={config.autoRestart}
                  onChange={e => onToggleConfig('autoRestart', e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-12 h-6 rounded-full transition-all duration-300 ${
                    config.autoRestart
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                      : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
                      config.autoRestart ? 'translate-x-6' : 'translate-x-0.5'
                    } mt-0.5`}
                  ></div>
                </div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group p-4 rounded-xl bg-black/20 hover:bg-black/30 border border-white/5 hover:border-white/10 transition-all duration-200">
              <span className="text-sm text-slate-200 font-medium">切换前自动备份</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={config.backupBeforeSwitch}
                  onChange={e => onToggleConfig('backupBeforeSwitch', e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-12 h-6 rounded-full transition-all duration-300 ${
                    config.backupBeforeSwitch
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                      : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
                      config.backupBeforeSwitch ? 'translate-x-6' : 'translate-x-0.5'
                    } mt-0.5`}
                  ></div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Cursor路径管理 */}
        <div
          className={`glass-card rounded-2xl p-6 card-hover animate-slide-up ${autoOpenPathSelector ? 'ring-2 ring-yellow-500/50 animate-pulse' : ''}`}
          style={{ animationDelay: '50ms' }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FolderOpen size={20} weight="bold" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Cursor 路径</h3>
                {autoOpenPathSelector && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-500/20 text-yellow-400 rounded-lg animate-pulse">
                    需要设置
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">设置Cursor安装位置</p>
            </div>
          </div>

          {/* 当前路径显示 */}
          {config.customCursorAppPath && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs text-emerald-400 font-semibold">✓ 自定义路径</p>
                <button
                  onClick={handleClearPath}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                  title="清除自定义路径"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
              <p className="text-xs font-mono text-slate-300 break-all">
                {config.customCursorAppPath}
              </p>
            </div>
          )}

          {/* 搜索按钮 */}
          <button
            onClick={handleSearchCursor}
            disabled={searching}
            className="
              w-full flex items-center justify-center gap-2
              px-4 py-3 text-sm font-semibold rounded-xl
              bg-gradient-to-r from-cyan-500 to-blue-600 text-white
              hover:from-cyan-600 hover:to-blue-700
              disabled:from-slate-700 disabled:to-slate-700
              disabled:text-slate-500 disabled:cursor-not-allowed
              transition-all duration-300
              hover:-translate-y-1 hover:shadow-lg
              active:translate-y-0
            "
          >
            <MagnifyingGlass size={16} weight="bold" />
            <span>{searching ? '搜索中...' : '搜索 Cursor'}</span>
          </button>

          {/* 找到多个路径，让用户选择 */}
          {foundPaths.length > 1 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-slate-400 font-medium">
                找到 {foundPaths.length} 个安装位置：
              </p>
              {foundPaths.map((path, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSetPath(path)}
                  className="
                    w-full p-3 rounded-xl text-left
                    bg-black/20 hover:bg-black/40
                    border border-white/5 hover:border-cyan-500/30
                    transition-all duration-200
                  "
                >
                  <p className="text-xs font-mono text-slate-300 break-all">{path}</p>
                </button>
              ))}
            </div>
          )}

          {/* 手动输入 */}
          {!showPathInput && foundPaths.length === 0 && (
            <button
              onClick={() => setShowPathInput(true)}
              className="
                w-full mt-3 flex items-center justify-center gap-2
                px-4 py-3 text-sm font-semibold rounded-xl
                bg-slate-700/50 text-slate-300
                hover:bg-slate-700 hover:text-white
                border border-slate-600/30 hover:border-slate-500/50
                transition-all duration-300
              "
            >
              <Folder size={16} weight="bold" />
              <span>手动输入路径</span>
            </button>
          )}

          {showPathInput && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-2 font-medium">
                  {window.platform.isMac ? 'Cursor.app 路径' : 'Cursor 安装目录'}
                </label>
                <input
                  type="text"
                  value={manualPath}
                  onChange={e => setManualPath(e.target.value)}
                  placeholder={
                    window.platform.isMac
                      ? '/Applications/Cursor.app'
                      : 'C:\\Users\\...\\Programs\\Cursor'
                  }
                  className="
                    w-full px-3 py-2 text-sm
                    bg-black/30 border border-white/10
                    rounded-xl text-slate-300
                    focus:outline-none focus:border-cyan-500/50
                    transition-colors
                  "
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSetPath(manualPath)}
                  disabled={!manualPath.trim()}
                  className="
                    flex-1 px-4 py-2 text-sm font-semibold rounded-xl
                    bg-gradient-to-r from-cyan-500 to-blue-600 text-white
                    hover:from-cyan-600 hover:to-blue-700
                    disabled:from-slate-700 disabled:to-slate-700
                    disabled:text-slate-500 disabled:cursor-not-allowed
                    transition-all duration-300
                  "
                >
                  确定
                </button>
                <button
                  onClick={() => {
                    setShowPathInput(false)
                    setManualPath('')
                  }}
                  className="
                    px-4 py-2 text-sm font-semibold rounded-xl
                    bg-slate-700/50 text-slate-300
                    hover:bg-slate-700 hover:text-white
                    transition-all duration-300
                  "
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
