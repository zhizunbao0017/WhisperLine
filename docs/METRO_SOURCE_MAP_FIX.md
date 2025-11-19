# Metro Source Map 崩溃修复 - Expo SDK 51+ (Nov 2025)

## 问题描述

在 EAS Production 构建时出现以下错误：

```
@expo/metro-config transform-worker.js 第178行 worker 崩溃
npx expo export:embed --eager --platform ios --dev false exited with non-zero code: 1
```

## 根本原因

这是 Expo SDK 51+ 在 2025 年 11 月的已知 bug：
- Metro 在生产环境生成 source map 时崩溃
- `transform-worker.js` 在处理 source map 时出现内存或处理错误
- 导致 `expo export:embed` 命令失败

## 解决方案

### 1. 在 eas.json 中禁用 Source Map 生成

```json
"env": {
  "EXPO_METRO_NO_SOURCE_MAPS": "true",
  "GENERATE_SOURCEMAP": "false",
  "EXPO_DEBUG": "false"
}
```

### 2. 在 app.config.js 中设置环境变量

```javascript
// CRITICAL: Fix Expo SDK 51+ Metro source map crash bug (Nov 2025)
if (process.env.EAS_BUILD_PROFILE === 'production' || process.env.NODE_ENV === 'production') {
  process.env.EXPO_METRO_NO_SOURCE_MAPS = "true";
  process.env.GENERATE_SOURCEMAP = "false";
  process.env.EXPO_DEBUG = "false";
}
```

## 已应用的修复

### eas.json

```json
"production": {
  "env": {
    "COCOAPODS_DISABLE_STATS": "1",
    "EXPO_NO_DOCTOR": "true",
    "EXPO_NO_TELEMETRY": "true",
    "RCT_NO_LAUNCH_PACKAGER": "true",
    "NO_FLIPPER": "1",
    "EXPO_METRO_NO_SOURCE_MAPS": "true",    // ✅ 新增
    "GENERATE_SOURCEMAP": "false",          // ✅ 新增
    "EXPO_DEBUG": "false",                  // ✅ 新增
    "NODE_ENV": "production"
  },
  "node": "18.18.2"                        // ✅ 已固定
}
```

### app.config.js

```javascript
// CRITICAL: Fix Expo SDK 51+ Metro source map crash bug (Nov 2025)
// Disable source map generation to prevent metro transform-worker crash
if (process.env.EAS_BUILD_PROFILE === 'production' || process.env.NODE_ENV === 'production') {
  process.env.EXPO_METRO_NO_SOURCE_MAPS = "true";
  process.env.GENERATE_SOURCEMAP = "false";
  process.env.EXPO_DEBUG = "false";
}
```

## 环境变量说明

| 变量 | 作用 | 说明 |
|------|------|------|
| `EXPO_METRO_NO_SOURCE_MAPS` | 禁用 Expo Metro source map | 防止 Metro 生成 source map |
| `GENERATE_SOURCEMAP` | 禁用 React Native source map | 防止 React Native 生成 source map |
| `EXPO_DEBUG` | 禁用 Expo 调试模式 | 减少调试相关的处理 |

## 影响

### ✅ 优点

- 修复 Metro transform-worker 崩溃
- 加快构建速度（不生成 source map）
- 减小构建产物大小
- 提高构建稳定性

### ⚠️ 注意事项

- Production 构建将不包含 source map
- 生产环境错误堆栈可能不够详细
- 如果需要调试生产问题，可能需要其他方案

## 验证

### 1. 检查环境变量

```bash
# 测试 Production 配置
EAS_BUILD_PROFILE=production node -e "require('./app.config.js'); console.log('EXPO_METRO_NO_SOURCE_MAPS:', process.env.EXPO_METRO_NO_SOURCE_MAPS)"
# 应该输出: EXPO_METRO_NO_SOURCE_MAPS: true
```

### 2. 运行构建

```bash
eas build --platform ios --profile production --clear-cache
```

### 3. 检查构建日志

查找以下信息：
- ✅ Bundle JavaScript 阶段成功
- ✅ 没有 Metro transform-worker 崩溃错误
- ✅ `expo export:embed` 成功完成

## 相关修复

此修复与之前的修复配合使用：

1. ✅ Flipper 完全禁用（3 层保护）
2. ✅ Debug-only pods 移除
3. ✅ IPHONEOS_DEPLOYMENT_TARGET 统一
4. ✅ ENABLE_BITCODE = NO
5. ✅ expo-dev-client 条件排除
6. ✅ **Metro source map 禁用**（本次修复）

## 如果仍然失败

1. **确认配置已提交**：
   ```bash
   git add eas.json app.config.js
   git commit -m "fix: Disable Metro source map generation to prevent crash"
   git push
   ```

2. **清理缓存重新构建**：
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```

3. **检查构建日志**：
   - 确认环境变量已设置
   - 检查是否有其他错误

## 参考

- Expo SDK 51+ 已知问题
- Metro transform-worker 崩溃修复
- EAS Build 最佳实践

