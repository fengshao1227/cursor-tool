# GitHub Actions 自动构建说明

## 🚀 自动构建功能

已配置 GitHub Actions 工作流，支持自动构建 Windows 和 Mac 版本。

## 📋 触发方式

### 1. 自动触发（推送代码）

**推送到 main/master 分支时自动构建：**
```bash
git push origin main
```

**创建版本标签时自动构建并发布：**
```bash
git tag v1.0.4
git push origin v1.0.4
```

### 2. 手动触发（推荐）

1. 打开 GitHub 仓库页面
2. 点击 **Actions** 标签页
3. 选择 **Build All Platforms** 工作流
4. 点击 **Run workflow** 按钮
5. 选择分支和选项：
   - **Branch**: 选择要构建的分支（通常是 `main`）
   - **Build without license check**: 
     - ✅ 勾选 = 打包无验证版本
     - ❌ 不勾选 = 打包有验证版本（默认）
6. 点击 **Run workflow** 开始构建

## 📦 构建产物

构建完成后，可以在以下位置下载：

1. **Actions 页面**
   - 进入 **Actions** 标签页
   - 点击最新的工作流运行
   - 在 **Artifacts** 部分下载：
     - `mac-build-{编号}` - Mac 版本
     - `win-build-{编号}` - Windows 版本

2. **Releases 页面**（如果创建了标签）
   - 进入 **Releases** 标签页
   - 下载对应版本的构建文件

## 🔧 工作流配置

### 工作流文件位置
- `.github/workflows/build-all.yml` - 主工作流（推荐使用）

### 构建矩阵
- **Mac**: `macos-latest` - 构建 .dmg 和 .zip
- **Windows**: `windows-latest` - 构建 .exe (NSIS 和便携版)

### 构建步骤
1. ✅ 检出代码
2. ✅ 设置 Node.js 20
3. ✅ 安装依赖 (`npm ci`)
4. ✅ 重建原生模块 (`npm run rebuild`)
5. ✅ 构建应用（根据选项选择有验证/无验证版本）
6. ✅ 上传构建产物

## 💡 使用示例

### 示例 1：构建有验证版本（默认）
```bash
# 1. 提交代码
git add .
git commit -m "Update features"
git push origin main

# 2. 在 GitHub Actions 页面手动触发，不勾选 "Build without license check"
# 或等待自动触发
```

### 示例 2：构建无验证版本
```bash
# 1. 提交代码
git add .
git commit -m "Update features"
git push origin main

# 2. 在 GitHub Actions 页面手动触发，勾选 "Build without license check"
```

### 示例 3：创建版本发布
```bash
# 1. 创建版本标签
git tag v1.0.4
git push origin v1.0.4

# 2. GitHub Actions 会自动：
#    - 构建 Mac 和 Windows 版本
#    - 创建 GitHub Release
#    - 上传所有构建文件到 Release
```

## ⚙️ 环境变量

工作流支持以下环境变量：

- `DISABLE_LICENSE_CHECK`: 
  - `true` = 构建无验证版本
  - `false` 或未设置 = 构建有验证版本（默认）

## 📝 注意事项

1. **构建时间**
   - Mac 构建：约 5-10 分钟
   - Windows 构建：约 5-10 分钟
   - 总时间：约 10-20 分钟（并行构建）

2. **构建产物保留**
   - Artifacts 保留 30 天
   - Releases 永久保留

3. **原生模块**
   - `better-sqlite3` 会在构建时自动重建
   - 如果重建失败，会继续构建（`continue-on-error: true`）

4. **版本号**
   - 从 `package.json` 读取版本号
   - 创建标签时使用标签名作为版本号

## 🔍 查看构建状态

1. 进入 GitHub 仓库
2. 点击 **Actions** 标签页
3. 查看工作流运行状态：
   - 🟡 黄色 = 运行中
   - ✅ 绿色 = 成功
   - ❌ 红色 = 失败

## 🐛 故障排除

### 构建失败

1. **检查日志**
   - 点击失败的工作流
   - 查看错误日志

2. **常见问题**
   - 依赖安装失败 → 检查 `package.json`
   - 原生模块构建失败 → 检查 `better-sqlite3` 版本
   - 权限问题 → 检查 GitHub Actions 权限设置

3. **重新构建**
   - 点击 **Re-run jobs** 按钮
   - 或推送新的提交触发重新构建

## ✅ 总结

通过 GitHub Actions，您可以：

1. ✅ **自动构建** - 推送代码时自动构建
2. ✅ **手动触发** - 随时手动触发构建
3. ✅ **选择版本** - 选择有验证或无验证版本
4. ✅ **自动发布** - 创建标签时自动发布 Release
5. ✅ **跨平台** - 同时构建 Mac 和 Windows 版本

**推荐工作流：**
1. 开发完成后提交代码
2. 在 GitHub Actions 页面手动触发构建
3. 选择是否需要验证
4. 等待构建完成
5. 下载构建产物

