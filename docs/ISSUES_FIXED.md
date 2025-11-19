# 发现并修复的问题

## ✅ 已修复的问题

### 1. app.json 和 app.config.js 配置冲突

**问题**：
- `app.json` 中硬编码了 `expo-dev-client` 和 `reactCompiler: true`
- 这会导致 Expo 在 production 构建时仍然尝试加载 `expo-dev-client`（在 devDependencies 中）
- `reactCompiler: true` 可能导致 production 构建问题

**修复**：
- ✅ 从 `app.json` 中移除了 `expo-dev-client`
- ✅ 从 `app.json` 中移除了 `reactCompiler: true`
- ✅ 现在完全由 `app.config.js` 动态控制这些配置

**影响**：
- Production 构建不会再尝试加载 `expo-dev-client`
- `reactCompiler` 只在 development 构建中启用

### 2. Metro 配置缺少 @ 别名支持

**问题**：
- Babel 已经配置了 `@` 别名
- Metro resolver 没有显式配置别名
- 虽然 Babel 会处理，但 Metro 也应该知道这些别名以确保一致性

**修复**：
- ✅ 在 `metro.config.js` 中添加了 `@` 别名配置
- ✅ 确保 production 构建时别名配置被保留

**影响**：
- Metro bundler 现在也能正确解析 `@` 别名
- 构建过程更加可靠

## ⚠️ 需要注意的警告

### New Architecture 已启用

**警告**：`newArchEnabled: true` 在 `app.config.js` 中

**说明**：
- 这不是错误，只是一个提醒
- 需要确保所有使用的原生模块都支持 New Architecture
- 如果构建失败，可能需要禁用 New Architecture 或更新不兼容的模块

**检查方法**：
```bash
# 检查哪些模块可能不支持 New Architecture
npm run test:native
```

## ✅ 验证结果

所有检查通过：
- ✅ 依赖验证通过
- ✅ Babel 配置正确
- ✅ 原生代码配置正确
- ✅ EAS 构建配置正确
- ✅ `@` 别名配置正确（Babel + Metro）
- ✅ `app.json` 和 `app.config.js` 不再冲突

## 下一步

现在可以安全地提交代码并运行 EAS 构建：

```bash
git add .
git commit -m "Fix: Remove conflicting configs from app.json and add Metro alias support"
git push
eas build --platform ios --profile production
```

