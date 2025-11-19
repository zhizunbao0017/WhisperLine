# 本地模拟 EAS 构建指南

在提交 EAS 构建之前，可以使用本地模拟来验证配置是否正确，避免浪费构建次数。

## 快速开始

### 方法 0: 快速预检查（最快，推荐先运行）
```bash
npm run prebuild:check
```

**优点**：
- ⚡ 最快（几秒钟）
- ✅ 检查所有关键配置
- 🎯 适合每次提交前运行

**验证内容**：
- ✅ 依赖验证
- ✅ Babel 配置测试
- ✅ **原生代码编译检查**（新增）

### 方法 1: 轻量级模拟（推荐，快速）
```bash
npm run simulate:build:light
```

**优点**：
- ⚡ 快速（不删除 node_modules）
- ✅ 验证所有关键配置
- 🎯 适合日常使用

**验证内容**：
- ✅ 环境变量设置
- ✅ 依赖安装验证
- ✅ Babel 配置测试
- ✅ app.config.js 加载测试
- ✅ Metro 入口点解析
- ✅ **@ 别名路径解析**
- ✅ **原生代码编译检查**（新增）
- ✅ 常见问题检查

### 方法 2: 完整模拟（彻底，但较慢）
```bash
npm run simulate:build
```

**优点**：
- 🧹 完全清理环境（模拟全新 EAS 构建）
- 🔍 更彻底的测试
- 📦 测试依赖安装过程

**注意**：会删除 `node_modules`，需要重新安装依赖（可能需要几分钟）

### 方法 3: 单独测试（最快）
```bash
# 只测试 Babel 配置
npm run test:babel

# 只验证依赖
npm run test:deps

# 同时运行两个测试
npm run prebuild:check
```

## 测试脚本说明

### `npm run test:babel`
快速测试 Babel 配置是否能正确加载 `babel-plugin-module-resolver`

### `npm run test:deps`
验证所有关键的 Babel 插件是否已正确安装

### `npm run simulate:build:light`
轻量级模拟 EAS 构建环境，不删除 node_modules

### `npm run simulate:build`
完整模拟 EAS 构建环境，包括清理和重新安装依赖

### `npm run prebuild:check`
运行依赖验证、Babel 测试和原生代码检查（完整快速检查）

### `npm run test:native`
只检查原生代码编译配置（iOS 配置、依赖、EAS 设置等）

## 模拟构建验证的内容

1. **环境变量**：设置与 EAS production 构建相同的环境变量
2. **依赖验证**：确保所有必需的 Babel 插件都已安装
3. **Babel 配置**：测试 babel.config.js 是否能正确加载
4. **app.config.js**：验证应用配置是否正确
5. **Metro 入口点**：检查 expo-router 入口点是否能解析
6. **@ 别名路径解析**：验证路径别名配置是否正确
7. **原生代码编译检查**（新增）：
   - iOS Bundle ID 和 Build Number
   - 权限描述配置
   - New Architecture 配置
   - 原生依赖检查
   - CocoaPods 文件检查
   - EAS 构建配置验证
8. **常见问题**：检查 package.json、.npmrc、eas.json 配置

## 模拟构建 vs 真实构建

### ✅ 模拟构建可以验证：
- JavaScript/Babel 配置
- 依赖安装
- 配置文件加载
- Metro bundler 入口点
- **@ 别名路径解析**
- **原生代码配置**（Bundle ID、权限、架构等）
- **EAS 构建配置**

### ❌ 模拟构建无法验证：
- 实际的 Xcode 编译过程
- CocoaPods 依赖冲突（运行时）
- 代码签名和证书
- App Store Connect 配置

## 使用流程

### 推荐流程：
```bash
# 1. 快速预检查（几秒钟）- 包含原生代码检查
npm run prebuild:check

# 2. 如果通过，运行轻量级模拟（1-2分钟）
npm run simulate:build:light

# 3. 如果全部通过，提交代码并构建
git add .
git commit -m "Fix babel-plugin-module-resolver build issue"
git push
eas build --platform ios --profile production
```

**注意**：`prebuild:check` 现在包含原生代码编译检查，可以提前发现 iOS 配置问题！

### 如果发现问题：
1. 根据错误信息修复问题
2. 重新运行测试
3. 确保所有测试通过后再提交 EAS 构建

## 故障排除

### 问题：`babel-plugin-module-resolver not found`
**解决**：
```bash
npm install babel-plugin-module-resolver --save
```

### 问题：依赖验证失败
**解决**：
```bash
rm -rf node_modules package-lock.json
npm install
npm run test:deps
```

### 问题：Babel 配置加载失败
**检查**：
- `babel.config.js` 语法是否正确
- 所有引用的插件是否已安装
- 插件是否在 `dependencies` 中（不是 `devDependencies`）

## 注意事项

1. **package-lock.json**：确保已提交到 git，EAS 会使用它来安装依赖
2. **依赖位置**：所有 Babel 插件必须在 `dependencies` 中，不能只在 `devDependencies` 中
3. **缓存**：如果模拟通过但 EAS 构建失败，可能是缓存问题，确保 `eas.json` 中缓存已禁用

## 相关文件

- `scripts/test-babel-only.js` - Babel 配置测试脚本
- `scripts/verify-dependencies.js` - 依赖验证脚本
- `scripts/simulate-eas-build-light.sh` - 轻量级模拟脚本
- `scripts/simulate-eas-build.sh` - 完整模拟脚本

