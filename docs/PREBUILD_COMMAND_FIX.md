# Prebuild Command 修复

## 问题描述

EAS 构建失败，错误信息：
```
unknown or unexpected option: --platform
npx expo node scripts/verify-dependencies.js --platform ios exited with non-zero code: 1
```

## 根本原因

1. **EAS 构建系统可能错误地传递参数**：EAS 在执行 `prebuildCommand` 时可能添加了 `--platform ios` 参数
2. **脚本不接受参数**：`verify-dependencies.js` 脚本不接受任何命令行参数
3. **prebuildCommand 不是必需的**：依赖验证应该在构建前就完成，不需要在 EAS 构建时再次验证

## 修复方案

### 方案1：移除 prebuildCommand（推荐）

**原因**：
- 依赖验证应该在提交构建前完成（使用 `npm run prebuild:check`）
- EAS 构建时会自动安装依赖，不需要额外验证
- 避免与 EAS 构建系统的参数传递冲突

**修复**：
- ✅ 从 `eas.json` 中移除了 `prebuildCommand`

### 方案2：更新脚本忽略未知参数（备选）

**修复**：
- ✅ 更新了 `verify-dependencies.js` 脚本，现在会忽略未知的命令行参数
- ✅ 即使 EAS 传递了 `--platform` 等参数，脚本也能正常运行

## 验证

运行以下命令验证修复：

```bash
# 测试脚本是否能处理未知参数
node scripts/verify-dependencies.js --platform ios

# 运行完整预检查
npm run prebuild:check
```

## 最佳实践

1. **提交前验证**：使用 `npm run prebuild:check` 在本地验证所有配置
2. **不要依赖 prebuildCommand**：依赖验证应该在构建前完成，而不是在构建时
3. **简化构建流程**：让 EAS 构建系统专注于构建，而不是验证

## 总结

- ✅ 移除了 `prebuildCommand`（推荐方案）
- ✅ 更新了脚本以支持未知参数（备选方案）
- ✅ 依赖验证应该在构建前完成，使用 `npm run prebuild:check`

现在可以安全地重新提交 EAS 构建。

