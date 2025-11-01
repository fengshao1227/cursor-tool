#!/bin/bash

# 交叉编译 Windows 版本的脚本
# 警告：此方法不保证成功，推荐使用 GitHub Actions 或在 Windows 机器上构建

set -e

echo "🚀 开始为 Windows 交叉编译..."
echo ""
echo "⚠️  警告：这可能不会成功！"
echo "   better-sqlite3 是原生模块，需要在目标平台上编译"
echo "   推荐方案："
echo "   1. 使用 GitHub Actions 自动构建"
echo "   2. 在 Windows 机器上直接构建"
echo ""

# 清理旧的构建文件
echo "📦 清理旧文件..."
rm -rf node_modules/.bin
rm -rf node_modules/better-sqlite3/build

# 安装 Windows 版本的 better-sqlite3 预编译包
echo "📥 尝试下载 Windows 预编译版本..."

# 设置环境变量强制使用预编译版本
export npm_config_arch=x64
export npm_config_target_arch=x64
export npm_config_platform=win32
export npm_config_target_platform=win32

# 重新安装 better-sqlite3
npm install better-sqlite3@9.2.2 --build-from-source=false --force

echo ""
echo "✅ 准备工作完成"
echo ""
echo "现在你可以运行："
echo "  npm run build"
echo "  npm run dist:win"
echo ""
echo "⚠️  但是！这个 Windows 安装包很可能无法运行！"
echo "   最可靠的方法是在 Windows 机器上构建"

