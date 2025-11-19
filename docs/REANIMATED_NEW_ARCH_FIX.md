# react-native-reanimated New Architecture 修复

## 问题描述

构建失败，错误信息：
```
[Reanimated] Reanimated requires the New Architecture to be enabled.
[!] Invalid `RNReanimated.podspec` file: [Reanimated] Reanimated requires the New Architecture to be enabled.
```

## 根本原因

`react-native-reanimated` 4.x 版本**强制要求**启用 New Architecture，但项目已禁用 New Architecture。

## 修复方案

### 1. 降级 react-native-reanimated

**从**: `~4.1.1` (要求 New Architecture)
**到**: `~3.16.1` (支持旧架构)

```json
// package.json
"react-native-reanimated": "~3.16.1"
```

**原因**：
- `react-native-reanimated` 3.x 版本支持旧架构
- `react-native-reanimated` 4.x 版本强制要求 New Architecture
- 3.16.1 与 Expo SDK 54 兼容

### 2. 在 eas.json 中明确设置环境变量

```json
// eas.json
"env": {
  // ... 其他环境变量
  "RCT_NEW_ARCH_ENABLED": "0"
}
```

**原因**：
- 确保 EAS 构建环境明确禁用 New Architecture
- Podfile 会读取此环境变量

### 3. 确保 Babel 配置正确

```javascript
// babel.config.js
plugins: [
  // ... 其他插件
  'react-native-reanimated/plugin'  // 必须放在最后
]
```

**原因**：
- `react-native-reanimated` 需要 Babel 插件进行代码转换
- 插件必须放在插件列表的最后

## 已应用的修复

1. ✅ 降级 `react-native-reanimated` 到 `~3.16.1`
2. ✅ 在 `eas.json` 中添加 `RCT_NEW_ARCH_ENABLED: "0"`
3. ✅ 在 `babel.config.js` 中添加 `react-native-reanimated/plugin`
4. ✅ Podfile 已正确配置（会自动读取 `RCT_NEW_ARCH_ENABLED`）

## 验证

运行以下命令验证修复：

```bash
# 检查 reanimated 兼容性
node scripts/check-reanimated-compatibility.js

# 检查 Babel 配置
npm run test:babel

# 完整预检查
npm run prebuild:check
```

## 其他可能的问题

### react-native-worklets

`react-native-worklets` 是 `react-native-reanimated` 的依赖，降级 reanimated 后会自动使用兼容版本。

### 版本兼容性

- ✅ Expo SDK 54: 兼容
- ✅ React Native 0.81.5: 兼容
- ✅ react-native-reanimated 3.16.1: 支持旧架构

## 下一步

1. **更新依赖**：
   ```bash
   npm install
   ```

2. **提交更改**：
   ```bash
   git add .
   git commit -m "Fix: Downgrade react-native-reanimated to 3.16.1 for old architecture compatibility"
   git push
   ```

3. **重新构建**：
   ```bash
   eas build --platform ios --profile production
   ```

## 预期结果

修复后应该能够：
1. ✅ 通过 Podfile 验证（不再要求 New Architecture）
2. ✅ 成功安装 CocoaPods 依赖
3. ✅ 通过原生代码编译
4. ✅ 成功完成构建

## 相关文档

- [react-native-reanimated 文档](https://docs.swmansion.com/react-native-reanimated/)
- [Expo SDK 54 兼容性](https://docs.expo.dev/versions/latest/sdk/overview/)
- [New Architecture 迁移指南](https://reactnative.dev/docs/the-new-architecture/landing-page)

