# Module Resolver @ Alias 修复

## 问题描述

模拟构建时发现 Metro bundler 无法解析 `@/components/ThemeSelector` 路径别名，报错：
```
Unable to resolve module @/components/ThemeSelector from app/theme-onboarding.tsx
```

## 根本原因

`babel.config.js` 中的 `babel-plugin-module-resolver` 配置缺少 `@` 别名设置。虽然 `tsconfig.json` 中定义了 `@/*` 路径映射，但 Babel/Metro 需要单独配置才能解析这些别名。

## 修复方案

在 `babel.config.js` 的 `module-resolver` 配置中添加了：

1. **root 配置**：`root: ['./']` - 设置项目根目录
2. **extensions 配置**：指定支持的文件扩展名（包括 .tsx, .ts）
3. **@ 别名**：`alias: { '@': './' }` - 将 `@` 映射到项目根目录

### 修复后的配置

```javascript
[
  'module-resolver',
  {
    root: ['./'],
    extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json', '.tsx', '.ts'],
    alias: {
      '@': './',
      'ReactPropTypes': 'prop-types',
    }
  }
]
```

## 验证

运行模拟构建测试：
```bash
npm run simulate:build:light
```

所有测试通过：
- ✅ Babel 配置加载成功
- ✅ @ 别名路径可以解析
- ✅ ThemeSelector 组件可以找到

## 相关文件

- `babel.config.js` - Babel 配置（已修复）
- `tsconfig.json` - TypeScript 配置（已有 @ 别名）
- `app/theme-onboarding.tsx` - 使用 @ 别名的文件
- `components/ThemeSelector.tsx` - 被引用的组件

## 注意事项

1. **Babel vs TypeScript**：TypeScript 的路径映射（tsconfig.json）只用于类型检查，运行时需要 Babel 配置
2. **Metro Bundler**：Metro 使用 Babel 配置来解析模块路径，所以必须在 babel.config.js 中配置
3. **文件扩展名**：确保 extensions 数组中包含所有使用的文件扩展名（.tsx, .ts, .js, .jsx）

## 测试命令

```bash
# 快速测试 Babel 配置
npm run test:babel

# 测试依赖和 Babel
npm run prebuild:check

# 轻量级模拟构建
npm run simulate:build:light

# 完整模拟构建
npm run simulate:build
```

