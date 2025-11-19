# 原生代码编译预检查指南

## 概述

`check-native-build.js` 脚本可以在提交 EAS 构建之前检查常见的 iOS 原生代码编译问题，帮助提前发现潜在问题，避免浪费构建次数。

## 使用方法

### 单独运行
```bash
npm run test:native
```

### 集成到完整检查
```bash
npm run prebuild:check
```

这会运行：
1. 依赖验证
2. Babel 配置测试
3. **原生代码编译检查**（新增）

### 集成到模拟构建
轻量级和完整模拟构建脚本已自动包含原生代码检查。

## 检查内容

### 1. iOS 配置检查
- ✅ Bundle Identifier 是否设置
- ✅ Build Number 是否设置
- ✅ Info.plist 配置是否存在
- ✅ 必需的权限描述（NSPhotoLibraryUsageDescription, NSCameraUsageDescription 等）
- ✅ ITSAppUsesNonExemptEncryption 设置（App Store 要求）

### 2. 架构配置检查
- ✅ New Architecture 是否明确设置
- ⚠️ New Architecture 启用时，检查所有原生模块是否支持

### 3. 原生依赖检查
- ✅ expo-dev-client 是否在正确的依赖分类中（不应在 dependencies）
- ✅ React Native 版本兼容性
- ✅ 已知问题包的配置

### 4. 原生代码文件检查
- ✅ Bridging Header 是否存在（Swift/Obj-C 桥接）
- ✅ AppDelegate.swift 是否存在
- ✅ Podfile 是否存在
- ✅ Podfile.lock 是否存在（表示 pods 已安装）

### 5. EAS 构建配置检查
- ✅ iOS 构建镜像设置
- ✅ Build Configuration（Release/Debug）
- ✅ 环境变量配置（NODE_ENV, NO_FLIPPER 等）
- ✅ 缓存配置
- ✅ Node 版本设置

### 6. Expo SDK 配置检查
- ✅ Expo SDK 版本兼容性
- ✅ expo-router 版本

## 输出说明

### ✅ 成功（绿色）
表示该项配置正确，不会导致构建问题。

### ⚠️ 警告（黄色）
表示该项可能需要关注，但通常不会阻止构建。例如：
- New Architecture 已启用（需要确保所有模块支持）
- 某些可选配置缺失

### ❌ 错误（红色）
表示该项配置有问题，可能导致构建失败。必须修复后才能构建。

## 常见问题修复

### 问题：Bundle Identifier 未设置
**修复**：在 `app.config.js` 中添加：
```javascript
ios: {
  bundleIdentifier: "com.yourcompany.yourapp"
}
```

### 问题：权限描述缺失
**修复**：在 `app.config.js` 的 `ios.infoPlist` 中添加：
```javascript
ios: {
  infoPlist: {
    NSPhotoLibraryUsageDescription: "需要访问相册以...",
    NSCameraUsageDescription: "需要访问相机以...",
    // 等等
  }
}
```

### 问题：expo-dev-client 在 dependencies 中
**修复**：确保 `expo-dev-client` 只在 `devDependencies` 中：
```bash
npm uninstall expo-dev-client
npm install --save-dev expo-dev-client
```

### 问题：Podfile.lock 不存在
**修复**：运行 pod install（如果本地有 ios 目录）：
```bash
cd ios && pod install
```

注意：EAS 构建会自动运行 pod install，所以这通常不是问题。

## 集成到 CI/CD

可以将此脚本集成到 CI/CD 流程中：

```yaml
# GitHub Actions 示例
- name: Check native build configuration
  run: npm run test:native
```

## 限制

此脚本**无法检查**：
- ❌ 实际的 Xcode 编译过程
- ❌ CocoaPods 依赖冲突
- ❌ 代码签名和证书问题
- ❌ App Store Connect 配置

这些只能在真实的 EAS 构建中验证。

## 最佳实践

1. **提交前检查**：每次提交 EAS 构建前运行 `npm run prebuild:check`
2. **修复错误**：优先修复所有 ❌ 错误
3. **审查警告**：至少了解警告的含义
4. **定期检查**：在更新依赖后重新运行检查

## 相关命令

```bash
# 快速检查（推荐）
npm run prebuild:check

# 只检查原生代码
npm run test:native

# 完整模拟构建（包含原生检查）
npm run simulate:build:light
```

