import { useState } from 'react'
import { Plus, X, Envelope, Key, Tag } from 'phosphor-react'

interface Props {
  onClose: () => void
  onAdd: (email: string, token: string, nickname?: string) => void
}

export default function AddAccountModal({ onClose, onAdd }: Props) {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [nickname, setNickname] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !token.trim()) {
      alert('请填写邮箱和Token')
      return
    }

    onAdd(email.trim(), token.trim(), nickname.trim() || undefined)
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 no-drag-region animate-fade-in p-4"
      onClick={onClose}
    >
      <div 
        className="glass-card rounded-3xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="relative p-6 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <Plus size={24} weight="bold" className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold text-white mb-1">添加新账号</h3>
              <p className="text-sm text-slate-400">
                输入 Cursor 账号的邮箱和访问令牌
              </p>
            </div>
            <button
              onClick={onClose}
              className="
                w-8 h-8 rounded-lg flex items-center justify-center
                text-slate-400 hover:text-white
                bg-white/5 hover:bg-white/10
                transition-all duration-200
                flex-shrink-0
              "
            >
              <X size={20} weight="bold" />
            </button>
          </div>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 邮箱地址 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
              <Envelope size={16} weight="bold" />
              <span>邮箱地址</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="
                w-full px-4 py-3 
                bg-black/30 backdrop-blur-sm 
                border border-white/10
                rounded-xl 
                focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                outline-none 
                text-sm text-white placeholder-slate-500
                transition-all duration-200 
                hover:border-white/20
              "
              required
            />
          </div>

          {/* Access Token */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
              <Key size={16} weight="bold" />
              <span>Access Token</span>
            </label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="
                w-full px-4 py-3 
                bg-black/30 backdrop-blur-sm 
                border border-white/10
                rounded-xl 
                focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                outline-none 
                text-sm text-white placeholder-slate-500
                font-mono
                transition-all duration-200 
                hover:border-white/20
                resize-none
              "
              rows={4}
              required
            />
            <p className="text-xs text-slate-500 px-2 flex items-center gap-1">
              <span className="text-slate-600">💡</span>
              从 Cursor 的 state.vscdb 中获取的 accessToken
            </p>
          </div>

          {/* 备注名称 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
              <Tag size={16} weight="bold" />
              <span>备注名称</span>
              <span className="text-xs text-slate-500 font-normal">（可选）</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="工作账号、个人账号..."
              className="
                w-full px-4 py-3 
                bg-black/30 backdrop-blur-sm 
                border border-white/10
                rounded-xl 
                focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                outline-none 
                text-sm text-white placeholder-slate-500
                transition-all duration-200 
                hover:border-white/20
              "
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 px-5 py-3 
                border-2 border-slate-600/50 text-slate-300
                rounded-xl 
                hover:bg-slate-700/30 hover:border-slate-500/50 hover:text-white
                transition-all duration-300 
                text-sm font-semibold
                hover:-translate-y-0.5
                active:translate-y-0
              "
            >
              取消
            </button>
            <button
              type="submit"
              className="
                flex-1 flex items-center justify-center gap-2
                px-5 py-3 
                btn-gradient-primary
                text-sm font-semibold
              "
            >
              <Plus size={18} weight="bold" />
              <span>添加账号</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
