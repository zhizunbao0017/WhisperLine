# 重新构建原生应用说明

## ⚠️ 重要提示

由于我们更新了 `app.json` 中的原生配置（添加了 `expo-image-picker` 插件和权限描述），**必须重新构建原生应用**才能生效。

简单的重新加载（reload）**不会**应用这些更改，因为权限配置是原生代码的一部分。

## 重新构建步骤

### 方法 1: 使用 Expo Prebuild（推荐）

```bash
# 停止当前的 Metro bundler (Ctrl+C)

# 清理并重新生成原生代码
npx expo prebuild --clean

# 然后运行应用
npx expo run:ios    # iOS
# 或
npx expo run:android # Android
```

### 方法 2: 直接运行（会自动触发 prebuild）

```bash
# 停止当前的 Metro bundler (Ctrl+C)

# 直接运行，Expo 会自动处理 prebuild
npx expo run:ios    # iOS
# 或
npx expo run:android # Android
```

### 方法 3: 使用 EAS Build（如果使用 EAS）

```bash
# 停止当前的 Metro bundler (Ctrl+C)

# 使用 EAS 构建开发版本
eas build --profile development --platform ios
# 或
eas build --profile development --platform android
```

## 已更新的配置

### 1. expo-image-picker 插件配置

在 `plugins` 数组中添加了：
```json
[
  "expo-image-picker",
  {
    "photosPermission": "Allow WhisperLine to access your photos...",
    "cameraPermission": "Allow WhisperLine to use your camera..."
  }
]
```

### 2. iOS 权限描述

更新了 `ios.infoPlist`：
- `NSPhotoLibraryUsageDescription` - 照片库访问权限
- `NSCameraUsageDescription` - 相机访问权限（新增）

### 3. Android 权限

添加了 `android.permissions`：
- `android.permission.CAMERA` - 相机权限
- `android.permission.READ_EXTERNAL_STORAGE` - 读取外部存储权限
- `android.permission.READ_MEDIA_IMAGES` - Android 13+ 读取媒体图片权限

## 验证配置

重新构建后，可以通过以下方式验证：

1. **iOS**: 在设置 → WhisperLine → 权限中查看照片和相机权限描述
2. **Android**: 在应用信息 → 权限中查看相机和存储权限

## 注意事项

- ⚠️ 重新构建会生成新的原生代码，可能需要几分钟时间
- ⚠️ 如果使用 Expo Go，这些配置**不会生效**，必须使用开发构建（development build）
- ✅ 项目已经配置了 `expo-dev-client`，支持自定义原生代码

## 故障排除

如果重新构建后仍然遇到权限问题：

1. 确保设备上已卸载旧版本的应用
2. 清理构建缓存：`npx expo prebuild --clean`
3. 检查 `app.json` 中的配置是否正确
4. 查看构建日志中是否有权限相关的警告

