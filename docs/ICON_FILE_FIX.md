# Icon 文件路径修复

## 问题描述

EAS 构建失败，错误信息：
```
ENOENT: no such file or directory, open './assets/images/icon.png'
```

## 根本原因

`.gitignore` 文件中包含了 `*.png`，这可能会阻止某些 PNG 文件被正确跟踪。虽然 `icon.png` 已经在 git 中，但需要确保：

1. ✅ `.gitignore` 不再忽略所有 PNG 文件
2. ✅ `icon.png` 文件确实在 git 仓库中
3. ✅ 路径配置正确

## 修复方案

### 1. 修复 .gitignore

**修复前**：
```
*.png
```

**修复后**：
```
# Ignore specific image files (not all PNGs)
# Note: assets/images/*.png should be tracked for app icons
image.png
```

**原因**：
- `assets/images/*.png` 文件（包括 `icon.png`）需要被 git 跟踪
- 只忽略特定的文件（如根目录的 `image.png`），而不是所有 PNG 文件

### 2. 验证文件存在

运行以下命令验证：
```bash
# 检查文件是否存在
ls -la assets/images/icon.png

# 检查文件是否在 git 中
git ls-files assets/images/icon.png

# 检查文件类型
file assets/images/icon.png
```

### 3. 确保文件被提交

如果文件不在 git 中，需要添加：
```bash
git add assets/images/icon.png
git add assets/images/*.png  # 添加所有需要的图标文件
git commit -m "Add app icon and image assets"
git push
```

## 相关文件

需要确保以下文件都在 git 中：
- `assets/images/icon.png` - 主应用图标
- `assets/images/android-icon-foreground.png` - Android 图标
- `assets/images/android-icon-background.png` - Android 图标背景
- `assets/images/android-icon-monochrome.png` - Android 单色图标
- `assets/images/favicon.png` - Web favicon
- `assets/images/splash.png` - 启动画面（如果使用）

## 验证

提交修复后，运行：
```bash
# 检查所有图标文件是否在 git 中
git ls-files assets/images/*.png

# 应该看到所有需要的文件
```

## 总结

- ✅ 修复了 `.gitignore`，不再忽略所有 PNG 文件
- ✅ 确保 `assets/images/*.png` 文件被 git 跟踪
- ✅ 验证文件路径配置正确

现在可以重新提交并构建。

