# Fastlane/Xcode 构建错误诊断指南

## 错误信息

```
The "Run fastlane" step failed with an unknown error.
Refer to "Xcode Logs" below for additional, more detailed logs.
```

## 常见原因

### 1. New Architecture 兼容性问题 ⚠️

**症状**：
- 构建在 fastlane/archive 阶段失败
- 某些原生模块编译失败

**解决方案**：
```javascript
// app.config.js 中临时禁用
newArchEnabled: false
```

**检查**：
```bash
node scripts/diagnose-fastlane-error.js
```

### 2. 代码签名问题

**症状**：
- Archive 失败
- 证书或配置文件错误

**检查**：
- EAS 构建日志中的 "Prepare credentials" 步骤
- 确认证书和配置文件有效

**解决方案**：
- EAS 会自动管理证书，但可以检查：
  ```bash
  eas credentials
  ```

### 3. 内存不足

**症状**：
- 编译过程中突然失败
- 没有明确的错误信息

**解决方案**：
- EAS 构建服务器通常有足够内存
- 如果是本地构建，增加可用内存

### 4. 依赖编译失败

**症状**：
- 特定 pod 编译失败
- Swift/Obj-C 编译错误

**检查**：
- 查看 Xcode 日志中的具体错误
- 检查是否有不兼容的依赖

### 5. Xcode 版本问题

**症状**：
- SDK 版本不匹配
- 某些 API 不可用

**解决方案**：
- 在 `eas.json` 中指定 iOS build image：
  ```json
  "ios": {
    "image": "macos-15.0.0"  // 指定具体版本
  }
  ```

## 诊断步骤

### 步骤 1: 运行诊断脚本

```bash
node scripts/diagnose-fastlane-error.js
```

### 步骤 2: 查看详细日志

1. 访问 EAS 构建日志 URL
2. 展开 "Xcode Logs" 部分
3. 下载或查看详细日志
4. 查找具体的错误信息

### 步骤 3: 检查常见问题

1. **New Architecture**：
   - 如果启用，尝试禁用
   - 检查所有原生模块是否支持

2. **依赖版本**：
   - 检查 React Native 和 Expo SDK 版本匹配
   - 检查是否有不兼容的依赖

3. **构建配置**：
   - 确认 `buildConfiguration: "Release"`
   - 确认缓存已禁用（用于排查）

## 快速修复尝试

### 尝试 1: 禁用 New Architecture

```javascript
// app.config.js
newArchEnabled: false
```

提交并重建：
```bash
git add app.config.js
git commit -m "Temporarily disable New Architecture"
git push
eas build --platform ios --profile production
```

### 尝试 2: 固定 iOS Build Image

```json
// eas.json
"ios": {
  "image": "macos-15.0.0",  // 使用稳定版本
  "buildConfiguration": "Release"
}
```

### 尝试 3: 检查特定依赖

如果诊断脚本提示某些包可能有问题，尝试：
1. 更新到最新版本
2. 检查是否有 New Architecture 支持
3. 临时移除并测试

## 获取详细错误信息

### 方法 1: EAS 构建日志

1. 访问构建日志 URL（在构建输出中提供）
2. 展开 "Xcode Logs" 部分
3. 下载日志文件
4. 搜索 "error" 或 "failed"

### 方法 2: 本地测试

如果可以本地构建：
```bash
npx expo prebuild
cd ios
pod install
xcodebuild -workspace WhisperLine.xcworkspace -scheme WhisperLine -configuration Release archive
```

## 常见错误模式

### 错误：`Code signing failed`
- **原因**：证书或配置文件问题
- **解决**：EAS 会自动管理，检查 "Prepare credentials" 步骤

### 错误：`No such module`
- **原因**：依赖未正确链接
- **解决**：检查 Podfile，确保所有依赖都已安装

### 错误：`Archive failed`
- **原因**：多种可能（签名、依赖、配置）
- **解决**：查看详细日志，定位具体错误

### 错误：`Swift compilation failed`
- **原因**：Swift 版本不兼容或代码错误
- **解决**：检查 Swift 版本，查看编译错误详情

## 下一步

1. ✅ 运行诊断脚本：`node scripts/diagnose-fastlane-error.js`
2. ✅ 查看 Xcode 日志获取详细错误
3. ✅ 根据具体错误信息采取相应措施
4. ✅ 如果 New Architecture 相关，尝试禁用

## 相关文档

- [EAS Build Troubleshooting](https://docs.expo.dev/build/troubleshooting/)
- [Fastlane Troubleshooting](https://docs.fastlane.tools/best-practices/troubleshooting/)
- [New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)

