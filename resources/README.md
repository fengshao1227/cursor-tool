# 应用图标

## 图标配置

已配置 `package.json`，Mac 和 Windows 使用相同的图标源：
- **Mac**: `resources/icon.icns`
- **Windows**: `resources/icon.ico`
- **通用**: `resources/icon.png` (作为后备)

## 从 Mac 图标生成 Windows 图标

如果 Mac 版本已经有图标（.icns），可以通过以下方式转换为 Windows 图标（.ico）：

### 方法一：使用在线工具（推荐）

1. **提取 Mac 图标**：
   - 如果 Mac 应用已打包，从 `Cursor账号管理器.app/Contents/Resources/icon.icns` 提取
   - 或者从 Mac 应用的 Info.plist 中找到图标路径

2. **转换为 PNG**：
   - 使用在线工具将 `.icns` 转换为 `.png`：
     - https://cloudconvert.com/icns-to-png
     - https://convertio.co/icns-png/

3. **转换为 ICO**：
   - 使用在线工具将 `.png` 转换为 `.ico`：
     - https://cloudconvert.com/png-to-ico
     - https://convertio.co/png-ico/
   - 确保包含以下尺寸：16x16, 32x32, 48x48, 256x256

### 方法二：使用命令行工具（Mac）

```bash
# 安装 imagemagick
brew install imagemagick

# 从 icns 提取最大尺寸的 PNG
sips -s format png icon.icns --out icon-1024.png

# 转换为 ICO（包含多个尺寸）
convert icon-1024.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico
```

### 方法三：使用 icns2png + 在线转换

```bash
# 安装 icns2png
brew install icns2png

# 提取所有尺寸
icns2png icon.icns

# 然后使用在线工具将最大的 PNG 转换为 ICO
```

## 图标要求

### Mac (icon.icns)
- 需要包含以下尺寸：16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024
- 格式：ICNS
- 位置：`resources/icon.icns`

### Windows (icon.ico)
- 需要包含以下尺寸：16x16, 32x32, 48x48, 256x256
- 格式：ICO
- 位置：`resources/icon.ico`

## 图标设计建议

推荐使用以下主题：
- 🔄 切换/交换图标
- 👥 多用户图标
- 🔑 钥匙/权限图标
- 📝 文档/编辑器图标

颜色建议：蓝色系（符合Cursor品牌色）

## 验证图标

打包后验证：
- **Mac**: 检查 `.app` 文件的图标是否显示正确
- **Windows**: 检查 `.exe` 文件的图标是否显示正确
- 如果图标未显示，检查文件路径和格式是否正确

