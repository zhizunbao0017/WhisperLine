# Babel Plugin Module Resolver Build Fix

## 问题描述
iOS production 构建失败，报错：`Cannot find module 'babel-plugin-module-resolver'`

## 根本原因分析
1. **EAS 缓存问题**：旧的缓存可能包含不完整的依赖状态
2. **依赖安装顺序**：EAS 构建时可能没有正确安装所有 dependencies
3. **Babel 配置验证缺失**：没有在构建前验证插件是否存在

## 解决方案

### 1. 禁用 EAS 缓存 (`eas.json`)
```json
"cache": {
  "disabled": true
}
```
**原因**：确保每次构建都从头开始安装依赖，避免使用可能损坏的缓存

### 2. 创建 `.npmrc` 文件
确保 npm 安装依赖时的行为一致：
- `legacy-peer-deps=false`：使用标准的 peer dependencies 处理
- `package-lock=true`：确保使用 package-lock.json
- `prefer-offline=false`：强制从 registry 获取最新版本

### 3. 优化 `babel.config.js`
添加了插件存在性验证：
```javascript
try {
  require.resolve('babel-plugin-module-resolver');
} catch (e) {
  throw new Error('babel-plugin-module-resolver not found!');
}
```
**原因**：在构建早期发现缺失的依赖，提供清晰的错误信息

### 4. 移动关键 Babel 插件到 dependencies
将 `babel-plugin-transform-replace-expressions` 从 `devDependencies` 移到 `dependencies`

**原因**：EAS production 构建不会安装 devDependencies，但 babel.config.js 需要这些插件

### 5. 添加构建前验证脚本 (`scripts/verify-dependencies.js`)
在构建前验证所有关键的 Babel 插件都已安装

### 6. 添加 prebuildCommand
在 `eas.json` 中添加：
```json
"prebuildCommand": "node scripts/verify-dependencies.js"
```

## 验证步骤

### 本地验证
```bash
# 1. 清理本地依赖
rm -rf node_modules package-lock.json

# 2. 重新安装
npm install

# 3. 运行验证脚本
node scripts/verify-dependencies.js

# 4. 测试 babel 配置
npx expo start --clear
```

### EAS 构建
```bash
# 确保所有更改已提交
git add .
git commit -m "Fix babel-plugin-module-resolver build issue"
git push

# 触发构建（禁用缓存）
eas build --platform ios --profile production --no-cache
```

## 预期结果
- ✅ 构建不再报 "Cannot find module 'babel-plugin-module-resolver'" 错误
- ✅ 所有 Babel 插件在构建时都能正确找到
- ✅ 依赖安装过程更加可靠

## 如果问题仍然存在

1. **检查 package-lock.json 是否已提交**
   ```bash
   git ls-files | grep package-lock.json
   ```

2. **手动验证依赖**
   ```bash
   npm ls babel-plugin-module-resolver
   ```

3. **检查 EAS 构建日志**
   - 查看 "Installing dependencies" 阶段
   - 确认 `babel-plugin-module-resolver` 是否出现在安装列表中

4. **尝试使用 exact version**
   如果问题持续，可以考虑将 `^5.0.2` 改为 `5.0.2`（固定版本）

## 相关文件
- `eas.json` - EAS 构建配置
- `babel.config.js` - Babel 配置
- `package.json` - 依赖配置
- `.npmrc` - npm 配置
- `scripts/verify-dependencies.js` - 依赖验证脚本

