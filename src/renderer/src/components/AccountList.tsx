import { Account } from '../../../shared/types'
import {
  CheckCircle,
  ArrowsLeftRight,
  PencilSimple,
  Trash,
  User,
  Clock,
  Calendar,
} from 'phosphor-react'

interface Props {
  accounts: Account[]
  onDelete: (id: string) => void
  onSwitch: (id: string) => void
}

export default function AccountList({ accounts, onDelete, onSwitch }: Props) {
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-fade-in">
        <div className="w-24 h-24 rounded-3xl glass-card flex items-center justify-center mb-6 shadow-lg">
          <User size={48} weight="thin" className="text-slate-500" />
        </div>
        <p className="text-base font-semibold mb-2">还没有添加账号</p>
        <p className="text-sm text-slate-500">点击右上角"添加账号"开始</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {accounts.map((account, index) => (
        <AccountCard
          key={account.id}
          account={account}
          index={index}
          onDelete={onDelete}
          onSwitch={onSwitch}
        />
      ))}
    </div>
  )
}

interface AccountCardProps {
  account: Account
  index: number
  onDelete: (id: string) => void
  onSwitch: (id: string) => void
}

function AccountCard({ account, index, onDelete, onSwitch }: AccountCardProps) {
  const isActive = account.isCurrent

  return (
    <div
      className={`
        relative glass-card rounded-2xl p-6
        card-hover animate-slide-up
        ${isActive ? 'gradient-border-glow' : 'gradient-border'}
        ${isActive ? 'shadow-lg' : ''}
      `}
      style={{
        animationDelay: `${index * 50}ms`,
        ...(isActive && { boxShadow: '0 8px 32px rgba(167, 139, 250, 0.3)' }),
      }}
    >
      {/* 头部 - 头像和状态 */}
      <div className="flex items-start gap-4 mb-4">
        {/* 头像 */}
        <div
          className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          flex-shrink-0
          ${
            isActive
              ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 ring-2 ring-purple-500/50'
              : 'bg-gradient-to-br from-slate-700/50 to-slate-600/50'
          }
        `}
        >
          <User
            size={24}
            weight={isActive ? 'fill' : 'regular'}
            className={isActive ? 'text-purple-300' : 'text-slate-400'}
          />
        </div>

        {/* 名称和状态 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white text-base truncate-1">
              {account.nickname || account.email}
            </h3>
            {isActive && (
              <CheckCircle
                size={20}
                weight="fill"
                className="flex-shrink-0 text-emerald-400 animate-pulse"
              />
            )}
          </div>

          {account.nickname && (
            <p className="text-sm text-slate-400 truncate-1 mb-1">{account.email}</p>
          )}

          {isActive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-lg">
              <CheckCircle size={12} weight="fill" />
              当前使用
            </span>
          )}
        </div>
      </div>

      {/* Token 显示 */}
      <div className="mb-4 p-3 rounded-xl bg-black/20 border border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-slate-400">Access Token</span>
        </div>
        <p className="text-xs font-mono text-slate-300 truncate-1">
          {account.token.substring(0, 40)}...
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={() => onSwitch(account.id)}
          disabled={isActive}
          className={`
            flex-1 flex items-center justify-center gap-2
            px-4 py-2.5 text-sm font-semibold rounded-xl
            transition-all duration-300
            ${
              isActive
                ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                : 'btn-gradient-primary'
            }
          `}
        >
          {isActive ? (
            <>
              <CheckCircle size={16} weight="fill" />
              <span>正在使用</span>
            </>
          ) : (
            <>
              <ArrowsLeftRight size={16} weight="bold" />
              <span>切换</span>
            </>
          )}
        </button>

        {/* <button
          onClick={() => {}}
          className="
            px-3 py-2.5 text-sm font-semibold rounded-xl
            bg-slate-700/30 text-slate-300
            hover:bg-slate-700/50 hover:text-white
            border border-slate-600/30 hover:border-slate-500/50
            transition-all duration-300
            hover:-translate-y-0.5
          "
          title="编辑"
        >
          <PencilSimple size={16} weight="bold" />
        </button> */}

        <button
          onClick={() => onDelete(account.id)}
          className="
            px-3 py-2.5 text-sm font-semibold rounded-xl
            bg-red-500/10 text-red-400
            hover:bg-red-500/20 hover:text-red-300
            border border-red-500/30 hover:border-red-500/50
            transition-all duration-300
            hover:-translate-y-0.5
          "
          title="删除"
        >
          <Trash size={16} weight="bold" />
        </button>
      </div>

      {/* 活动账号的额外发光效果 */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(167, 139, 250, 0.1) 0%, transparent 70%)',
          }}
        />
      )}
    </div>
  )
}
