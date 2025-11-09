# Cursor 账号管理器

一个跨平台的桌面应用，用于管理多个Cursor Pro账号，支持一键切换账号、重置机器码等功能。

## 🎉 v1.0.3 重大更新（2025-11-01）

**✅ 已修复：切换账号时会话丢失问题！**

现在切换账号时，您的所有聊天历史、工作区状态、用户设置都会完整保留！不再需要担心切换账号后丢失宝贵的会话数据。

**改进内容：**
- ✅ 会话历史完整保留
- ✅ 工作区状态不丢失  
- ✅ 用户设置保持不变
- ✅ MCP 配置继续生效
- ✅ 认证信息正确隔离

详情请查看 [更新日志](CHANGELOG.md)。

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

已配置 GitHub Actions 工作流，支持自动构建 Windows 和 Mac 版本。

**触发方式：**
1. **自动触发**：推送到 `main` 分支时自动构建
   ```bash
   git push origin main
   ```
2. **手动触发**（推荐）：
   - 打开 GitHub 仓库 → Actions 标签页
   - 选择 **Build All Platforms** 工作流
   - 点击 **Run workflow**，选择分支和选项：
     - ✅ 勾选 "Build without license check" = 打包无验证版本
     - ❌ 不勾选 = 打包有验证版本（默认）
3. **版本发布**：创建版本标签时自动构建并发布 Release
   ```bash
   git tag v1.0.4
   git push origin v1.0.4
   ```

**下载构建产物：**
- 进入 **Actions** 标签页 → 最新工作流运行 → **Artifacts** 部分
- `mac-build-{编号}` - Mac 版本（.dmg, .zip）
- `win-build-{编号}` - Windows 版本（.exe）

**构建时间：** Mac ~5-10分钟，Windows ~5-10分钟，总计 ~10-20分钟（并行构建）

**验证开关功能：**

可以通过环境变量 `DISABLE_LICENSE_CHECK` 控制是否需要验证：

**打包无验证版本：**
```bash
npm run dist:no-license:win    # Windows
npm run dist:no-license:mac    # Mac
npm run dist:no-license        # 所有平台
```

**打包有验证版本（默认）：**
```bash
npm run dist:win    # Windows
npm run dist:mac    # Mac
npm run dist        # 所有平台
```

**工作原理：**
- 环境变量：`DISABLE_LICENSE_CHECK=true` 或 `1` 时禁用验证
- 代码位置：`src/main/license-service.ts`
- 禁用验证时：无需激活卡密，直接使用所有功能
- 启用验证时（默认）：需要激活卡密才能使用

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

### 3. 独占卡密功能

独占卡密功能让每个卡密都绑定一个独立的 Cursor Token，实现一卡密一账号的自动注入登录。

**使用流程：**

**首次使用：**
1. 软件启动时如果没有卡密会弹出卡密输入框
2. 输入你的卡密
3. 点击"激活并注入账号"
4. 等待激活成功
5. 启动 Cursor，会自动登录到对应账号

**更换卡密：**
1. 在侧边栏底部点击黄色的 **🔑 更换卡密** 按钮
2. 如果 Cursor 正在运行，会提示关闭
3. 输入新的卡密
4. 点击"激活并注入账号"
5. 启动 Cursor，自动登录到新账号

**解绑设备：**
- 在更换卡密界面点击"解绑此设备"可以解绑当前设备

**注意事项：**
- 注入账号信息需要修改 Cursor 的数据库文件，必须在 Cursor 关闭时才能安全操作
- 更换卡密后，软件会自动切换到新卡密对应的账号
- 卡密过期后软件会提示需要重新输入卡密

### 4. 重置机器码

当频繁切换账号导致被限制时：
1. 点击"重置机器码"按钮
2. 工具会生成新的设备标识
3. Cursor会被识别为新设备

⚠️ **注意**: 重置机器码会清除当前登录状态，需要重新登录

### 5. 深度重置（跨平台）

执行更彻底的系统级重置：
1. 点击"🔥🔥 深度重置 🔥🔥"按钮
2. 会执行：

**Mac 系统：**
   - 修改系统UUID
   - 清除DNS缓存
   - 修改Cursor程序文件
   - 移除并重新签名应用

**Windows 系统（8个步骤）：**
   - 修改注册表 MachineGuid（需要管理员权限）
   - 修改系统标识符（ProductId、InstallDate）
   - 清除DNS缓存
   - 清除网络缓存（ARP、NetBIOS）
   - 处理MAC地址信息
   - 清除Windows事件日志
   - 清除Windows缓存和临时文件
   - 修改Cursor程序文件（增强版，8种匹配模式）

⚠️ **重要提示**:
- Windows需要以**管理员身份**运行才能完整执行深度重置
- Mac上首次启动修改后的Cursor可能需要在"系统偏好设置→安全性"中允许
- Windows上首次运行可能触发SmartScreen警告，点击"更多信息"→"仍要运行"即可
- 建议深度重置后重启计算机

**安全性说明：**
- ✅ 所有高风险操作都有自动备份机制（程序文件、配置文件、数据库）
- ✅ 所有操作都有错误处理，失败不会影响其他操作
- ✅ 提供恢复功能，可以随时恢复备份
- ✅ 不会影响系统核心功能
- ✅ 不会丢失用户数据（重要数据有备份）
- ⚠️ 修改程序文件后，Cursor首次运行可能触发SmartScreen警告（正常现象）
- ⚠️ 修改注册表MachineGuid可能影响其他依赖该标识的软件（通常影响很小）

**重置内容：**
- 同时更新 `storage.json` 和 `state.vscdb` 数据库中的机器ID
- 更新所有相关字段：`telemetry.machineId`、`telemetry.macMachineId`、`telemetry.devDeviceId`、`telemetry.sqmId`、`storage.serviceMachineId`

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

### Q: Windows 系统中，Cursor 路径应该填写什么？
A: 
应该填写 **Cursor 的文件夹路径**，而不是 exe 文件路径。

**正确示例：**
- `C:\Users\你的用户名\AppData\Local\Programs\Cursor`
- `C:\Program Files\Cursor`

**错误示例：**
- `C:\Users\你的用户名\AppData\Local\Programs\Cursor\Cursor.exe` ❌

工具会自动在您填写的文件夹路径下查找 `Cursor.exe` 文件。如果找不到，会提示路径无效。

**常见默认路径：**
- 用户安装：`%LOCALAPPDATA%\Programs\Cursor`
- 系统安装：`%PROGRAMFILES%\Cursor` 或 `%PROGRAMFILES(X86)%\Cursor`

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

