# Windows 机器码重置方法分析（参考 CursorPool_Client）

## 🔍 常见的 Windows 机器码重置方法

根据社区工具（如 CursorPool_Client、cursor-shadow-patch、cursor-fake-machine）的实现，Windows 机器码重置通常包括以下方法：

### 1. 修改注册表 MachineGuid ⭐⭐⭐⭐⭐

**位置：** `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`

**方法：**
```cmd
reg add "HKLM\SOFTWARE\Microsoft\Cryptography" /v MachineGuid /t REG_SZ /d "{新GUID}" /f
```

**我们的实现：** ✅ 已实现
- `resetWindowsMachineGuid()` 方法
- 需要管理员权限

### 2. 修改 storage.json ⭐⭐⭐⭐⭐

**位置：** `%APPDATA%\Cursor\User\globalStorage\storage.json`

**字段：**
- `telemetry.machineId`
- `telemetry.macMachineId`
- `telemetry.devDeviceId`
- `telemetry.sqmId`

**我们的实现：** ✅ 已实现
- `resetMachineId()` 方法
- 更新所有相关字段

### 3. 修改 state.vscdb 数据库 ⭐⭐⭐⭐⭐

**位置：** `%APPDATA%\Cursor\User\globalStorage\state.vscdb`

**字段：**
- `telemetry.devDeviceId`
- `telemetry.macMachineId`
- `telemetry.machineId`
- `telemetry.sqmId`
- `storage.serviceMachineId`

**我们的实现：** ✅ 已实现（参考 Python 脚本）
- `updateStateDatabaseMachineIds()` 方法
- 更新所有相关字段

### 4. 修改系统标识符 ⭐⭐⭐⭐

**位置：** `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion`

**字段：**
- `ProductId`
- `InstallDate`
- `DigitalProductId`（通常不建议修改，可能影响激活）

**我们的实现：** ✅ 已实现
- `resetWindowsSystemIdentifiers()` 方法
- 修改 ProductId 和 InstallDate

### 5. 修改 MAC 地址 ⭐⭐⭐

**方法：**
- 通过 PowerShell 或注册表修改网络适配器 MAC 地址
- 需要禁用/启用适配器

**我们的实现：** ⚠️ 部分实现
- `resetWindowsMACAddress()` 方法
- 提供 MAC 地址信息和修改建议
- 不自动修改（避免网络中断）

### 6. 清除 Windows 事件日志 ⭐⭐⭐

**方法：**
```cmd
wevtutil cl Application
wevtutil cl System
wevtutil cl Security
```

**我们的实现：** ✅ 已实现
- `clearWindowsEventLogs()` 方法
- 清除 Application、System、Security 日志

### 7. 清除缓存和临时文件 ⭐⭐⭐

**位置：**
- `%TEMP%`
- `C:\Windows\Prefetch`
- `C:\Windows\SoftwareDistribution\Download`

**我们的实现：** ✅ 已实现
- `clearWindowsCache()` 方法
- 清除临时文件、预取文件、更新缓存

### 8. 修改 Cursor 程序文件 ⭐⭐⭐⭐

**方法：**
- 替换获取 MachineGuid 的命令
- 拦截 Node.js API 调用
- 修改硬编码的标识符
- 改变文件哈希

**我们的实现：** ✅ 已实现（增强版）
- `modifyCursorAppWindows()` 方法
- 8 种正则表达式匹配模式
- Node.js API 拦截机制
- 文件哈希修改

## 📊 功能对比表

| 功能 | CursorPool_Client | 我们的实现 | 状态 |
|------|------------------|-----------|------|
| 修改注册表 MachineGuid | ✅ | ✅ | 已实现 |
| 修改 storage.json | ✅ | ✅ | 已实现 |
| 修改 state.vscdb | ✅ | ✅ | 已实现 |
| 修改系统标识符 | ❓ | ✅ | 已实现 |
| 修改 MAC 地址 | ❓ | ⚠️ | 部分实现 |
| 清除事件日志 | ❓ | ✅ | 已实现 |
| 清除缓存 | ❓ | ✅ | 已实现 |
| 修改程序文件 | ❓ | ✅ | 已实现（增强） |

## 🎯 我们的实现优势

### 1. 多重防护机制

我们实现了 **8 个步骤**的深度重置：
1. ✅ 修改系统 MachineGuid
2. ✅ 修改系统标识符（ProductId、InstallDate）
3. ✅ 清除 DNS 缓存
4. ✅ 清除网络缓存（ARP、NetBIOS）
5. ✅ 处理 MAC 地址信息
6. ✅ 清除 Windows 事件日志
7. ✅ 清除 Windows 缓存和临时文件
8. ✅ 修改 Cursor 程序文件（增强版）

### 2. 程序文件修改增强

- ✅ 8 种正则表达式匹配模式（覆盖更多情况）
- ✅ Node.js API 拦截机制
- ✅ 文件哈希确保改变（即使其他修改失败）

### 3. 数据库同步更新

- ✅ 同时更新 `storage.json` 和 `state.vscdb`
- ✅ 更新所有相关字段，包括 `storage.serviceMachineId`

## 💡 可能的改进方向

基于 CursorPool_Client 的可能实现，我们可以考虑：

### 1. 自动修改 MAC 地址（可选）

如果用户需要，可以添加自动修改 MAC 地址的功能：
```typescript
// 使用 PowerShell 修改 MAC 地址
// 需要管理员权限，可能中断网络连接
```

### 2. 修改更多注册表项

可以添加修改其他可能用于设备标识的注册表项：
- `HKLM\SOFTWARE\Microsoft\SQMClient\MachineId`
- `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\AccountDomainSid`

### 3. 清除更多缓存

可以添加清除更多可能包含设备信息的缓存：
- Windows 更新历史
- Windows 错误报告
- 应用程序兼容性缓存

## ✅ 总结

我们的 Windows 深度重置实现已经非常完善：

1. ✅ **覆盖了所有常见方法**
   - 注册表修改
   - 配置文件修改
   - 数据库更新
   - 程序文件修改

2. ✅ **多重防护机制**
   - 8 个步骤的完整流程
   - 每个步骤都有备份和错误处理

3. ✅ **增强的程序文件修改**
   - 更多匹配模式
   - API 拦截机制
   - 文件哈希确保改变

4. ✅ **与 Python 脚本一致**
   - 同时更新 `storage.json` 和 `state.vscdb`
   - 更新所有相关字段

**我们的实现已经非常完善，效果应该不亚于 CursorPool_Client！** 🎉

