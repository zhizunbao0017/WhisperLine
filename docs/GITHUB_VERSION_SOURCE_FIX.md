# GitHub 版本源问题修复

## 问题分析

### 构建失败的根本原因

**问题**：`eas.json` 中配置了 `"appVersionSource": "remote"`，导致 EAS 构建时尝试从 GitHub 远程仓库获取版本信息。

**失败原因**：
1. **网络访问问题**：EAS 构建服务器可能无法访问 GitHub（网络限制、防火墙等）
2. **权限问题**：如果仓库是私有的，EAS 可能没有访问权限
3. **GitHub API 限制**：GitHub API 可能有速率限制或临时不可用
4. **仓库访问问题**：仓库可能暂时不可访问或已迁移

### 错误表现

构建可能在以下阶段失败：
- 初始化阶段：无法获取版本信息
- 版本检查阶段：无法从远程读取版本号
- 构建配置阶段：版本信息缺失导致配置错误

## 解决方案

### ✅ 已修复：改为使用本地版本源

将 `eas.json` 中的 `appVersionSource` 从 `"remote"` 改为 `"local"`：

```json
{
  "cli": {
    "version": ">= 16.26.0",
    "appVersionSource": "local"  // ✅ 改为 local
  }
}
```

### 版本管理方式

使用 `"local"` 后，EAS 会：
- ✅ 从 `app.json` 中读取 `version` 字段
- ✅ 从 `app.json` 中读取 `ios.buildNumber` 和 `android.versionCode`
- ✅ 配合 `autoIncrement: true` 自动递增构建号
- ✅ 不依赖 GitHub 访问，构建更稳定

### 版本配置位置

版本信息现在完全由本地文件控制：

**app.json**:
```json
{
  "expo": {
    "version": "1.1.1",  // 应用版本
    "ios": {
      "buildNumber": "14"  // iOS 构建号
    },
    "android": {
      "versionCode": 14  // Android 版本代码
    }
  }
}
```

**eas.json**:
```json
{
  "build": {
    "production": {
      "autoIncrement": true  // 自动递增构建号
    }
  }
}
```

## 验证修复

### 检查配置

```bash
# 检查 eas.json 配置
cat eas.json | grep appVersionSource

# 应该显示： "appVersionSource": "local"
```

### 测试构建

```bash
# 清理缓存并重新构建
eas build --platform ios --profile production --clear-cache
```

## 版本管理最佳实践

### 更新版本号

1. **更新应用版本**（重大更新）：
   ```json
   // app.json
   "version": "1.2.0"  // 从 1.1.1 升级
   ```

2. **自动递增构建号**：
   - `autoIncrement: true` 会自动递增 `buildNumber`
   - 每次构建都会自动增加

3. **手动设置构建号**（如需要）：
   ```json
   // app.json
   "ios": {
     "buildNumber": "15"  // 手动设置
   }
   ```

## 相关配置说明

### appVersionSource 选项

- **`"local"`** ✅ **推荐**：使用本地 `app.json` 中的版本信息
  - 不依赖外部服务
  - 构建更稳定
  - 版本完全可控

- **`"remote"`** ⚠️ **不推荐**：从 GitHub 远程仓库获取版本信息
  - 依赖 GitHub 访问
  - 可能因网络/权限问题失败
  - 适合需要从 Git tags 获取版本的场景

## 预期结果

修复后，构建应该能够：

1. ✅ **成功获取版本信息**
   - 从本地 `app.json` 读取
   - 不依赖 GitHub 访问

2. ✅ **自动递增构建号**
   - `autoIncrement: true` 正常工作
   - 每次构建自动增加

3. ✅ **稳定完成构建**
   - 不再因 GitHub 访问问题失败
   - 构建过程更可靠

## 相关文档

- [EAS Build 配置文档](https://docs.expo.dev/build/eas-json/)
- [版本管理最佳实践](./QUICK_RELEASE_GUIDE.md)
- [构建失败诊断](./BUILD_FAILURE_DIAGNOSIS.md)

---

**状态**: ✅ **已修复**

版本源已改为本地，不再依赖 GitHub 访问，构建应该能够成功完成。

