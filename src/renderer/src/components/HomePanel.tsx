import { House } from 'phosphor-react'

export default function HomePanel() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 mb-6">
            <House size={40} weight="fill" className="text-gradient-primary" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Cursor 账号管理器</h1>
          <p className="text-xl text-slate-400">
            轻松管理多个 Cursor Pro 账号，快速切换，提高工作效率
          </p>
        </div>

        {/* 功能特点 */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="p-6 rounded-xl glass-dark border border-white/10 hover:border-emerald-500/30 transition-all">
            <div className="text-3xl mb-3">🔐</div>
            <h3 className="text-lg font-semibold text-white mb-2">账号管理</h3>
            <p className="text-sm text-slate-400">
              添加、删除、切换多个 Cursor Pro 账号，一键切换，无需手动登录
            </p>
          </div>

          <div className="p-6 rounded-xl glass-dark border border-white/10 hover:border-emerald-500/30 transition-all">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold text-white mb-2">快速切换</h3>
            <p className="text-sm text-slate-400">
              自动重启 Cursor，无缝切换账号，保留工作区状态和配置
            </p>
          </div>

          <div className="p-6 rounded-xl glass-dark border border-white/10 hover:border-emerald-500/30 transition-all">
            <div className="text-3xl mb-3">💾</div>
            <h3 className="text-lg font-semibold text-white mb-2">备份恢复</h3>
            <p className="text-sm text-slate-400">
              自动备份账号会话数据，支持一键恢复，防止数据丢失
            </p>
          </div>

          <div className="p-6 rounded-xl glass-dark border border-white/10 hover:border-emerald-500/30 transition-all">
            <div className="text-3xl mb-3">🛠️</div>
            <h3 className="text-lg font-semibold text-white mb-2">系统工具</h3>
            <p className="text-sm text-slate-400">
              初始化 Cursor 环境，重置机器码，恢复出厂设置等功能
            </p>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">使用说明</h2>

          <div className="space-y-4">
            <div className="p-5 rounded-xl glass-dark border border-white/10">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">激活软件</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    首次使用需要输入卡密激活软件。激活成功后，软件会自动添加对应的账号到账号列表中。
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl glass-dark border border-white/10">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">添加账号</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    在"账号管理"页面点击"添加账号"按钮，输入邮箱和 token
                    即可添加新账号。也可以点击"导入"按钮从当前 Cursor 中导入已登录的账号。
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl glass-dark border border-white/10">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">切换账号</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    在账号列表中点击"切换"按钮，软件会自动关闭当前 Cursor，切换账号并重新启动
                    Cursor。切换过程中会保留你的工作区状态。
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl glass-dark border border-white/10">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">备份管理</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    在"备份管理"页面可以查看、创建和恢复账号的会话备份。建议在切换账号前启用"切换前自动备份"选项，确保数据安全。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 注意事项 */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">注意事项</h2>

          <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <ul className="space-y-3 text-slate-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">⚠️</span>
                <span>切换账号会自动重启 Cursor，请确保已保存当前工作</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">⚠️</span>
                <span>首次使用需要配置 Cursor 的安装路径，软件会自动尝试查找</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">⚠️</span>
                <span>初始化 Cursor 会清除所有数据，请谨慎操作</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 作者信息 */}
        <div className="text-center pt-8 border-t border-white/10">
          <p className="text-slate-400 text-sm mb-2">Made with ❤️ by</p>
          <p className="text-lg font-semibold text-white">不知名的程序猿</p>
        </div>
      </div>
    </div>
  )
}
