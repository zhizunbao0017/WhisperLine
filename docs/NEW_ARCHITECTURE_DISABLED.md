# New Architecture 禁用说明

## 当前状态

**New Architecture 已彻底禁用**

- ✅ `app.json` 中 `newArchEnabled: false`
- ✅ `app.config.js` 中 `newArchEnabled: false`
- ✅ Podfile 中会读取此配置并禁用

## 禁用原因

1. **构建稳定性**：确保 EAS 构建能够成功完成
2. **模块兼容性**：部分原生模块可能不完全支持 New Architecture
3. **快速上架**：先确保应用能够成功构建和上架

## 不兼容的模块（已知）

以下模块在 New Architecture 下可能有问题：
- `react-native-calendars`
- `react-native-chart-kit`
- `react-native-pell-rich-editor`
- `react-native-rich-editor`
- `@dr.pogodin/react-native-fs`
- `@dr.pogodin/react-native-static-server`

## 验证 New Architecture 状态

### 方法 1: 运行诊断脚本
```bash
node scripts/diagnose-fastlane-error.js
```

### 方法 2: 检查配置
```bash
node -e "const config = require('./app.config.js')({}); console.log('New Architecture:', config.expo.newArchEnabled);"
# 应该输出: New Architecture: false
```

### 方法 3: 检查 app.json
```bash
grep newArchEnabled app.json
# 应该输出: "newArchEnabled": false,
```

## 重新启用计划（上架后）

### 步骤 1: 验证所有模块兼容性
1. 检查每个依赖的 New Architecture 支持情况
2. 更新或替换不兼容的模块
3. 测试每个模块的功能

### 步骤 2: 逐步启用
1. 先在 development 构建中启用
2. 充分测试所有功能
3. 确认无问题后再在 production 构建中启用

### 步骤 3: 启用方法
```javascript
// app.config.js
newArchEnabled: true,  // 改为 true

// app.json
"newArchEnabled": true,  // 改为 true
```

### 步骤 4: 测试和验证
```bash
# 运行诊断
node scripts/diagnose-fastlane-error.js

# 运行预检查
npm run prebuild:check

# 测试构建
eas build --platform ios --profile production
```

## 注意事项

⚠️ **重要**：
- 在应用成功上架之前，**不要**启用 New Architecture
- 启用前必须验证所有模块的兼容性
- 建议先在 development 构建中测试
- 确保所有功能正常工作后再启用

## 相关文档

- [React Native New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [Expo New Architecture Guide](https://docs.expo.dev/development/new-architecture/)
- [Fastlane Build Error Diagnosis](./FASTLANE_BUILD_ERROR_DIAGNOSIS.md)

