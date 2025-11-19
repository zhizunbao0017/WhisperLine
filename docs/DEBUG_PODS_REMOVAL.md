# Debug-Only Pods 移除配置

## 概述

本配置确保在 Release/Production 构建时完全排除所有 debug-only pods，避免 EAS 构建时出现 exit code 65 的 archive 失败。

## 已禁用的 Debug-Only Pods

以下 pods 在 Release 构建时会被自动移除：

1. **ReactNativeStaticServer** - 本地开发服务器，仅用于调试
2. **Flipper** 及其所有相关组件：
   - FlipperKit
   - Flipper-Folly
   - Flipper-Glog
   - Flipper-PeerTalk
   - Flipper-RSocket
   - CocoaAsyncSocket
   - FlipperDoubleConversion
   - FlipperFmt

## 工作原理

### 1. Release 构建检测

`Podfile` 中的 `is_release_build?` 函数通过以下方式检测 Release 构建：

- 检查 `CONFIGURATION` 或 `BUILD_CONFIGURATION` 环境变量
- 检查 `EAS_BUILD_PROFILE` 是否为 `production`
- 检查 `EAS_BUILD` 环境变量
- 检查 `Podfile.properties.json` 中的 `ios.buildConfiguration`

### 2. Flipper 禁用

在 `use_react_native!` 调用中，通过 `flipper_configuration` 参数显式禁用 Flipper：

```ruby
:flipper_configuration => flipper_enabled? ? FlipperConfiguration.enabled : FlipperConfiguration.disabled
```

### 3. Debug-Only Pods 移除

在 `post_install` 钩子中，自动移除所有匹配的 debug-only pods：

```ruby
if is_release_build?
  debug_only_pods.each do |pod_name|
    # Remove pod from project
  end
end
```

## 代码兼容性

### StaticServer 服务

`services/staticServer.js` 已经实现了优雅降级：

- 如果 `ReactNativeStaticServer` 不可用，会自动降级到使用 `data:` URI
- 不会导致应用崩溃
- Release 构建中会正常工作（使用降级方案）

### 使用示例

```javascript
// 在代码中使用 StaticServer
import { ensureStaticServer, getPublicUrlForFileUri } from '../services/staticServer';

// 这会自动处理 Release 构建中的缺失情况
const publicUrl = await getPublicUrlForFileUri(fileUri);
// 在 Release 构建中，会返回 data: URI 或原始 file:// URI
```

## 验证配置

### 本地验证（Debug）

```bash
# 运行 Debug 构建，应该包含所有 debug pods
npx expo run:ios

# 检查 Podfile.lock，应该看到 ReactNativeStaticServer 和 Flipper
grep -i "ReactNativeStaticServer\|Flipper" ios/Podfile.lock
```

### EAS 构建验证（Release）

```bash
# 运行 Production 构建
eas build --platform ios --profile production --clear-cache

# 在构建日志中查找：
# ✅ [Release Build] Removed X debug-only pod(s)
# 或
# ℹ️  [Release Build] No debug-only pods found (already clean)
```

## 构建日志示例

### Release 构建（成功）

```
⚠️  [Release Build] Removing debug-only pod: ReactNativeStaticServer
⚠️  [Release Build] Removing debug-only pod: FlipperKit
✅ [Release Build] Removed 2 debug-only pod(s)
```

### Debug 构建（正常）

```
ℹ️  [Debug Build] Debug-only pods enabled (Flipper, ReactNativeStaticServer, etc.)
```

## 故障排除

### 问题：构建仍然失败，exit code 65

**可能原因**：
1. Podfile 修改未生效
2. 构建缓存未清理
3. 有其他 debug-only pod 未被识别

**解决方案**：
1. 确保 `ios/Podfile` 已提交到仓库
2. 使用 `--clear-cache` 重新构建：
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```
3. 检查构建日志，查看是否有其他未识别的 pod

### 问题：Debug 构建中缺少功能

**可能原因**：
- Release 构建检测逻辑过于激进

**解决方案**：
- 检查 `is_release_build?` 函数的逻辑
- 确保本地 Debug 构建时 `CONFIGURATION=Debug` 被正确设置

### 问题：StaticServer 在 Release 构建中不工作

**这是正常的**：
- Release 构建中 `ReactNativeStaticServer` 会被移除
- 代码会自动降级到使用 `data:` URI 或 `file://` URI
- 这不会影响应用功能，只是性能可能略有差异

## 相关文件

- `ios/Podfile` - 主要配置文件
- `services/staticServer.js` - StaticServer 服务实现（已处理降级）
- `eas.json` - EAS 构建配置

## 注意事项

1. **不要手动修改 Podfile.lock**：这个文件是自动生成的
2. **确保 Podfile 已提交**：EAS 构建需要从仓库读取 Podfile
3. **清理缓存**：修改 Podfile 后，建议使用 `--clear-cache` 重新构建
4. **测试 Debug 构建**：确保本地 Debug 构建仍然正常工作

## 更新日志

- **2024-01-XX**: 初始实现，禁用 Flipper 和 ReactNativeStaticServer
- **2024-01-XX**: 改进 Release 构建检测逻辑，添加更多 Flipper 相关 pods

