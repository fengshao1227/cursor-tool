# Cursor 账号管理器

一个跨平台的桌面应用，用于管理多个Cursor Pro账号，支持一键切换账号、重置机器码等功能。

## ✨ 核心功能

- 🔄 **快速切换账号** - 一键切换多个Cursor Pro账号
- 🔑 **Token注入** - 直接修改Cursor的认证数据库，无需复制文件
- 🖥️ **机器码重置** - 重置设备标识，避免封禁风险
- 🔥 **恢复出厂设置** - 彻底重置Cursor到全新状态
- 💾 **会话备份** - 备份和恢复Cursor会话、工作区、历史记录
- ⚙️ **设置备份** - 备份和恢复编辑器设置、快捷键、代码片段
- 📥 **快速导入** - 一键从Cursor导入当前账号
- 🎨 **现代化界面** - 美观易用的图形界面
- 🚀 **跨平台支持** - 支持 macOS 和 Windows

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS
- **后端**: Electron 28
- **数据库**: SQLite3 (better-sqlite3)
- **构建**: Vite + electron-vite
- **打包**: electron-builder

## 📦 安装依赖

```bash
npm install
```

## 🚀 开发运行

```bash
npm run dev
```

## 📱 打包应用

### Mac版本（在 Mac 上）
```bash
npm run build
npm run dist:mac
```

### Windows版本（推荐在 Windows 上）
```bash
# 1. 诊断构建环境（可选）
npm run diagnose

# 2. 清理旧文件（可选）
npm run clean

# 3. 安装依赖
npm install

# 4. 构建和打包
npm run build
npm run dist:win
```

**⚠️ Windows 构建重要提示**

如果 Windows 版本无法启动，通常是 `better-sqlite3` 原生模块的问题：

**推荐方案（在 Windows 机器上构建）**：
```bash
# 首次需要安装构建工具
npm install --global windows-build-tools


# 清理、安装、构建
npm run clean
npm install
npm run build
npm run dist:win
```

**快速诊断**：
```bash
npm run diagnose  # 自动检查构建环境和依赖
```

**使用 GitHub Actions 自动构建**：
- 已配置自动在 Windows/Mac 平台构建
- 推送代码后在 Actions 标签页下载构建产物

**常见问题**：
- 应用无法启动：必须在 Windows 上重新 `npm install` 和构建
- 找不到模块：运行 `npm run rebuild:electron`
- 架构不匹配：在目标平台上重新构建

## 📖 使用说明

### 1. 添加账号

点击"添加账号"按钮，填写以下信息：
- **邮箱地址**: Cursor账号的邮箱
- **Access Token**: 从Cursor配置中获取的token

#### 如何获取Token？

**方法一：手动提取**

Mac系统：
```bash
sqlite3 "~/Library/Application Support/Cursor/User/globalStorage/state.vscdb" \
  "SELECT value FROM ItemTable WHERE key='cursorAuth/accessToken'"
```

Windows系统：
```cmd
sqlite3 "%APPDATA%\Cursor\User\globalStorage\state.vscdb" \
  "SELECT value FROM ItemTable WHERE key='cursorAuth/accessToken'"
```

**方法二：使用本工具导入**
- 在Cursor中登录账号
- 在本工具中点击"导入当前账号"

### 2. 切换账号

1. 在账号列表中选择要切换的账号
2. 点击"切换"按钮
3. 工具会自动关闭Cursor并注入新的Token
4. 根据设置自动重启Cursor或手动启动

### 3. 重置机器码

当频繁切换账号导致被限制时：
1. 点击"重置机器码"按钮
2. 工具会生成新的设备标识
3. Cursor会被识别为新设备

⚠️ **注意**: 重置机器码会清除当前登录状态，需要重新登录

### 4. 深度重置（跨平台）

执行更彻底的系统级重置：
1. 点击"🔥🔥 深度重置 🔥🔥"按钮
2. 会执行：

**Mac 系统：**
   - 修改系统UUID
   - 清除DNS缓存
   - 修改Cursor程序文件
   - 移除并重新签名应用

**Windows 系统：**
   - 修改注册表 MachineGuid（需要管理员权限）
   - 清除DNS缓存
   - 清除网络缓存（ARP、NetBIOS）
   - 修改Cursor程序文件

⚠️ **重要提示**:
- Windows需要以**管理员身份**运行才能完整执行深度重置
- Mac上首次启动修改后的Cursor可能需要在"系统偏好设置→安全性"中允许
- Windows上首次运行可能触发SmartScreen警告，点击"更多信息"→"仍要运行"即可
- 建议深度重置后重启计算机

## 🔒 安全说明

- 所有账号数据存储在本地SQLite数据库中
- 不会上传任何数据到远程服务器
- Token数据仅用于本地切换账号

## 📂 数据存储位置

### Mac
- 应用数据: `~/Library/Application Support/cursor-account-manager/`
- 数据库: `~/Library/Application Support/cursor-account-manager/accounts.db`
- Cursor配置: `~/Library/Application Support/Cursor/`

### Windows
- 应用数据: `%APPDATA%\cursor-account-manager\`
- 数据库: `%APPDATA%\cursor-account-manager\accounts.db`
- Cursor配置: `%APPDATA%\Cursor\`

## ⚙️ 工作原理

### Token注入机制

1. Cursor将认证信息存储在 `state.vscdb` SQLite数据库中
2. 关键字段：
   - `cursorAuth/accessToken` - 访问令牌
   - `cursorAuth/refreshToken` - 刷新令牌
   - `cursorAuth/cachedEmail` - 账号邮箱
3. 本工具直接修改数据库中的这些字段实现账号切换

### 机器码重置

修改 `storage.json` 中的以下字段：
- `telemetry.machineId` - 主机器码
- `telemetry.macMachineId` - MAC机器码
- `telemetry.devDeviceId` - 设备ID
- `telemetry.sqmId` - SQM ID

## 🐛 常见问题

### Q: 切换账号后Cursor无法启动？
A: 确保在切换前完全关闭了Cursor，可以尝试：
1. 手动强制关闭Cursor进程
2. 等待3-5秒后再启动

### Q: Token失效怎么办？
A: 
1. 在Cursor中重新登录该账号
2. 使用"导入当前账号"功能更新Token

### Q: 重置机器码后仍然被限制？
A: 
1. 检查是否完全清除了缓存
2. 尝试重新安装Cursor
3. 等待一段时间后再尝试

## 📝 开发计划

- [ ] 添加会话备份恢复功能
- [ ] 支持自动刷新Token
- [ ] 添加账号分组管理
- [ ] 支持导入/导出账号配置
- [ ] 添加使用统计和日志查看

## ⚖️ 免责声明

本工具仅供学习和研究使用，请遵守Cursor的服务条款。频繁切换账号可能违反服务协议，请谨慎使用。

## 📄 许可证

MIT License

## 👨‍💻 贡献

欢迎提交Issue和Pull Request！

