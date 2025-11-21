# EAS 本地构建 "Prepare credentials" 阶段失败分析

## 🔴 问题描述

运行 `eas build --local` 时，构建在 **"Prepare credentials build phase"** 阶段失败，错误信息：
```
Error unknown. See logs of the Prepare credentials build phase for more information.
Error: build command failed.
```

## 🔍 诊断结果

根据诊断脚本检查，发现以下情况：

### ✅ 正常项
1. **EAS CLI 版本**: eas-cli/16.27.0 ✅
2. **EAS 登录状态**: 已登录 (j8t) ✅
3. **app.json 配置**: Bundle ID 和 EAS Project ID 配置正确 ✅
4. **eas.json 配置**: production profile 配置正确 ✅
5. **钥匙串访问**: 正常 ✅
6. **网络连接**: 可以访问 Apple Developer 服务 ✅

### ⚠️ 问题项
**关键问题**: **未找到本地 Apple Developer 代码签名证书**

## 🎯 根本原因

EAS **本地构建** (`eas build --local`) 需要：
1. 从本地钥匙串访问 Apple Developer 证书
2. 使用本地证书进行代码签名
3. 准备 provisioning profiles

**当前情况**：
- 本地钥匙串中没有 Apple Developer 代码签名证书
- EAS 无法在 "Prepare credentials" 阶段获取必要的签名凭证
- 导致构建失败

## 💡 解决方案

### 方案 1: 使用云端构建（强烈推荐）⭐

**这是最简单、最可靠的方案**：

```bash
# 使用云端构建，EAS 会自动管理所有凭证
eas build --platform ios --profile production
```

**优势**：
- ✅ EAS 自动管理所有证书和配置文件
- ✅ 不需要本地配置证书
- ✅ 更稳定可靠
- ✅ 构建速度通常更快（使用 EAS 的构建服务器）

**为什么推荐云端构建**：
- EAS 云端构建服务器已经配置好所有必要的证书
- 不需要本地准备凭证
- 避免本地环境问题
- 更符合 EAS 的设计理念

### 方案 2: 配置本地证书（不推荐，复杂）

如果你必须使用本地构建，需要：

1. **导出 Apple Developer 证书**：
   - 从 Apple Developer 账户下载证书
   - 或从其他 Mac 导出证书

2. **安装到本地钥匙串**：
   ```bash
   # 双击 .cer 文件安装，或使用命令行
   security import certificate.cer -k ~/Library/Keychains/login.keychain-db
   ```

3. **配置 EAS 使用本地证书**：
   ```bash
   eas credentials --platform ios
   # 选择 "Use local credentials"
   ```

**缺点**：
- ❌ 需要手动管理证书
- ❌ 证书过期需要手动更新
- ❌ 容易出错
- ❌ 不符合 EAS 最佳实践

### 方案 3: 重新配置 EAS 凭证（如果使用云端构建失败）

如果云端构建也失败，可能是 EAS 凭证配置问题：

```bash
# 重新配置凭证
eas credentials --platform ios

# 选择 production profile
# 选择 "Set up new credentials" 或 "Update existing credentials"
```

## 📊 对比：本地构建 vs 云端构建

| 特性 | 本地构建 | 云端构建 |
|------|---------|---------|
| 凭证管理 | 需要本地证书 | EAS 自动管理 ✅ |
| 构建速度 | 取决于本地机器 | 通常更快 ✅ |
| 稳定性 | 受本地环境影响 | 更稳定 ✅ |
| 配置复杂度 | 复杂 ❌ | 简单 ✅ |
| 推荐度 | ⭐⭐ | ⭐⭐⭐⭐⭐ |

## 🚀 立即行动

### 推荐操作（云端构建）：

```bash
# 1. 清理缓存
eas build --platform ios --profile production --clear-cache

# 2. 如果失败，重新配置凭证
eas credentials --platform ios
```

### 如果必须使用本地构建：

1. 先尝试配置本地证书（见方案 2）
2. 如果仍然失败，切换到云端构建

## 📝 总结

**问题根源**：EAS 本地构建需要本地 Apple Developer 证书，但本地钥匙串中没有这些证书。

**最佳解决方案**：**使用云端构建** (`eas build --platform ios --profile production`)，让 EAS 自动管理所有凭证。

**为什么 babel-plugin-module-resolver 问题已解决**：
- ✅ 依赖已正确安装
- ✅ package-lock.json 已更新
- ✅ 本地 `expo export` 验证通过
- ✅ 代码已推送到远程仓库

**当前构建失败与 babel-plugin-module-resolver 无关**，是 EAS 本地构建的凭证准备问题。

## 🔗 相关文档

- [EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [EAS 凭证管理](https://docs.expo.dev/app-signing/managed-credentials/)
- [本地构建 vs 云端构建](https://docs.expo.dev/build/local-builds/)

