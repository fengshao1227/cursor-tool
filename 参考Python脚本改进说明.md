# Windows 深度重置功能增强（参考 Python 脚本）

## 🎯 关键改进

参考您提供的 Python 脚本，我们发现了一个重要的遗漏：**需要同时更新 `state.vscdb` 数据库中的机器ID**。

### Python 脚本的关键功能

Python 脚本会更新两个位置：
1. ✅ `storage.json` - 存储机器ID配置
2. ✅ `state.vscdb` - SQLite 数据库，也存储机器ID

更新的字段包括：
- `telemetry.devDeviceId`
- `telemetry.macMachineId`
- `telemetry.machineId`
- `telemetry.sqmId`
- `storage.serviceMachineId` ⭐（这个我们之前没有更新）

### 我们的改进

现在我们的实现也同时更新两个位置：

1. **更新 `storage.json`**（原有功能）
2. **更新 `state.vscdb` 数据库**（新增功能）⭐

## 📝 代码改进

### 新增方法：`updateStateDatabaseMachineIds()`

```typescript
/**
 * 更新 state.vscdb 数据库中的机器ID（参考 Python 脚本实现）
 */
private updateStateDatabaseMachineIds(newIds: {
  machineId: string
  macMachineId: string
  deviceId: string
  sqmId: string
}): boolean
```

这个方法会：
- 打开 `state.vscdb` SQLite 数据库
- 确保 `ItemTable` 表存在
- 更新所有机器ID字段：
  - `telemetry.devDeviceId`
  - `telemetry.macMachineId`
  - `telemetry.machineId`
  - `telemetry.sqmId`
  - `storage.serviceMachineId` ⭐（新增）

### 改进的 `resetMachineId()` 方法

现在 `resetMachineId()` 会：
1. 更新 `storage.json` 文件
2. **同时更新 `state.vscdb` 数据库**（新增）

## 🔄 完整流程

当执行深度重置时：

1. **基础重置**（`factoryReset()`）
   - 调用 `resetMachineId()`
   - `resetMachineId()` 现在会：
     - ✅ 更新 `storage.json`
     - ✅ 更新 `state.vscdb` 数据库（新增）

2. **深度重置**（`performDeepReset()`）
   - Windows: 8 个步骤
   - Mac: 3 个步骤
   - 都会调用 `factoryReset()`，因此也会更新数据库

## 🎉 效果提升

### 之前
- ✅ 更新 `storage.json`
- ❌ 没有更新 `state.vscdb` 数据库

### 现在（参考 Python 脚本）
- ✅ 更新 `storage.json`
- ✅ 更新 `state.vscdb` 数据库
- ✅ 更新所有相关字段，包括 `storage.serviceMachineId`

## 💡 为什么这很重要？

Cursor 可能从两个位置读取机器ID：
1. `storage.json` 文件
2. `state.vscdb` 数据库

如果只更新一个位置，Cursor 可能仍能从另一个位置读取旧的机器ID，导致重置不完全。

现在两个位置都更新了，确保重置更彻底！

## 📊 对比 Python 脚本

| 功能 | Python 脚本 | 我们的实现（改进后） |
|------|------------|-------------------|
| 更新 `storage.json` | ✅ | ✅ |
| 更新 `state.vscdb` | ✅ | ✅（新增） |
| 更新 `telemetry.devDeviceId` | ✅ | ✅ |
| 更新 `telemetry.macMachineId` | ✅ | ✅ |
| 更新 `telemetry.machineId` | ✅ | ✅ |
| 更新 `telemetry.sqmId` | ✅ | ✅ |
| 更新 `storage.serviceMachineId` | ✅ | ✅（新增） |

## ✅ 总结

通过参考 Python 脚本，我们发现了重要的遗漏并已修复：

1. ✅ **新增 `updateStateDatabaseMachineIds()` 方法**
2. ✅ **`resetMachineId()` 现在同时更新两个位置**
3. ✅ **更新所有相关字段，包括 `storage.serviceMachineId`**
4. ✅ **与 Python 脚本功能一致**

现在 Windows 深度重置功能更加完善，效果更接近 Python 脚本！

