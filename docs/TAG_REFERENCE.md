# Git Tag 参考指南

## v1.1.1-eas-production-build-fix

**创建日期**: 2025-11-XX  
**版本**: 1.1.1  
**构建号**: 14

### 标签说明

此标签标记了 iOS EAS Production 构建 exit code 65 失败的终极修复。

### 解决的问题

- ✅ EAS Production 构建 exit code 65 失败
- ✅ Flipper 在生产构建中导致 archive 失败
- ✅ Debug-only pods 导致签名问题
- ✅ IPHONEOS_DEPLOYMENT_TARGET 不匹配
- ✅ ENABLE_BITCODE 配置问题

### 关键修改

#### ios/Podfile

1. **Flipper 完全禁用（3 层保护）**
   - Layer 1: `NO_FLIPPER=1` 环境变量（最高优先级）
   - Layer 2: Release 构建检测
   - Layer 3: 生产环境检测

2. **Debug-Only Pods 移除**
   - ReactNativeStaticServer
   - Flipper 及其所有 20+ 相关组件

3. **IPHONEOS_DEPLOYMENT_TARGET 统一处理**
   - 所有 targets 统一 deployment target
   - 防止签名问题

4. **ENABLE_BITCODE = NO**
   - 所有 targets 强制设置为 NO

#### eas.json

```json
"env": {
  "EXPO_NO_DOCTOR": "true",
  "EXPO_NO_TELEMETRY": "true",
  "RCT_NO_LAUNCH_PACKAGER": "true",
  "NO_FLIPPER": "1",
  "NODE_ENV": "production"
},
"node": "18.18.2"
```

### 如果将来遇到类似问题

#### 检查清单

1. **检查 ios/Podfile**：
   ```bash
   git show v1.1.1-eas-production-build-fix:ios/Podfile
   ```
   - 确认 Release 构建检测逻辑
   - 确认 Flipper 禁用逻辑
   - 确认 debug-only pods 移除逻辑

2. **检查 eas.json**：
   ```bash
   git show v1.1.1-eas-production-build-fix:eas.json
   ```
   - 确认所有必需的环境变量
   - 确认 Node 版本固定

3. **验证构建配置**：
   - 运行 `docs/FINAL_BUILD_VERIFICATION.md` 中的验证步骤
   - 检查构建日志中的关键标记

#### 快速恢复

如果需要恢复到修复版本：

```bash
# 查看修复版本的 Podfile
git show v1.1.1-eas-production-build-fix:ios/Podfile > ios/Podfile.fix

# 查看修复版本的 eas.json
git show v1.1.1-eas-production-build-fix:eas.json > eas.json.fix

# 比较差异
diff ios/Podfile ios/Podfile.fix
diff eas.json eas.json.fix
```

#### 应用修复

1. **复制 Podfile 配置**：
   - Release 构建检测函数
   - Flipper 禁用逻辑
   - Debug-only pods 移除逻辑
   - IPHONEOS_DEPLOYMENT_TARGET 统一处理

2. **更新 eas.json**：
   - 添加所有必需的环境变量
   - 固定 Node 版本

3. **验证**：
   - 运行构建验证脚本
   - 检查构建日志

### 相关文档

- [最终构建验证清单](./FINAL_BUILD_VERIFICATION.md)
- [终极配置说明](./ULTIMATE_EAS_PRODUCTION_CONFIG.md)
- [改动总结](../../CHANGES_SUMMARY.md)

### 标签信息

```bash
# 查看标签详情
git show v1.1.1-eas-production-build-fix

# 查看标签列表
git tag -l "*eas-production*"

# 切换到标签版本（只读）
git checkout v1.1.1-eas-production-build-fix
```

### 注意事项

- ⚠️ 此标签是只读的，不要直接在此标签上提交
- ✅ 如果需要应用修复，请创建新分支并合并相关更改
- ✅ 建议在遇到类似问题时参考此标签的配置

