# 更新日志

## v1.0.2 (2024-10-28)

### 💾 新增功能 - 完整的备份和恢复系统

#### 会话备份和恢复
**备份内容：**
- ✅ state.vscdb（会话状态和认证信息）
- ✅ storage.json（机器码和配置）
- ✅ workspaceStorage（工作区数据）
- ✅ History（历史记录）
- ✅ Cookies（认证Cookie）
- ✅ Local Storage（本地存储）

**使用场景：**
- 切换账号前备份当前会话
- 保存特定账号的完整状态
- 在不同设备间迁移会话

#### 设置备份和恢复
**备份内容：**
- ✅ settings.json（编辑器设置）
- ✅ keybindings.json（快捷键配置）
- ✅ snippets（代码片段）
- ✅ profiles.json（配置文件）
- ✅ extensions.json（扩展列表）

**使用场景：**
- 保存你的个性化配置
- 在重装系统后快速恢复
- 分享配置给其他人

#### 备份管理界面
- 🎨 新增"备份管理"标签页
- 📋 列出所有备份，显示类型、时间、账号
- 🔄 一键恢复备份
- 🗑️ 删除不需要的备份
- 📦 自动保存备份元数据

**功能特点：**
1. **智能备份** - 自动关闭Cursor，避免文件占用
2. **安全恢复** - 恢复前自动备份当前状态（.before-restore）
3. **详细信息** - 显示备份了哪些内容，成功恢复了哪些项
4. **时间排序** - 最新的备份显示在最前面

### 🎯 使用示例

#### 备份当前账号的会话：
1. 切换到标签页"💾 备份管理"
2. 点击"备份会话"
3. 等待备份完成
4. 查看备份列表

#### 恢复之前的会话：
1. 在备份列表中找到要恢复的会话
2. 点击"恢复"按钮
3. 确认操作
4. 重启Cursor生效

#### 备份你的设置：
1. 点击"备份设置"
2. 所有个性化配置被保存
3. 重装系统后可一键恢复

### 📁 备份存储位置

Mac:
```
~/Library/Application Support/cursor-account-manager/backups/
├── session_user@example.com_2024-10-28T12-00-00/
│   ├── metadata.json
│   ├── state.vscdb
│   ├── storage.json
│   ├── Cookies
│   ├── workspaceStorage/
│   └── History/
└── settings_2024-10-28T13-00-00/
    ├── metadata.json
    ├── settings.json
    ├── keybindings.json
    └── snippets/
```

---

## v1.0.1 (2024-10-28)

### 🔥 新增功能

#### 完整恢复出厂设置
新增**彻底重置Cursor**功能，一键让Cursor回到刚安装的状态！

**清理内容：**
- ✅ 重置机器码（生成全新设备ID）
- ✅ 清除所有认证信息（登出）
- ✅ 清空所有缓存目录（Cache、Code Cache、GPU Cache等）
- ✅ 清空Local Storage
- ✅ 清空Session Storage  
- ✅ 清空工作区历史
- ✅ 清空历史记录
- ✅ 清空备份数据
- ✅ 清空日志文件

**使用场景：**
1. 账号频繁切换被限制，需要彻底重置
2. Cursor出现异常，需要清理缓存
3. 想要完全清除使用痕迹
4. 重新开始使用Cursor

**如何使用：**
1. 在右侧工具面板找到"机器码管理"
2. 点击红色的"🔥 恢复出厂设置"按钮
3. 确认警告提示
4. 等待清理完成
5. 重新启动Cursor，状态将回到全新安装

**注意事项：**
- ⚠️ 这是**危险操作**，会删除所有Cursor数据
- ⚠️ 操作前会自动备份state.vscdb
- ⚠️ 建议先关闭Cursor（工具会自动关闭）
- ⚠️ 恢复后需要重新登录账号

#### 快速导入账号
新增**导入当前账号**按钮，一键从Cursor导入！

**使用方法：**
1. 在Cursor中登录你的账号
2. 在本工具中点击"📥 导入"按钮
3. 输入备注名称（可选）
4. 自动读取并保存token

**优势：**
- 无需手动获取token
- 自动读取邮箱和token
- 快速添加多个账号

### 🔧 修复

- 修复打包后无法启动的问题（路径配置错误）
- 修复Account类型定义缺少refreshToken字段

### 📦 打包配置优化

- 修改输出目录为 `out/` (electron-vite默认)
- 自动在打包前执行build
- 移除图标配置避免缺失文件错误
- 添加asarUnpack配置

---

## v1.0.0 (2024-10-28)

### ✨ 首次发布

**核心功能：**
- ✅ 多账号管理（增删改查）
- ✅ Token直接注入切换
- ✅ 机器码重置
- ✅ 自动关闭/启动Cursor
- ✅ 现代化UI界面
- ✅ 跨平台支持（Mac/Windows）

**技术栈：**
- Electron + React + TypeScript
- SQLite本地数据库
- Tailwind CSS

**文档：**
- README.md - 项目介绍
- USAGE_GUIDE.md - 使用指南
- BUILD.md - 构建指南
- PROJECT_SUMMARY.md - 项目总结

