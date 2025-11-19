# iOS Build Image 错误修复

## 问题

构建失败，错误信息：
```
Invalid image for macOS: "macos-15.0.0"
```

## 原因

`eas.json` 中指定的 iOS build image `macos-15.0.0` 不是有效的镜像名称。

## 修复

已修复为使用 `sdk-54`（与 Expo SDK 54 匹配）：

```json
"ios": {
  "image": "sdk-54",
  "buildConfiguration": "Release"
}
```

## 为什么选择 sdk-54

1. **匹配 Expo SDK**：项目使用 Expo SDK 54，`sdk-54` 镜像与之匹配
2. **稳定性**：SDK 特定镜像比 `latest` 更稳定
3. **可预测性**：每次构建使用相同的环境

## 其他可选镜像

如果需要，也可以使用：
- `latest` - 最新版本（可能变化）
- `stable` - 稳定版本
- `macos-sequoia-15.6-xcode-26.1` - 特定 macOS/Xcode 版本

## 验证

```bash
# 检查配置
cat eas.json | grep -A 3 '"ios"'

# 应该显示：
# "ios": {
#   "image": "sdk-54",
#   "buildConfiguration": "Release"
# }
```

## 下一步

提交修复并重新构建：

```bash
git add eas.json
git commit -m "Fix: Use valid iOS build image 'sdk-54'"
git push
eas build --platform ios --profile production
```

