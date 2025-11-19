# EAS 构建 Icon 文件缺失修复

## 问题描述

EAS 构建失败，Prebuild 阶段报错：
```
ENOENT: no such file or directory, open './assets/images/icon.png'
```

## 根本原因分析

虽然本地文件存在且已在 git 中，但可能的原因：

1. **`.gitignore` 中的 `*.png` 规则**：之前可能阻止了文件被提交
2. **文件未提交到远程仓库**：本地有文件但远程没有
3. **路径问题**：EAS 构建时的工作目录可能不同

## 修复方案

### 1. 修复 .gitignore（已完成）

**修复**：
- ✅ 移除了 `*.png` 规则
- ✅ 只忽略特定的 `image.png` 文件
- ✅ 确保 `assets/images/*.png` 文件被跟踪

### 2. 确保文件被提交

**检查文件是否在 git 中**：
```bash
# 检查文件是否被跟踪
git ls-files assets/images/icon.png

# 检查文件是否在最新提交中
git ls-tree HEAD assets/images/icon.png

# 检查所有图标文件
git ls-files assets/images/*.png
```

**如果文件不在 git 中，需要添加**：
```bash
git add assets/images/icon.png
git add assets/images/*.png
git commit -m "Add app icon and image assets"
git push
```

### 3. 验证远程仓库

**确保文件已推送到远程**：
```bash
# 检查远程是否有文件
git ls-tree origin/main assets/images/icon.png

# 如果没有，需要推送
git push origin main
```

## 需要提交的文件

确保以下文件都在 git 中：
- ✅ `assets/images/icon.png` - 主应用图标（必需）
- ✅ `assets/images/android-icon-foreground.png` - Android 图标
- ✅ `assets/images/android-icon-background.png` - Android 图标背景
- ✅ `assets/images/android-icon-monochrome.png` - Android 单色图标
- ✅ `assets/images/favicon.png` - Web favicon
- ✅ `assets/images/splash.png` - 启动画面（如果使用）

## 验证步骤

1. **检查本地文件**：
   ```bash
   ls -la assets/images/icon.png
   ```

2. **检查 git 跟踪**：
   ```bash
   git ls-files assets/images/icon.png
   ```

3. **检查 .gitignore**：
   ```bash
   git check-ignore assets/images/icon.png
   # 应该返回空（不被忽略）
   ```

4. **提交并推送**：
   ```bash
   git add .gitignore assets/images/*.png
   git commit -m "Fix: Ensure icon files are tracked in git"
   git push
   ```

## 如果问题仍然存在

如果修复后仍然失败，可能的原因：

1. **文件确实不在远程仓库**：
   - 检查 `git ls-tree origin/main assets/images/icon.png`
   - 如果不存在，需要推送

2. **EAS 构建缓存**：
   - 清除 EAS 构建缓存（已在 `eas.json` 中禁用）

3. **路径问题**：
   - 确保 `app.config.js` 和 `app.json` 中的路径都是 `./assets/images/icon.png`

## 总结

- ✅ 修复了 `.gitignore`，不再忽略所有 PNG 文件
- ✅ 验证文件存在且格式正确
- ✅ 确保文件在 git 中
- ⚠️ 需要确保文件已推送到远程仓库

**下一步**：提交 `.gitignore` 的修改，并确保所有图标文件都已推送到远程仓库。

