# GitHub 自动发布 Token 配置指南

## 方法一：使用 GitHub Actions 内置 Token（推荐，但需要权限配置）

GitHub Actions 自动提供 `GITHUB_TOKEN`，但默认权限可能不足以创建 Release。

### 配置步骤：

1. **检查当前 Workflow 权限**
   - 进入仓库：`https://github.com/fengshao1227/cursor-tool`
   - 点击 `Settings` → `Actions` → `General`
   - 找到 `Workflow permissions` 部分
   - 选择 `Read and write permissions`
   - 勾选 `Allow GitHub Actions to create and approve pull requests`
   - 点击 `Save`

2. **更新 Workflow 文件**
   在 `.github/workflows/build.yml` 中添加权限配置：

```yaml
jobs:
  build:
    permissions:
      contents: write  # 允许创建 Release
    runs-on: ${{ matrix.os }}
    # ... 其他配置
```

## 方法二：创建 Personal Access Token (PAT)（更灵活）

### 步骤 1：创建 Personal Access Token

1. **访问 GitHub Token 设置页面**
   - 打开：https://github.com/settings/tokens
   - 或：GitHub 头像 → `Settings` → `Developer settings` → `Personal access tokens` → `Tokens (classic)`

2. **创建新 Token**
   - 点击 `Generate new token` → `Generate new token (classic)`
   - 填写 Token 名称（如：`cursor-tool-release`）
   - 设置过期时间（根据需要选择）
   - **勾选以下权限**：
     - ✅ `repo` (完整仓库权限)
       - ✅ `repo:status`
       - ✅ `repo_deployment`
       - ✅ `public_repo`
       - ✅ `repo:invite`
       - ✅ `security_events`
   - 点击 `Generate token`

3. **复制 Token**
   - ⚠️ **重要**：Token 只显示一次，请立即复制保存！

### 步骤 2：将 Token 添加到 GitHub Secrets

1. **进入仓库 Secrets 设置**
   - 仓库地址：https://github.com/fengshao1227/cursor-tool
   - 点击 `Settings` → `Secrets and variables` → `Actions`

2. **添加新 Secret**
   - 点击 `New repository secret`
   - Name: `GH_TOKEN`（或 `GITHUB_TOKEN`）
   - Value: 粘贴刚才复制的 Token
   - 点击 `Add secret`

### 步骤 3：更新 Workflow 文件（如果使用方法二）

如果使用 PAT，workflow 文件保持不变，因为已经使用了 `secrets.GH_TOKEN`：

```yaml
env:
  GH_TOKEN: ${{ secrets.GH_TOKEN }}  # 如果使用 PAT，确保 Secret 名称是 GH_TOKEN
```

或者使用 `GITHUB_TOKEN`：

```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # GitHub Actions 内置 token
```

## 方法三：使用 Fine-grained Personal Access Token（最新方式）

1. **创建 Fine-grained Token**
   - 访问：https://github.com/settings/tokens?type=beta
   - 点击 `Generate new token` → `Generate new token (fine-grained)`
   - 选择仓库：`fengshao1227/cursor-tool`
   - 设置权限：
     - Repository permissions → `Contents`: `Read and write`
     - Repository permissions → `Metadata`: `Read-only`
   - 点击 `Generate token`

2. **添加到 Secrets**（同方法二步骤 2）

## 验证配置

配置完成后，当你推送标签 `v1.0.0` 时，GitHub Actions 会自动：
1. 构建应用
2. 创建 GitHub Release
3. 上传构建产物到 Release

## 常见问题

### Q: 403 Forbidden 错误
**A:** 检查：
- Token 权限是否包含 `repo` 权限
- Token 是否已过期
- Workflow 权限是否设置为 `Read and write`

### Q: 如何查看 Workflow 日志
**A:** 进入仓库 → `Actions` 标签页 → 点击对应的 Workflow 运行 → 查看日志

### Q: Token 安全吗？
**A:** Token 存储在 GitHub Secrets 中，只有仓库管理员可见，相对安全。建议：
- 定期轮换 Token
- 使用最小权限原则
- 不要将 Token 提交到代码仓库

