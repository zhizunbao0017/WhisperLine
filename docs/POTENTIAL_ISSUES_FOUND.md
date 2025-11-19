# 发现的潜在问题

## ⚠️ 问题 1: app.json 和 app.config.js 配置冲突

### 问题描述
- `app.json` 中硬编码了 `expo-dev-client` 和 `reactCompiler: true`
- `app.config.js` 已经动态处理这些配置
- Expo 可能优先使用 `app.json`，导致 production 构建时仍然尝试加载 `expo-dev-client`

### 影响
- Production 构建可能失败，因为 `expo-dev-client` 在 `devDependencies` 中
- `reactCompiler: true` 可能导致 production 构建问题

### 解决方案
需要从 `app.json` 中移除这些配置，让 `app.config.js` 完全控制。

## ⚠️ 问题 2: Metro 配置缺少 @ 别名支持

### 问题描述
- Babel 已经配置了 `@` 别名
- Metro 配置中没有显式配置别名
- 虽然 Babel 会处理，但 Metro resolver 也应该知道这些别名

### 影响
- 可能在某些情况下路径解析失败
- 构建时可能出现模块找不到的错误

### 解决方案
在 `metro.config.js` 中添加 resolver 配置。

## ✅ 其他检查结果

- ✅ `babel-plugin-module-resolver` 配置正确
- ✅ `@` 别名在 Babel 中配置正确
- ✅ `expo-dev-client` 在 `devDependencies` 中（正确）
- ✅ EAS 配置正确
- ✅ iOS 配置完整

