import { Power, ArrowsClockwise, Fingerprint, Fire, Lightning } from 'phosphor-react'

interface Props {
  machineId: string
  isCursorRunning: boolean
  onResetMachineId: () => void
  onRefresh: () => void
}

export default function ToolPanel({
  machineId,
  isCursorRunning,
  onResetMachineId,
  onRefresh,
}: Props) {
  const handleKillCursor = async () => {
    const result = await window.api.killCursor()
    alert(result.message)
    onRefresh()
  }

  const handleLaunchCursor = async () => {
    const result = await window.api.launchCursor()
    alert(result.message)
    onRefresh()
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部标题 */}
      <div className="p-6 border-b border-white/10">
        <h2 className="text-2xl font-bold text-white mb-1">系统工具</h2>
        <p className="text-sm text-slate-400">管理 Cursor 进程和机器码</p>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Cursor状态 */}
        <div className="glass-card rounded-2xl p-6 card-hover animate-slide-up">
          <div className="flex items-center gap-3 mb-5">
            <div
              className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${
                isCursorRunning
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-700/50 text-slate-500'
              }
            `}
            >
              <Power size={20} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cursor 状态</h3>
              <p className="text-xs text-slate-400">进程管理和控制</p>
            </div>
          </div>

          {/* 状态显示 */}
          <div className="flex items-center justify-between mb-5 p-4 rounded-xl bg-black/20 border border-white/5">
            <span className="text-sm text-slate-300 font-medium">运行状态</span>
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isCursorRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                }`}
                style={{ boxShadow: isCursorRunning ? '0 0 10px rgba(74, 222, 128, 0.6)' : 'none' }}
              />
              <span
                className={`text-sm font-semibold ${
                  isCursorRunning ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {isCursorRunning ? '运行中' : '未运行'}
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleKillCursor}
              disabled={!isCursorRunning}
              className="
                flex-1 flex items-center justify-center gap-2
                px-4 py-3 text-sm font-semibold rounded-xl
                bg-gradient-to-r from-red-500 to-rose-600 text-white
                hover:from-red-600 hover:to-rose-700
                disabled:from-slate-700 disabled:to-slate-700 
                disabled:text-slate-500 disabled:cursor-not-allowed
                transition-all duration-300
                hover:-translate-y-1 hover:shadow-lg
                active:translate-y-0
              "
            >
              <Power size={16} weight="bold" />
              <span>关闭</span>
            </button>
            <button
              onClick={handleLaunchCursor}
              disabled={isCursorRunning}
              className="
                flex-1 flex items-center justify-center gap-2
                px-4 py-3 text-sm font-semibold rounded-xl
                btn-gradient-primary
                disabled:from-slate-700 disabled:to-slate-700 
                disabled:text-slate-500 disabled:cursor-not-allowed
              "
            >
              <Lightning size={16} weight="fill" />
              <span>启动</span>
            </button>
          </div>
        </div>

        {/* 机器码管理 */}
        <div
          className="glass-card rounded-2xl p-6 card-hover animate-slide-up"
          style={{ animationDelay: '50ms' }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Fingerprint size={20} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">机器码管理</h3>
              <p className="text-xs text-slate-400">重置设备标识</p>
            </div>
          </div>

          {/* 机器码显示 */}
          <div className="mb-5">
            <p className="text-xs text-slate-400 mb-2 font-medium">当前机器码</p>
            <div className="p-3 rounded-xl bg-black/30 border border-white/5">
              <p className="text-xs font-mono text-slate-300 break-all">{machineId || '未找到'}</p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              onClick={onResetMachineId}
              className="
                w-full flex items-center justify-center gap-2
                px-4 py-3 text-sm font-semibold rounded-xl
                bg-gradient-to-r from-amber-500 to-orange-600 text-white
                hover:from-amber-600 hover:to-orange-700
                transition-all duration-300
                hover:-translate-y-1 hover:shadow-lg
                active:translate-y-0
              "
            >
              <ArrowsClockwise size={16} weight="bold" />
              <span>重置机器码</span>
            </button>
            <p className="text-xs text-slate-500 px-2">⚠️ 重置后 Cursor 会被登出，需要重新登录</p>

            <button
              onClick={async () => {
                if (
                  !confirm(
                    '⚠️ 这将彻底清除Cursor所有数据，包括：\n\n✓ 机器码\n✓ 登录状态\n✓ 所有缓存\n✓ 工作区历史\n✓ 扩展数据\n\n确定要恢复出厂设置吗？'
                  )
                ) {
                  return
                }

                const result = await window.api.factoryReset()

                if (result.success && result.details) {
                  alert(`${result.message}\n\n清理详情：\n${result.details.join('\n')}`)
                  onRefresh()
                } else {
                  alert(result.message || result.error)
                }
              }}
              className="
                w-full flex items-center justify-center gap-2
                px-4 py-3 text-sm font-semibold rounded-xl
                bg-gradient-to-r from-red-500 to-rose-600 text-white
                hover:from-red-600 hover:to-rose-700
                transition-all duration-300
                hover:-translate-y-1 hover:shadow-lg
                active:translate-y-0
              "
            >
              <Fire size={16} weight="fill" />
              <span>恢复出厂设置</span>
            </button>
            <p className="text-xs text-red-400 mb-2 px-2 font-medium">
              🔥 危险操作！会清除所有 Cursor 数据
            </p>

            <button
              onClick={async () => {
                if (
                  !confirm(
                    '🔥🔥🔥 深度重置警告 🔥🔥🔥\n\n这将执行最彻底的重置，包括：\n\n✓ 修改系统UUID\n✓ 修改Cursor程序文件\n✓ 移除并重新签名应用\n✓ 清除DNS缓存\n✓ 重置所有机器码\n✓ 清除所有数据\n\n⚠️ 需要管理员权限！\n⚠️ Cursor签名会失效！\n⚠️ 首次启动需要允许运行！\n\n确定要执行深度重置吗？'
                  )
                ) {
                  return
                }

                const result = await window.api.deepReset()

                if (result.success && result.details) {
                  alert(`${result.message}\n\n${result.details.join('\n')}`)
                  onRefresh()
                } else {
                  alert(result.message || result.error)
                }
              }}
              className="
                w-full flex items-center justify-center gap-2
                px-4 py-3 text-sm font-semibold rounded-xl
                bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white
                hover:from-red-700 hover:via-orange-700 hover:to-red-700
                transition-all duration-300
                hover:-translate-y-1 hover:shadow-xl
                active:translate-y-0
                animate-pulse
              "
              style={{ animationDuration: '3s' }}
            >
              <Fire size={16} weight="fill" />
              <Fire size={16} weight="fill" />
              <span>深度重置</span>
              <Fire size={16} weight="fill" />
              <Fire size={16} weight="fill" />
            </button>
            <p className="text-xs text-orange-400 px-2 font-medium">
              ⚠️ 最彻底的重置！会修改 Cursor 程序文件！
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
