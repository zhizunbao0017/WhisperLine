# CocoaPods 构建失败解决方案

## 问题描述

构建失败错误：
```
[!] Unable to add a source with url 'https://cdn.cocoapods.org/' named 'trunk'.
pod install exited with non-zero code: 1
```

## 原因分析

这是 CocoaPods 无法访问 CDN 源的问题，可能由以下原因导致：
1. EAS 构建服务器的网络问题
2. CocoaPods 仓库配置问题
3. 构建环境缓存问题

## 解决方案

### 方案一：使用 --clear-cache 重新构建（推荐）

```bash
eas build --platform ios --profile production --clear-cache
```

`--clear-cache` 标志会：
- 清理所有构建缓存
- 重新下载依赖
- 重新配置 CocoaPods 仓库

### 方案二：检查 EAS 构建配置

已更新 `eas.json` 添加了：
- `"image": "latest"` - 使用最新的构建镜像
- `"buildConfiguration": "Release"` - 明确指定构建配置
- `"COCOAPODS_DISABLE_STATS": "1"` - 禁用 CocoaPods 统计

### 方案三：如果问题持续存在

如果使用 `--clear-cache` 仍然失败，可以尝试：

1. **检查网络连接**：这可能是 EAS 服务器的临时网络问题
2. **等待后重试**：有时是 CocoaPods CDN 的临时问题
3. **联系 EAS 支持**：如果问题持续，可能是 EAS 基础设施问题

## 下一步操作

1. **使用清理缓存重新构建**：
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```

2. **监控构建进度**：
   - 终端输出
   - EAS 网页：https://expo.dev/accounts/j8t/projects/whisperline/builds

3. **如果仍然失败**：
   - 查看完整的构建日志
   - 检查是否有其他错误信息
   - 考虑联系 EAS 支持

## 注意事项

- CocoaPods 源问题通常是临时性的
- 使用 `--clear-cache` 会增加构建时间（约 20-40 分钟）
- 如果多次失败，可能需要检查是否有其他依赖问题

