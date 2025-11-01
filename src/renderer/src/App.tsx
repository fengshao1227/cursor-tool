import { useState, useEffect } from 'react'
import { Account, AppConfig } from '../../shared/types'
import HomePanel from './components/HomePanel'
import AccountList from './components/AccountList'
import AddAccountModal from './components/AddAccountModal'
import ToolPanel from './components/ToolPanel'
import BackupPanel from './components/BackupPanel'
import SettingsPanel from './components/SettingsPanel'
import LicenseModal from './components/LicenseModal'
import Sidebar, { NavItem } from './components/Sidebar'
import { AnnouncementBanner } from './components/AnnouncementBanner'
import { Plus, UserPlus, Key } from 'phosphor-react'

function App() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false)
  const [isLicenseRequired, setIsLicenseRequired] = useState(false)
  const [config, setConfig] = useState<AppConfig>({
    autoRestart: false,
    backupBeforeSwitch: false,
  })
  const [isCursorRunning, setIsCursorRunning] = useState(false)
  const [machineId, setMachineId] = useState<string>('')
  const [activeNav, setActiveNav] = useState<NavItem>('home')
  const [platformClass, setPlatformClass] = useState('')
  const [showCursorPathModal, setShowCursorPathModal] = useState(false)
  const [cursorPathSearching, setCursorPathSearching] = useState(false)

  // 检测平台
  useEffect(() => {
    if (window.platform.isMac) {
      setPlatformClass('platform-mac')
    } else if (window.platform.isWindows) {
      setPlatformClass('platform-windows')
    } else if (window.platform.isLinux) {
      setPlatformClass('platform-linux')
    }
  }, [])

  // 检查卡密有效期（改用新逻辑）
  const checkLicense = async () => {
    try {
      // 优先使用实时验证，确保卡密仍然有效
      const status = await window.api.getLicenseStatus()
      
      if (!status.valid) {
        // 验证失败，要求激活
        console.log('⚠️ 卡密验证失败:', status.message)
        setIsLicenseRequired(true)
        setIsLicenseModalOpen(true)
        return
      }
      
      // 卡密有效
      console.log(`✅ 卡密有效，有效期至：${status.expiresAt ? new Date(status.expiresAt).toLocaleDateString() : '未知'}`)
    } catch (error) {
      console.error('Failed to check license:', error)
      // 验证出错，要求激活
      setIsLicenseRequired(true)
      setIsLicenseModalOpen(true)
    }
  }

  // 检查Cursor路径（优先级最高）
  const checkCursorPath = async () => {
    try {
      const currentPath = await window.api.getCurrentCursorAppPath()
      
      // 如果没有配置路径，尝试搜索
      if (!currentPath) {
        console.log('🔍 未找到Cursor路径，开始自动搜索...')
        setCursorPathSearching(true)
        const foundPaths = await window.api.searchCursorInstallations()
        setCursorPathSearching(false)
        
        if (foundPaths.length === 0) {
          // 没找到，强制导航到设置面板让用户手动设置
          alert('⚠️ 未找到Cursor安装位置\n\n请手动选择Cursor的安装路径，否则无法使用自动启动/关闭功能')
          setActiveNav('settings')  // 自动切换到设置面板
          setShowCursorPathModal(true)
        } else if (foundPaths.length === 1) {
          // 找到一个，自动设置
          await window.api.setCustomCursorPath(foundPaths[0])
          console.log('✅ 已自动设置Cursor路径:', foundPaths[0])
          alert(`✅ 已自动找到并设置Cursor路径：\n\n${foundPaths[0]}`)
          await loadData()  // 刷新配置
        } else {
          // 找到多个，让用户选择
          alert(`🔍 找到 ${foundPaths.length} 个Cursor安装位置\n\n请在"设置"中选择正确的路径`)
          setActiveNav('settings')  // 自动切换到设置面板
          setShowCursorPathModal(true)
        }
      }
    } catch (error) {
      console.error('检查Cursor路径失败:', error)
    }
  }

  // 加载数据
  const loadData = async () => {
    try {
      const accs = await window.api.getAccounts()
      setAccounts(accs)

      const cfg = await window.api.getConfig()
      setConfig(cfg)

      const running = await window.api.isCursorRunning()
      setIsCursorRunning(running)

      const mid = await window.api.getCurrentMachineId()
      setMachineId(mid)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  useEffect(() => {
    checkCursorPath()  // 最优先：检查Cursor路径
    checkLicense()     // 其次：检查许可证
    loadData()

    // 定时刷新Cursor运行状态
    const interval = setInterval(async () => {
      const running = await window.api.isCursorRunning()
      setIsCursorRunning(running)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleAddAccount = async (
    email: string,
    token: string,
    nickname?: string
  ) => {
    const result = await window.api.addAccount(email, token, nickname)
    if (result.success) {
      loadData()
      setIsAddModalOpen(false)
      alert(result.message)
    } else {
      alert(result.message || result.error)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('确定要删除这个账号吗？')) return

    const result = await window.api.deleteAccount(id)
    if (result.success) {
      loadData()
      alert(result.message)
    } else {
      alert(result.message || result.error)
    }
  }

  const handleSwitchAccount = async (id: string) => {
    if (!confirm('切换账号会重启Cursor，确定要继续吗？')) return

    const result = await window.api.switchAccount(id)
    if (result.success) {
      loadData()
      alert(result.message)
    } else {
      alert(result.message || result.error)
    }
  }

  const handleResetMachineId = async () => {
    if (!confirm('重置机器码会清除认证信息，Cursor将被登出。确定要继续吗？')) return

    const result = await window.api.resetMachineId()
    if (result.success) {
      loadData()
      alert(result.message)
    } else {
      alert(result.message || result.error)
    }
  }

  const handleImportCurrentAccount = async () => {
    const nickname = prompt('请输入备注名称（可选）：', '当前账号')
    const result = await window.api.importCurrentAccount(nickname || undefined)
    
    if (result.success) {
      loadData()
      alert(result.message)
    } else {
      alert(result.message || result.error)
    }
  }

  const handleToggleConfig = async (key: keyof AppConfig, value: boolean) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    await window.api.updateConfig(newConfig)
  }

  // 渲染主内容区
  const renderContent = () => {
    switch (activeNav) {
      case 'home':
        return (
          <div className="h-full overflow-y-auto">
            <HomePanel />
          </div>
        )

      case 'accounts':
        return (
          <div className="flex flex-col h-full">
            {/* 顶部操作栏 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-white/10">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">账号管理</h2>
                <p className="text-sm text-slate-400">
                  管理你的 Cursor Pro 账号，快速切换
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleImportCurrentAccount}
                  className="
                    flex-1 sm:flex-none flex items-center justify-center gap-2
                    px-5 py-2.5 rounded-xl
                    bg-slate-700/30 text-slate-300
                    hover:bg-slate-700/50 hover:text-white
                    border border-slate-600/30 hover:border-slate-500/50
                    transition-all duration-300
                    text-sm font-semibold
                    hover:-translate-y-0.5
                  "
                  title="从Cursor导入当前登录的账号"
                >
                  <UserPlus size={18} weight="bold" />
                  <span>导入</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="
                    flex-1 sm:flex-none flex items-center justify-center gap-2
                    px-5 py-2.5 rounded-xl
                    btn-gradient-primary
                    text-sm font-semibold
                  "
                >
                  <Plus size={18} weight="bold" />
                  <span>添加账号</span>
                </button>
              </div>
            </div>

            {/* 账号列表 */}
            <div className={`flex-1 overflow-y-auto p-6 ${platformClass === 'platform-mac' ? 'scrollbar-mac' : 'scrollbar-windows'}`}>
              <AccountList
                accounts={accounts}
                onDelete={handleDeleteAccount}
                onSwitch={handleSwitchAccount}
              />
            </div>
          </div>
        )

      case 'tools':
        return (
          <div className="h-full overflow-y-auto">
            <ToolPanel
              machineId={machineId}
              isCursorRunning={isCursorRunning}
              onResetMachineId={handleResetMachineId}
              onRefresh={loadData}
            />
          </div>
        )

      case 'settings':
        return (
          <div className="h-full overflow-y-auto">
            <SettingsPanel
              config={config}
              onToggleConfig={handleToggleConfig}
              onRefresh={loadData}
              autoOpenPathSelector={showCursorPathModal}
              onPathSelectorClose={() => setShowCursorPathModal(false)}
            />
          </div>
        )

      case 'backup':
        return (
          <div className="h-full overflow-y-auto">
            <BackupPanel
              currentAccountEmail={
                accounts.find((a) => a.isCurrent)?.email
              }
              onRefresh={loadData}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`h-screen flex gradient-bg overflow-hidden ${platformClass}`}>
      {/* 侧边栏 */}
      <Sidebar 
        activeItem={activeNav} 
        onNavigate={setActiveNav}
        onChangeLicense={() => {
          setIsLicenseRequired(false)
          setIsLicenseModalOpen(true)
        }}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* macOS 拖拽区域 */}
        {window.platform.isMac && (
          <div className="h-10 drag-region flex-shrink-0" />
        )}

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto">
          {/* 在线公告 - 显示在所有页面顶部，优先级最高 */}
          <div className="px-6 pt-4">
            <AnnouncementBanner />
          </div>
          
          <div className="h-full">
            {renderContent()}
          </div>
        </div>

        {/* 底部状态栏 */}
        <div className="flex-shrink-0 px-6 py-3 glass-dark border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">
                账号: <span className="text-white font-semibold">{accounts.length}</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className={`flex items-center gap-1 ${isCursorRunning ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className={`w-2 h-2 rounded-full ${isCursorRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                Cursor {isCursorRunning ? '运行中' : '未运行'}
              </span>
              {config.licenseExpiresAt && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    📅 卡密有效期: {new Date(config.licenseExpiresAt).toLocaleDateString('zh-CN')}
                    {config.licenseRemainingDays !== undefined && ` (剩余${config.licenseRemainingDays}天)`}
                  </span>
                </>
              )}
            </div>
            <div className="text-slate-500 font-mono truncate-1 max-w-xs">
              Machine ID: {machineId.substring(0, 16)}...
            </div>
          </div>
        </div>
      </div>

      {/* 添加账号弹窗 */}
      {isAddModalOpen && (
        <AddAccountModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddAccount}
        />
      )}

      {/* 许可证弹窗 */}
      {isLicenseModalOpen && (
        <LicenseModal
          onClose={() => {
            setIsLicenseModalOpen(false)
          }}
          required={isLicenseRequired}
          onAccountAdded={loadData}
          onActivationSuccess={() => {
            // 激活成功后取消 required 状态
            setIsLicenseRequired(false)
          }}
        />
      )}
    </div>
  )
}

export default App
