# expo-dev-client 插件解析失败修复

## 问题描述

在 EAS Production 构建时出现以下错误：

```
PluginError: Failed to resolve plugin for module "expo-dev-client" relative to "/Users/expo/workingdir/build". 
Do you have node modules installed?
```

## 根本原因

1. `expo-dev-client` 在 `app.json` 的 `plugins` 数组中
2. `expo-dev-client` 在 `package.json` 的 `devDependencies` 中
3. EAS Production 构建**不会安装** `devDependencies`
4. Expo 尝试解析 `expo-dev-client` 插件时找不到模块

## 解决方案

### 1. 使用动态配置 (`app.config.js`)

将 `app.json` 改为 `app.config.js`，根据构建环境动态包含/排除 `expo-dev-client`：

```javascript
const isProduction = process.env.EAS_BUILD_PROFILE === 'production' || 
                     process.env.NODE_ENV === 'production';

plugins: [
  "expo-router",
  // 只在 Development 构建中包含 expo-dev-client
  ...(isProduction ? [] : ["expo-dev-client"]),
  // ... 其他插件
]
```

### 2. 配置说明

- **Production 构建**：`expo-dev-client` 被排除，不会尝试解析
- **Development 构建**：`expo-dev-client` 被包含，正常使用

### 3. 验证

```bash
# 测试 Production 配置
EAS_BUILD_PROFILE=production node -e "const config = require('./app.config.js'); console.log(config({}).expo.plugins)"
# 应该不包含 "expo-dev-client"

# 测试 Development 配置
EAS_BUILD_PROFILE=development node -e "const config = require('./app.config.js'); console.log(config({}).expo.plugins)"
# 应该包含 "expo-dev-client"
```

## 相关文件

- `app.config.js` - 动态配置文件（新增）
- `app.json` - 静态配置文件（保留作为备份，Expo 会优先使用 `app.config.js`）
- `package.json` - `expo-dev-client` 在 `devDependencies` 中（正确）

## 注意事项

1. ✅ Expo 会优先使用 `app.config.js`（如果存在）
2. ✅ `app.json` 可以保留作为备份或参考
3. ✅ Development 构建仍然可以使用 `expo-dev-client`
4. ✅ Production 构建不会尝试解析 `expo-dev-client`

## 如果仍然失败

1. **确认 `app.config.js` 已提交**：
   ```bash
   git add app.config.js
   git commit -m "fix: Use dynamic config to exclude expo-dev-client in production"
   git push
   ```

2. **清理缓存重新构建**：
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```

3. **检查构建日志**：
   - 查找 `📦 [Production Build] expo-dev-client plugin excluded`
   - 确认没有 `expo-dev-client` 相关的错误

