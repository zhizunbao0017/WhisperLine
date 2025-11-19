# EAS iOS 构建失败诊断总结

## 当前构建失败情况

**失败阶段**：Run fastlane  
**构建 ID**：b4f95c11-46a1-4eaf-9f8e-3a02c8dc78b2  
**构建日志**：https://expo.dev/accounts/j8t/projects/whisperline/builds/b4f95c11-46a1-4eaf-9f8e-3a02c8dc78b2

## 可能的原因分析

### 1. CocoaPods 源问题（已修复）
- ✅ **状态**：已修复
- **修复**：在 `ios/Podfile` 中添加了 `source 'https://github.com/CocoaPods/Specs.git'`
- **验证**：Podfile 已提交到仓库

### 2. Apple WWDR 证书问题（待确认）
- ⚠️ **状态**：需要检查构建日志确认
- **本地检查结果**：
  - 找到 1 个 WWDR 证书在系统钥匙串
  - 未发现过期证书
  - **注意**：EAS 构建在云端运行，本地证书不影响构建

### 3. EAS 凭证问题（待检查）
- ⚠️ **状态**：需要检查 EAS 凭证状态
- **检查方法**：
  ```bash
  eas credentials --platform ios
  ```
  或访问：https://expo.dev/accounts/j8t/projects/whisperline/credentials

### 4. Provisioning Profile 问题（待确认）
- ⚠️ **状态**：需要检查构建日志确认
- **常见错误**：
  - "No provisioning profile found"
  - "Provisioning profile expired"
  - "Bundle identifier mismatch"

## 诊断步骤

### 步骤 1：查看详细构建日志

访问构建日志页面，重点查看以下部分：

1. **Xcode Logs**：
   - 搜索关键词：`WWDR`、`certificate`、`code signing`
   - 查看具体的错误信息

2. **Install Pods**：
   - 确认 CocoaPods 安装是否成功
   - 检查是否有源访问错误

3. **Run Fastlane**：
   - 查看 fastlane 执行的详细步骤
   - 确认失败的具体操作

### 步骤 2：检查 EAS 凭证状态

```bash
# 检查凭证状态
eas credentials --platform ios

# 选择 production profile
# 查看凭证详情
```

### 步骤 3：运行本地诊断脚本

```bash
# 检查 WWDR 证书（本地）
./scripts/check-wwdr-certificate.sh

# 检查构建配置
./scripts/verify-build-config.sh
```

## 根据错误类型采取的行动

### 如果是 WWDR 证书问题

**错误信息示例**：
- "WWDR certificate expired"
- "certificate verify failed"
- "Apple Worldwide Developer Relations Certification Authority"

**解决方案**：
1. 下载最新的 WWDR G4 证书：
   ```bash
   curl -O https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
   ```

2. 安装到系统钥匙串：
   ```bash
   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain AppleWWDRCAG4.cer
   ```

3. **重要**：EAS 构建在云端，本地证书更新不会直接影响构建
   - 需要检查 EAS 凭证是否有效
   - 可能需要重新生成 EAS 凭证

### 如果是 Provisioning Profile 问题

**错误信息示例**：
- "No provisioning profile found"
- "Provisioning profile expired"
- "Bundle identifier mismatch"

**解决方案**：
```bash
# 让 EAS 重新生成凭证
eas credentials --platform ios

# 选择 production profile
# 选择 "Set up new credentials" 或 "Update existing credentials"
```

### 如果是代码签名问题

**错误信息示例**：
- "code signing failed"
- "signing certificate invalid"
- "entitlements mismatch"

**解决方案**：
1. 检查 `app.json` 中的 `bundleIdentifier`：
   ```json
   "bundleIdentifier": "com.xietian.whisperline"
   ```

2. 确认 Apple Developer 账户状态正常

3. 重新生成凭证：
   ```bash
   eas credentials --platform ios --clear
   ```

## 快速修复尝试

### 方案 1：清理缓存重新构建

```bash
eas build --platform ios --profile production --clear-cache
```

### 方案 2：重新配置凭证

```bash
eas credentials --platform ios
# 选择 production profile
# 选择 "Update existing credentials"
```

### 方案 3：检查 Apple Developer 账户

1. 访问：https://developer.apple.com/account
2. 确认账户状态正常
3. 检查证书和配置文件是否有效

## 下一步操作

1. **立即执行**：查看构建日志中的具体错误信息
   - 访问：https://expo.dev/accounts/j8t/projects/whisperline/builds/b4f95c11-46a1-4eaf-9f8e-3a02c8dc78b2
   - 重点查看 "Xcode logs" 部分

2. **根据错误信息**：
   - 如果是证书问题 → 参考 `docs/WWDR_CERTIFICATE_FIX.md`
   - 如果是 CocoaPods 问题 → 已修复，重新构建
   - 如果是凭证问题 → 重新配置 EAS 凭证

3. **重新构建**：
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```

## 相关文档

- [WWDR 证书修复指南](./WWDR_CERTIFICATE_FIX.md)
- [CocoaPods 构建修复](./COCOAPODS_BUILD_FIX.md)
- [预构建检查清单](./PRE_BUILD_CHECKLIST.md)

