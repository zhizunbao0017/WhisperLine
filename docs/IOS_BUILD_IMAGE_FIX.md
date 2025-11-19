# iOS Build Image 修复

## 问题描述

构建失败，错误信息：
```
Invalid image for macOS: "macos-15.0.0"
```

## 根本原因

`eas.json` 中指定的 iOS build image `macos-15.0.0` 不是有效的镜像名称。

## 支持的镜像列表

根据错误信息，EAS 支持以下镜像：

### 通用镜像
- `auto` - 自动选择
- `default` - 默认镜像
- `stable` - 稳定版本
- `latest` - 最新版本

### SDK 特定镜像
- `sdk-54` - Expo SDK 54
- `sdk-53` - Expo SDK 53
- `sdk-52` - Expo SDK 52
- `sdk-51` - Expo SDK 51
- `sdk-50` - Expo SDK 50
- `sdk-49` - Expo SDK 49

### macOS 版本特定镜像
- `macos-ventura-13.6-xcode-15.0`
- `macos-ventura-13.6-xcode-15.1`
- `macos-ventura-13.6-xcode-15.2`
- `macos-sonoma-14.4-xcode-15.3`
- `macos-sonoma-14.5-xcode-15.4`
- `macos-sonoma-14.6-xcode-16.0`
- `macos-sonoma-14.6-xcode-16.1`
- `macos-sequoia-15.3-xcode-16.2`
- `macos-sequoia-15.4-xcode-16.3`
- `macos-sequoia-15.5-xcode-16.4`
- `macos-sequoia-15.5-xcode-26.0`
- `macos-sequoia-15.6-xcode-16.4`
- `macos-sequoia-15.6-xcode-26.0`
- `macos-sequoia-15.6-xcode-26.1`

## 修复方案

### 方案 1: 使用 latest（推荐，快速修复）

```json
"ios": {
  "image": "latest",
  "buildConfiguration": "Release"
}
```

**优点**：
- 总是使用最新的构建环境
- 简单直接

**缺点**：
- 可能在不同时间构建使用不同版本

### 方案 2: 使用 SDK 特定镜像（推荐，稳定）

```json
"ios": {
  "image": "sdk-54",
  "buildConfiguration": "Release"
}
```

**优点**：
- 与 Expo SDK 版本匹配
- 更稳定和可预测

**缺点**：
- 需要与 Expo SDK 版本对应

### 方案 3: 使用特定 macOS/Xcode 版本（最稳定）

```json
"ios": {
  "image": "macos-sequoia-15.6-xcode-26.1",
  "buildConfiguration": "Release"
}
```

**优点**：
- 完全可预测
- 最稳定

**缺点**：
- 需要手动更新

## 已应用的修复

已修复为使用 `latest` 镜像（快速修复）：

```json
"ios": {
  "image": "latest",
  "buildConfiguration": "Release"
}
```

## 验证

运行以下命令验证修复：

```bash
# 检查 eas.json
cat eas.json | grep -A 2 "ios"

# 应该显示：
# "ios": {
#   "image": "latest",
#   "buildConfiguration": "Release"
# }
```

## 建议

对于生产环境，建议：

1. **短期**：使用 `latest`（已修复）
2. **长期**：考虑使用 `sdk-54` 或特定版本以获得更好的稳定性

## 下一步

提交修复并重新构建：

```bash
git add eas.json
git commit -m "Fix: Use valid iOS build image 'latest' instead of invalid 'macos-15.0.0'"
git push
eas build --platform ios --profile production
```

