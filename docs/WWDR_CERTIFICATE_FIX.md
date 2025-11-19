# Apple WWDR 证书问题诊断与修复

## 问题描述

EAS iOS 构建在 "Run fastlane" 阶段失败，可能是由于 Apple WWDR (Worldwide Developer Relations) 中间证书过期或缺失导致的。

## 错误症状

- 构建失败发生在 "Run fastlane" 阶段
- 错误信息可能包含：
  - "certificate verify failed"
  - "WWDR certificate expired"
  - "code signing failed"
  - "provisioning profile invalid"

## 诊断步骤

### 1. 检查本地 WWDR 证书状态

在 macOS 上：

```bash
# 打开钥匙串访问
open /Applications/Utilities/Keychain\ Access.app

# 或者使用命令行检查
security find-certificate -a -c "Apple Worldwide Developer Relations Certification Authority" -p
```

### 2. 检查 EAS 构建日志

访问构建日志页面，查看 "Xcode logs" 部分，搜索以下关键词：
- `WWDR`
- `certificate`
- `code signing`
- `provisioning profile`

## 解决方案

### 方案一：更新 WWDR 证书（推荐）

#### 步骤 1：下载最新的 WWDR 证书

访问 Apple 官方下载页面：
- **WWDR 中间证书（G4）**：https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
- **WWDR 中间证书（G3）**：https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer

或者使用命令行下载：

```bash
# 下载 G4 证书（最新）
curl -O https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer

# 下载 G3 证书（备用）
curl -O https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer
```

#### 步骤 2：安装证书

**方法 A：图形界面**
1. 双击下载的 `.cer` 文件
2. 系统会自动打开"钥匙串访问"
3. 选择"系统"钥匙串（不是"登录"）
4. 点击"添加"

**方法 B：命令行**
```bash
# 安装到系统钥匙串
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain AppleWWDRCAG4.cer
```

#### 步骤 3：删除过期的 WWDR 证书

1. 打开"钥匙串访问"
2. 选择"系统"钥匙串
3. 点击菜单栏：显示 > 显示已过期的证书
4. 找到名称为 "Apple Worldwide Developer Relations Certification Authority" 的过期证书
5. 右键选择"删除"

### 方案二：让 EAS 自动管理证书

EAS 通常会自动管理证书，但如果出现问题，可以尝试：

```bash
# 重新配置凭证
eas credentials --platform ios

# 选择 "production" profile
# 选择 "Set up new credentials" 或 "Update existing credentials"
```

### 方案三：清理并重新构建

```bash
# 清理构建缓存
eas build --platform ios --profile production --clear-cache

# 如果仍然失败，尝试重置凭证
eas credentials --platform ios --clear
```

## EAS 构建服务器上的证书

**重要**：EAS 构建在云端服务器上运行，本地证书不会直接影响构建。

如果问题出在 EAS 服务器端：

1. **检查 EAS 凭证状态**：
   ```bash
   eas credentials --platform ios
   ```

2. **查看凭证详情**：
   访问：https://expo.dev/accounts/j8t/projects/whisperline/credentials

3. **重新生成凭证**：
   - 如果凭证过期，EAS 会自动更新
   - 或者手动删除并重新创建

## 常见问题

### Q: 本地证书更新后，EAS 构建仍然失败？

A: EAS 构建在云端运行，本地证书更新不会直接影响构建。需要：
1. 检查 EAS 凭证是否有效
2. 确保 Apple Developer 账户状态正常
3. 查看构建日志中的具体错误

### Q: 如何确认是 WWDR 证书问题？

A: 查看构建日志中的错误信息：
- 如果看到 "WWDR" 或 "certificate verify failed"，很可能是证书问题
- 如果看到 "provisioning profile" 相关错误，可能是配置文件问题
- 如果看到 "code signing" 错误，可能是签名证书问题

### Q: EAS 会自动处理证书更新吗？

A: 是的，EAS 通常会：
- 自动检测并更新过期的证书
- 自动管理 provisioning profiles
- 自动处理 WWDR 证书

但如果遇到问题，可能需要手动干预。

## 验证修复

修复后，重新构建：

```bash
eas build --platform ios --profile production --clear-cache
```

如果构建成功，说明问题已解决。

## 相关链接

- [Apple WWDR 证书下载](https://www.apple.com/certificateauthority/)
- [EAS 凭证管理文档](https://docs.expo.dev/app-signing/managed-credentials/)
- [EAS 构建故障排除](https://docs.expo.dev/build/troubleshooting/)

