# 构建前检查清单

## 📋 概述

在运行 EAS build 之前，使用本地验证脚本检查所有配置，可以：
- ✅ 提前发现配置错误
- ✅ 节省 EAS 构建资源
- ✅ 减少构建失败次数
- ✅ 提高构建成功率

## 🚀 快速使用

### 方法一：完整检查（推荐）

```bash
./scripts/pre-build-check.sh
```

这个脚本会执行：
1. 配置验证
2. 代码质量检查
3. 依赖完整性验证
4. EAS 构建准备检查

### 方法二：基础验证

```bash
./scripts/verify-build-config.sh
```

只执行基础配置验证。

## ✅ 检查项目

### 1. 项目结构
- [x] app.json 存在
- [x] package.json 存在
- [x] eas.json 存在
- [x] ios/Podfile 存在

### 2. 应用配置
- [x] Bundle ID 已配置
- [x] 版本号已设置
- [x] 构建号已设置
- [x] 所有权限描述已配置

### 3. 依赖管理
- [x] node_modules 存在
- [x] package-lock.json 存在
- [x] package.json 和 package-lock.json 同步
- [x] 关键依赖已安装

### 4. EAS 配置
- [x] EAS CLI 已安装
- [x] EAS 已登录
- [x] EAS 项目 ID 已配置
- [x] production 构建配置存在

### 5. iOS 配置
- [x] ios 目录存在
- [x] Podfile 存在
- [x] Podfile.lock 存在（可选）

## ⚠️ 常见警告

### 警告 1: react-native-static-server
```
⚠ 检测到可能有问题的依赖: @dr.pogodin/react-native-static-server
```
**说明**: 如果构建失败，考虑暂时移除此依赖

### 警告 2: Podfile 验证失败
```
⚠ Podfile 验证失败（可能是网络问题）
```
**说明**: 本地网络问题，不影响 EAS 构建

### 警告 3: Lint 警告
```
⚠ 发现 lint 警告（不影响构建）
```
**说明**: 代码风格问题，不影响构建

## 🔧 修复常见问题

### 问题 1: 依赖未安装
```bash
npm install
```

### 问题 2: package-lock.json 不同步
```bash
rm package-lock.json
npm install
git add package-lock.json
git commit -m "fix: Sync package-lock.json"
```

### 问题 3: EAS 未登录
```bash
eas login
```

### 问题 4: 缺少配置文件
检查并创建缺失的配置文件：
- `app.json`
- `eas.json`
- `package.json`

## 📝 构建前检查流程

1. **运行验证脚本**
   ```bash
   ./scripts/pre-build-check.sh
   ```

2. **检查结果**
   - ✅ 所有检查通过 → 可以构建
   - ⚠️ 有警告 → 建议修复，但可以尝试构建
   - ✗ 有错误 → 必须先修复

3. **修复问题**（如果有）
   - 根据错误提示修复配置
   - 重新运行验证脚本

4. **执行构建**
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```

## 🎯 最佳实践

1. **每次构建前都运行检查**
   - 避免浪费 EAS 构建资源
   - 提前发现配置问题

2. **提交前检查**
   - 在提交代码前运行检查
   - 确保配置正确

3. **定期更新依赖**
   - 保持依赖版本最新
   - 定期运行 `npm audit fix`

4. **监控构建日志**
   - 即使检查通过，也要监控构建过程
   - 及时发现问题

## 📞 需要帮助？

如果验证脚本发现问题但不知道如何修复，请：
1. 查看错误信息
2. 检查相关配置文件
3. 参考本文档的修复指南
4. 联系技术支持

---

**最后更新**: 2025年1月

