# 应用图标

## 图标要求

### Mac (icon.icns)
- 需要包含以下尺寸：16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024
- 格式：ICNS
- 可以使用在线工具生成：https://cloudconvert.com/png-to-icns

### Windows (icon.ico)
- 需要包含以下尺寸：16x16, 32x32, 48x48, 256x256
- 格式：ICO
- 可以使用在线工具生成：https://cloudconvert.com/png-to-ico

## 快速生成图标

1. 准备一个 1024x1024 的PNG图片（建议使用Cursor的logo或自定义图标）
2. 使用在线工具转换：
   - Mac: https://cloudconvert.com/png-to-icns
   - Windows: https://cloudconvert.com/png-to-ico
3. 将生成的文件放到此目录

## 临时解决方案

如果暂时没有图标文件，可以：
1. 使用默认的Electron图标（打包时会警告但不影响功能）
2. 后续再替换图标

## 示例图标设计

推荐使用以下主题：
- 🔄 切换/交换图标
- 👥 多用户图标
- 🔑 钥匙/权限图标
- 📝 文档/编辑器图标

颜色建议：蓝色系（符合Cursor品牌色）

